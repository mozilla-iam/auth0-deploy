function (user, context, callback) {
  // If user is not LDAP user don't try to do stuff

  if (context.connectionStrategy !== 'ad') {
    return callback(null, user, context);
  }
  // XXX Remove this webtask when a LDAP CIS Publisher is available
  if (user.app_metadata === undefined || !user.app_metadata) {
    // no group in metadata, nothing needed here, just bail
    return callback(null, user, context);
  }
  // Just for safety
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || [];
  user.identities = user.identities || [];
  
  // Retrieve LDAP groups from the API since the rule does not have direct access
  // as auth0 will remap user.app_metadata.groups to user.groups in the rule context
  // but.. not in the api context
  var userApiUrl = auth0.baseUrl + '/users';
  request({
   url: userApiUrl,
   headers: {
     Authorization: 'Bearer ' + auth0.accessToken
   },
   qs: {
     search_engine: 'v2',
     q: 'user_id:"' + user.user_id + '"',
   }
  },
  function(err, response, body) {
    if (err) return callback(err);
    var theuser = JSON.parse(body);
    var non_ldap_groups = [];
    Array.prototype.forEach.call(user.app_metadata.groups, function(value) {
      if (value.startsWith('mozilliansorg_') || value.startsWith('hris_')) {
        Array.prototype.push.apply(non_ldap_groups, [value]);
      }
    });
    //reconstruct groups if there was a match...
    var groups = [];
    if (theuser.length !== 0) {
      groups = theuser[0].groups || [];
    }
    // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
    var profile;
    for (var i = 0, len = user.identities.length;i<len;i++) {
      profile = user.identities[i];
      if ('profileData' in profile) {
       if ('groups' in profile.profileData) {
         // Re-integrate LDAP
         console.log("reintegrating additional profile groups for "+user.user_id);
         Array.prototype.push.apply(groups, profile.profileData.groups);
       }
      }
    }

    Array.prototype.push.apply(groups, ['everyone']);
    Array.prototype.push.apply(groups, non_ldap_groups);

    // save groups everywhere
    user.app_metadata.groups = groups;
    user.groups = groups;
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
       .then(function(){
         console.log("reintegration complete for " + user.user_id);
         return callback(null, user, context);
       })
       .catch(function(err){
         console.log(err);
         return callback(err);
    });
  });
}
