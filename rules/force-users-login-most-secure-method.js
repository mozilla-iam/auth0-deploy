function (user, context, callback) {
var WHITELIST = ['HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH', // mozillians.org account verification
                   'nV1rnMMkB4uX9IewNOCitqy8NoyXVHlM', // air.mozilla.org
                   'w5mW5ZufRCWg6metsZ7hMckSH5s3b1Cq', // air.allizom.org
                   't9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1', // https://web-mozillians-staging.production.paas.mozilla.community Verification client
                   'jijaIzcZmFCDRtV74scMb9lI87MtYNTA', // mozillians.org Verification Client
                   '1db5KNoLN5rLZukvLouWwVouPkbztyso', // login.taskcluster.net
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
  var matchOrder = {'ad': 0,
                    'github': 1,
                    'firefoxaccounts': 1,
                    'google-oauth2': 2,
                    'email': 3
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
          var provider = targetUser.identities[0].provider;
          var previous_provider = selected_user.identities[0].provider;
          if (matchOrder[provider] < matchOrder[previous_provider]) {
            selected_user = targetUser;
          }
          console.log(targetUser.user_id+'is of match order '+matchOrder[provider]+'. Selecting: '+selected_user.user_id);
        }
        cb();
      }, function(err) {
        if (err) {
          callback(err, user, context);
        } else { // No error, but loop ended
          console.log('User profile that may log in is: '+selected_user.user_id+' initial login attempt was with: '+user.user_id);
          if (user.user_id !== selected_user.user_id) {
            var code = 'incorrectaccount';
            return callback(null, user, global.postError(code, context, selected_user.identities[0].connection));
          }
        }
        callback(null, user, context);
      });
    } else {
      callback(null, user, context);
    }
  });
}
