function (user, context, callback) {
  // Id token claim namespace
  const NAMESPACE = 'https://sso.mozilla.com/claim/';

  if (configuration.restricted_users === undefined) {
    return callback(null, user, context);
  }

  // list of primary emails that should be in the restricted mode
  const restrictedUsers = configuration.restricted_users.split(',');
  
  // list of RPs the user will be restricted to (i.e. allowed to access)
  const reliersAllowedWithRestrictedAccess = [
    'FeqjZfpOqMIkcGKkd2fDjpnm5oSsOOZ2',  // aai-low-social-ldap-pwless.testrp.security.allizom.org for dev testing only (dev clientid)

    // The following are production clientIDs
    'smKTjsVVxUJDEkjIftOsP0bop2NWjysa',  // Google / Gsuite
    'Hypn042D0cqtqET33nRrnqOwAcIXOqx6',  // Workday
    'Qzs1IbNmnXB1js1KlhhdnwYZT9rwwF4U',  // Mana
    'WXVdgVoCca11OtpGlK8Ir3pR9CBAlSA5',  // Slack
    'TnqNECyCfoQYd1X7c4xwMF4PMsEfyWPj',  // Zoom
    '5gtZrLu2eyAapp1BgQsF11rhdPNt2lGP',  // Hub
    'adMlV8Ud0Z77GLfsaa4fb4oQj8ggf0ws',  // Expensify
    'o2e391VjmnPk0115UedNTmRL8x2nySOa',  // PMO/Dinopark
    'HdfEiM1SZibaQnOYTxLoMdxSh4a6ZKD3',  // Mozillians.org
    'cav8o4za5QGMXilUEjglH9cgJpQl33Ck',  // Moderator
    '7euXeq96glWUS85bwDRCCs10xKGY93t0',  // INXPO air.mozilla.org
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V',  // sso.mozilla.com
  ];

  if (restrictedUsers.includes(user.email)) {
    // Remove all group but what's allowed (IntranetWiki) just in case
    console.log(`User is restricted, wiping group data for ${user.user_id}`);
    user.app_metadata = user.app_metadata || {};
    user.app_metadata.groups = ['IntranetWiki'];
    user.groups = ['IntranetWiki'];
    user.ldap_groups = ['IntranetWiki'];
    context.idToken[`${NAMESPACE}groups`] = ['IntranetWiki'];

    // call auth0 to update the app metadata
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata);

    // This will mark the user as restricted for our records
    user.user_metadata = user.user_metadata || {};
    user.user_metadata.restricted_user = true;
    auth0.users.updateUserMetadata(user.user_id, user.user_metadata);

    if (reliersAllowedWithRestrictedAccess.includes(context.clientID)) {
      console.log(`Restricted user ${user.user_id} was allowed to access ${context.clientID}, ${context.clientName}`);
    } else {
      console.log(`Disallowed user ${user.user_id} access to ${context.clientID}, 
        ${context.clientName} because it is in restricted mode`);
      return callback(null, user, global.postError('notingroup', context));
    }
  }

  return callback(null, user, context);
}
