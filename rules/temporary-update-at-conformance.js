function (user, context, callback) {
  // only affect some apps
  var apps = [
    'aDL5o9SZRaYTH5zzkGntT4l76qydMbZe', // sso dashboard allizom
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V', // sso dashboard prod
    'mc1l0G4sJI2eQfdWxqgVNcRAD9EAgHib', // sso dashboard allizom
  ];

  if (apps.indexOf(context.clientID) >= 0) {
    // Fix http://openid.net/specs/openid-connect-implicit-1_0.html#StandardClaims
    // This ensures updated_at is an INTEGER (timestamp since the epoch) and not a string
    // So that libraries that follow the OpenID Connect spec function as intended.
    context.idToken.updated_at = Math.floor(new Date(user.updated_at)/1000);
    return callback(null, user, context);
  }
  callback(null, user, context);
}
