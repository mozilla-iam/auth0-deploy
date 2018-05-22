function (user, context, callback) {
  // Declare functions here and assign them to the `global` object (which is cached for a small amount of time)
  // This rule MUST be at the top of the rule list (FIRST) or other rules WILL FAIL
  // with a NON RECOVERABLE error, and thus LOGIN WILL FAIL FOR USERS

  // updateAccessExpiration()
  // Always returns - will attempt to update user.app_metadata.authoritativeGroups[].lastUsed timestamp
  // for the RP/client_id we're currently trying to login to
  if (!global.updateAccessExpiration) {
    global.updateAccessExpiration = function updateAccessExpiration() {
      user.app_metadata = user.app_metadata || {};
      if (user.app_metadata.authoritativeGroups === undefined) {
          console.log('ExpirationOfAccess: Not used here');
          return;
      }

      var updated = false;
      for (var index = 0;index < user.app_metadata.authoritativeGroups.length;++index) {
        if (user.app_metadata.authoritativeGroups[index].uuid === context.clientID) {
          user.app_metadata.authoritativeGroups[index].lastUsed = new Date();
          updated = true;
          break; // we're done
        }
      }
      if (updated === true) {
        auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
          .catch(function(err) {
          console.log('ExpirationOfAccess: Error updating app_metadata (AuthoritativeGroups) for user '+user.user_id+': '+err);
        });
      }
      console.log('ExpirationOfAccess: Updated lastUsed for '+user.user_id);
      return;
    };
      return;
  }

  // postError(code)
  // @code string with an error code for the SSO Dashboard to display
  // @rcontext the current Auth0 rule context (passed from the rule)
  // Returns rcontext with redirect set to the error
  if (!global.postError) {
    global.postError = function postError(code, rcontext, prefered_connection_arg) {
      var jwt = require('jsonwebtoken');
      var prefered_connection = prefered_connection_arg || ""; // Optional arg

      // Token is valid from 30s ago, to 1h from now
      var skey = new Buffer(configuration.jwt_msgs_rsa_skey, 'base64').toString('ascii');
      var token = jwt.sign({ code: code,
                             redirect_uri: rcontext.request.query.redirect_uri,
                             client: rcontext.clientName,
                             connection: rcontext.connection,
                             preferred_connection_name: prefered_connection,
                             iat: Math.floor(Date.now() / 1000) - 30,
                             exp: Math.floor(Date.now() / 1000) + 3600 },
                           skey, {algorithm: 'RS256'});
      skey = undefined; // auth0 compiler does not allow 'delete' so we undefine instead
      rcontext.redirect = {
        url: "https://sso.mozilla.com/forbidden?error="+token
      };

      return rcontext;
    };
  }
  callback(null, user, context);
}
