/*jshint esversion: 6 */

// Note: This function could be optimized to only call when
// 1 - we know it's a new user because created == updated dates
// 2 - we know the `blocked` attribute has changed, and we should reflect that (can we know this?)
function (user, context, callback) {
  const ACCESS_KEY_ID = configuration.CIS_access_key_id;
  const SECRET_KEY = configuration.CIS_access_secret_key;

  let AWS = require('aws-sdk');
  var lambda = new AWS.Lambda({
    apiVersion: '2015-03-31',
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_KEY,
    region: 'us-west-2',
    logger: console
  });

  params = {FunctionName: configuration.CIS_hook_arn,
    InvokeArgs: [user.user_id]
  };
  // We invoke fully async as to not block login flow
  // In case of any error, these should be caught in the function itself
  // If the invocation itself fails (i.e. there won't be logs), there is a backup batch job every 15min
  let res = lambda.invokeAsync(params);
  AWS.Request.send(res);
}
