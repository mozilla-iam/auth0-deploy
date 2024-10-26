exports.onExecutePostLogin = async (event, api) => {
  console.log("Running action:", "OIDCConformanceWorkaround");

  // This issue only affects certain application
  var apps = [
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V', // sso dashboard prod
    '2KNOUCxN8AFnGGjDCGtqiDIzq8MKXi2h', // sso dashboard allizom
  ];

  if (apps.indexOf(event.client.client_id) >= 0) {
    // Fix http://openid.net/specs/openid-connect-implicit-1_0.html#StandardClaims
    // This ensures updated_at is an INTEGER (timestamp since the epoch) and not a string
    // So that libraries that follow the OpenID Connect spec function as intended.
    api.idToken.setCustomClaim(`updated_at`, Math.floor(Number(new Date(event.user.updated_at))/1000));
    return;
  }
  return;
}
