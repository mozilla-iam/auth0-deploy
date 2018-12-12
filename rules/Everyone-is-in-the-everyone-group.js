function (user, context, callback) {
  // This is a work-around because the SSO Dashboard apps.yml authorization rules
  // decided to have a group that's called `everyone` hardcoded, even thus no such group exists
  // This rule hard codes it for all users, as it is meant to represent, well, every user.
  // Without this rule, users would otherwise be denied access when an RP has an authorization of "`everyone`" in the SSO Dashboard apps.yml

  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || [];
  user.groups = user.groups || [];

  if (user.app_metadata.groups.indexOf('everyone') < 0) {
    Array.prototype.push.apply(user.app_metadata.groups, ['everyone']);
  }
  auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
       .then(function(){
         callback(null, user, context);
       })
       .catch(function(err){
         console.log(err);
         callback(err);
  });
}
