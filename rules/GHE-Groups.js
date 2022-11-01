function (user, context, callback) {

  // dictionary of applications and their related mozillians groups to worry about

  // THIS IS THE DEV SITE AND GHE MAPPINGS FOR PROD WON'T WORK IN DEV
  const applicationGroupMapping = {
    '9MR2UMAftbs6758Rmbs8yZ9Dj5AjeT0P': 'mozilliansorg_ghe_ghe-auth-dev_users',
  };

  // array of mozillians groups that have unrestricted access to all GHE orgs [SE-2845]
  // NOTE: admins will only have access to groups listed in the mapping table above
  const allAccessAdminsGroupList = [
    'ghe_admins',
    'ghe_security-managers',
  ];

  const fetch = require('node-fetch@2.6.0');
  const AUTH0_TIMEOUT = 5000;  // milliseconds
  const PERSONAPI_BEARER_TOKEN_REFRESH_AGE = 64770;  // 18 hours - 30 seconds for refresh timeout allowance
  const PERSONAPI_TIMEOUT = 5000;  // milliseconds
  const USER_ID = context.primaryUser || user.user_id;
  const getBearerToken = async () => {
    // if we have the bearer token stored, we don't need to fetch it again
   if (global.personapi_bearer_token &&
        global.personapi_bearer_token_creation_time &&
        Date.now() - global.personapi_bearer_token_creation_time < PERSONAPI_BEARER_TOKEN_REFRESH_AGE) {
      return global.personapi_bearer_token;
   }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: AUTH0_TIMEOUT,
      body: JSON.stringify({
        audience: configuration.personapi_audience,
        client_id: configuration.personapi_read_profile_api_client_id,
        client_secret: configuration.personapi_read_profile_api_secret,
        grant_type: 'client_credentials',
      })
    };

    try {
      console.log("the personapi_oauth_url is: " + configuration.personapi_oauth_url);
      console.log("the personapi audience is: " + configuration.personapi_audience);
      console.log("the personapi client_id is: " + configuration.personapi_read_profile_api_client_id);
      const response = await fetch(configuration.personapi_oauth_url, options);
      const data = await response.json();
      console.log("the access token from the personapi oauth url is: " + data.access_token);
      // store the bearer token in the global object, so it's not constantly retrieved
      global.personapi_bearer_token = data.access_token;
      global.personapi_bearer_token_creation_time = Date.now();

      //console.log(`Successfully retrieved bearer token from Auth0`);
      return global.personapi_bearer_token;
    } catch (error) {
      throw Error(`Unable to retrieve bearer token from Auth0: ${error.message}`);
    }
  };


const getPersonProfile = async () => {
    // Retrieve a bearer token to gain access to the person api
    // return the profile data
    const bearer = await getBearerToken();
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearer}`,
      },
      timeout: PERSONAPI_TIMEOUT,
    };

    const url = `${configuration.personapi_url}/v2/user/user_id/${encodeURI(USER_ID)}`;
    console.log(`Fetching person profile of ${USER_ID}`);
    console.log("url is " + url);
    const response = await fetch(url, options);
    return await response.json();
};

  
  // We only care about SSO applications that exist in the applicationGroupMapping
  // If the SSO ID is undefined in applicationGroupMapping, skip processing and return callback()

  if(applicationGroupMapping[context.clientID] !== undefined) {
        console.log("group found: " + context.clientID);

        // the code assumes this has a value, so if it doesn't, everyone gets access, which isn't okay.
        console.log("configuration.github_enterprise_wiki_url: " + configuration.github_enterprise_wiki_url);

        if(configuration.github_enterprise_wiki_url === undefined) {
          // halt and redirect to a guaranteed-invalid hostname, to display a useful error to the end-user.
          console.log('Auth0 rules configuration param github_enterprise_wiki_url is not set');
          context.redirect = { url: 'http://auth0-ghe-misconfiguration-detected-please-contact-admins./' };
          return callback(null, user, context);
        }

        getPersonProfile().then(profile => {
          let githubUsername = null;
          // Get githubUsername from person api, otherwise we'll redirect
          try {
            githubUsername = profile.usernames.values['HACK#GITHUB'];
            // Explicitely setting githubUsername to null if undefined
            if(githubUsername === undefined) {
              console.log("githubUsername is undefined");
              githubUsername = null;
            }
            // If somehow dinopark allows a user to store an empty value
            // Let's set to null to be redirected later
            if(githubUsername.length === 0) { 
              console.log("empty HACK#GITHUB");
              githubUsername = null;
            }
          } catch (e) {
            console.log("Unable to do the githubUsername lookup: " + e.message);
          }
          console.log("githubUsername: " + githubUsername);

          // confirm the user has a githubUsername stored in mozillians, otherwise redirect
          if(githubUsername === null) {
            // no githubUsername means unable to login, so deny them access.
            console.log("githubUsername is null");
            context.redirect = {
               url: configuration.github_enterprise_wiki_url
            };
          } else {
            // Is the user is a member of an all-access admin group?
            if(user.app_metadata.groups.some(group => allAccessAdminsGroupList.includes(group))) {
              // They are, so grant them access by skipping the normal group membership checks.
              console.log("GHE admin access granted for " + githubUsername);
            } else {
              // Confirm the user has the group defined from mozillians matching the application id
              if(!user.app_metadata.groups.includes(applicationGroupMapping[context.clientID])) {
                // They do not, so deny them access.
                context.redirect = {
                   url: configuration.github_enterprise_wiki_url
                };
              }
            }
          }

          // if we set context.redirect above, SSO will be cancelled with an HTTP redirect to the URL set above.
          // if we do not, authentication is allowed to complete and the session is approved for GHE org access.
          return callback(null, user, context);
        });

  // Nothing matched, return callback() and proceed rules processing
  } else {
    return callback(null, user, context);
  }
}
