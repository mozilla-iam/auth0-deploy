function (user, context, callback) {
  // /!\ DO NOT EDIT THIS FILE /!\
  // Please use http://github.com/mozilla-iam/auth0-rules instead

  // Applications that are restricted
  // The rule must cover both dev and prod client_ids as the rule is merged from dev to prod.
  var MOCO_MOFO_APPS = [
    // Examples:
    //'0123456789abcdefghijKLMNOPQRSTuv',  // auth : phonebook.mozilla.com
    //'123456789abcdefghijKLMNOPQRSTuvw',  // auth-dev : phonebook-dev.mozilla.com
  ];
  // LDAP groups allowed to access these applications
  var ALLOWED_GROUPS = [
    // Examples:
    //'team_moco', 'team_mofo'
  ];

  if (MOCO_MOFO_APPS.indexOf(context.clientID) >= 0) {
    var groupHasAccess = ALLOWED_GROUPS.some(
      function (group) {
        if (!user.groups)
          return false;
        return user.groups.indexOf(group) >= 0;
    });
    if (groupHasAccess) {
     return callback(null, user, context);
    } else {
     // We use a redirect instead of UnauthorizedError() here as this ensure we can
     // tell the user what happened. Otherwise, if the RP does not handle the error message
     // there is no chance to tell the user why they're not getting logged in.
     context.redirect = {
       url: "https://sso.mozilla.com/forbidden"
     };
     return callback(null, null, context);
    }
  }
  callback(null, user, context);
}
