function (user, context, callback) {
  // This is a work-around because the SSO Dashboard apps.yml authorization rules
  // decided to have a group that's called `everyone` hardcoded, even thus no such group exists
  // This rule hard codes it for all users, as it is meant to represent, well, every user.
  // Without this rule, users would otherwise be denied access when an RP has an authorization of "`everyone`" in the SSO Dashboard apps.yml
  
  user.groups = user.groups || [];
  user.groups.push.apply(user.groups, ['everyone']);
  callback(null, user, context);
}
