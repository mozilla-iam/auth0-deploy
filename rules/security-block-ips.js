function securityBlockIps(user, context, callback) {
  const BLACKLIST_IPS = [];
  const BLACKLIST_RANGES = [];

  if (BLACKLIST_IPS.indexOf(context.request.ip) >= 0) {
    console.log("WARNING: Refusing login because IP address is blacklisted: "+context.request.ip);
    return callback(new UnauthorizedError('Access denied.'));
  }

  if (BLACKLIST_RANGES.indexOf(context.request.ip) >= 0) {
    var i;
    for (i = 0; i<BLACKLIST_RANGES.length; i++) {
      if (context.request.ip.startsWith(BLACKLIST_RANGES[i])) {
        console.log("WARNING: Refusing login because IP address RANGE is blacklisted: "+context.request.ip);
        return callback(new UnauthorizedError('Access denied.'));
      }
    }
  }
  callback(null, user, context);
}
