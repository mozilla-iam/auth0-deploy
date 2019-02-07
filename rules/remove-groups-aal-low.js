function (user, context, callback) {
  // Remove group data for AAL LOW (i.e. passwordless) if present during login
  user.aal = user.aal || "UNKNOWN";

  if (user.aal == "LOW") {
    console.log("User AAL is LOW, removing group data: "+user.user_id);
    user.groups = [];
    if (user.app_metadata.groups !== undefined) {
      user.app_metadata.groups = [];
    }
  }
  callback(null, user, context);
}
