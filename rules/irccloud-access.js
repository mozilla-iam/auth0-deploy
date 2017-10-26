function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  // Applications that are restricted
  // The rule must cover both dev and prod client_ids as the rule is merged from dev to prod.
  var IRCCLOUD_APP = [
    'D4hqwOVDV2UUJBW2FwD1RxnguPm14Mv3', // auth : irccloud.mozilla.com
  ];
  // LDAP groups allowed to access these applications
  var ALLOWED_GROUPS = [
    // Examples:
    //'team_moco', 'team_mofo'
    'irccloud'
  ];

  if (IRCCLOUD_APP.indexOf(context.clientID) >= 0) {
    var groupHasAccess = ALLOWED_GROUPS.some(
      function (group) {
        if (!user.groups)
          return false;
        return user.groups.indexOf(group) >= 0;
    });
    if (groupHasAccess) {
     return callback(null, user, context);
    } else {
     // Since this rule should only be used for RPs which can not do the
     // authorization check themselves, and these types of RPs will likely
     // also be unable to interpret the UnauthorizedError() `error` and
     // `error_description` arguments passed back and will consequently
     // not show the user why their login failed, the user is redirected
     // instead of using UnauthorizedError() [1]
     // 1: https://auth0.com/docs/rules#deny-access-based-on-a-condition
     context.redirect = {
       url: "https://sso.mozilla.com/forbidden"
     };
     return callback(null, null, context);
    }
  }
  callback(null, user, context);
}
