function (user, context, callback) {
  var WHITELIST = ['7PQFR1tyqr6TIqdHcgbRcYcbmbgYflVE', // ldap-pwless.testrp.security.allizom.org
                   'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT', // Federated AWS CLI auth0-dev
                   'N7lULzWtfVUDGymwDs0yDEq6ZcwmFazj', // Federated AWS CLI auth0-prod
  ];
  if (WHITELIST.indexOf(context.clientID) >= 0) {
    const token = '&quot;';
    var filtered = [];
    console.log("Enriching id_token with amr for AWS Federated CLI");

    user.groups = user.groups || [];

    // always replace our token so that it cannot be bypassed by a group that would use it
    // this is because the AWS rule/policy condition uses the `amr` value with a string match
    // and does not know how to parse the list
    // See also
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html#Conditions_String
    Array.prototype.forEach.call(user.groups, function(value) {
      Array.prototype.push.apply(filtered, [value.replace('"', token)]);
    });

    // String will look like:
    // 'amr': 'groupA"groupB"groupC"'
    var tmp = user.groups.join('"');
    context.idToken['amr'] = tmp;
  }
  return callback(null, user, context);
}
