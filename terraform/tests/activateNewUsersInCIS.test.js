const _ = require('lodash');
const fetch = require('node-fetch');

const eventObj = require('./modules/event.json');
const { onExecutePostLogin } = require('../actions/activateNewUsersInCIS.js');

// Mock the node-fetch module
jest.mock('node-fetch');

// Take all log enteries and combine them into a single array
const combineLog = (consoleLogs) => {
  let combinedLog = [];
  for (let i = 0; i < consoleLogs.length; i++) {
    singleStr = consoleLogs[i].join(' ');
    combinedLog.push(singleStr);
  }
  return combinedLog;
}

beforeEach(() => {
  // Clone the event object to be used before each test
  _event = _.cloneDeep(eventObj);

  // Set event secrets
  _event.secrets = {
    accessKeyId: "fakefakefakefake",
    secretAccessKey: "fakefakefakefake",
    changeapi_url: "https://change.api.dev.sso.allizom.org",
    personapi_oauth_url: "https://auth.mozilla.auth0.com/oauth/token",
    personapi_client_id: "fakefakefakefake",
    personapi_client_secret: "fakefakefakefake",
    personapi_url: "https://person.api.dev.sso.allizom.org",
    personapi_audience: "api.dev.sso.allizom.org"
  };

  // Make sure redirect_url is undefined before each test
  _event.transaction.redirect_uri = undefined;

  // Set the default connection type
  _event.connection.name = "email";

  // Default fetch response status and code
  personResponseStatusOk = true;
  personResponseStatusCode = 200;
  tokenResponseStatusOk = true;
  tokenResponseStatusCode = 200;
  changeResponseStatusOk = true;
  changeResponseStatusCode = 200;

  // Mock auth0 api object
  api = {
    idToken: {
      setCustomClaim: jest.fn()
    },
    access: {
      deny: jest.fn()
    },
    redirect: {
      sendUserTo: jest.fn()
    },
    user: {
      setAppMetadata: jest.fn()
    }
  };

  // Mock setCustomClaim
  api.idToken.setCustomClaim.mockImplementation((key, value) => {
    _idToken[key] = value;
  });

  // Mock sendUserTo
	api.redirect.sendUserTo.mockImplementation((uri) => {
		_event.transaction["redirect_uri"] = uri;
	});

  // Mock setAppMetadata
  api.user.setAppMetadata.mockImplementation((key, value) => {
    _event.user.app_metadata[key] = value;
  });

  // Spy on console
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  // Example api responses
  // personResp = { usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}};
  // tokenResp = { access_token: "faketoken" };

  // Fetch mockImplemenation depending on the URL passed to fetch
  fetchRespCallback = (url) => {
    // https://person.api.dev.sso.allizom.org/v2/user/user_id/${encodeURI(USER_ID)}
    const encodedUserId = encodeURI(_event.user.user_id);
    if (url.startsWith(`https://person.api.dev.sso.allizom.org/v2/user/user_id/${encodedUserId}`)) {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue(personResp),
        ok: personResponseStatusOk,
        status: personResponseStatusCode
      });
    // https://auth.mozilla.auth0.com/oauth/token
    } else if (url === 'https://auth.mozilla.auth0.com/oauth/token') {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue(tokenResp),
        ok: tokenResponseStatusOk,
        status: tokenResponseStatusCode
      });
    // https://change.api.dev.sso.allizom.org
    } else if (url.startsWith('https://change.api.dev.sso.allizom.org')) {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue(changeResp),
        ok: changeResponseStatusOk,
        status: changeResponseStatusCode
      });
    // Default response for URLs that aren't matched
    } else {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue({ error: 'Unknown URL' }),
        ok: false,
        status: 404,
      });
    }
  };
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// Connections that are actually used in dev/prod Auth0 tenants
const WHITELISTED_CONNECTIONS = ['email', 'firefoxaccounts', 'github', 'google-oauth2', 'Mozilla-LDAP', 'Mozilla-LDAP-Dev'];

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});


test('When connection does not match, expect empty logs and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set connection name to a connection other than WHITELISTED_CONNECTIONS
  _event.connection.name = "non_whitelisted_provider";

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch not to have been called
  expect(fetch).not.toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const searchString = "non_whitelisted_provider is not whitelisted. Skip activateNewUsersInCIS";
  expect(combinedLogs.some(element => element.includes(searchString))).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test('When existsInCIS is already set, expect empty logs and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set existsInCIS in user metadata
  _event.user.user_metadata = { existsInCIS: true };

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch not to have been called
  expect(fetch).not.toHaveBeenCalled();

  // Expect log entry
  expect(consoleLogSpy).toHaveBeenCalledWith(
      `${_event.user.user_id} existsInCIS is True.  Skip activateNewUsersInCIS`
  );

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test('When failing to load secrets, expect error logged and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set secrets empty
  _event.secrets = {};

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch not to have been called
  expect(fetch).not.toHaveBeenCalled();

  // Expect log entry
  expect(consoleLogSpy).toHaveBeenCalledWith("Error: Unable to find secrets");

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();

});

test('When failing to get beartoken, expect error logged and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set token fetch responses
  tokenResp = {};
  tokenResponseStatusOk = false;
  tokenResponseStatusCode = 403;

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch to have been called
  expect(fetch).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString = "Error: Unable to retrieve bearer token from Auth0: Error: HTTP error! status: 403";
  expect(combinedLogs.some(element => element.includes(searchString))).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test('When failing to get profile, expect error logged and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set token and person fetch responses
  tokenResp = { access_token: "fakefakefakefake"};
  personResponseStatusOk = false;
  personResponseStatusCode = 403;
  personResp = { usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}};

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch to have been called
  expect(fetch).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString = "Error: Unable to retrieve profile from Person API: Error: HTTP error! status: 403";
  expect(combinedLogs.some(element => element.includes(searchString))).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});


test('When change API fails, expect error logged and workflow to continue', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set token, person and change responses
  tokenResp = { access_token: "fakefakefakefake"};
  personResp = {};
  changeResp = {};
  changeResponseStatusOk = false;
  changeResponseStatusCode = 403;

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch to have been called
  expect(fetch).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString = `Error: Unable to create profile for ${_event.user.user_id} in ChangeAPI: Error: HTTP error! status: 403`;
  expect(combinedLogs.some(element => element.includes(searchString))).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test.each(WHITELISTED_CONNECTIONS)('When new user with %s connection is created, expect it logged and workflow to continue', async (connection) => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set token, person and change responses
  tokenResp = { access_token: "fakefakefakefake"};
  personResp = {};
  changeResp = {};

  // Set connection name for each iteration of this test
  _event.connection.name = connection;

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Collect logs and expect log entry array to match consoleLog array
  consoleLog = [
    'Running action: activateNewUsersInCIS',
    'Retrieving bearer token to create new user in CIS',
    'Successfully retrieved bearer token from Auth0',
    `Fetching person profile of ${_event.user.user_id}`,
    `Generating CIS profile for ${_event.user.user_id}`,
    `Posting profile for ${_event.user.user_id} to ChangeAPI`,
    `Successfully created profile for ${_event.user.user_id} in ChangeAPI as ${_event.user.user_id}`,
    `Updated user metadata on ${_event.user.user_id} to set existsInCIS`
  ];
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  expect(combinedLogs).toEqual(consoleLog);

  // Expect Fetch to have been called
  expect(api.user.setAppMetadata).toHaveBeenCalled();

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test('When person API profile exists, expect set existsInCIS', async () => {
  // Mock Fetch
  fetch.mockImplementation(fetchRespCallback);

  // Set token and person fetch responses
  tokenResp = { access_token: "fakefakefakefake"};
  personResp = { usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}};

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.user.setAppMetadata to have been called
  expect(api.user.setAppMetadata).toHaveBeenCalled();

  // Collect console logs and expect both existsMsg and updateMsg to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const existsMsg = `Profile for ${_event.user.user_id} already exists in PersonAPI as ${_event.user.user_id}`;
  const updateMsg = `Updated user metadata on ${_event.user.user_id} to set existsInCIS`;
  expect(combinedLogs.some(element => element.includes(existsMsg))).toBe(true);
  expect(combinedLogs.some(element => element.includes(updateMsg))).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

