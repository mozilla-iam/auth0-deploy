function (user, context, callback) {
  var ALLOWED_CLIENTIDS = [ 'poy4bMcyUJ7v2RuOTjs8WVDVcfCHbqqY', //testrp
                            '7euXeq96glWUS85bwDRCCs10xKGY93t0', //INXPO
                           'UCOY390lYDxgj5rU8EeXRtN6EP005k7V', //sso dash
                           'WXVdgVoCca11OtpGlK8Ir3pR9CBAlSA5', // slack prod
                           'BbenZUhB0TUVZnAtYvysfvpZKNHby4JX' // community analytics
  ];
  //See https://mozillians.org/en-US/group/nda/
  var WHITELIST_GROUP = 'mozilliansorg_nda';

  if (!user) {
    return callback(null, null, context);
  }

  if (ALLOWED_CLIENTIDS.indexOf(context.clientID) < 0) {
    return callback(null, user, context);
  }

  var request = require('request@2.56.0');
  // Request a new access-token for this API
  try {
    var options = { method: 'POST',
      url: 'https://'+context.request.hostname+'/oauth/token',
      headers: { 'content-type': 'application/json' },
      body: '{"client_id": "'+configuration.webtask_clientid+'","client_secret": "'+configuration.webtask_clientsecret+'" ,"audience":"'+configuration.personapi_audience+'","grant_type":"client_credentials"}' };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      var oauth_assertion = JSON.parse(body);
      personapi_req_profile(oauth_assertion.access_token);
    });
  } catch(e) {
    console.log('Error processing temporary-cis-api-integration rule (non-fatal): '+e);
    return callback(null, user, context);
  }

  function personapi_req_profile(accessToken) {
    // Request data from Person API
    return request({
      url: configuration.personapi_url+encodeURIComponent(user.user_id),
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    },
    function(err, response, body) {
      if (err) console.log('Error while querying personapi: '+err);
      if (response.statusCode !== 200) console.log('Error while querying personapi, code: '+response.statusCode);
      var person = JSON.parse(JSON.parse(body).body);

      if (person.groups && person.groups.indexOf(WHITELIST_GROUP) >= 0) {
        var extend = require('extend');
        console.log('user '+user.user_id+' is in group '+WHITELIST_GROUP+', reintegrating');
        var obj = [WHITELIST_GROUP];
        user.groups = extend(true, user.groups, obj);
        //XXX is this rule is re-enabled, change this to use app_metadata or things may fail
      }

      return callback(null, user, context);
    });
  }
}
