function temporaryHRData(user, context, callback) {
  // This is a rule to specifically allow access to _HRData for specific ClientIDs
  // _HRData comes from WorkDay, through LDAP Connector
  // Ideally the RPs who need this data should request it directly from WorkDay, so this is a work-around.

  // Applications that are ALLOWED to see _HRData
  var ALLOWED_CLIENTIDS = [
    'IU80mVpKPtIZyUZtya9ZnSTs6fKLt3JO', //biztera.com
    'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84', //mozilla.tap.thinksmart.com
    'fNzzMG3XfkxQJcnUpgrGyH2deII3nFFM', //pto1.dmz.mdc1.mozilla.com
    'T2tB7Ss8It7PKrw3ijazoXu9PgZniLPD', //https://web-mozillians-staging.production.paas.mozilla.community (dev auth0)
    'FQw134gwheaK3KkW6fQf0JPV6P7h2yo1', //https://web-mozillians-staging.production.paas.mozilla.community (prod auth0)
    'HdfEiM1SZibaQnOYTxLoMdxSh4a6ZKD3', //mozillians.org
    'dcdQ6M9yaZfyy1fPLiXIzORHFHEiwjNc', //Staples - Gear Store - Stage
    'wsvwqDk1Z2zYa6AU4mMT5Dq4H40lfvF2', //Staples - Gear Store - Production
    'TnqNECyCfoQYd1X7c4xwMF4PMsEfyWPj', //mozilla.zoom.us
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
    // Wipe _HRData (do use non-dot notation)
    user['_HRData'] = {"placeholder": "empty"};
    callback(null, user, context);
  }
}
