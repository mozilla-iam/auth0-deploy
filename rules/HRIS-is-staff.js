function (user, context, callback) {
  // NOTE: _HRData comes from WorkDay, through LDAP Connector
  //
  // This fix is only for Mozillians.org and the SSO dashboard
  // If the user does not have a hris_is_staff group but _HRData is present and has staff data
  // it will force-add the missing group
  // 
  // This fix is no longer needed when CIS PersonAPI v2 is present as this data would be written in all cases
  const ALLOWED_CLIENTIDS = [
    'T2tB7Ss8It7PKrw3ijazoXu9PgZniLPD',  // https://web-mozillians-staging.production.paas.mozilla.community (dev auth0)
    'FQw134gwheaK3KkW6fQf0JPV6P7h2yo1',  // https://web-mozillians-staging.production.paas.mozilla.community (prod auth0)
    'HdfEiM1SZibaQnOYTxLoMdxSh4a6ZKD3',  // mozillians.org
    'mc1l0G4sJI2eQfdWxqgVNcRAD9EAgHib',  // sso dashboard allizom (auth0 dev)
    'aDL5o9SZRaYTH5zzkGntT4l76qydMbZe',  // sso dashboard allizom (auth0 prod)
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V',  // sso dashboard prod (auth0 prod)
  ];

  // We only care about LDAP and the above clients
  if (context.connectionStrategy !== 'ad' || !ALLOWED_CLIENTIDS.includes(context.clientID)) {
    return callback(null, user, context);
  }

  const isStaff = user._HRData !== undefined && user._HRData.cost_center !== undefined;
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || [];
  user.groups = user.groups || [];

  // add `hris_is_staff` to groups if not there and user is staff
  if (isStaff &&
      !user.app_metadata.groups.includes('hris_is_staff') &&
      !user.groups.includes('hris_is_staff')) {
    user.app_metadata.groups.push('hris_is_staff');
    user.groups.push('hris_is_staff');

    console.log(`Re-integrated hris_is_staff group for ${user.user_id}`);
  }

  return callback(null, user, context);
}
