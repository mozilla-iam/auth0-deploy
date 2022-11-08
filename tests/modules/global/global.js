const configuration = require('./configuration.js');
const jwt = require('jsonwebtoken');

module.exports = {
  // this is taken from Global-Function-Declarations.js
  postError: (code, rcontext, prefered_connection_arg) => {
    var prefered_connection = prefered_connection_arg || ""; // Optional arg

    // Token is valid from 30s ago, to 1h from now
    var skey = Buffer.from(configuration.jwt_msgs_rsa_skey, 'base64').toString('ascii');
    var token = jwt.sign(
      {
        code: code,
        redirect_uri: rcontext.request.query.redirect_uri,
        client: rcontext.clientName,
        connection: rcontext.connection,
        preferred_connection_name: prefered_connection,
        iat: Math.floor(Date.now() / 1000) - 30,
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      skey,
      { algorithm: 'RS256' }
    );

    skey = undefined; // auth0 compiler does not allow 'delete' so we undefine instead
    rcontext.redirect = {
      url: `https://sso.mozilla.com/forbidden?error=${token}`,
    };

    return rcontext;
  },
};
