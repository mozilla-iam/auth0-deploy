function CISClaimsFixups(user, context, callback) {
  var namespace = 'https://sso.mozilla.com/claim/';
  var whitelist = ['']; // claim whitelist

  // If the only scopes requested are neither profile nor any scope beginning with
  // https:// then do not overload with custom claims
  let scopes_requested = context.request.query.scope ? context.request.query.scope.split(' ') : [];
  let fixup_needed = function(scope) {
    return scope === 'profile' || scope.startsWith('https://');
  };
  if (! scopes_requested.some(fixup_needed)) {
    console.log('Client '+context.clientID+' only requested '+scopes_requested+', not adding custom claims');
    return callback(null, user, context);
  }

  // CIS is our only functionality that can set app_metadata
  // Auth0 auto-integrate user.app_metadata.* into user.*
  // This rule cleans up the left overs for conciseness, clarity and size
  // (in particular this affects the id_token size, that goes onto GET queries
  // which are limited to 8k-if-not-less depending on the httpd server
  // settings)
  // Additional integration into user.app_metadata itself is at:
  // https://github.com/mozilla-iam/cis_functions/tree/master/functions/idvtoauth0


  // Fixup claims to be namespaced, for compat
  // Auth0 in the "OIDC-Conformant" mode will only allow these claims. That mode
  // enforces more than the OIDC spec in at least one regard:
  // Auth0 forbids the use of optional claims UNLESS these are namespaced by a URL.
  // See also https://auth0.com/docs/api-auth/tutorials/adoption/scope-custom-claims

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
    // We don't pass these to reduce the profile size. use the CIS claim instead, or the CIS API
    //"emails",
    //"dn",
    //"organizationUnits",
    //"email_aliases",
    //"_HRData",
    // This is "sub"
    // "user_id"
    // We don't use these anyway:
    //"identities"
    //"multifactor"
    //"clientID"
    //"created_at"
  ];

  // XXX NOTE WARNING XXX
  // Do NOT enable this as this will inflate the id_token
  // This feature may only be used for specific scope or endpoints, whenever auth0 let us do that
  // Import entire CIS profile to a namespaced claim
  //context.idToken[namespace+'cis'] = user.app_metadata;


  // Reduce profile size further
  // Note: do not wipe user.app_metadata as auth0 now re-overlays it in memory
  // user.app_metadata = undefined;
  user.email_aliases = undefined;
  user.dn = undefined;
  user.organizationUnits = undefined;

  // Re-map old and new profile claims to namespaced claims
  // Basically that's `groups`
  old_authzero_claims.forEach(function(claim) {
    try {
      if (whitelist.indexOf(context.clientID) < 0) {
        context.idToken[namespace+claim] = user[claim];
      }
    } catch (e) {
      console.log("Undefined claim (non-fatal): "+e);
    }
  });

  // AAI & AAL values
  user.aai = user.aai || [];
  context.idToken[namespace+'AAI'] = user.aai;
  user.aal = user.aal || "UNKNOWN";
  context.idToken[namespace+'AAL'] = user.aal;

/* WARNING  this entire block can be removed when mozillians.org / DinoPark uses it's own verification method for
* accounts */
/* START removable block */
  var WHITELIST = ['HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH', // mozillians.org account verification
                  't9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1', // https://web-mozillians-staging.production.paas.mozilla.community Verification client
                  'jijaIzcZmFCDRtV74scMb9lI87MtYNTA', // mozillians.org Verification Client
              ];
  if (WHITELIST.indexOf(context.clientID) >= 0) {
    // Original connection method's user_id (useful when the account is a linked account, this lets you know what the actual IdP
    // was used to login
    // Default to current user_id
    var originalConnection_user_id = user.user_id;
    var targetIdentity;
    // If we have linked account, check if we have a better match
    if (user.identities && user.identities.length > 1) {
      for (var i = 0; i < user.identities.length; i++) {
        targetIdentity = user.identities[i];
        // Find the identity which corresponding to the user logging in
        if ((targetIdentity.connection === context.connection) && (targetIdentity.provider === context.connectionStrategy)) {
          // If what we find has no `profileData` structure it means the user_id is the same as the one currently
          // logging in, so we don't need to do anything.
          // If it is, then we need to reconstruct a user_id from the identity data
          if (targetIdentity.profileData !== undefined) {
            originalConnection_user_id = targetIdentity.provider + '|' + targetIdentity.user_id;
          }
          break;
        }
      }
    }
    context.idToken[namespace+'original_connection_user_id'] = originalConnection_user_id;
  }
/* END of removable block */

  // Give info about CIS API
  context.idToken[namespace+'README_FIRST'] = 'Please refer to https://github.com/mozilla-iam/person-api in order to query Mozilla IAM CIS user profile data';
  return callback(null, user, context);
}
