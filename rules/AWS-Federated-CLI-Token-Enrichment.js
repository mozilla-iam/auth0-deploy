function (user, context, callback) {
  var ALLOWED_CLIENTIDS = [
    'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT', // Federated AWS CLI auth0-dev
    'N7lULzWtfVUDGymwDs0yDEq6ZcwmFazj', // Federated AWS CLI auth0-prod
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {
    context.idToken['oaud'] = 'authenticated';
    console.log(context.idToken);
    callback(null, user, context);
  } else {
    callback(null, user, context);
  }
}
