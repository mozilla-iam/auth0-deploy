function (user, context, callback) {
  // NOTE: _HRData comes from WorkDay, through LDAP Connector
  //
  // This fix is only for Mozillians.org
  // If the user does not have a hris_is_staff group but _HRData is present and has staff data, it will force-add the
  // missing group
  // This fix is no longer needed when CIS PersonAPI v2 is present as this data would be written in all cases
  var ALLOWED_CLIENTIDS = [
    'T2tB7Ss8It7PKrw3ijazoXu9PgZniLPD', //https://web-mozillians-staging.production.paas.mozilla.community (dev auth0)
    'FQw134gwheaK3KkW6fQf0JPV6P7h2yo1', //https://web-mozillians-staging.production.paas.mozilla.community (prod auth0)
    'HdfEiM1SZibaQnOYTxLoMdxSh4a6ZKD3', //mozillians.org
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {
    user.app_metadata = user.app_metadata || {};
    user.app_metadata.groups = user.app_metadata.groups || [];

    // Group not present?
    if (user.app_metadata.groups.indexOf('hris_is_staff') < 0) {
      // But user is staff?
      if (user._HRData.cost_center !== undefined) {
        //Reintegrate this specific group
        Array.prototype.push.apply(user.app_metadata.groups, ['hris_is_staff']);
        Array.prototype.push.apply(user.groups, ['hris_is_staff']);
        console.log('Re-integrated hris_is_staff group for '+user.user_id);
      }
    }
  }
  callback(null, user, context);
}
