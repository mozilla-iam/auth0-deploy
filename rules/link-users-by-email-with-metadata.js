/**
 * @title Link Accounts with Same Email Address while Merging Metadata
 * @overview Link any accounts that have the same email address while merging metadata.
 * @gallery true
 * @category access control
 *
 * This rule will link any accounts that have the same email address while merging metadata.
 * Source/Original: https://github.com/auth0/rules/blob/master/src/rules/link-users-by-email-with-metadata.js
 *
 * Please see https://github.com/mozilla-iam/mozilla-iam/blob/master/docs/deratcheting-user-flows.md#user-logs-in-with-the-mozilla-iam-system-for-the-first-time
 * for detailed explanation of what happens here.
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
                      'email': 4,
                      'unknown': 5 // Always lowest
                     };
  // How old an account should be to be considered "new" to the system for linking, in seconds
  const user_ratchet_link_delay_sec = 300;

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
    if (response.statusCode !== 200) return callback(new Error("API Call failed: "+body));

    var data = JSON.parse(body);
    // Ignore non-verified users and current user, if present
    // The user_ratchet_link_delay_sec dictate if we consider this user to be present pre or post-ratcheting
    data = data.filter(function (u) {
      if (!u.email_verified) {
        return false;
      }

      if (u.user_id === user.user_id) {
        // Convert the Date() objects to seconds (instead of milliseconds)
        var creation_time_distance = (Date.now()/1000) - (Date.parse(u.created_at)/1000);
        user.user_is_new = false;
        if (creation_time_distance < user_ratchet_link_delay_sec) {
          console.log(`User account was just created (creation_time_distance ${creation_time_distance} < user_ratchet_link_delay_sec ${user_ratchet_link_delay_sec}) and is considered new: ${u.user_id}`);
          user.user_is_new = true;
          return false;
        }
      }
      return true;
    });


    // @primaryUser JSON The user profile that all other user profiles will be linked to as children
    // @targetUser JSON The first search result from Auth0 DB
    var primaryUser = user;
    var targetUser = data[0] || undefined ;

    // CASE 0:
    // If the only account in auth0 database is the one they just logged in with (data.length === 0)
    // the user is logging in with either a linked or unlinked account and there are no other accounts
    // continue with login
    if (data.length === 0) {
      return callback(null, user, context);
    }

    // We have a single match in the auth0 database (after the filtering function ran)
    if (data.length === 1) {
      // ERROR CASE (should never be reached)
      // user.identities.length should never be 0
      if (user.identities && user.identities.length === 0) {
        console.log("ERROR: Identity is zero length");
        return callback(new Error("Identity is zero length"));

      // CASE 1:
      // If user has a single account in auth0 database other than the one they just logged in with (data.length === 1),
      // AND they are logging in with an account which is already linked to other accounts (user.identities.length > 1),
      // set primaryUser to the account that the user just logged in with (primaryUser = user)
      // Example test case: LDAP, FxA, GitHub account with kang@insecure.ws `user.email` exist
      // FxA logins: CASE 3 is hit (LDAP primary, Fxa linked)
      // FxA logins again: No change, due to this case
      // Eventually GitHub login and hits CASE 2
      } else if (user.identities && user.identities.length > 1) {
        console.log("Account linking case 1 reached for "+user.user_id);
        primaryUser = user;
        context.primaryUserMetadata = primaryUser.user_metadata || {};

      // CASE 2:
      // If user has a single account in auth0 database other than the one they just logged in with (data.length === 1),
      // AND they are logging in with an account which is linked to one other account (user.identities.length === 1),
      // AND that one other account has one or more additional accounts linked to it (targetUser.identities.length >= 1)
      // we do not apply ratcheting logic as this means
      // 1) `user` is a new user not in the database
      // 2) `targetUser` is already linked to something, or is a single unlinked account and thus should be
      // `primaryUser` as well.
      // Example test case A: LDAP or a linked LDAP account exists as well as Github, all with kang@insecure.ws `user.email`
      // LDAP logins: Github is set as target here and will therefore be linked to LDAP or linked LDAP as primary
      // Example test case B: same setup but
      // GitHub logins: CASE 1 is hit if GitHub is already linked
      //                CASE 3 is hit if neither accounts are linked but GitHub already exist
      //                CASE 3 is hit if LDAP is already linked (because LDAP, i.e. targetUser.identities.length > 1)
      //                CASE 2 (THIS CASE) is hit if GitHub is a new account and it will be the primary account, LDAP will
      //                be linked to it as LDAP is not already linked
      } else if ((user.identities && user.identities.length === 1) && (targetUser.identities && targetUser.identities.length >= 1)) {
        console.log("Account linking case 2 reached for "+user.user_id);
        primaryUser = targetUser;
      }
    } // end data.length === 1

    // CASE 3:
    // If the user has 2+ accounts in auth0 database other than the one they just logged in with, (data.length > 1)
    // This is the "linking racheting" loop/logic which emulates the deprecated login racheting, while linking
    // Example test case: FxA, GitHub, and Google accounts exist all with kang@insecure.ws `user.email`
    // Google logins: this loop finds all 3 accounts and selects FxA as primary due to ratcheting
    //                FxA will be primary and Google will be linked to it. Nothing happens to GitHub, until the user
    //                logins again and hits CASE 1
    if (data.length > 1) {
      console.log("Account linking case 3 reached for "+user.user_id);
      for (var i = 0, len = data.length; i < len; i++) {
        targetUser = data[i];

        var targetConnection = targetUser.identities[0].connection;
        var primaryConnection = primaryUser.identities[0].connection;
        // If we have a new user, its connection type should not be factored in the choice, and thus is set to unknown
        // instead
        if (primaryUser.user_is_new !== undefined && primaryUser.user_is_new === true) {
          primaryConnection = 'unknown';
        }
        console.log(`Case 3: comparing targetConnection: ${targetConnection} (user_id: ${targetUser.user_id}) with primaryConnection: ${primaryConnection} (user_id: ${primaryUser.user_id})`);

        if (matchOrder[targetConnection] < matchOrder[primaryConnection]) {
          console.log("Found user_id that should be primary profile used for linking, according to ratcheting logic: " + targetUser.user_id);
          primaryUser = targetUser;
        }
      }
    }

    if (primaryUser.user_id === user.user_id) {
      // The primary user we're trying to link is the same as the one we're logged in as
      // This happens if the linking ratcheting logic selects the same profile and other profiles are not yet linked
      // These will be linked the first time the user logs in with them instead
      console.log("No automatic profile linking performed due to primary profile matching current profile for: " + user.user_id);
      return callback(null, user, context);
    }

    console.log("Performing automatic profile linking: primary profile: "+primaryUser.user_id+" is now also primary for: " + user.user_id);

    // Current user providers
    const provider = user.identities[0].provider;
    const providerUserId = user.identities[0].user_id;

    // Update app, user metadata as auth0 won't back this up in user.identities[x].profileData
    user.app_metadata = user.app_metadata || {};
    user.user_metadata = user.user_metadata || {};
    auth0.users.updateAppMetadata(primaryUser.user_id, user.app_metadata)
    .then(auth0.users.updateUserMetadata(primaryUser.user_id, Object.assign({}, user.user_metadata, primaryUser.user_metadata))
    // Link the accounts
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
          // Finally, swap user_id so that the current login process has the correct data
          context.primaryUser = primaryUser.user_id;
          context.primaryUserMetadata = primaryUser.user_metadata || {};

          return callback(null, user, context);
      });
    })
    .catch(function (err) {
      console.log("An unknown error occured while linking accounts: " + err);
      return callback(err);
    });
  });
}
