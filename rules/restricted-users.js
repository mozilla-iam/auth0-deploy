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
    'smKTjsVVxUJDEkjIftOsP0bop2NWjysa',  // Google / GSuite
    'Hypn042D0cqtqET33nRrnqOwAcIXOqx6',  // Workday
    'Qzs1IbNmnXB1js1KlhhdnwYZT9rwwF4U',  // mana.mozilla.org
    'WXVdgVoCca11OtpGlK8Ir3pR9CBAlSA5',  // Slack
    'TnqNECyCfoQYd1X7c4xwMF4PMsEfyWPj',  // Zoom
    '5gtZrLu2eyAapp1BgQsF11rhdPNt2lGP',  // mozilla.service-now.com / The Hub
    'adMlV8Ud0Z77GLfsaa4fb4oQj8ggf0ws',  // expensify.com
    'o2e391VjmnPk0115UedNTmRL8x2nySOa',  // people.mozilla.org / Dinopark
    'HdfEiM1SZibaQnOYTxLoMdxSh4a6ZKD3',  // mozillians.org
    'cav8o4za5QGMXilUEjglH9cgJpQl33Ck',  // moderator.mozilla.org
    '7euXeq96glWUS85bwDRCCs10xKGY93t0',  // INXPO air.mozilla.org
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V',  // sso.mozilla.com
    'LGK34V7wTjZ8tkMSCQhxI0ynfiMcAsvg',  // chat.mozilla.org / Matrix IM
    '7wyIItkJX4t7vYEaDmGrwP9k2fBh5qWP',  // prod.testrp.allizom.org
    'NhzqLGjjqXIp3kGoonkTLSO7awPBhWsK',  // Udemy
  ];

  if (restrictedUsers.includes(user.email)) {
    // Remove all group but what's allowed (IntranetWiki) just in case
    console.log(`User is restricted, wiping group data for ${user.user_id}`);
    user.app_metadata = user.app_metadata || {};
    const groups_to_add = ['IntranetWiki'];
    user.app_metadata.groups = groups_to_add;
    user.groups = groups_to_add;
    user.ldap_groups = groups_to_add;
    context.idToken[`${NAMESPACE}groups`] = groups_to_add;

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
