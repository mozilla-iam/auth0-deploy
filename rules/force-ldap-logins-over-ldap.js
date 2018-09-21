function (user, context, callback) {
var WHITELIST = ['HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH', // mozillians.org account verification
                   't9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1', // https://web-mozillians-staging.production.paas.mozilla.community Verification client
                   'jijaIzcZmFCDRtV74scMb9lI87MtYNTA', // mozillians.org Verification Client
                ];

var MOZILLA_STAFF_DOMAINS = [ 'mozilla.com', // Main corp domain
                              'mozillafoundation.org', // Main org domain
                              'readitlater.com', // Pocket
                              'getpocket.com', // Pocket
                              'mozilla.net', // Corp NetOps - should not happen, but just in case
                              'mozilla.org' // Corp org domain - should not happen, but just in case
                            ]


  // Sanity checks
  if (!user) {
    return callback(null, null, context);
  }

  if (!user.email_verified) {
    var code = 'primarynotverified';
    console.log('Primary email not verified, can\'t let the user in. This should not happen.');
    return callback(null, user, global.postError(code, context));
  }

  // Ignore whitelisted clients
  try {
    if (WHITELIST.indexOf(context.clientID) >= 0) {
      console.log('Whitelisted client '+context.clientID+', no login enforcement taking place');
      return callback(null, user, context);
    }
  } catch (e) {
    console.log('Client not found while checking force-user-to-login-with-most-secure-method whitelist (non-fatal): '+e);
  }

  // 'ad' is LDAP - Force LDAP users to log with LDAP here
  if (context.connectionStrategy !== 'ad') {
    for (var index = 0; index < MOZILLA_STAFF_DOMAINS.length; ++index) {
      if (user.email.endsWith(MOZILLA_STAFF_DOMAINS[index])) {
        var code = 'staffmustuselda';
        console.log('Staff user attempted to login with the wrong login method. We only allow ad (LDAP) for staff.');
        return callback(null, user, global.postError(code, context));
      }
    }
  }
}
