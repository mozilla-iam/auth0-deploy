function (user, context, callback) {
  const AWS_TIMEOUT = 10000;  // 10 seconds

  if (!('CIS_access_key_id' in configuration) ||
      !('CIS_access_secret_key' in configuration) ||
      !('CIS_hook_arn' in configuration)) {
    console.error(`Error: CIS hook configuration values are missing.`);
    return callback(null, user, context);
  }

  const now = new Date();
  const created = new Date(user.created_at);

  // User is LDAP? Bail because the user is created by the LDAP publisher
  // TODO: Should this use context.connectionStrategy, like force-ldap-logins-over-ldap?
  if (context.connection.startsWith('Mozilla-LDAP')) {
    return callback(null, user, context);
  }

  // User is older than 20 seconds? Bail - we only process newly added users
  if ((now - created) / 1000 > 20) {
    return callback(null, user, context);
  }

  const AWS = require('aws-sdk@2.5.3');
  const lambda = new AWS.Lambda({
    accessKeyId: configuration.CIS_access_key_id,
    apiVersion: '2015-03-31',
    httpOptions: {
      connectTimeout: AWS_TIMEOUT,
      timeout: AWS_TIMEOUT,
    },
    logger: console,
    region: 'us-west-2',
    secretAccessKey: configuration.CIS_access_secret_key,
  });

  // We invoke async (Event) as to not block login flow
  // See also https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property
  const params = {
    FunctionName: configuration.CIS_hook_arn,
    InvocationType: 'Event',  // Change to RequestResponse to block / debugging
    Payload: `["${user.user_id}"]`,
    LogType: 'None',          // Change to Tail for debugging
  };

  return lambda.invoke(params)
    .promise()
    .then(data => {
      console.log(`Successfully called CIS new user hook for user_id ${user.user_id}`);
      return callback(null, user, context);
    })
    .catch(error => {
      console.error(`Error: Unable to invoke CIS new user lambda hook: ${error}`);
      return callback(null, user, context);
    });
}
