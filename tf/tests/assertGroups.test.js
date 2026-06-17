const _ = require("lodash");
const idTokenObj = require("./modules/idToken.json");
const eventObj = require("./modules/event.json");
const { onExecutePostLogin } = require("../actions/assertGroups.js");

jest.mock("auth0");

var _event;
var _idToken;
var _samlAttributes;

beforeEach(() => {
  _event = {
    ..._.cloneDeep(eventObj),
    secrets: {
      mgmtClientId: "foo",
      mgmtClientSecret: "bar",
    },
  };
  _idToken = _.cloneDeep(idTokenObj);
  _samlAttributes = {};
  api = {
    samlResponse: {
      setAttribute: jest.fn((k, v) => (_samlAttributes[k] = v)),
    },
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Tines SAML tests", () => {
  const clientIDs = [
    "cPH0znP4n74JvPf9Efc1w6O8KQWwT634",
    "cDof40r4Uvde1xGs8i30HYnekOkIglN6",
  ];

  test.each(clientIDs)(
    "Ensure SAML configuration mappings for client %s",
    async (clientID) => {
      _event.transaction.protocol = "samlp";
      _event.client.client_id = clientID;

      _event.user.app_metadata = {};
      _event.user.app_metadata.groups = [
        "mozilliansorg_sec_tines-admin",
        "foo",
        "mozilliansorg_sec_tines-access",
        "bar",
        "team_moco",
        "team_mofo",
        "team_mozorg",
        "team_mzla",
        "team_mzai",
        "team_mzvc",
      ];

      expectedSamlAttributes = {
        "http://sso.mozilla.com/claim/groups": [
          "mozilliansorg_sec_tines-admin",
          "mozilliansorg_sec_tines-access",
          "team_moco",
          "team_mofo",
          "team_mozorg",
          "team_mzla",
          "team_mzai",
          "team_mzvc",
        ],
        "http://schemas.xmlsoap.org/claims/Group": null,
      };

      // Execute onExecutePostLogin
      await onExecutePostLogin(_event, api);

      expect(api.samlResponse.setAttribute).toHaveBeenCalled();
      expect(_samlAttributes).toEqual(expectedSamlAttributes);
    }
  );
});
