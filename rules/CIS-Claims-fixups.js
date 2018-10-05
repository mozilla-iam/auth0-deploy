function (user, context, callback) {
  var namespace = 'https://sso.mozilla.com/claim/';
  var whitelist = ['']; // claim whitelist
  
  // If you're not OIDC Conformant, stop right there as this INCREASES the profile size
  // significantly! The metadata is set by us, manually.
  
  if (!context.clientMetadata || !context.clientMetadata.oidc_conformant || context.clientMetadata.oidc_conformant !== 'true') {
    console.log('Client '+context.clientID+' is not OIDC conformant yet, please fix!');
    // Bare minimum conversion to help migrating clients to OIDC conformant
    //context.idToken = context.idToken || {};
    //context.idToken[namespace+'groups'] = user.groups;
    return callback(null, user, context);
  }
  
  
  // CIS is our only functionality that can set app_metadata
  // Auth0 auto-integrate user.app_metadata.* into user.*
  // This rule cleans up the left overs for conciseness, clarity and size
  // (in particular this affects the id_token size, that goes onto GET queries
  // which are limited to 8k-if-not-less depending on the httpd server
  // settings)
  // Additional integration into user.app_metadata itself is at:
  // https://github.com/mozilla-iam/cis_functions/tree/master/functions/idvtoauth0
  

  // Fixup claims to be namespaced, for compat
  // Auth0 in the "OIDC-Conformant" mode will only allow these claims. That mode
  // enforces more than the OIDC spec in at least one regard:
  // Auth0 forbids the use of optional claims UNLESS these are namespaced by a URL.
  // See also https://auth0.com/docs/api-auth/tutorials/adoption/scope-custom-claims
  
  // These claims can be used directly and/or are preserved if integrated by Auth0
  // See also: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
  var std_oidc_claims = [
    "sub",
    "name",
    "given_name",
    "family_name",
    "middle_name",
    "nickname",
    "preferred_username",
    "profile",
    "picture",
    "website",
    "email",
    "email_verified",
    "gender",
    "birthdate",
    "zoneinfo",
    "locale",
    "phone_number",
    "phone_number_verified",
    "address",
    "updated_at"
    ];

  // These are the claims Auth0 used to provide, plus some of ours
  var old_authzero_claims = [
    "groups",
    // We don't pass these to reduce the profile size. use the CIS claim instead, or the CIS API
    //"emails",
    //"dn",
    //"organizationUnits",
    //"email_aliases",
    //"_HRData",
    // This is "sub"
    // "user_id"
    // We don't use these anyway:
    //"identities"
    //"multifactor"
    //"clientID"
    //"created_at"
  ];
  
  // XXX This code is no longer required once we get an LDAP identity driver
  // It reintegrates LDAP groups into the user's app_metadata/profile
  if (user.app_metadata !== undefined && user.app_metadata.length > 0) {
    
    // Force re-integrate LDAP groups until we have a LDAP CIS publisher
    // See https://github.com/mozilla-iam/cis_functions/blob/master/functions/idvtoauth0/main.py#L87
    // which this very code below supersedes as idvauth0 code only gets triggered if a profile is being actively published
    var index = 0;
    var userApiUrl = auth0.baseUrl + '/users/';
    var ugroups = user.app_metadata.groups;

    request({
      url: userApiUrl+user.user_id,
      headers: {
        Authorization: 'Bearer ' + auth0.accessToken
      },
    },
    function(err, response, body) {
      if (!err) {
        var udata = JSON.parse(body);
        // If user has no LDAP groups, return immediately
        if (udata.groups === undefined) {
          return cb();
        }

        // Add non-LDAP groups to new_groups
        var new_groups = [];
        
        for (index = 0; index < ugroups.length; ++index) {
          var cur_grp = ugroups[index];
          if (cur_grp === null) {
            console.log("CIS: Group data contained null entries in array, that's not normal");
            continue;
          }
          // Don't remove non-LDAP groups
          if (cur_grp.substr(0,14) === 'mozilliansorg_') {
            new_groups.push(cur_grp);
          } else if (cur_grp.substr(0,5) === 'hris_') {
            new_groups.push(cur_grp);
          }
        }
        
        // Re-add groups that are in LDAP (ie udata.groups)
        for (index = 0; index < udata.groups.length; ++index) {
            new_groups.push(udata.groups[index]);
        }
        return cb(new_groups);
      } else {
        console.log('CIS: Error while parsing user groups for user '+user.user_id+': '+err);
        return cb();
      }
      console.log('CIS: HTTP Error while parsing user groups for user '+user.user_id+': '+err);
      return cb();
    });
  } else {
    return cb();
  }

  // Ensure this is always called or the webtask will timeout
  function cb(new_groups) {
    user.app_metadata = user.app_metadata || {};
    if (new_groups !== undefined) {
      user.app_metadata.groups = new_groups;
      // Save app_metadata changes
      auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
        .catch(function(err){
          console.log('CIS: Error updating app_metadata (groups) for user '+user.user_id+': '+err);     
      });
    }
    // XXX NOTE WARNING XXX
    // Do NOT enable this as this will inflate the id_token
    // This feature may only be used for specific scope or endpoints, whenever auth0 let us do that
    // Import entire CIS profile to a namespaced claim
    //context.idToken[namespace+'cis'] = user.app_metadata;


    // Reduce profile size further
    user.app_metadata = undefined;
    user.email_aliases = undefined;
    user.dn = undefined;
    user.organizationUnits = undefined;

    // Re-map old and new profile claims to namespaced claims
    // Basically that's `groups`
    old_authzero_claims.forEach(function(claim) {
      try {
        if (whitelist.indexOf(context.clientID) < 0) {
          context.idToken[namespace+claim] = user[claim];
        }
      } catch (e) {
        console.log("Undefined claim (non-fatal): "+e);
      }
    });

    // AAI value
    user.aai = user.aai || [];
    context.idToken[namespace+'AAI'] = user.aai;

    // Give info about CIS API
    context.idToken[namespace+'README_FIRST'] = 'Please refer to https://github.com/mozilla-iam/person-api in order to query Mozilla IAM CIS user profile data';
    return callback(null, user, context);
  }
}
