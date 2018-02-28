function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  var APPS = [
    '2lTZtlpqx4bslng167l1BBqTMusCAJkZ' // AWS Mozilla-IAM - Read Only
  ];

  var ALLOWED_GROUPS = ['mozilliansorg_mozilla-iam-aws-access'];

  if (APPS.indexOf(context.clientID) >= 0) {
    var groupHasAccess = ALLOWED_GROUPS.some(
      function (group) {
        if (!user.groups)
          return false;
        return user.groups.indexOf(group) >= 0;
    });
    if (groupHasAccess) {
      user.awsRole = 'arn:aws:iam::320464205386:role/FederatedAWSAccountRead,arn:aws:iam::329567179436:saml-provider/auth0-prod';
      user.awsRoleSession = user.email;
      context.samlConfiguration.mappings = {
        'https://aws.amazon.com/SAML/Attributes/Role': 'awsRole',
        'https://aws.amazon.com/SAML/Attributes/RoleSessionName': 'awsRoleSession'
      };
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
