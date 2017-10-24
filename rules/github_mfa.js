function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }
  if ((context.connection === 'github') && (!user.two_factor_authentication)) {
    console.log('GitHub user not allowed to log in because 2FA was disabled on the account: '+user.user_id);
    var reason = 'You must setup a security device ("MFA", "2FA") for your GitHub account in order to access ' +
      'this service. Please follow the ' +
      '<a href="https://help.github.com/articles/securing-your-account-with-two-factor-authentication-2fa/"> ' +
      'GitHub documentation</a> to setup the device and try logging in again.';

    context.redirect = {
     url: "https://sso.mozilla.com/forbidden?reason="+encodeURIComponent(reason)
    };
    return callback(null, null, context);
  } else {
    return callback(null, user, context);
  }
}
