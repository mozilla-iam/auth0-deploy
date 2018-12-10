/**
 * @title Link Accounts with Same Email Address while Merging Metadata
 * @overview Link any accounts that have the same email address while merging metadata.
 * @gallery true
 * @category access control
 *
 * This rule will link any accounts that have the same email address while merging metadata.
 * Source/Original: https://github.com/auth0/rules/blob/master/src/rules/link-users-by-email-with-metadata.js
 *
 */

function (user, context, callback) {
  const request = require('request');

  // Check if email is verified, we shouldn't automatically
  // merge accounts if this is not the case.
  if (!user.email || !user.email_verified) {
    return callback(null, user, context);
  }

  const userApiUrl = auth0.baseUrl + '/users';
  const userSearchApiUrl = auth0.baseUrl + '/users-by-email';

  request({
   url: userSearchApiUrl,
   headers: {
     Authorization: 'Bearer ' + auth0.accessToken
   },
   qs: {
     email: user.email
   }
  },
  function (err, response, body) {
    if (err) return callback(err);
    if (response.statusCode !== 200) return callback(new Error(body));

    var data = JSON.parse(body);
    // Ignore non-verified users and current user, if present
    data = data.filter(function (u) {
      return u.email_verified && (u.user_id !== user.user_id);
    });

//    if (data.length > 1) {
      // We already have  more than one match, so we need to decide which account is going to be main
      // This code is only triggered by accounts that were present before automatic linking was enabled
      
//    }
    if (data.length === 0) {
      // Already linked or no matching email found, continue with login
      return callback(null, user, context);
    }

    const originalUser = data[0];
    const provider = user.identities[0].provider;
    const providerUserId = user.identities[0].user_id;
    
    console.log("Performing automatic profile linking: main profile: "+originalUser.user_id+" is now also main for: "+user.user_id);

    user.app_metadata = user.app_metadata || {};
    user.user_metadata = user.user_metadata || {};
    auth0.users.updateAppMetadata(originalUser.user_id, user.app_metadata)
    .then(auth0.users.updateUserMetadata(originalUser.user_id, user.user_metadata))
    .then(function() {
      request.post({
        url: userApiUrl + '/' + originalUser.user_id + '/identities',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken
        },
        json: { provider: provider, user_id: String(providerUserId) }
      }, function (err, response, body) {
          if (response && response.statusCode >= 400) {
            console.log("Error linking account: " + response.statusMessage);
            return callback(new Error('Error linking account: ' + response.statusMessage));
          }
          context.primaryUser = originalUser.user_id;
          callback(null, user, context);
      });
    })
    .catch(function (err) {
      callback(err);
    });
  });
}
