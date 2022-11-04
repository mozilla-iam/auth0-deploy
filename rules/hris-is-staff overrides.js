function HRISIsStaff(user, context, callback) {
  // This overrides a design flaw uncovered by IAM-947.
  // Once the relevant dino-park code is deployed, this can be removed.
  const ALLOWED_CLIENTIDS = [
    'o2e391VjmnPk0115UedNTmRL8x2nySOa',  // people.mozilla.org
  ];

  // 2022-10-27 atoll - IAM-975 deployed, no longer required.
  const STAFF_OVERRIDE = [
    // 'ad|Mozilla-LDAP|atoll_admin',			// atoll_admin@mozilla.com

    // 'ad|Mozilla-LDAP|aerickson_admin',	// aerickson_admin@mozilla.com
    // 'ad|Mozilla-LDAP|cknowles_admin',		// cknowles_admin@mozilla.com
    // 'ad|Mozilla-LDAP|hwine_admin',			// hwine_admin@mozilla.com
  ];

  // We only care about LDAP and the above clients
  if (context.connectionStrategy !== 'ad' || !ALLOWED_CLIENTIDS.includes(context.clientID)) {
    return callback(null, user, context);
  }

  const isStaff = STAFF_OVERRIDE.includes(user.user_id);

  // these shouldn't happen, but... just in case
  user.app_metadata = user.app_metadata || {};
  user.app_metadata.groups = user.app_metadata.groups || [];
  user.groups = user.groups || [];

  // add `hris_is_staff` to groups if not there and user is staff
  if (isStaff) {
    if (!user.app_metadata.groups.includes('hris_is_staff')) {
      user.app_metadata.groups.push('hris_is_staff');
    }

    if (!user.groups.includes('hris_is_staff')) {
      user.groups.push('hris_is_staff');
    }

    console.log(`Re-integrated hris_is_staff group for ${user.user_id}`);
  }

  return callback(null, user, context);
}
