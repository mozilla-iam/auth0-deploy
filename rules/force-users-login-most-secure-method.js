function (user, context, callback) {
  var WHITELIST = ['HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH' // mozillians.org account verification
             ];

  if (!user.email_verified) {
    var reason = 'You primary email is not verified. Please contact EUS.';
    context.redirect = {
     url: "https://sso.mozilla.com/forbidden?reason="+encodeURIComponent(reason)
    };
    console.log('Primary email not verified');
    return callback(null, user, context);
  }

  if (context.connectionStrategy === 'ad') {
    // this is the highest level of account, always let in
    console.log('ad account passthru');
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
      console.log('ad account via google-oauth2 passthru');
      return callback(null, user, context);
    }
  }

  // Query all users to find matches for everything else...
  var request = require('request@2.56.0');
  var userApiUrl = auth0.baseUrl + '/users';

  // Lower is better
  var matchOrder = {'ad': 0,
                    'github': 1,
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
          console.log(targetUser.user_id+' is of match order '+matchOrder[provider]+'. Selecting: '+selected_user.user_id);
        }
        cb();
      }, function(err) {
        if (err) {
          callback(err, user, context);
        } else { // No error, but loop ended
          console.log('User profile that may log in is: '+selected_user.user_id+' initial login attempt was with: '+user.user_id);
            if (user.user_id !== selected_user.user_id) {
              var reason = 'Sorry - you may not login with that user account. Please always' +
                  ' use your '+selected_user.identities[0].connection+' account instead.';
              context.redirect = {
                url: "https://sso.mozilla.com/forbidden?reason="+encodeURIComponent(reason)+'&redirect_uri='+context.request.query.redirect_uri
              };
            }
        }
        callback(null, user, context);
      });
    } else {
      callback(null, user, context);
    }
  });
}
