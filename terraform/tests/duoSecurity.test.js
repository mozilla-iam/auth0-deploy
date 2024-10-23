const _ = require('lodash');

const eventObj = require('./modules/event.json');
const decodeRedirect = require('./modules/decodePostErrorUrl.js');
const { onExecutePostLogin } = require('../actions/duoSecurity.js');


beforeEach(() => {
  // Clone the event object to be used before each test
  _event = _.cloneDeep(eventObj);

  // Set event secrets
  _event.secrets = {
    accessKeyId: "fakefakefakefake",
    secretAccessKey: "fakefakefakefake",
  };

  // Make sure redirect_url is undefined before each test
  _event.transaction.redirect_uri = undefined;

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
    },
    multifactor: {
      enable: jest.fn()
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

test('Connection is not LDAP, do not call api.multifactor.enable', async () => {
  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.multifactor.enable to have been called
  expect(api.multifactor.enable).not.toHaveBeenCalled();
});

test('user in LDAP (ad) requires 2FA', async () => {
  _event.connection = {
    id: "con_qVLhpUZQxluxX5kN",
    metadata: {},
    name: "Mozilla-LDAP-Dev",
    strategy: "ad"
  },

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.multifactor.enable to have been called
  expect(api.multifactor.enable).toHaveBeenCalled();
});

test('email account not verified', async () => {
  _event.user.email_verified = false;
  _event.connection = {
    id: "con_qVLhpUZQxluxX5kN",
    metadata: {},
    name: "Mozilla-LDAP-Dev",
    strategy: "ad"
  },

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toBeDefined();
  expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual("primarynotverified");
});
