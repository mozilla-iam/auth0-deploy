function (user, context, callback) {
  var WHITELIST = ['7PQFR1tyqr6TIqdHcgbRcYcbmbgYflVE', // ldap-pwless.testrp.security.allizom.org
                   'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT', // Federated AWS CLI auth0-dev
                   'N7lULzWtfVUDGymwDs0yDEq6ZcwmFazj', // Federated AWS CLI auth0-prod
  ];
  if (WHITELIST.indexOf(context.clientID) >= 0) {
    console.log("Enriching id_token with amr for AWS Federated CLI");
    // Amazon will read in the id token's `amr` list and allow you to match on policies with a string condition.
    // See
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html#Conditions_String
    //
    // Note that this abuses the `amr` value (see https://tools.ietf.org/html/rfc8176) as these are not listed as
    // registered values, and that groups are not authentication methods.

    context.idToken['amr'] = user.groups || [];
  }
  return callback(null, user, context);
}
