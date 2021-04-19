function (user, context, callback) {
  // Planful requires a value for each user which is always the same
  const ALLOWED_CLIENTIDS = [
  ];

  // We only care about the above clients
  if (!ALLOWED_CLIENTIDS.includes(context.clientID)) {
    return callback(null, user, context);
  }

  user["IdP Entity ID"] = "fed.identropy.hostanalytics.saml2"


  return callback(null, user, context);
}