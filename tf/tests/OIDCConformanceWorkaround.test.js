const _ = require("lodash");
const eventObj = require("./modules/event.json");
const idTokenObj = require("./modules/idToken.json");
const {
  onExecutePostLogin,
} = require("../actions/OIDCConformanceWorkaround.js");

beforeEach(() => {
  _event = _.cloneDeep(eventObj);
  _idToken = _.cloneDeep(idTokenObj);

  api = { idToken: { setCustomClaim: jest.fn() } };
  api.idToken.setCustomClaim.mockImplementation((key, value) => {
    _idToken[key] = value;
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
// This list should match what is being applied in the OIDC-conformance-workaround rule itself.
const client_ids = [
  "UCOY390lYDxgj5rU8EeXRtN6EP005k7V", // sso dashboard prod
  "2KNOUCxN8AFnGGjDCGtqiDIzq8MKXi2h", // sso dashboard allizom
];

describe("onExecutePostLogin", () => {
  it("should be defined", () => {
    expect(onExecutePostLogin).toBeDefined();
  });

  it("should execute without throwing", async () => {
    await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
  });
});

describe("Ensure multiple clientID coverage", () => {
  test.each(client_ids)(
    "given client_id %s, expect event.idToken.updated_at is an int",
    async (client_id) => {
      _event.client.client_id = client_id;

      await onExecutePostLogin(_event, api);

      // Expect api.multifactor.enable to have been called
      expect(api.idToken.setCustomClaim).toHaveBeenCalled();

      expect(Number.isInteger(_idToken.updated_at)).toBeTruthy();
      expect(api.idToken.setCustomClaim).toHaveBeenCalledWith(
        "updated_at",
        1725218182
      );
    }
  );
});

describe("Ensure Rule is not applied", () => {
  test("Ensure Rule does not apply when clientID is not covered", async () => {
    await onExecutePostLogin(_event, api);

    // Expect api.multifactor.enable to have not been called
    const isIntegerString = (str) => /^-?\d+$/.test(str);
    expect(isIntegerString(_idToken.updated_at)).toBe(true);
    expect(api.idToken.setCustomClaim).not.toHaveBeenCalled();
  });
});
