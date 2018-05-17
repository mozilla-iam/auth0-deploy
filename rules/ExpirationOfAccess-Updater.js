function (user, context, callback) {
  user.app_metadata = user.app_metadata || {};

  // No expiration
  if (user.app_metadata.authoritativeGroups === undefined) {
    return callback(null, user, context);
  }

  var updated = false;
  for (var index = 0;index < user.app_metadata.authoritativeGroups.length;++index) {
    if (user.app_metadata.authoritativeGroups[index].uuid === context.clientID) {
      user.app_metadata.authoritativeGroups[index].lastUsed = new Date();
      updated = true;
      break; // we're done
    }
  }
  if (updated === true) {
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
      .catch(function(err) {
      console.log('ExpirationOfAccess: Error updating app_metadata (AuthoritativeGroups) for user '+user.user_id+': '+err);
    });
  }
  console.log('ExpirationOfAccess: Updated lastUsed for '+user.user_id);
  return callback(null, user, context);
}
