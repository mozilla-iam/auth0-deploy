// This is the Fetch User Profile Script for FxA
// latest-dev URLs:
// Authorization endpoint: https://oauth-latest.dev.lcip.org/v1/authorization
// Token endpoint: https://oauth-latest.dev.lcip.org/v1/token
// scopes: openid profile
function(accessToken, ctx, cb) {
  // See docs at https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Firefox_Accounts/Introduction
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
    // If you need to debug FxA's reply, un-comment this and look at the webtask logs
    // console.log('FxA profile output: '+p);
    return cb(null, {
      user_id: p.uid,
      picture: p.avatar,
      preferredLanguage: p.locale,
      email: p.email,
      email_verified: true,
      fxa_sub: p.sub,
      fxa_amrValues: p.amrValues,
      fxa_twoFactorAuthentication: p.twoFactorAuthentication
    });

  });
}
