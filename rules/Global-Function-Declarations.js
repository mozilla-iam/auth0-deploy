function globalFunctionDeclaration(user, context, callback) {
  // Declare functions here and assign them to the `global` object (which is cached for a small amount of time)
  // This rule MUST be at the top of the rule list (FIRST) or other rules WILL FAIL
  // with a NON RECOVERABLE error, and thus LOGIN WILL FAIL FOR USERS

  // Since we do not use the /continue endpoint let's make sure we explictly fail with an UnauthorizedError
  // otherwise it is possible to continue the session even after a postError redirect is set.
  if (context.protocol === "redirect-callback") {
    return callback(new UnauthorizedError('The /continue endpoint is not allowed'), user, context);
  }

  // postError(code)
  // @code string with an error code for the SSO Dashboard to display
  // @rcontext the current Auth0 rule context (passed from the rule)
  // Returns rcontext with redirect set to the error
  if (!global.postError) {
    global.postError = (code, rcontext, prefered_connection_arg) => {
      var jwt = require('jsonwebtoken');
      var prefered_connection = prefered_connection_arg || ""; // Optional arg

      // Token is valid from 30s ago, to 1h from now
      var skey = Buffer.from(configuration.jwt_msgs_rsa_skey, 'base64').toString('ascii');
      var token = jwt.sign(
        {
          client: rcontext.clientName,
          code: code,
          connection: rcontext.connection,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 30,
          preferred_connection_name: prefered_connection,
          redirect_uri: rcontext.request.query.redirect_uri,
        },
        skey,
        { algorithm: 'RS256' }
      );

      skey = undefined;  // auth0 compiler does not allow 'delete' so we undefine instead

      var domain = context.tenant === "dev" ? "sso.allizom.org" : "sso.mozilla.com";
      rcontext.redirect = {
        url: `https://${domain}/forbidden?error=${token}`
      };

      return rcontext;
    };
  }

  return callback(null, user, context);
}
