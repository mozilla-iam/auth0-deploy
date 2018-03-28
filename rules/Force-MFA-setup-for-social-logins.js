function (user, context, callback) {
  if ((context.connection === 'github') && (!user.two_factor_authentication)) {
    // Force MFA for GitHub logins
    console.log('GitHub user not allowed to log in because 2FA was disabled on the account: '+user.user_id);
    return callback(null, user, global.postError('githubrequiremfa', context));
  } else if ((context.connection === 'firefoxaccounts') && (!user.fxa_twoFactorAuthentication)) {
    // Force MFA for Firefox Accounts (FxA) logins
    // Note FxA also provides the standard amrValues which can be used to specify which 2FA we want to allow.
    // Right now we trust FxA to make this choice for us (which is, require TOTP for user.fxa_twoFactorAuthentication to
    // be set to True
    console.log('Firefox Accounts user not allowed to log in because 2FA was disabled on the account: '+user.user_id);
    return callback(null, user, global.postError('fxarequiremfa', context));

    // Forcing MFA for Google accounts is not currently supported
  } else {
    return callback(null, user, context);
  }
}
