function (user, context, callback) {
  // Planful requires a value for each user which is always the same
  const ALLOWED_CLIENTIDS = [
    'H5ddlJSCfGP8ab65EnWaB2sd541CJAlM',  // Planful
  ];

  // We only care about the above clients
  if (!ALLOWED_CLIENTIDS.includes(context.clientID)) {
    return callback(null, user, context);
  }

  user.app_metadata = user.app_metadata || {};
  user.app_metadata["IdP Entity ID"] = "fed.identropy.hostanalytics.saml2"


  return callback(null, user, context);
}