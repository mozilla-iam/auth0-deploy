function (user, context, callback) {
  // Workaround all the group handling in Auth0. This should integrate all groups from all locations into user.app_metadata.groups, which is the only thing actually evalutated during any ACL or other rule.
  // Ensure we have the correct group data
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || [];
  user.identities = user.identities || [];
  user.groups = user.ldap_groups || user.groups || [];
  
  // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
  var profile;
  var groups = [];
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

  // This is a work-around because the SSO Dashboard apps.yml authorization rules
  // decided to have a group that's called `everyone` hardcoded, even thus no such group exists
  // This rule hard codes it for all users, as it is meant to represent, well, every user.
  // Without this rule, users would otherwise be denied access when an RP has an authorization of "`everyone`" in the SSO Dashboard apps.yml
  Array.prototype.push.apply(groups, ['everyone']);
  Array.prototype.push.apply(groups, user.app_metadata.groups);
  Array.prototype.push.apply(groups, user.groups);
  groups = Array.from(new Set(groups));
  user.groups = groups;
  user.app_metadata.groups = groups;
  auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
     .then(function(){
       console.log("reintegration complete for " + user.user_id);
       return callback(null, user, context);
     })
     .catch(function(err){
       console.log(err);
       return callback(err);
  });
}
