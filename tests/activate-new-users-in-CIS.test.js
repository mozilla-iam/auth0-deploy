const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');
const auth0 = require('./modules/global/auth0.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('activate-new-users-in-CIS.js', false);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
  delete Global.personapi_bearer_token;
  delete Global.personapi_bearer_token_creation_time;

  fetch.resetMocks();

  // Example api responses
  // personResp = JSON.stringify({ usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}});
  // tokenResp = JSON.stringify({ access_token: "faketoken" });

  fetchRespCallback = (req) => {
    // https://person.api.dev.sso.allizom.org/v2/user/user_id/${encodeURI(USER_ID)}
    if (req.url.match(/https:\/\/person.api.dev.sso.allizom.org\/v2\/user\/user_id/)) {
      if (req.method === 'GET' && personResp) {
        return Promise.resolve(personResp);
      }
      return Promise.reject(new Error('Person API error'));
    }
    // https://auth.mozilla.auth0.com/oauth/token
    if (req.url.match(/https:\/\/auth.mozilla.auth0.com\/oauth\/token/)) {
      if (req.method === 'POST' && tokenResp) {
        return Promise.resolve(tokenResp);
      }
      return Promise.reject(new Error('Auth0 API error'));
    }
    // https://change.api.dev.sso.allizom.org
    if (req.url.match(/https:\/\/change.api.dev.sso.allizom.org\/v2\/user\?user_id=/)) {
      if (req.method === 'POST' && changeResp) {
        return Promise.resolve(changeResp);
      }
      return Promise.reject(new Error('Change API error'));
    }
    // Default response for all other requests
    return Promise.reject(new Error('URL not matched'));
  };
});


const WHITELISTED_CONNECTIONS = ['email', 'firefoxaccounts', 'github', 'google-oauth2', 'Mozilla-LDAP', 'Mozilla-LDAP-Dev'];

test('When connection does not match, expect empty logs and workflow to continue', async () => {
  fetchMock.mockResponse(fetchRespCallback);

  _context.connection = "non_whitelisted_provider";
  modContext = _.cloneDeep(_context); // clone for later comparison
  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const combinedLogs = [...output._log.error, ...output._log.warn, ...output._log.log];
  expect(combinedLogs).toEqual([]);
  expect(output.user).toEqual(user);
  expect(output.context).toEqual(modContext);
});

test('When existsInCIS is already set, expect empty logs and workflow to continue', async () => {
  fetchMock.mockResponse(fetchRespCallback);

  _user.user_metadata = { existsInCIS: true };
  modUser = _.cloneDeep(_user); // clone for later comparison
  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const combinedLogs = [...output._log.error, ...output._log.warn, ...output._log.log];
  expect(combinedLogs).toEqual([]);
  expect(output.user).toEqual(modUser);
  expect(output.context).toEqual(context);
});

test('When failing to get beartoken, expect error logged and workflow to continue', async () => {
  tokenResp = undefined;;
  fetchMock.mockResponse(fetchRespCallback);

  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const errorMsg = "Unable to retrieve bearer token from Auth0:";
  const isErrorPresent = output._log.error.some(element => element.includes(errorMsg));

  expect(isErrorPresent).toEqual(true);
  expect(output.user).toEqual(user);
  expect(output.context).toEqual(context);
});


test('When failing to get profile, expect error logged and workflow to continue', async () => {
  tokenResp = JSON.stringify({ access_token: "faketoken" });
  fetchMock.mockResponse(fetchRespCallback);

  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const errorMsg = "Unable to retrieve profile from Person API:";
  const isErrorPresent = output._log.error.some(element => element.includes(errorMsg));

  expect(isErrorPresent).toEqual(true);
  expect(output.user).toEqual(user);
  expect(output.context).toEqual(context);
});


test('When change API fails, expect error logged and workflow to continue', async () => {
  personResp = JSON.stringify({});
  tokenResp = JSON.stringify({ access_token: "faketoken" });
  changeResp = JSON.stringify(undefined);

  fetchMock.mockResponse(fetchRespCallback);

  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const errorMsg = "Unable to create profile for ad|Mozilla-LDAP-Dev|jdoe in ChangeAPI:";
  const isErrorPresent = output._log.error.some(element => element.includes(errorMsg));

  expect(isErrorPresent).toEqual(true);
  expect(output.user).toEqual(user);
  expect(output.context).toEqual(context);
});

test.each(WHITELISTED_CONNECTIONS)('When new user with %s connection is created, expect it logged and workflow to continue', async (connection) => {
  personResp = JSON.stringify({});
  tokenResp = JSON.stringify({ access_token: "faketoken" });
  changeResp = JSON.stringify({});

  fetchMock.mockResponse(fetchRespCallback);
  _context.connection = connection;
  modContext = _.cloneDeep(_context); // clone for later comparison

  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  consoleLog = [
    'Retrieving bearer token to create new user in CIS',
    'Successfully retrieved bearer token from Auth0',
    'Fetching person profile of ad|Mozilla-LDAP-Dev|jdoe',
    'Generating CIS profile for ad|Mozilla-LDAP-Dev|jdoe',
    'Posting profile for ad|Mozilla-LDAP-Dev|jdoe to ChangeAPI',
    'Successfully created profile for ad|Mozilla-LDAP-Dev|jdoe in ChangeAPI as ad|Mozilla-LDAP-Dev|jdoe',
    'Updated user metadata on ad|Mozilla-LDAP-Dev|jdoe to set existsInCIS'
  ];

  expect(output._log.log).toEqual(consoleLog);
  expect(output.user).toEqual(user);
  expect(output.context).toEqual(modContext);
});

test('When person API profile exists, expect set existsInCIS', async () => {
  personResp = JSON.stringify({ usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}});
  tokenResp = JSON.stringify({ access_token: "faketoken" });

  fetchMock.mockResponse(fetchRespCallback);

  output = await rule(_user, _context, configuration, Global, auth0, fetch);

  const warnMsg = "Profile for ad|Mozilla-LDAP-Dev|jdoe already exists in PersonAPI as ad|Mozilla-LDAP-Dev|jdoe";
  const isWarnPresent = output._log.warn.some(element => element.includes(warnMsg));
  expect(isWarnPresent).toEqual(true);

  const logMsg = "Updated user metadata on ad|Mozilla-LDAP-Dev|jdoe to set existsInCIS";
  const isLogPresent = output._log.log.some(element => element.includes(logMsg));
  expect(isLogPresent).toEqual(true);

  expect(output.user).toEqual(user);
  expect(output.context).toEqual(context);
});

