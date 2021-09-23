function (user, context, callback) {
  // dictionary of applications and their related mozillians groups to worry about

  const applicationGroupMapping = {
    'EnEylt4OZW6i7yCWzZmCxyCxDRp6lOY0': 'mozilliansorg_ghe_saml-test-integrations_users',
  };

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
      //console.log(configuration.personapi_oauth_url);
      const response = await fetch(configuration.personapi_oauth_url, options);
      const data = await response.json();
      // store the bearer token in the global object, so it's not constantly retrieved
      global.personapi_bearer_token = data.access_token;
      global.personapi_bearer_token_creation_time = Date.now();

      console.log(`Successfully retrieved bearer token from Auth0`);
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
    //console.log(`Fetching person profile of ${USER_ID}`);
    //console.log("url is " + url);
    const response = await fetch(url, options);
    return await response.json();
};

  
  // We only care about SSO applications that exist in the applicationGroupMapping
  // If the SSO ID is undefined in applicationGroupMapping, skip processing and return callback()

  if(applicationGroupMapping[context.clientID] !== undefined) {
        getPersonProfile().then(profile => {
          let githubUsername = null;
          // Get githubUsername from person api, otherwise we'll redirect
          try {
            githubUsername = profile.usernames.values['HACK#GITHUB'];
            if(githubUsername === undefined) {
              githubUsername = null;
            }
            // If somehow dinopark allows a user to store an empty value
            // Let's set to null to be redirected later
            if(githubUsername.length === 0) { 
              console.log("empty HACK#GITHUB");
              githubUsername = null;
            }
            //console.log("githubUsername: " +  githubUsername);
          } catch (e) {
            // Unable to do the githubUsername lookup
          }
          
          // Confirm the user has the group defined from mozillians matching the application id
          // confirm the user has a githubUsername stored in mozillians, otherwise redirect
          if(!user.app_metadata.groups.includes(applicationGroupMapping[context.clientID]) || githubUsername === null) {
            context.redirect = {
               url: configuration.github_enterprise_wiki_url
             };
          }
          return callback(null, user, context);
        });

  // Nothing matched, return callback() and proceed rules processing
  } else {
    return callback(null, user, context);
  }
}
