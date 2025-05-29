const _ = require("lodash");

const eventObj = require("./modules/event.json");
const decodeRedirect = require("./modules/decodePostErrorUrl.js");
const { onExecutePostLogin } = require("../actions/ensureLdapUsersUseLdap.js");

// Take all log enteries and combine them into a single array
const combineLog = (consoleLogs) => {
  let combinedLog = [];
  for (let i = 0; i < consoleLogs.length; i++) {
    singleStr = consoleLogs[i].join(" ");
    combinedLog.push(singleStr);
  }
  return combinedLog;
};

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
      setCustomClaim: jest.fn(),
    },
    access: {
      deny: jest.fn(),
    },
    redirect: {
      sendUserTo: jest.fn(),
    },
    user: {
      setAppMetadata: jest.fn(),
    },
    multifactor: {
      enable: jest.fn(),
    },
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
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

const WHITELIST = [
  "HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH", // mozillians.org account verification
  "t9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1", // https://web-mozillians-staging.production.paas.mozilla.community Verification client
  "jijaIzcZmFCDRtV74scMb9lI87MtYNTA", // mozillians.org Verification Client
];

const MOZILLA_STAFF_DOMAINS = [
  "mozilla.com", // Main corp domain
  "mozillafoundation.org", // Mozilla Foundation domain
  "mozilla.org", // Mozilla Organization domain
  "getpocket.com", // Pocket domain
  "thunderbird.net", // MZLA domain
  "readitlater.com",
  "mozilla-japan.org",
  "mozilla.ai",
  "mozilla.vc",
];

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});

test.each(WHITELIST)(
  "Whitelisted client %s, without enforcement",
  async (clientId) => {
    // Set the connection as LDAP
    (_event.connection = {
      id: "con_qVLhpUZQxluxX5kN",
      metadata: {},
      name: "Mozilla-LDAP-Dev",
      strategy: "ad",
    }),
      // Set clientId for each WHITELIST element
      (_event.client.client_id = clientId);

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    // Expect redirect_uri to be undefined
    expect(_event.transaction.redirect_uri).toBe(undefined);

    // Collect console logs and expect searchString to exist in logs
    const combinedLogs = combineLog(consoleLogSpy.mock.calls);
    const searchString = `Whitelisted client ${clientId}, no login enforcement taking place`;
    expect(combinedLogs.some((element) => element.includes(searchString))).toBe(
      true
    );

    // Expect no Errors to be raised outside of onExecutePostLogin
    await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
  }
);

test("email account not verified", async () => {
  _event.user.email_verified = false;
  (_event.connection = {
    id: "con_qVLhpUZQxluxX5kN",
    metadata: {},
    name: "Mozilla-LDAP-Dev",
    strategy: "ad",
  }),
    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toBeDefined();
  expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
    "primarynotverified"
  );
});

test.each(MOZILLA_STAFF_DOMAINS)(
  "Staff account with domain %s, not using ldap",
  async (domain) => {
    _event.user.email = `jdoe@${domain}`;

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "staffmustuseldap"
    );
  }
);

test("Non-staff account not using ldap", async () => {
  _event.connection.strategy = "not-ad";
  _event.user.email = "jdoe@example.com";
  _event.user.email_verified = true;

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).not.toBeDefined();
});
