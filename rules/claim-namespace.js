function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  // Auth0 in the "OIDC-Conformant" mode will only allow these claims. That mode
  // enforces more than the OIDC spec in at least one regard:
  // Auth0 forbids the use of optional claims UNLESS these are namespaced by a URL.
  // See also https://auth0.com/docs/api-auth/tutorials/adoption/scope-custom-claims

  // This is the namespace we used for our own claims
  var namespace = 'https://sso.mozilla.com/claim/';
  var whitelist = [''];

  // These claims can be used directly and/or are preserved if integrated by Auth0
  // See also: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
  var std_oidc_claims = [
    "sub",
    "name",
    "given_name",
    "family_name",
    "middle_name",
    "nickname",
    "preferred_username",
    "profile",
    "picture",
    "website",
    "email",
    "email_verified",
    "gender",
    "birthdate",
    "zoneinfo",
    "locale",
    "phone_number",
    "phone_number_verified",
    "address",
    "updated_at"
    ];

  // These are the claims Auth0 used to provide, plus some of ours
  var old_authzero_claims = [
    "groups",
    "emails",
    "dn",
    "organizationUnits",
    "email_aliases",
    "_HRData",
    // This is "sub"
    // "user_id"
    // We don't use these anyway:
    //"identities"
    //"multifactor"
    //"clientID"
    //"created_at"
  ];

  // XXX Todo load the enriched/new profile claims (when we start using these)

  // Re-map old and new profile claims to namespaced claims
  old_authzero_claims.forEach(function(claim) {
    try {
      if (whitelist.indexOf(context.clientID) < 0) {
        context.idToken[namespace+claim] = user[claim];
      }
    } catch (e) {
      console.log("Undefined claim (non-fatal): "+e);
    }
  });
  callback(null, user, context);
}
