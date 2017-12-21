function (user, context, callback) {
  // If user is not LDAP user don't try to do stuff
  if (context.connection !== 'ad') {
    return callback(null, user, context);
  }
  // XXX Remove this webtask when a LDAP CIS Publisher is available
  if (user.app_metadata === undefined || !user.app_metadata) {
    // no group in metadata, nothing needed here, just bail
    return callback(null, user, context);
  }
  // Just for safety
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || {};
  user.groups = user.groups || {};
  
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
    //reconstruct groups...
    user.groups = theuser[0].groups || {};
    Array.prototype.push.apply(user.groups, ['everyone']);
    Array.prototype.push.apply(user.groups, non_ldap_groups);
    user.app_metadata.groups = user.groups;
    console.log("reintegration complete for " + user.user_id);
//    console.log(user.groups);
    return callback(null, user, context);
  });
}
