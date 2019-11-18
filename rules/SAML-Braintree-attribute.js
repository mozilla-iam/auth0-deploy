function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  var ALLOWED_CLIENTIDS = [
    'x7TF6ZtJev4ktoHR4ObWmA9KeqGni6rq', //Braintree
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {

      user.grant_all_merchant_accounts = "true";

      context.samlConfiguration.mappings = {
        "grant_all_merchant_accounts":       "grant_all_merchant_accounts",
        "roles":        "app_metadata.groups",
      };

    callback(null, user, context);
  } else {
      callback(null, user, context);
  }
}
