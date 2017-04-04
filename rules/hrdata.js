function (user, context, callback) {
  // This is a rule to specifically allow access to _HRData for specific ClientIDs
  // _HRData comes from WorkDay, through LDAP Connector
  // Ideally the RPs who need this data should request it directly from WorkDay, so this is a work-around.

  // Applications that are ALLOWED to see _HRData
  var ALLOWED_CLIENTIDS = [
    'IU80mVpKPtIZyUZtya9ZnSTs6fKLt3JO', //biztera.com
    'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84' //mozilla.tap.thinksmart.com
  ];

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) >= 0) {
    var extend = require('extend');
    context.samlConfiguration = context.samlConfiguration || {};
    //Remap SAML attributes as SAML cannot show Javascript objects
    for(var value in user._HRData){
      var nname = "http://schemas.security.allizom.org/claims/HRData/"+encodeURIComponent(value);
      var nvalue = "_HRData."+value;
      var obj = {};
      obj[nname] = nvalue;
      context.samlConfiguration.mappings = extend(true, context.samlConfiguration.mappings, obj);
    }
    callback(null, user, context);
  } else {
    // Wipe _HRData
    user._HRData = undefined;
    callback(null, user, context);
  }
}
