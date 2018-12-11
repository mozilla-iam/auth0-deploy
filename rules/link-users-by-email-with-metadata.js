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

  // Lower is better - used by linking ratcheting logic
  const matchOrder = {'Mozilla-LDAP': 0,
                      'Mozilla-LDAP-Dev': 0,
                      'firefoxaccounts': 1,
                      'github': 2,
                      'google-oauth2': 3,
                      'email': 4
                     };
  // How old an account should be to be considered "new" to the system for linking, in seconds
  const user_ratchet_link_delay_sec = 300;

  const userApiUrl = auth0.baseUrl + '/users';
  const userSearchApiUrl = auth0.baseUrl + '/users-by-email';

 
  // primaryUser : The user profile that all other user profiles will be linked
  //               to as children
  // targetUser : The iterator that we use as we iterate over the search results

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

    if (data.length === 0) {
      // Already linked or no matching email found, continue with login
      return callback(null, user, context);
    }

    // Default to ourselves as the primary profile
    var primaryUser = user;

    // We have matches in Auth0, so we need to decide which account is going to be primary
    // Please see https://github.com/mozilla-iam/mozilla-iam/blob/master/docs/deratcheting-user-flows.md#user-logs-in-with-the-mozilla-iam-system-for-the-first-time
    // for detailed explanation of what happens here.
    // NOTE: No date time check is made here as the current user is not yet present in Auth0 database (anymore?)
    // thus we do not need to verify that the current profile (`user`) has a "new" `user.created_at` value. Yay!
    for (var i = 0, len = data.length; i < len; i++) {
      var targetUser = data[i];

      var targetConnection = targetUser.identities[0].connection;
      var primaryConnection = primaryUser.identities[0].connection;

      if (matchOrder[targetConnection] < matchOrder[primaryConnection]) {
        console.log("Found user_id that should be primary profile used for linking, according to ratcheting logic: " + targetUser.user_id);
        primaryUser = targetUser;
      }
    }

    // Current user providers
    const provider = user.identities[0].provider;
    const providerUserId = user.identities[0].user_id;

    if (primaryUser.user_id === user.user_id) {
      // The primary user we're trying to link is the same as the one we're logged in as
      // This happens if the linking ratcheting logic selects the same profile and other profiles are not yet linked
      // These will be linked the first time the user logs in with them instead
      console.log("No automatic profile linking performed due to primary profile matching current profile for: " + user.user_id);
      return callback(null, user, context);
    }

    console.log("Performing automatic profile linking: primary profile: "+primaryUser.user_id+" is now also primary for: " + user.user_id);

    user.app_metadata = user.app_metadata || {};
    user.user_metadata = user.user_metadata || {};
    auth0.users.updateAppMetadata(primaryUser.user_id, user.app_metadata)
    .then(auth0.users.updateUserMetadata(primaryUser.user_id, user.user_metadata))
    .then(function() {
      request.post({
        url: userApiUrl + '/' + primaryUser.user_id + '/identities',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken
        },
        json: { provider: provider, user_id: String(providerUserId) }
      }, function (err, response, body) {
          if (response && response.statusCode >= 400) {
            console.log("Error linking account: " + response.statusMessage);
            return callback(new Error('Error linking account: ' + response.statusMessage));
          }
          context.primaryUser = primaryUser.user_id;
          callback(null, user, context);
      });
    })
    .catch(function (err) {
      callback(err);
    });
  });
}
