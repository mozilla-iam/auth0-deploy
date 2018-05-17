function (user, context, callback) {
  var rules_url = 'https://cdn.sso.mozilla.com/apps.yml'; //S3 bucket with CFN
  var groups = user.groups || [];
  
  // Check if array A has any occurence from array B
  function array_in_array(A, B) {
    var found = A.some(
      function(item) {
        if (!B)
          return false;
        return B.indexOf(item) >= 0;
    });
    return found;
  }
  // Process the access cache decision
  function access_decision(access_rules, callback) {
    for (var i=0;i<access_rules.length;i++) {
      var app = access_rules[i].application;
      //Handy for quick testing in dev (overrides access rules)
      //var app = {'client_id': 'pCGEHXW0VQNrQKURDcGi0tghh7NwWGhW', // This is testrp social-ldap-pwless
      //           'authorized_users': ['gdestuynder@mozilla.com'],
      //           'authorized_groups': ['okta_mfa']
      //          };

      if (app.client_id && (app.client_id.indexOf(context.clientID) >= 0)) {
        // The follow expiration check MUST always run first
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
                // If not expired, let the user in
                if (delta < app.expire_access_when_unused_after) {
                  return callback(null, user, context);
                } else {
                    // Do not allow the user in, no matter what other access has been set
                    console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - access has expired");
                    return callback(null, user, global.postError('accesshasexpired', context));
                }
                break;
              }
            }
          }
          return callback(null, user, context);
        }

        // XXX this authorized_users SHOULD BE REMOVED as it's unsafe. USE GROUPS.
        // XXX This needs to be fixed in the dashboard first

        // Empty users or groups (length == 0) means no access in the dashboard apps.yml world
        if (app.authorized_users.length === app.authorized_groups.length === 0) {
          console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - this app denies ALL users and ALL groups");
          return callback(null, user, global.postError('notingroup', context));
        }
        // Check if the user is authorized to access
        if ((app.authorized_users.length > 0 ) && (app.authorized_users.indexOf(user.email) >= 0)) {
          return callback(null, user, context);
        // Same dance as above, but for groups
        } else if ((app.authorized_groups.length > 0) && array_in_array(app.authorized_groups, groups)) {
          return callback(null, user, context);
        }

        console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - not in authorized group or not an authorized user");
        return callback(null, user, global.postError('notingroup', context));
      } // correct client id
    } // for loop
    // We matched no rule, access is granted
    return callback(null, user, context);
  }
  
  // Fetch the apps.yml access rules or use cache if available
  // Note that the cache is very short lived, though it's better than nothing
  // Basically: the underlaying webtask is still running and reused,
  // thus the global namespace (`global`) is shared/still in memory and available to us
  if (global.access_rules) {
    return access_decision(global.access_rules, callback);
  } else {
    var request = require('request');
    var YAML = require('js-yaml');
    try {
      var options = { method: 'GET',
        url: rules_url};
      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        global.access_rules = YAML.load(body).apps;
        return access_decision(global.access_rules, callback);
      });
    } catch(e) {
      console.log('Error fetching access rules (fatal): '+e);
      return callback(null, null, context);
    }
  }
}
