function (user, context, callback) {
  if ((context.connection === 'github') && (!user.two_factor_authentication)) {
    console.log('GitHub user not allowed to log in because 2FA was disabled on the account: '+user.user_id);
    context.redirect = {
     url: "https://sso.mozilla.com/forbidden?reason=githubmfa"
    };
    return callback(null, null, context);
  } else {
    return callback(null, user, context);
  }
}
