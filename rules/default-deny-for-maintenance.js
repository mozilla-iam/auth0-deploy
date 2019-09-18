function (user, context, callback) {
    // Denies all users from logging in
    // Only use for maintenance purposes
    
    return callback(null, user, global.postError('maintenancemode', context));
}
