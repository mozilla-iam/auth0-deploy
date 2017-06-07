function (user, context, callback) {
  // Currently, only run this rule if the user has app_metadata set
  // And thus has the Mozilla user-profile configured
  // Ideally the schema should be validated here as well for operational safety
  //
  // Whitelisting only certain user_ids for now as well (To be removed in prod)
  var USER_WHITE_LIST = [
    'email|58a49af917047975e79ff5ff', //gdestuynder passwordless
  ];
  if (USER_WHITE_LIST.indexOf(user.user_id) >=0) {
    if (typeof user.app_metadata !== 'undefined' && user.app_metadata) {
      var extend = require('extend');
      var user_profile = {};

      // Preserve original profile data that we care for
      // Work-around - auth0 will fail to process app_metadata is not set for some reason
      user_profile.app_metadata = {'invalid': 'ignore this'};
      user_profile.user_metadata = undefined;
      user_profile.clientID = user.clientID;
      user_profile.iss = user.iss;
      user_profile.azp = user.azp;
      user_profile.aud = user.aud;
      user_profile.iat = user.iat;
      user_profile.exp = user.exp;
      user_profile.nonce = user.nonce;
      user_profile.sub = user.sub;
      user_profile.access_token = user.access_token;
      user_profile.global_client_id = user.global_client_id;
      user_profile.multifactor = user.multifactor;

      // New profile data gets integrated to the base profile
      var new_user = extend(true, user_profile, user.app_metadata);
      callback(null, new_user, context);
    } else {
      // Regular auth0 user
       // XXX This should probably be changed into a login failure in the future
      callback(null, user, context);
    }
   } else {
     callback(null, user, context);
   }
}
