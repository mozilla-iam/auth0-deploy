function SAMLNavexPartitionId(user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  var ALLOWED_CLIENTIDS = [
    'gL08r5BRiweqf4aDQVX6xB4FHyFepFlM', //Navex - Stage
    'iz2qSHo0lSv2nRZ8V3JnOESX5UR4dcpX', //Navex
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {

    user.partition_id = "MOZILLA";

    context.samlConfiguration.mappings = {
      "PARTITION":       "partition_id",
    };

    return callback(null, user, context);
  }

  return callback(null, user, context);
}
