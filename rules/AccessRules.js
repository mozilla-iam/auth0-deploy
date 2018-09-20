function (user, context, callback) {
  // Imports
  var request = require('request');
  var YAML = require('js-yaml');
  var jose = require('node-jose');

  // Define global variables that need some kind of initialization in case they're missing from Auth0
  var groups = user.groups || [];

  // Retrieve the access file URL from well-known
  // See also https://github.com/mozilla-iam/cis/blob/profilev2/docs/.well-known/mozilla-iam.json
  function get_access_file_url(cb) {
    var access_file = {};
      var options = { method: 'GET', url: configuration.iam_well_known };
      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        access_file = JSON.load(body).access_file;
        // contains mainly:
        // access_file.endpoint  (URL)
        // access_file.jwks_keys[]{} (pub keys)
        return cb(access_file);
      });
  }

  // Retrieve and verify access rule file itself
  function get_verified_access_rules(cb, access_file) {
    // Bypass if we have a cached version present already
    // Cache is very short lived in webtask, it just means we hit a "hot" task which nodejs process hasn't yet been
    // terminated. Generally this means we hit the same task within 60s.
    if (global.access_rules) {
      return cb(global.access_rules);
    }

    var options = { method: 'GET', url: access_file.endpoint };
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      // Convert key into jose-formatted-key
      // XXX This key should also be fetched from well-known
      var pubkey = jose.JWK.asKey(configuration.iam_jwt_rsa_pkey, 'pem').then((jwk) => jwk);

      var verifier = jose.JWS.createVerify(pubkey);
      var ret = verifier.verify(body).then((response) => response.payload).catch((err) => err);
      var decoded = ret.then((data) => data).catch((err) => {
        console.log('Signature verification of access file failed (fatal): '+err);
        return access_denied(null, null, context);
      });
      global.access_rules = YAML.load(decoded).apps;
      return cb(global.access_rules);
    });
  }

  // Unsafe version (no signature verification)
  function get_unverified_access_rules(cb, rules_url) {
    var options = { method: 'GET', url: rules_url};
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      global.access_rules = YAML.load(body).apps;
      return cb(global.access_rules);
    });
  }

  // Check if array A has any occurrence from array B
  function array_in_array(A, B) {
    var found = A.some(
      function(item) {
        if (!B)
          return false;
        return B.indexOf(item) >= 0;
    });
    return found;
  }

  // Update expiration and grant access
  function access_granted(a, b, c) {
    updateAccessExpiration();
    return callback(a, b, c);
  }

  // Deny access
  function access_denied(a, b, c) {
    return callback(a, b, c);
  }

  // updateAccessExpiration()
  // Always returns - will attempt to update user.app_metadata.authoritativeGroups[].lastUsed timestamp
  // for the RP/client_id we're currently trying to login to
  function updateAccessExpiration() {
      user.app_metadata = user.app_metadata || {};
      if (user.app_metadata.authoritativeGroups === undefined) {
          console.log('ExpirationOfAccess: Not used here');
          return;
      }

      var updated = false;
      for (var index = 0;index < user.app_metadata.authoritativeGroups.length;++index) {
        if (user.app_metadata.authoritativeGroups[index].uuid === context.clientID) {
          user.app_metadata.authoritativeGroups[index].lastUsed = new Date();
          updated = true;
          break; // we're done
        }
      }
      if (updated === true) {
        auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
          .catch(function(err) {
          console.log('ExpirationOfAccess: Error updating app_metadata (AuthoritativeGroups) for user '+user.user_id+': '+err);
        });
      }
      console.log('ExpirationOfAccess: Updated lastUsed for '+user.user_id);
      return;
  }

  // Process the access cache decision
  function access_decision(access_rules) {
    for (var i=0;i<access_rules.length;i++) {
      var app = access_rules[i].application;

      //Handy for quick testing in dev (overrides access rules)
      //var app = {'client_id': 'pCGEHXW0VQNrQKURDcGi0tghh7NwWGhW', // This is testrp social-ldap-pwless
      //           'authorized_users': ['gdestuynder@mozilla.com'],
      //           'authorized_groups': ['okta_mfa'],
      //           'expire_access_when_unused_after': 86400
      //          };

      if (app.client_id && (app.client_id.indexOf(context.clientID) >= 0)) {
        // Note that the expiration check MUST always run first
        // Check if the user access to the RP has expired due to ExpirationOfAccess
        if ((app.expire_access_when_unused_after !== undefined) && (app.expire_access_when_unused_after > 0)) {
          user.app_metadata = user.app_metadata || {};
          // If the user has no authoritativeGroups for this clientID, let the user in
          if (user.app_metadata.authoritativeGroups !== undefined) {
            for (var index=0;index < user.app_metadata.authoritativeGroups.length; ++index) {
              if (user.app_metadata.authoritativeGroups[index].uuid === context.clientID) {
                // Find the delta for this user and see if access should have expired
                var lastUsed_ts = new Date(user.app_metadata.authoritativeGroups[index].lastUsed).getTime();
                var delta = new Date().getTime() - lastUsed_ts;
                // Access expired?
                if (delta > app.expire_access_when_unused_after) {
                    // Do not allow the user in, no matter what other access has been set
                    console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - access has expired");
                    return access_denied(null, user, global.postError('accesshasexpired', context));
                }
                break;
              }
            }
          }
        }

        // XXX this authorized_users SHOULD BE REMOVED as it's unsafe. USE GROUPS.
        // XXX This needs to be fixed in the dashboard first
        // Empty users or groups (length == 0) means no access in the dashboard apps.yml world
        if (app.authorized_users.length === app.authorized_groups.length === 0) {
          console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - this app denies ALL users and ALL groups");
          return access_denied(null, user, global.postError('notingroup', context));
        }

        // Check if the user is authorized to access
        if ((app.authorized_users.length > 0 ) && (app.authorized_users.indexOf(user.email) >= 0)) {
          return access_granted(null, user, context);
        // Same dance as above, but for groups
        } else if ((app.authorized_groups.length > 0) && array_in_array(app.authorized_groups, groups)) {
          return access_granted(null, user, context);
        }

        console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - not in authorized group or not an authorized user");
        return access_denied(null, user, global.postError('notingroup', context));
      } // correct client id
    } // for loop
    // We matched no rule, access is granted
    return access_granted(null, user, context);
  }


  // "Main" starts here
  //get_access_file_url(function(url) { return get_verified_access_rules(access_decision, url) });
  return get_unverified_access_rules(access_decision, 'https://cdn.sso.mozilla.com/apps.yml');
}
