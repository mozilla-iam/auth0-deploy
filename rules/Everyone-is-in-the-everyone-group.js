function everyoneIsInTheEveryoneGroup(user, context, callback) {
  // This is a work-around because the SSO Dashboard apps.yml authorization rules
  // decided to have a group that's called `everyone` hardcoded, even thus no such group exists
  // This rule hard codes it for all users, as it is meant to represent, well, every user.
  // Without this rule, users would otherwise be denied access when an RP has an authorization of "`everyone`" in the SSO Dashboard apps.yml

  var is_write_needed = false;

  // ensure that the user object is valid enough
  if (user.app_metadata == undefined) {
    is_write_needed = true;
    user.app_metadata = {};
  }
  if (user.app_metadata.groups == undefined) {
    is_write_needed = true;
    user.app_metadata.groups = [];
  }
  if (user.groups == undefined) {
    is_write_needed = true;
    user.groups = [];
  }

  // append the group 'everyone' if not already present
  if (user.app_metadata.groups.indexOf('everyone') < 0) {
    is_write_needed = true;
    Array.prototype.push.apply(user.app_metadata.groups, ['everyone']);
  }

  if (is_write_needed) {
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
      .catch(function(err){
        console.log(err);
        callback(err);
      });
  }

  callback(null, user, context);
}
