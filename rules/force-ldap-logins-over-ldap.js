function (user, context, callback) {
  var WHITELIST = [
    'HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH',  // mozillians.org account verification
    't9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1',  // https://web-mozillians-staging.production.paas.mozilla.community Verification client
    'jijaIzcZmFCDRtV74scMb9lI87MtYNTA',  // mozillians.org Verification Client
  ];

  var MOZILLA_STAFF_DOMAINS = [
     'mozilla.com',            // Main corp domain
     'mozillafoundation.org',  // Main org domain
  ];

  // Sanity checks
  if (!user) {
    return callback(null, null, context);
  }

  if (!user.email_verified) {
    var code = 'primarynotverified';
    console.log(`Primary email not verified, can't let the user in. This should not happen.`);
    return callback(null, user, global.postError(code, context));
  }

  // Ignore whitelisted clients
  if (WHITELIST.includes(context.clientID)) {
    console.log(`Whitelisted client ${context.clientID}, no login enforcement taking place`);
    return callback(null, user, context);
  }

  // 'ad' is LDAP - Force LDAP users to log with LDAP here
  if (context.connectionStrategy !== 'ad') {
    for (domain of MOZILLA_STAFF_DOMAINS) {
      if (user.email.endsWith(domain)) {
        var code = 'staffmustuseldap';
        console.log(`Staff or LDAP user attempted to login with the wrong login method. We only allow ad (LDAP) for staff: ${user.email}`);
        return callback(null, user, global.postError(code, context));
      }
    }
  }

  return callback(null, user, context);
}
