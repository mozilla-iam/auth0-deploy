function (user, context, callback) {
  // CIS is our only functionality that can set app_metadata
  // Auth0 auto-integrate user.app_metadata.* into user.*
  // This rule cleans up the left overs for conciseness, clarity and size
  // (in particular this affects the id_token size, that goes onto GET queries
  // which are limited to 8k-if-not-less depending on the httpd server
  // settings)
  // Additional integration into user.app_metadata itself is at:
  // https://github.com/mozilla-iam/cis_functions/tree/master/functions/idvtoauth0

  var namespace = 'https://sso.mozilla.com/claim/';

  if (typeof(user.app_metadata) !== undefined) {
    // Import entire CIS profile to an "OIDC conformant" namespace"
    // Note this is different from the Auth0 Management API's user data structure
    context.idToken[namespace+'cis'] = user.app_metadata;
    user.app_metadata = undefined;
    user.email_aliases = undefined;
    user.dn = undefined;
    user.organizationUnits = undefined;
  }
  callback(null, user, context);
}
