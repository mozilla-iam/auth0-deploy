function temporaryLDAPReReintergration(user, context, callback) {
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
}
