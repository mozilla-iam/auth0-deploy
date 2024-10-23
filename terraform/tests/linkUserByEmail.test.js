const _ = require('lodash');
const auth0Sdk = require('auth0');

const { ldapUser, emailUser, firefoxaccountUser } = require('./modules/users.js');
const eventObj = require('./modules/event.json');
const { onExecutePostLogin } = require('../actions/linkUserByEmail.js');

// Mock auth0 module
jest.mock('auth0');

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
  _event              = _.cloneDeep(eventObj);
  _ldapUser           = _.cloneDeep(ldapUser);
  _emailUser          = _.cloneDeep(emailUser);
  _firefoxaccountUser = _.cloneDeep(firefoxaccountUser);

  // Set event secrets
  _event.secrets = {
    mgmtClientId: "fakefakefake",
    mgmtClientSecret: "fakefakefake"
  };

  // Make sure redirect_url is undefined before each test
  _event.transaction.redirect_uri = undefined;

  // Set the default connection type
  _event.connection.name = "email";

  // Mock auth0 api object
  api = {
    access: {
      deny: jest.fn()
    },
    redirect: {
      sendUserTo: jest.fn()
    },
    authentication: {
      setPrimaryUser: jest.fn()
    }
  };

  // Mock api.authentication.setPrimaryUser
  api.authentication.setPrimaryUser.mockImplementation((primaryUserId) => {
    _event.user.user_id = primaryUserId;
  });

  // Mock sendUserTo
	api.redirect.sendUserTo.mockImplementation((uri) => {
		_event.transaction["redirect_uri"] = uri;
	});

  // Mock implementation of ManagementClient
  mockManagementClient = {
    users: {
      link: jest.fn()
    },
    usersByEmail: {
      getByEmail: jest.fn()
    }
  };

  users = [];

  getByEmail = (payload) => {
    const { email } = payload;
    const profiles = users.filter(profileObj => profileObj.email === email);
    return Promise.resolve({ data: profiles });
	};


  // Mock the constructor of ManagementClient to return the mocked instance
  auth0Sdk.ManagementClient = jest.fn(() => mockManagementClient);

  // Spy on console
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});


afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});


test('If zero usersByEmail are found, expect no account linking', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  users = [];

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).not.toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).not.toHaveBeenCalled();
});

test('If one usersByEmail is found, expect no account linking', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  users = [_ldapUser];
  _event.user = _ldapUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).not.toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).not.toHaveBeenCalled();
});

test('If two usersByEmail is found, expect account linking', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  users = [_ldapUser, _emailUser];
  _event.user = _ldapUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const searchString = `Linking secondary identity ${_emailUser.user_id} into primary identity ${_event.user.user_id}`;
  expect(combinedLogs.some(element => element.includes(searchString))).toBe(true);
});

test('If more than 2 usersByEmail is found, expect error', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  users = [_ldapUser, _emailUser,_firefoxaccountUser];
  _event.user = _ldapUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).not.toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).not.toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedErrorLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString = `Error linking account ${_event.user.user_id} as there are over 2 identities`;
  expect(combinedErrorLogs.some(element => element.startsWith(searchString))).toBe(true);
});

test('Test for email of different case, expect account linking', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  _ldapUser.email = "jDoe@mozilla.com";
  users = [_ldapUser, _emailUser];
  _event.user = _ldapUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).toHaveBeenCalled();
});

test('Test for email of different case and where primary is swapped, expect account linking', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  _firefoxaccountUser.email = "jDoE@mozilla.com";
  users = [_ldapUser, _firefoxaccountUser];
  _event.user = _firefoxaccountUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).toHaveBeenCalled();

  // Expect Primary user to be set to LDAP user
  expect(_event.user.user_id).toEqual(_ldapUser.user_id);
});

test('Test attempting to link 2 LDAP accounts, expect error', async () => {
  // Define user profiles to return with usersByEmail.getByEmail
  _firefoxaccountUser.user_id = "ad|Mozilla-LDAP|jdoe";
  users = [_ldapUser, _firefoxaccountUser];
  _event.user = _ldapUser;

  // Mock implementation of ManagementClient.usersByEmail.getByEmail()
	mockManagementClient.usersByEmail.getByEmail.mockImplementation(getByEmail);

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(mockManagementClient.users.link).not.toHaveBeenCalled();
  expect(api.authentication.setPrimaryUser).not.toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedErrorLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString = `Error: both ${_event.user.user_id} and ${_firefoxaccountUser.user_id} are LDAP Primary accounts. Linking will not occur.`
  expect(combinedErrorLogs.some(element => element.includes(searchString))).toBe(true);
});
