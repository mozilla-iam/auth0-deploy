function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  if (context.connectionStrategy === 'ad') {
    context.multifactor = {
      provider: 'duo',
      ikey: configuration.duo_ikey_mozilla,
      skey: configuration.duo_skey_mozilla,
      host: configuration.duo_apihost_mozilla,

      // optional:
      // Force DuoSecurity everytime this rule runs. Defaults to false.
      // If accepted by users the cookie lasts for 30 days - i.e. 30 days MFA session (this cannot be changed)
      ignoreCookie: false,
      username: user.email,
    };
  }
  callback(null, user, context);
}
