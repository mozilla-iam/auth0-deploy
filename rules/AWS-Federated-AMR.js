function (user, context, callback) {
  var WHITELIST = ['7PQFR1tyqr6TIqdHcgbRcYcbmbgYflVE', // ldap-pwless.testrp.security.allizom.org
                   'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT', // Federated AWS CLI auth0-dev
                   'N7lULzWtfVUDGymwDs0yDEq6ZcwmFazj', // Federated AWS CLI auth0-prod
  ];
  if (WHITELIST.indexOf(context.clientID) >= 0) {
    context.idToken['amr'] = 'test';
  }
  return callback(null, user, context);
}
