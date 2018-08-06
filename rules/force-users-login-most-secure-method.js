function (user, context, callback) {
var WHITELIST = ['HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH', // mozillians.org account verification
                   'nV1rnMMkB4uX9IewNOCitqy8NoyXVHlM', // air.mozilla.org
                   'w5mW5ZufRCWg6metsZ7hMckSH5s3b1Cq', // air.allizom.org
                   't9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1', // https://web-mozillians-staging.production.paas.mozilla.community Verification client
                   'jijaIzcZmFCDRtV74scMb9lI87MtYNTA', // mozillians.org Verification Client
                   '1db5KNoLN5rLZukvLouWwVouPkbztyso', // login.taskcluster.net
                   'pl6mWaOtBMeXzTY3fUw57ED80bVkrgU1', // Common Voice Dev
                  ];
  
  if (!user) {
    return callback(null, null, context);
  }
  
  
  if (!user.email_verified) {
    var code = 'primarynotverified';
    console.log('Primary email not verified');
    return callback(null, user, global.postError(code, context));
  }
  
  if (context.connectionStrategy === 'ad') {
    // this is the highest level of account, always let in
    console.log('User is allowed to login because this is an ad account');
    return callback(null, user, context);
  }
 
  try {
    if (WHITELIST.indexOf(context.clientID) >= 0) {
      console.log('Whitelisted client '+context.clientID+', no login enforcement taking place');
      return callback(null, user, context);
    }
  } catch (e) {
    console.log('Client not found while checking force-user-to-login-with-most-secure-method whitelist (non-fatal): '+e);
  }

  if (context.connectionStrategy === 'google-oauth2') {
    // this is == to 'ad' for us
    if (user.email.endsWith('mozilla.com') || user.email.endsWith('mozillafoundation.org')) {
      console.log('User is allowed to login because this is an ad account via google-oauth2 passthru');
      return callback(null, user, context);
    }
  }
  
  // Query all users to find matches for everything else...
  var request = require('request');
  var userApiUrl = auth0.baseUrl + '/users';
  
  // Lower is better
  var matchOrder = {'Mozilla-LDAP': 0,
                    'Mozilla-LDAP-Dev': 0,
                    'firefoxaccounts': 1,
                    'github': 2,
                    'google-oauth2': 3,
                    'email': 4
                   };

  request({
   url: userApiUrl,
   headers: {
     Authorization: 'Bearer ' + auth0.accessToken
   },
   qs: {
     search_engine: 'v2',
     q: 'email:"' + user.email+'"',
   }
  },
  function(err, response, body) {
    if (err) return callback(err);

    if (response.statusCode !== 200) return callback(new Error(body));

    var data = JSON.parse(body);
    if (data.length > 0) {
      // Initialize selected_user as current user
      var selected_user = user;
      async.each(data, function(targetUser, cb) {
        // Only list "not us" ;-)
        if (targetUser.user_id !== user.user_id) {
          // XXX This currently assumes single identity/no linked account /!\
          var connection = targetUser.identities[0].connection;
          var previous_connection = selected_user.identities[0].connection;

          // As we iterate through the search results, targetUser is the current result
          // If targetUser uses a more secure connection than the one the currently logged in user used
          // Change selected_user from being the currently logged in user to be this search result
          if (matchOrder[connection] < matchOrder[previous_connection]) {
            // TODO : Check for the presence of connection and previous_connection in matchOrder to protect against
            // an unexpected connection type

            // The user has logged in with a less secure connection than one they've previously logged in with
            selected_user = targetUser;
          }
          console.log(targetUser.user_id+'is of match order '+matchOrder[connection]+'. Selecting: '+selected_user.user_id);
        }
        cb();
      }, function(err) {
        if (err) {
          callback(err, user, context);
        } else { // No error, but loop ended
          console.log('User profile that may log in is: '+selected_user.user_id+' initial login attempt was with: '+user.user_id);
          if (user.user_id !== selected_user.user_id) {
            // A user profile was found in the search results that was of a more secure connection than what the user just logged in with
            var code = 'incorrectaccount';
            return callback(null, user, global.postError(code, context, selected_user.identities[0].connection));
          }
        }
        callback(null, user, context);
      });
    } else {
      // Search for this user returned no results. Should this never occur, or is this what happens when a user logs
      // in for the first time? If it's the former, a case that should never occur, shouldn't we fail the login
      // instead of allowing like we do here?
      callback(null, user, context);
    }
  });
}
