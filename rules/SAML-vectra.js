async function SAMLVectra(user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  var ALLOWED_CLIENTIDS = [
    'RmsIEl3T3cZzpKhEmZv1XZDns0OvTzIy',
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {
    // Vectra expects one and only one group which happens to map to a single role on the Vectra side
    // https://support.vectra.ai/s/article/KB-VS-1577

    user.vectra_group = "mozilliansorg_sec_network_detection";
    context.samlConfiguration.mappings = {
      "https://schema.vectra.ai/role": "vectra_group",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "email",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "given_name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "family_name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn": "upn"
    };

    return callback(null, user, context);
  }
  return callback(null, user, context);
}
