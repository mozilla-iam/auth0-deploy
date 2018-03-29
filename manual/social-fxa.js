// This is the Fetch User Profile Script for FxA
// Note the `acr_values` parameter, which requires AAL2 authenticator assurance level
// (https://pages.nist.gov/800-63-3/sp800-63b.html)
// Authenticator Assurance Level 2: AAL2 provides high confidence that the claimant controls an authenticator(s) bound to the subscriber’s account. Proof of possession and control of two different authentication factors is required through secure authentication protocol(s). Approved cryptographic techniques are required at AAL2 and above.
// We'd also be fine with AAL3 of course, though FxA supports up to AAL2 at this time.

// latest-dev URLs:
// Authorization endpoint: https://oauth-latest.dev.lcip.org/v1/authorization?acr_values=AAL2
// Token endpoint: https://oauth-latest.dev.lcip.org/v1/token
// scopes: openid profile
//
function(accessToken, ctx, cb) {
  // Auth0 already verified the id_token and it's signature at this stage
  // See docs at https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Firefox_Accounts/Introduction
  // See also https://github.com/mozilla/fxa-oauth-server/issues/519#issuecomment-367196241 for information on fields
  // Note that we assert this email is verified by FxA, though we do not check `amr` contains `email`. This is because
  // We currently assert `email_verified` to be true if it has ever been verified, not if it's "just been verified"
  var id_token = JSON.parse(jwt.decode(ctx.id_token));

  // Request additional profile info, such as picture, locale, etc.
  request.get('https://latest.dev.lcip.org/profile/v1/profile', {
    'headers': {
      'Authorization': 'Bearer ' + accessToken,
      'User-Agent': 'MozillaIAM-Auth0'
    }
  }, function(e, r, b) {
    if (e) return callback(e);
    if (r.statusCode !== 200) {
      return cb(new Error('Failed to fetch user profile. StatusCode:' + r.statusCode));
    }

    var p = JSON.parse(b);

    if (id_token.sub != p.sub) {
      return cb(new Error('sub does not match, this should not happen'));
    }

    return cb(null, {
      user_id: id_token.sub,
      picture: p.avatar,
      preferredLanguage: p.locale,
      email: p.email,
      email_verified: true,
      fxa_sub: id_token.sub,
      amr: id_token.amr,
      acr: id_token.acr,
      fxa_twoFactorAuthentication: p.twoFactorAuthentication
    });

  });
}
