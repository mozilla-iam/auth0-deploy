/* vim: set ts=2 sw=2 et: */

/* This rule merges the current account with an existing, verified, account
* with the same email address.
*
* SECURITY CONSIDERATIONS
* It is of the UPMOST IMPORTANCE that all emails used for merging
* are marked as VERIFIED.
*/

/* TODO
 * - Support dynamically figuring out the primary account (whichever previous account, or LDAP)
 * - Support user.emails (ie aliases)
 * - Support linking previously existing accounts
 * - Do not logout the user on linking! ;-)
 */

function (user, context, callback) {
  // API library for ManagementClient is at https://github.com/auth0/node-auth0
  var request = require('request@2.56.0');
  var ManagementClient = require('auth0@2.1.0').ManagementClient;
  
  // We check if email of the user currently logging-in is verified,
  // we NEVER automatically merge accounts if this is not the case.
  if (!user.email_verified) {
    console.log('Permissioned denied: Cannot link unverified email from user '+user.email);
    return callback(null, user, context);
  }

  var management = new ManagementClient({
    token: auth0.accessToken,
    domain: auth0.domain
  });

  // Find all users that have a matching email
  // XXX Currently this only searches LDAP accounts from the DEV instance
  management.users.getAll({
    search_engine: 'v1',
    connection: 'Mozilla-LDAP-Dev',
    fields: "email,email_verified,user_id,identities"

  }).then(function (users) {
   if (users.length > 0) {
      // Matched user email MUST ALWAYS be verified as well
      var matches = users.filter(function(muser){return ((muser.email === user.email) && muser.email_verified);});
      if (matches && matches.length > 0) {
        // Always take the first match only, as there should normally not be non-exact matches
        var match = matches[0];
        // XXX Debug msgs
        //console.log('match %j', match);
        //console.log("user json: %j",user);

        // Cannot link to yourself.
        if (user.user_id === match.user_id) {
          return callback(null, user, context);
        }

        // Check all identities - is user.user_id already linked to our match?
        for (var ident in match.identities) {
          if (match.identities[ident].user_id === user.user_id) {
            console.log('%s is already linked', user.user_id);
            return callback(null, user, context);
          }
        }

        console.log('Linking: %s (provider: %s) with %s (provider: %s)',
          user.user_id, user.identities[0].provider, match.user_id, match.identities[0].provider);

        // This is where we actually link accounts.
        // Function definition is not documented, so here goes:
        // management.users.link(id:original_user_id, user_id:target_user_id, callback)
        management.users.link(match.user_id,
          {
            user_id: user.user_id,
            provider: user.identities[0].provider
          },
          // Callback function for management.users.link
          function (err, ruser) {
            if (err)
              console.log('Error: linking user %s failed. Error: %s', user.user_id, err);
          })
          // If linking worked fine, we continue here
          .then(function() {
            // Swap to primary user account id right now, 
            // so that the RP sees the linked account immediately.
            user.original_user_id = user.user_id;
            user.user_id = match.user_id;
        });
      } else {
        console.log('No existing user to link for email %s', user.email);
      }
      return callback(null, user, context);
    }
  }).catch(callback);
}
