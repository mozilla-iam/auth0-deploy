/*jshint esversion: 6 */

function (user, context, callback) {
  const ACCESS_KEY_ID = configuration.CIS_access_key_id;
  const SECRET_KEY = configuration.CIS_access_secret_key;
  let now = new Date();
  let created = new Date(user.created_at);

  // User is LDAP? Bail
  if (context.connection.startsWith("Mozilla-LDAP")) {
    return callback(null, user, context);
  }
  // User is older than 20 seconds? Bail - we only process newly added users
  if ((now-created)/1000 > 20) {
    return callback(null, user, context);
  }

  let AWS = require('aws-sdk');
  var lambda = new AWS.Lambda({
    apiVersion: '2015-03-31',
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_KEY,
    region: 'us-west-2',
    logger: console
  });

 // We invoke async (Event) as to not block login flow
 // See also https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property
 var params = {FunctionName: configuration.CIS_hook_arn,
               InvocationType: "Event", // Change to RequestResponse to block / debugging
               Payload: `["${user.user_id}"]`,
               LogType: "None" // Change to Tail for debugging
  };
  lambda.invoke(params, function(err, data) {
         if (err) {
            console.log(`Error ${err}`);
         }
  });
  return callback(null, user, context);
}
