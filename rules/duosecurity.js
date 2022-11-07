function duoSecurity(user, context, callback) {
  var WHITELIST = [
    'moc+servicenow@mozilla.com',      // MOC see: https://bugzilla.mozilla.org/show_bug.cgi?id=1423903
    'moc-sso-monitoring@mozilla.com',  // MOC see: https://bugzilla.mozilla.org/show_bug.cgi?id=1423903
  ];

  if (!user.email_verified) {
    console.log(`duosecurity: user primary email NOT verified, refusing login for ${user.email}`);
    return callback(null, user, global.postError('notingroup', context));
  }

  // Fake 2FA
  if (WHITELIST.includes(user.email)) {
    console.log(`duosecurity: whitelisted account ${user.email}, no 2FA check performed`);
    context.multifactor = true;
    return callback(null, user, context);
  }

  // Any user logging in with LDAP (ad) requires MFA authentication.
  // TODO: Fix undefined behavior if the configuration variables aren't set
  if (context.connectionStrategy === 'ad') {
    context.multifactor = {
      host: configuration.duo_apihost_mozilla,
      ikey: configuration.duo_ikey_mozilla,
      provider: 'duo',
      skey: configuration.duo_skey_mozilla,
      username: user.email,

      // Optional: Force DuoSecurity everytime this rule runs. Defaults to false.
      // If accepted by users the cookie lasts for 30 days - i.e. 30 days MFA session (this cannot be changed)
      ignoreCookie: false,
    };
  }

  console.log(`duosecurity: ${user.email} is in LDAP and requires 2FA check`);

  return callback(null, user, context);
}
