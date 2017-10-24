function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }
  // Fix http://openid.net/specs/openid-connect-implicit-1_0.html#StandardClaims
  // This ensures updated_at is an INTEGER (timestamp since the epoch) and not a string
  // So that libraries that follow the OpenID Connect spec function as intended.
  context.idToken.updated_at = Math.floor(new Date(user.updated_at)/1000);
  callback(null, user, context);
}
