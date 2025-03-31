const _ = require("lodash");

const eventObj = require("./modules/event.json");
const { onExecutePostLogin } = require("../actions/gheGroups.js");

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

  // Cache object for api.cache get/set functions
  _cache = {};

  // Set event secrets
  _event.secrets = {
    accessKeyId: "fakefakefakefake",
    secretAccessKey: "fakefakefakefake",
    personapi_oauth_url: "https://auth.mozilla.auth0.com/oauth/token",
    personapi_client_id: "fakefakefakefake",
    personapi_client_secret: "fakefakefakefake",
    personapi_url: "https://person.api.dev.sso.allizom.org",
    personapi_audience: "api.dev.sso.allizom.org",
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
    cache: {
      get: jest.fn(),
      set: jest.fn(),
    },
  };

  // Mock api.cache.set
  api.cache.set.mockImplementation((key, value) => {
    _cache[key] = value;
  });

  // Mock api.cache.get
  api.cache.get.mockImplementation((key) => {
    return { value: _cache[key] };
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

  // Example api responses
  // personResp = { usernames: { values: { 'HACK#GITHUB': 'jdoegithub' }}};
  // tokenResp = { access_token: "faketoken" };

  // Fetch mockImplemenation depending on the URL passed to fetch
  fetchRespCallback = (url) => {
    // https://person.api.dev.sso.allizom.org/v2/user/user_id/${encodeURI(USER_ID)}
    const encodedUserId = encodeURI(_event.user.user_id);
    if (
      url.startsWith(
        `https://person.api.dev.sso.allizom.org/v2/user/user_id/${encodedUserId}`
      )
    ) {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue(personResp),
        ok: personResponseStatusOk,
        status: personResponseStatusCode,
      });
      // https://auth.mozilla.auth0.com/oauth/token
    } else if (url === "https://auth.mozilla.auth0.com/oauth/token") {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue(tokenResp),
        ok: tokenResponseStatusOk,
        status: tokenResponseStatusCode,
      });
      // Default response for URLs that aren't matched
    } else {
      return Promise.resolve({
        json: jest.fn().mockResolvedValue({ error: "Unknown URL" }),
        ok: false,
        status: 404,
      });
    }
  };
  fetchSpy = jest.spyOn(global, "fetch").mockImplementation(fetchRespCallback);
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  fetchSpy.mockRestore();
});

const applicationGroupMapping = {
  // Dev applications
  "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P": "mozilliansorg_ghe_ghe-auth-dev_users",

  // Prod applications
  RzaIwPS6wfABGLrhnCmWdzlCLoKXUY84: "mozilliansorg_ghe_mozilla-actions_users",
  EnEylt4OZW6i7yCWzZmCxyCxDRp6lOY0:
    "mozilliansorg_ghe_saml-test-integrations_users",
  "2MVzcGFtl2rbdEx97rpC98urD6ZMqUcf": "mozilliansorg_ghe_mozilla-it_users",
  Cc2xFG6xS5O8UKoSzoJ4eNggo6jHnzDU: "mozilliansorg_ghe_mozilla-games_users",
  "8lXCX2EGQNLixvBqONK3ceCVY2ppYiU6": "mozilliansorg_ghe_mozilla-jetpack_users",
  kkVlkyyJjjhONdxjiB4963i4cka6VBSh: "mozilliansorg_ghe_mozilla-twqa_users",
  nzV38DSEECYNl9toBfbVvVqXG04d2DaR: "mozilliansorg_ghe_fxos_users",
  RXTiiTCJ8wCCHklJuU9NxB1gK3GpFL4J: "mozilliansorg_ghe_fxos-eng_users",
  "2mw77kvVsYBwlvZFay45S0e7dJ9Cd6z5": "mozilliansorg_ghe_mozilla-b2g_users",
  XBQy3ijpDhqnE9PQLd9fvO85o8NNroFH: "mozilliansorg_ghe_mozilla-tw_users",
  pFmfC1JoiDB9DZcrqX5GpiUM0IpDwIi5: "mozilliansorg_ghe_mozillawiki_users",
  F7KEqlRIgdC5yUAAq0zm4voJZFk9IlS4:
    "mozilliansorg_ghe_mozilla-outreachy-datascience_users",
  lhAIAsdx3jSOiKe1LoHmB0zEsUrCbfhI: "mozilliansorg_ghe_moco-ghe-admin_users",
  f1MpcTzYA8J06nUUdO5LuhhA7b4JZVJi: "mozilliansorg_ghe_mozilla_users",
  s0v1r2d34lTqPtQu0jBVOKbWOKK4i1TU: "mozilliansorg_ghe_mozmeao_users",
  "5GfQ2AMXMqibOsatSYTKh3dVSioVPhGA": "mozilliansorg_ghe_mozrelops_users",
  k2dBGcFJAhzlqOuSZH5nQhyq6L87jVaT: "mozilliansorg_ghe_mozilla-svcops_users",
  oU3JDtWZSeeBuUcJ0dfLKXU1S2tnTg0K:
    "mozilliansorg_ghe_mozilla-applied-ml_users",
  NyrIlf4H3ZYtMUfJLs6UmUwllOpfo23v: "mozilliansorg_ghe_mozilla-iam_users",
  TeSutPsFGcieGEIl30pL35lrZ4HDEim0: "mozilliansorg_ghe_devtools-html_users",
  HPl9z5rJS6mjRUNqkcr2avRZvnnXW1nI: "mozilliansorg_ghe_mozilla-archive_users",
  "3agx8byruE6opXpzoAaJl1rvlS6JA8Ly": "mozilliansorg_ghe_mozilla-commons_users",
  Vyg4xo7d0ECLHaLD1DnLl1MYmziqv1SP: "mozilliansorg_ghe_mozilla-lockbox_users",
  npLk8377ceFcsXp5SIEJYwBqoXUn1zeu: "mozilliansorg_ghe_mozilla-private_users",
  qBv5vlRW7fNiIRIiuSjjZtoulwlUwo6L: "mozilliansorg_ghe_mozilladpx_users",
  "4Op3cF3IvEHBGpD6gIFHHUlAXFGLiZWq":
    "mozilliansorg_ghe_mozilla-frontend-infra_users",
  IYfS3mWjTOnCX5YJ6mMWlBWEJyAwUAZm: "mozilliansorg_ghe_mozilla-bteam_users",
  tflU5Bd4CAzzlJzgDPT25Ks2CNADkuhZ: "mozilliansorg_ghe_mozilla-conduit_users",
  HHb263N55HitFj5bBVFanv2AnF6E6bGf:
    "mozilliansorg_ghe_mozilla-sre-deploy_users",
  bPCduBPyVFSxPEEdpG3dMdoiHXuj26Kr: "mozilliansorg_ghe_firefox-devtools_users",
  fqzPu0Hg17Vgx90JcWh1nWcV8TN4WkXa: "mozilliansorg_ghe_iodide-project_users",
  AcnyB9st2RTC6JfqizCSdaMlzBC7notV: "mozilliansorg_ghe_mozilla-l10n_users",
  fdGht0OM5DNTYPTWENtEhrXdGP6zmH9L: "mozilliansorg_ghe_mozilla-lockwise_users",
  aKU0bzGLTVv53jDokaUDwNUyNfZxgT4R:
    "mozilliansorg_ghe_mozilla-spidermonkey_users",
  Oy6exOuOGejAqExc8fZnSGdJA9t4njnG: "mozilliansorg_ghe_mozillareality_users",
  "3iAAhN0vAavOHIzCqnaFKo9Mlqb9pBLH": "mozilliansorg_ghe_mozillasecurity_users",
  Qb2ZWerstBXCn5yCXQYU7vUfLuaZ1dMB: "mozilliansorg_ghe_nss-dev_users",
  A5hvTaSHqMyrCVMypE3TNhW4VXQzM63d: "mozilliansorg_ghe_nubisproject_users",
  VStrUcaxLXH9xQEEFX9Vkf0D5pRo5c6C: "mozilliansorg_ghe_projectfluent_users",
  WKOfTFaGTV10YKzfkMOyAl3bgi3BPFMc: "mozilliansorg_ghe_taskcluster_users",
  "8Zhm4W07m9OSBlwN2h9FtQorFs6WgbQ8": "mozilliansorg_ghe_mozilla-mobile_users",
  vJG7CGVQutdCWpMGO9pkC5Vn4vgJzJ3I: "mozilliansorg_ghe_mozilla-ocho_users",
  dlDfXM5oqapRXUvrkCarPwgTN2INIA9G: "mozilliansorg_ghe_mozilla-metrics_users",
  lJbj6OE9VFK05i2XjZEiAEljamPyOCkz:
    "mozilliansorg_ghe_mozilla-platform-ops_users",
  AgiLB9xCoW4beavY9z7UuvO36DLmdwJ1: "mozilliansorg_ghe_mozilla-rally_users",
  QfJVAjXlaGzpCo5S48J9D38QvIfhlYzF:
    "mozilliansorg_ghe_mozilladatascience_users",
  UwUgLsXH6YtrWLATQpTuil2iNilYGGhF: "mozilliansorg_ghe_mozilla-services_users",
  RLPUxhCQsmmRHyOmDOGkLpu1mArNH3xn: "mozilliansorg_ghe_firefoxux_users",
  KMcYzqySOFXHteY1zliDlq577ARCb6gi: "mozilliansorg_ghe_mozillasocial_users",
  IEc83wZvZzcQXMkpUmrnb9P8wztUiokl: "mozilliansorg_ghe_mozscout_users",
  vkoDkHlCEUhlHNhVDtewJqRLVLGVsPrZ: "mozilliansorg_ghe_mozilla-fakespot_users",
  T6mjvGguOB5hkq9Aviaa58tOlwpJG5o6: "mozilliansorg_ghe_mozilla-necko_users",
  ZemrAl9S2q9GKJNQUdjZCNsLiVmSEg1P: "mozilliansorg_ghe_mozilla-privacy_users",
  sZHTTA4iuHgmiQGzbkS7lcXE1bbMGces: "mozilliansorg_ghe_firefoxgraphics_users",
};

const applicationGroupEntries = Object.entries(applicationGroupMapping);

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});

test("Client ID is not a member of applicationGroupMapping", async () => {
  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);
  // Expect Fetch to have been called
  expect(fetch).not.toHaveBeenCalled();
});

test("Failed to get bearer token; expect error", async () => {
  // Set token fetch responses
  tokenResp = {};
  tokenResponseStatusOk = false;
  tokenResponseStatusCode = 403;

  // Set client_id to a ghe client
  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect Fetch to have been called
  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedErrorLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString =
    "Error: Unable to retrieve bearer token from Auth0: Error: HTTP error! status: 403";
  expect(
    combinedErrorLogs.some((element) => element.includes(searchString))
  ).toBe(true);

  // Expect no Errors to be raised outside of onExecutePostLogin
  await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
});

test("Failed to get person api profile; expect error", async () => {
  // Set token and person fetch responses
  tokenResp = { access_token: "faketoken" };
  personResp = undefined;
  personResponseStatusOk = false;
  personResponseStatusCode = 403;

  // Set client_id to a ghe client
  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedErrorLogs = combineLog(consoleErrorSpy.mock.calls);
  const searchString =
    "Error: Unable to retrieve profile from Person API: Error: HTTP error! status: 403";
  expect(
    combinedErrorLogs.some((element) => element.includes(searchString))
  ).toBe(true);
});

test("User not in proper group; expect redirect", async () => {
  // Set token and person fetch responses
  personResp = { usernames: { values: { "HACK#GITHUB": "jdoegithub" } } };
  tokenResp = { access_token: "faketoken" };

  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toEqual(
    "https://wiki.mozilla.org/GitHub/SAML_issues?auth=dev&dbg=ghgr"
  );
  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();
});

test("Users github username is undefined; expect redirect", async () => {
  // Set token and person fetch responses
  personResp = { usernames: { values: { "HACK#GITHUB": undefined } } };
  tokenResp = { access_token: "faketoken" };

  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";
  _event.user.app_metadata.groups = [];
  _event.user.app_metadata.groups.push("mozilliansorg_ghe_ghe-auth-dev_users");

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toEqual(
    "https://wiki.mozilla.org/GitHub/SAML_issues?auth=dev&dbg=ghnd"
  );
  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const searchString = "githubUsername is undefined";
  expect(combinedLogs.some((element) => element.includes(searchString))).toBe(
    true
  );
});

test("Users github username is empty string; expect redirect", async () => {
  // Set token and person fetch responses
  personResp = { usernames: { values: { "HACK#GITHUB": "" } } };
  tokenResp = { access_token: "faketoken" };

  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";
  _event.user.app_metadata.groups = [];
  _event.user.app_metadata.groups.push("mozilliansorg_ghe_ghe-auth-dev_users");

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toEqual(
    "https://wiki.mozilla.org/GitHub/SAML_issues?auth=dev&dbg=ghnd"
  );
  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const searchString = "empty HACK#GITHUB";
  expect(combinedLogs.some((element) => element.includes(searchString))).toBe(
    true
  );
});

test("Failed to find users github username; expect redirect", async () => {
  // Set token and person fetch responses
  personResp = {};
  tokenResp = { access_token: "faketoken" };

  _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";
  _event.user.app_metadata.groups = [];
  _event.user.app_metadata.groups.push("mozilliansorg_ghe_ghe-auth-dev_users");

  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  expect(_event.transaction.redirect_uri).toEqual(
    "https://wiki.mozilla.org/GitHub/SAML_issues?auth=dev&dbg=ghul"
  );
  expect(fetch).toHaveBeenCalled();
  expect(api.access.deny).toHaveBeenCalled();

  // Collect console logs and expect searchString to exist in logs
  const combinedLogs = combineLog(consoleLogSpy.mock.calls);
  const searchString = "Unable to do the githubUsername lookup:";
  expect(combinedLogs.some((element) => element.startsWith(searchString))).toBe(
    true
  );
});

test.each(applicationGroupEntries)(
  "Given client is %s, group is %s and users github username lookup succeeds; expect no redirection",
  async (clientID, group) => {
    // Set token and person fetch responses
    personResp = { usernames: { values: { "HACK#GITHUB": "jdoegithub" } } };
    tokenResp = { access_token: "faketoken" };

    _event.client.client_id = "9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P";
    _event.user.app_metadata.groups = [];
    _event.user.app_metadata.groups.push(
      "mozilliansorg_ghe_ghe-auth-dev_users"
    );

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(_event.transaction.redirect_uri).toBe(undefined);
    expect(fetch).toHaveBeenCalled();
    expect(api.access.deny).not.toHaveBeenCalled();
  }
);
