// Required Libraries
const fetch = require('node-fetch');

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running action:", "gheGroups");

  // Object of applications with a 1:1 mapping of clientID and related group
  const applicationGroupMapping = {
  // Dev applications
    '9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P': 'mozilliansorg_ghe_ghe-auth-dev_users',

  // Prod applications
    'RzaIwPS6wfABGLrhnCmWdzlCLoKXUY84': 'mozilliansorg_ghe_mozilla-actions_users',
    'EnEylt4OZW6i7yCWzZmCxyCxDRp6lOY0': 'mozilliansorg_ghe_saml-test-integrations_users',
    '2MVzcGFtl2rbdEx97rpC98urD6ZMqUcf': 'mozilliansorg_ghe_mozilla-it_users',
    'Cc2xFG6xS5O8UKoSzoJ4eNggo6jHnzDU': 'mozilliansorg_ghe_mozilla-games_users',
    '8lXCX2EGQNLixvBqONK3ceCVY2ppYiU6': 'mozilliansorg_ghe_mozilla-jetpack_users',
    'kkVlkyyJjjhONdxjiB4963i4cka6VBSh': 'mozilliansorg_ghe_mozilla-twqa_users',
    'nzV38DSEECYNl9toBfbVvVqXG04d2DaR': 'mozilliansorg_ghe_fxos_users',
    'RXTiiTCJ8wCCHklJuU9NxB1gK3GpFL4J': 'mozilliansorg_ghe_fxos-eng_users',
    '2mw77kvVsYBwlvZFay45S0e7dJ9Cd6z5': 'mozilliansorg_ghe_mozilla-b2g_users',
    'XBQy3ijpDhqnE9PQLd9fvO85o8NNroFH': 'mozilliansorg_ghe_mozilla-tw_users',
    'pFmfC1JoiDB9DZcrqX5GpiUM0IpDwIi5': 'mozilliansorg_ghe_mozillawiki_users',
    'F7KEqlRIgdC5yUAAq0zm4voJZFk9IlS4': 'mozilliansorg_ghe_mozilla-outreachy-datascience_users',
    'lhAIAsdx3jSOiKe1LoHmB0zEsUrCbfhI': 'mozilliansorg_ghe_moco-ghe-admin_users',
    'f1MpcTzYA8J06nUUdO5LuhhA7b4JZVJi': 'mozilliansorg_ghe_mozilla_users',
    's0v1r2d34lTqPtQu0jBVOKbWOKK4i1TU': 'mozilliansorg_ghe_mozmeao_users',
    '5GfQ2AMXMqibOsatSYTKh3dVSioVPhGA': 'mozilliansorg_ghe_mozrelops_users',
    'k2dBGcFJAhzlqOuSZH5nQhyq6L87jVaT': 'mozilliansorg_ghe_mozilla-svcops_users',
    'oU3JDtWZSeeBuUcJ0dfLKXU1S2tnTg0K': 'mozilliansorg_ghe_mozilla-applied-ml_users',
    'NyrIlf4H3ZYtMUfJLs6UmUwllOpfo23v': 'mozilliansorg_ghe_mozilla-iam_users',
    'TeSutPsFGcieGEIl30pL35lrZ4HDEim0': 'mozilliansorg_ghe_devtools-html_users',
    'HPl9z5rJS6mjRUNqkcr2avRZvnnXW1nI': 'mozilliansorg_ghe_mozilla-archive_users',
    '3agx8byruE6opXpzoAaJl1rvlS6JA8Ly': 'mozilliansorg_ghe_mozilla-commons_users',
    'Vyg4xo7d0ECLHaLD1DnLl1MYmziqv1SP': 'mozilliansorg_ghe_mozilla-lockbox_users',
    'npLk8377ceFcsXp5SIEJYwBqoXUn1zeu': 'mozilliansorg_ghe_mozilla-private_users',
    'qBv5vlRW7fNiIRIiuSjjZtoulwlUwo6L': 'mozilliansorg_ghe_mozilladpx_users',
    '4Op3cF3IvEHBGpD6gIFHHUlAXFGLiZWq': 'mozilliansorg_ghe_mozilla-frontend-infra_users',
    'IYfS3mWjTOnCX5YJ6mMWlBWEJyAwUAZm': 'mozilliansorg_ghe_mozilla-bteam_users',
    'tflU5Bd4CAzzlJzgDPT25Ks2CNADkuhZ': 'mozilliansorg_ghe_mozilla-conduit_users',
    'HHb263N55HitFj5bBVFanv2AnF6E6bGf': 'mozilliansorg_ghe_mozilla-sre-deploy_users',
    'bPCduBPyVFSxPEEdpG3dMdoiHXuj26Kr': 'mozilliansorg_ghe_firefox-devtools_users',
    'fqzPu0Hg17Vgx90JcWh1nWcV8TN4WkXa': 'mozilliansorg_ghe_iodide-project_users',
    'AcnyB9st2RTC6JfqizCSdaMlzBC7notV': 'mozilliansorg_ghe_mozilla-l10n_users',
    'fdGht0OM5DNTYPTWENtEhrXdGP6zmH9L': 'mozilliansorg_ghe_mozilla-lockwise_users',
    'aKU0bzGLTVv53jDokaUDwNUyNfZxgT4R': 'mozilliansorg_ghe_mozilla-spidermonkey_users',
    'Oy6exOuOGejAqExc8fZnSGdJA9t4njnG': 'mozilliansorg_ghe_mozillareality_users',
    '3iAAhN0vAavOHIzCqnaFKo9Mlqb9pBLH': 'mozilliansorg_ghe_mozillasecurity_users',
    'Qb2ZWerstBXCn5yCXQYU7vUfLuaZ1dMB': 'mozilliansorg_ghe_nss-dev_users',
    'A5hvTaSHqMyrCVMypE3TNhW4VXQzM63d': 'mozilliansorg_ghe_nubisproject_users',
    'VStrUcaxLXH9xQEEFX9Vkf0D5pRo5c6C': 'mozilliansorg_ghe_projectfluent_users',
    'WKOfTFaGTV10YKzfkMOyAl3bgi3BPFMc': 'mozilliansorg_ghe_taskcluster_users',
    '8Zhm4W07m9OSBlwN2h9FtQorFs6WgbQ8': 'mozilliansorg_ghe_mozilla-mobile_users',
    'vJG7CGVQutdCWpMGO9pkC5Vn4vgJzJ3I': 'mozilliansorg_ghe_mozilla-ocho_users',
    'dlDfXM5oqapRXUvrkCarPwgTN2INIA9G': 'mozilliansorg_ghe_mozilla-metrics_users',
    'lJbj6OE9VFK05i2XjZEiAEljamPyOCkz': 'mozilliansorg_ghe_mozilla-platform-ops_users',
    'AgiLB9xCoW4beavY9z7UuvO36DLmdwJ1': 'mozilliansorg_ghe_mozilla-rally_users',
    'QfJVAjXlaGzpCo5S48J9D38QvIfhlYzF': 'mozilliansorg_ghe_mozilladatascience_users',
    'UwUgLsXH6YtrWLATQpTuil2iNilYGGhF': 'mozilliansorg_ghe_mozilla-services_users',
    'RLPUxhCQsmmRHyOmDOGkLpu1mArNH3xn': 'mozilliansorg_ghe_firefoxux_users',
    'KMcYzqySOFXHteY1zliDlq577ARCb6gi': 'mozilliansorg_ghe_mozillasocial_users',
    'IEc83wZvZzcQXMkpUmrnb9P8wztUiokl': 'mozilliansorg_ghe_mozscout_users',
    'vkoDkHlCEUhlHNhVDtewJqRLVLGVsPrZ': 'mozilliansorg_ghe_mozilla-fakespot_users',
    'T6mjvGguOB5hkq9Aviaa58tOlwpJG5o6': 'mozilliansorg_ghe_mozilla-necko_users',
    'ZemrAl9S2q9GKJNQUdjZCNsLiVmSEg1P': 'mozilliansorg_ghe_mozilla-privacy_users',
    'sZHTTA4iuHgmiQGzbkS7lcXE1bbMGces': 'mozilliansorg_ghe_firefoxgraphics_users'
  };

  // ClientID isn't mapped here, return callback() and proceed rules processing
  if (applicationGroupMapping[event.client.client_id] === undefined) {
    console.log("Not mapped");
    return;
  }

  // Consts
  const AUTH0_TIMEOUT = 5000;  // milliseconds
  const PERSONAPI_BEARER_TOKEN_REFRESH_AGE = 64770;  // 18 hours - 30 seconds for refresh timeout allowance
  const PERSONAPI_TIMEOUT = 5000;  // milliseconds
  const USER_ID = event.user.user_id;

  // Get a bearer token in order to access the person api
  const getBearerToken = async () => {

    const cachedBearerToken = api.cache.get("personapi_bearer_token");
    const cachedBearerTokenCreationTime = api.cache.get("personapi_bearer_token_creation_time");
    // If we have the bearer token stored, we don't need to fetch it again
    if ( cachedBearerToken?.value && cachedBearerTokenCreationTime?.value ) {
      if (Date.now() - Number(cachedBearerTokenCreationTime.value) < PERSONAPI_BEARER_TOKEN_REFRESH_AGE) {
        console.log("Returning cached token", cachedBearerToken);
        return cachedBearerToken.value;
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: AUTH0_TIMEOUT,
      body: JSON.stringify({
        audience: event.secrets.personapi_audience,
        client_id: event.secrets.personapi_read_profile_api_client_id,
        client_secret: event.secrets.personapi_read_profile_api_secret,
        grant_type: 'client_credentials',
      })
    };

    try {
      const response = await fetch(event.secrets.personapi_oauth_url, options);
      if (!response.ok) {
        // Throw an error if the response status code is not in the 200-299 range
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // store the bearer token in the global object, so it's not constantly retrieved
      api.cache.set("personapi_bearer_token", data.access_token);
      api.cache.set("personapi_bearer_token_creation_time", String(Date.now()));

      console.log(`Successfully retrieved bearer token from Auth0`);
      return data.access_token;
    } catch (err) {
      throw Error(`Unable to retrieve bearer token from Auth0: ${err}`);
    }
  };


  const getPersonProfile = async (bearerToken) => {
    try {
      // Retrieve a bearer token to gain access to the person api
      // return the profile data
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
        timeout: PERSONAPI_TIMEOUT,
      };

      const url = `${event.secrets.personapi_url}/v2/user/user_id/${encodeURI(USER_ID)}`;
      console.log(`Fetching person profile of ${USER_ID}`);
      const response = await fetch(url, options);
        if (!response.ok) {
          // Throw an error if the response status code is not in the 200-299 range
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      return await response.json();
    } catch (error) {
      throw Error(`Unable to retrieve profile from Person API: ${error}`);
    }
  };

  const processProfile = (profile) => {

    // Create a new URL object
    const gheWikiUrl = new URL("https://wiki.mozilla.org/GitHub/SAML_issues");

    // Set the tenant searchParam
    gheWikiUrl.searchParams.set("auth", event.tenant.id);

    let errorCode;

    // Confirm the user has the group defined from mozillians matching the application id
    if(!event.user.app_metadata.groups?.includes(applicationGroupMapping[event.client.client_id])) {
      errorCode = "ghgr";
    } else {
      // Get githubUsername from person api, otherwise we'll redirect
      let githubUsername;

      try {
        githubUsername = profile.usernames.values['HACK#GITHUB'];
        // If profile does not hold key/value for githubUsername
        if(githubUsername === undefined) {
          console.log("githubUsername is undefined");
          errorCode = "ghnd";
        } else if (githubUsername.length === 0) {
          // If somehow dinopark allows a user to store an empty value
          console.log("empty HACK#GITHUB");
          errorCode = "ghnd";
        }
      } catch (err) {
        console.log("Unable to do the githubUsername lookup: " + err);
        errorCode = "ghul";
      }
    }

    // confirm the user has a githubUsername stored in mozillians, otherwise redirect
    if (errorCode) {
      // Set the search parameter error code
      gheWikiUrl.searchParams.set("dbg", errorCode);
      // Redirect the user
      api.redirect.sendUserTo(gheWikiUrl.href);
      return api.access.deny(`Access denied: See ${gheWikiUrl.href}`);
    }
    return;
  };

  // Main
  try {
    // Retrieve user's profiles
    const bearerToken = await getBearerToken();
    const userProfile = await getPersonProfile(bearerToken);
    return processProfile(userProfile);
  } catch (err) {
    console.error(err);
    return api.access.deny(err);
  }
}
