async function AccessRules(user, context, callback) {

  // Imports
  const fetch = require('node-fetch@2.6.1');
  const YAML = require('js-yaml');
  const jose = require('node-jose');

  // Check if array A has any occurrence from array B
  function hasCommonElements(A, B) {
      return A.some(element => B.includes(element));
  }

  // Grant access
  function access_granted(a, b, c) {
    return callback(a, b, c);
  }

  // Deny access
  function access_denied(a, b, c) {
    return callback(a, b, c);
  }

  // Process the access cache decision
  function access_decision(access_rules, access_file_conf) {
    // Ensure we have the correct group data
    user.app_metadata = user.app_metadata || {};
    user.app_metadata.groups = user.app_metadata.groups || [];
    user.identities = user.identities || [];
    user.ldap_groups = user.ldap_groups || [];
    user.groups = user.groups || [];

    // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
    // Here we iterate over all possible user identities and build an array of all groups from them
    var _profile;
    var profile_groups = [];
    for (var x = 0, len = user.identities.length;x<len;x++) {
      _profile = user.identities[x];
      if ('profileData' in _profile) {
        if ('groups' in _profile.profileData) {
          Array.prototype.push.apply(profile_groups, _profile.profileData.groups);
        }
      }
    }

    // Collect all variations of groups and merge them together for access evaluation
    var groups = Array.prototype.concat(user.app_metadata.groups, user.ldap_groups, user.groups, profile_groups);

    // Inject the everyone group and filter for duplicates
    groups.push("everyone");
    groups = groups.filter((value, index, array) => array.indexOf(value) === index);

    // Update user.groups with new merged values
    user.groups = groups;

    // This is used for authorized user/groups
    var authorized = false;
    // Defaut app requested aal to MEDIUM for all apps which do not have this set in access file
    var required_aal = "MEDIUM";

    for (var i=0; i<access_rules.length; i++) {
      var app = access_rules[i].application;

      //Handy for quick testing in dev (overrides access rules)
      //var app = {'client_id': 'pCGEHXW0VQNrQKURDcGi0tghh7NwWGhW', // This is testrp social-ldap-pwless
      //           'authorized_users': ['gdestuynder@mozilla.com'],
      //           'authorized_groups': ['okta_mfa'],
      //           'aal': 'LOW'
      //          };

      if (app.client_id && (app.client_id.indexOf(context.clientID) >= 0)) {
        // If there are multiple applications in apps.yml with the same client_id
        // then this expiration of access check will only run against the first
        // one encountered. This matters if there are multiple applications, using
        // the same client_id, and asserting different expire_access_when_unused_after
        // values.

        // Set app AAL (AA level) if present
        required_aal = app.AAL || required_aal;

        // AUTHORIZED_{GROUPS,USERS}
        // XXX this authorized_users SHOULD BE REMOVED as it's unsafe (too easy to make mistakes). USE GROUPS.
        // XXX This needs to be fixed in the dashboard first
        // Empty users or groups (length == 0) means no access in the dashboard apps.yml world
        if (app.authorized_users.length === app.authorized_groups.length === 0) {
          console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - this app denies ALL users and ALL groups");
          context.request.query.redirect_uri = app.url || "https://sso.mozilla.com";
          return access_denied(null, user, global.postError('notingroup', context));
        }

        // Check if the user is authorized to access
        // A user is authorized if they are a member of any authorized_groups or if they are one of the authorized_users
        if ((app.authorized_users.length > 0 ) && (app.authorized_users.indexOf(user.email) >= 0)) {
          authorized = true;
        // Same dance as above, but for groups
        } else if ((app.authorized_groups.length > 0) && hasCommonElements(app.authorized_groups, groups)) {
          authorized = true;
        } else {
          authorized = false;
        }

        if (!authorized) {
          console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - not in authorized group or not an authorized user");
          context.request.query.redirect_uri = app.url || "https://sso.mozilla.com";
          return access_denied(null, user, global.postError('notingroup', context));
        }
      } // correct client id / we matched the current RP
    } // for loop / next rule in apps.yml

    // AAI (AUTHENTICATOR ASSURANCE INDICATOR) REQUIREMENTS
    //
    // Note that user.aai is set in another rule (rules/aai.js)
    // This file sets the user.aal (authenticator assurance level) which is the result of a map lookup against user.aai
    //
    // Mapping logic and verification
    // Ex: our mapping says 2FA for MEDIUM AAL and app AAL is MEDIUM as well, and the user has 2FA AAI, looks like:
    // access_file_conf.aai_mapping['MEDIUM'] = ['2FA'];
    // app.AAL = 'MEDIUM;
    // user.aai = ['2FA'];
    // Thus user should be allowed for this app (it requires MEDIUM, and MEDIUM requires 2FA, and user has 2FA
    // indeed)
    //
    var aai_pass = false;
    if (access_file_conf.aai_mapping !== undefined) {
      // 1 Set user.aal
      // maps = [ "LOW", "MEDIUM", ...
      // aal_nr = position in the maps (aai_mapping[maps[aal_nr=0]] is "LOW" for.ex)
      // aai_nr = position in the array of AAIs (aai_mapping[maps[aal_nr=0]] returns ["2FA", .., aai_nr=0 would be the
      // position for "2FA")
      // Note that the list is ordered so that the highest AAL always wins
      const maps = Object.keys(access_file_conf.aai_mapping);
      for (var aal_nr = 0; aal_nr < maps.length; aal_nr++) {
        for (var aai_nr = 0; aai_nr < access_file_conf.aai_mapping[maps[aal_nr]].length; aai_nr++) {
          var cur_aai = access_file_conf.aai_mapping[maps[aal_nr]][aai_nr];
          if (user.aai.indexOf(cur_aai) >= 0) {
            user.aal = maps[aal_nr];
            console.log("User AAL set to "+user.aal+" because AAI contains "+user.aai);
            break;
          }
        }
      }
      // 2 Check if user.aal is allowed for this RP
      if (access_file_conf.aai_mapping[required_aal].length === 0) {
        console.log("No required indicator in aai_mapping for this RP (mapping empty for this AAL), access will be granted");
        aai_pass = true;
      } else {
        for (var y = 0; y < user.aai.length; y++) {
          var this_aai = user.aai[y];
          if (access_file_conf.aai_mapping[required_aal].indexOf(this_aai) >= 0) {
            console.log("User AAL is included in this RP's AAL requirements, access will be granted");
            aai_pass = true;
            break;
          }
        }
      }
    }

    if (!aai_pass) {
      console.log("Access denied to "+context.clientID+" for user "+user.email+" ("+user.user_id+") - due to " +
        "Identity Assurance Level being too low for this RP. Required AAL: "+required_aal+
        " ("+aai_pass+")");
      context.request.query.redirect_uri = "https://sso.mozilla.com";
      return access_denied(null, user, global.postError('aai_failed', context));
    }

    // We matched no rule, access is granted
    return access_granted(null, user, context);
  }

  const cdnUrl = 'https://cdn.sso.mozilla.com/apps.yml';

  const access_file_conf = { aai_mapping: {
    "LOW": [],
    "MEDIUM": ["2FA", "HIGH_ASSURANCE_IDP"],
    "HIGH": ["HIGH_NOT_IMPLEMENTED"],
    "MAXIMUM": ["MAXIMUM_NOT_IMPLEMENTED"]
  }};

  // This function pulls the apps.yml and returns a promise to yield the application list
  async function getAppsYaml(url) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        return YAML.load(data).apps;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
  }

  // Main try
  try {
    const appsYaml = await getAppsYaml(cdnUrl);
    return access_decision(appsYaml, access_file_conf);
  } catch (error) {
    // All error should be caught here and we return the callback handler with the error
    return callback(error);
  }
}
