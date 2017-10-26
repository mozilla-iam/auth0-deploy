function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  var ALLOWED_CLIENTIDS = [
    'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84', //mozilla.tap.thinksmart.com
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {
    var extend = require('extend');
    context.samlConfiguration = context.samlConfiguration || {};
    var mappings = {};
    mappings = {
      "Email": "email",
      "firstName": "given_name",
      "lastName": "family_name",
    };
    context.samlConfiguration.mappings = extend(true, context.samlConfiguration.mappings,mappings);
    callback(null, user, context);
  } else {
    callback(null, user, context);
  }
}
