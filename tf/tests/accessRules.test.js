const _ = require("lodash");

const appsYaml = require("./modules/apps.yml.js").load();
const eventObj = require("./modules/event.json");
const decodeRedirect = require("./modules/decodePostErrorUrl.js");
const idTokenObj = require("./modules/idToken.json");
const { onExecutePostLogin } = require("../actions/accessRules.js");

beforeEach(() => {
  _event = _.cloneDeep(eventObj);
  _event.user.aai = [];
  _event.secrets = {};
  _event.secrets.jwtMsgsRsaSkey;
  _event.secrets.accessKeyId = "fakefakefakefake";
  _event.secrets.secretAccessKey = "fakefakefakefake";
  _event.transaction.redirect_uri = undefined;

  _idToken = _.cloneDeep(idTokenObj);

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
  fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
    text: jest.fn().mockResolvedValue(appsYaml),
  });
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  fetchSpy.mockRestore();
});

// TODO: test whitelisted duo users

describe("Basic tests", () => {
  it("should be defined", () => {
    expect(onExecutePostLogin).toBeDefined();
  });

  it("should execute without throwing", async () => {
    await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
  });
});

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});

test("Connection is not LDAP, do not call api.multifactor.enable", async () => {
  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.multifactor.enable to have been called
  expect(api.multifactor.enable).not.toHaveBeenCalled();
});

test("user in LDAP (ad) requires 2FA", async () => {
  _event.client.client_id = "client00000000000000000000000005";
  _event.connection = {
    id: "con_qVLhpUZQxluxX5kN",
    metadata: {},
    name: "Mozilla-LDAP-Dev",
    strategy: "ad",
  };

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.multifactor.enable to have been called
  expect(api.multifactor.enable).toHaveBeenCalled();
});

test("service account MFA bypass", async () => {
  (_event.connection = {
    id: "con_qVLhpUZQxluxX5kN",
    metadata: {},
    name: "Mozilla-LDAP-Dev",
    strategy: "ad",
  }),
    (_event.user.email = "moc-sso-monitoring@mozilla.com");

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect api.multifactor.enable to have been called
  expect(api.multifactor.enable).not.toHaveBeenCalled();
});

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

describe("Test group merges", () => {
  test("Expect user.groups to be a merged list of multiple group lists", async () => {
    _event.client.client_id = "client00000000000000000000000005";
    _event.transaction.requested_scopes = ["email", "profile"];
    _event.user.aai = ["2FA"];
    _event.user.groups = ["groups_1", "groups_2"];
    _event.user.ldap_groups = ["ldap_groups_1", "ldap_groups_2"];
    _event.user.app_metadata.groups = [
      "app_metadata_groups_1",
      "app_metadata_groups_2",
    ];

    mergedGroups = [
      "everyone",
      "groups_1",
      "groups_2",
      "ldap_groups_1",
      "ldap_groups_2",
      "app_metadata_groups_1",
      "app_metadata_groups_2",
    ];
    await onExecutePostLogin(_event, api);

    // Ensure _user.groups is a subset of mergedGroups and vice versa
    expect(_idToken["https://sso.mozilla.com/claim/groups"]).toEqual(
      expect.arrayContaining(mergedGroups)
    );
    expect(mergedGroups).toEqual(
      expect.arrayContaining(_idToken["https://sso.mozilla.com/claim/groups"])
    );

    // Additionally, check if they have the same length to ensure no duplicates
    expect(_idToken["https://sso.mozilla.com/claim/groups"]).toHaveLength(
      mergedGroups.length
    );
  });
});

describe("Client does not exist in apps.yml", () => {
  test("Client id does not exist and aai is 2FA; expect not allowed", async () => {
    _event.user.multifactor = ["duo"];
    await onExecutePostLogin(_event, api);
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "notingroup"
    );
  });

  test("Client id does not exist and aai is empty; expect not allowed", async () => {
    await onExecutePostLogin(_event, api);

    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "notingroup"
    );
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000001", () => {
  /*
   *  This client app is defined in apps.yml but no user or groups have been defined
   *  AAL defaults to MEDIUM
   *  Therfore, access is denied
   *  - application:
   *      authorized_groups: []
   *      authorized_users: []
   *      client_id: client00000000000000000000000001
   */
  test("No users, no groups defined; expect not allowed", async () => {
    _event.client.client_id = "client00000000000000000000000001";
    //_event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];
    _event.transaction.redirect_uri = undefined;

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "notingroup"
    );
    expect(fetch).toHaveBeenCalledWith("https://cdn.sso.mozilla.com/apps.yml");
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000002", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL defaults to MEDIUM
   *  - application:
   *     authorized_groups:
   *     - everyone
   *     authorized_users: []
   *     client_id: client00000000000000000000000002
   */
  test("User has no groups except everyone, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000002";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has no groups, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000002";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000003", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL defaults to MEDIUM
   *  - application:
   *      authorized_groups:
   *      - fakegroup1
   *      authorized_users: []
   *      client_id: client00000000000000000000000003
   */
  test("User has no groups, aai 2FA; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000003";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "notingroup"
    );
  });
  test("User has matching group, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000003";
    _event.user.groups = ["fakegroup1"];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has matching group, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000003";
    _event.user.multifactor = ["duo"];
    _event.user.groups = ["fakegroup1"];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has matching group, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000003";
    _event.user.multifactor = ["duo"];
    _event.user.groups = ["fakegroup2"];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000004", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL defaults to MEDIUM
   *  - application:
   *      authorized_groups: []
   *      authorized_users:
   *      - joe@mozilla.com
   *      - jane@mozilla.com
   *      client_id: client00000000000000000000000004
   */
  test("User has no groups, aai 2FA; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000004";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "notingroup"
    );
  });
  test("User has matching allowed email, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000004";
    _event.user.email = "joe@mozilla.com";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has matching allowed email, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000004";
    _event.user.multifactor = ["duo"];
    _event.user.email = "joe@mozilla.com";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has matching allowed email, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000004";
    _event.user.multifactor = ["duo"];
    _event.user.email = "jane@mozilla.com";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000005", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL set to low
   *  - application:
   *      AAL: LOW
   *      authorized_groups:
   *      - everyone
   *      authorized_users: []
   *      client_id: client00000000000000000000000005
   */
  test("User has no groups, aai unset; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000005";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has no groups, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000005";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has no groups, aai HIGH_ASSURANCE_IDP; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000005";
    _event.connection.name = "google-oauth2";
    _event.user.groups = [];
    _event.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000006", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL set to Medium
   *  - application:
   *      AAL: MEDIUM
   *      authorized_groups:
   *      - everyone
   *      authorized_users: []
   *      client_id: client00000000000000000000000006
   */
  test("User has no groups, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000006";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has no groups, aai 2FA; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000006";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
  test("User has no groups, aai HIGH_ASSURANCE_IDP; expect allowed", async () => {
    _event.client.client_id = "client00000000000000000000000006";
    _event.connection.name = "google-oauth2";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be undefined
    expect(_event.transaction.redirect_uri).toEqual(undefined);
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000007", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL set to HIGH
   *  - application:
   *      AAL: HIGH
   *      authorized_groups:
   *      - everyone
   *      authorized_users: []
   *      client_id: client00000000000000000000000006
   */
  test("User has no groups, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000007";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has no groups, aai 2FA; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000007";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has no groups, aai HIGH_ASSURANCE_IDP; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000007";
    _event.connection.name = "google-oauth2";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
});

describe("Client is defined in apps.yml as client00000000000000000000000008", () => {
  /*
   *  This client app is defined in apps.yml and has everyone group defined.
   *  AAL set to MAXIMUM
   *  - application:
   *      AAL: MAXIMUM
   *      authorized_groups:
   *      - everyone
   *      authorized_users: []
   *      client_id: client00000000000000000000000008
   */
  test("User has no groups, aai unset; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000008";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has no groups, aai 2FA; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000008";
    _event.user.multifactor = ["duo"];
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
  test("User has no groups, aai HIGH_ASSURANCE_IDP; expect denied", async () => {
    _event.client.client_id = "client00000000000000000000000008";
    _event.connection.name = "google-oauth2";
    _event.user.groups = [];
    _event.user.ldap_groups = [];
    _event.user.app_metadata.groups = [];

    await onExecutePostLogin(_event, api);

    // expect redirect.url to be defined and the error code to match
    expect(_event.transaction.redirect_uri).toBeDefined();
    expect(decodeRedirect(_event.transaction.redirect_uri)).toEqual(
      "aai_failed"
    );
  });
});
