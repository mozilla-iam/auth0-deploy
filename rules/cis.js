function (user, context, callback) {
  // CIS is our only functionality that can set app_metadata
  // Auth0 auto-integrate user.app_metadata.* into user.*
  // This rule cleans up the left overs for conciseness, clarity and size
  // (in particular this affects the id_token size, that goes onto GET queries
  // which are limited to 8k-if-not-less depending on the httpd server
  // settings)
  // Additional integration into user.app_metadata itself is at:
  // https://github.com/mozilla-iam/cis_functions/tree/master/functions/idvtoauth0
  if (typeof(user.app_metadata) !== undefined) {
    user.app_metadata = undefined;
    user.email_aliases = undefined;
    user.dn = undefined;
    user.organizationUnits = undefined;
  }
  callback(null, user, context);
}
