/**
 * @title Link Accounts with Same Email Address while Merging Metadata
 * @overview Link any accounts that have the same email address while merging metadata.
 * @gallery true
 * @category access control
 *
 * This rule will link any accounts that have the same email address while merging metadata.
 * Source/Original: https://github.com/auth0/rules/blob/master/src/rules/link-users-by-email-with-metadata.js
 *
 * Please see https://github.com/mozilla-iam/mozilla-iam/blob/master/docs/deratcheting-user-flows.md#user-logs-in-with-the-mozilla-iam-system-for-the-first-time
 * for detailed explanation of what happens here.
 *
 */

function linkUsersByEmailWithMetadata(user, context, callback) {
  const fetch = require('node-fetch@2.6.1');

  // Check if email is verified, we shouldn't automatically
  // merge accounts if this is not the case.
  if (!user.email || !user.email_verified) {
    return callback(null, user, context);
  }

  const userApiUrl = auth0.baseUrl + '/users';
  const userSearchApiUrl = auth0.baseUrl + '/users-by-email';

  const params = new URLSearchParams({
    email: user.email
	});

  fetch(userSearchApiUrl + params.toString(),
  {
    headers: {
      Authorization: 'Bearer ' + auth0.accessToken
    }
  }).then((response) => {
    if (response.status !== 200) return callback(new Error("API Call failed: " + response.body));

    var data = response.json;
    // Ignore non-verified users
    data = data.filter(u => u.email_verified);

    if (data.length === 1) {
      // The user logged in with an identity which is the only one Auth0 knows about
      // Do not perform any account linking
      return callback(null, user, context);
    }

    if (data.length === 2) {
      // Auth0 is aware of 2 identities with the same email address which means
      // that the user just logged in with a new identity that hasn't been linked
      // into the other existing identity
      return linkAccount(data.filter(u => u.user_id !== user.user_id)[0]);
    } else {
      // data.length is > 2 which, post November 2020 when all identities were
      // force linked manually, shouldn't be possible
      var error_message = `Error linking account ${user.user_id} as there are ` +
          `over 2 identities with the email address ${user.email} ` +
          data.map(x => x.user_id).join();
      console.log(error_message);
      publishSNSMessage(`${error_message}\n\ndata : ${JSON.stringify(data)}\nuser : ${JSON.stringify(user)}`);
      return callback(new Error(error_message));
    }
  }).catch(err => {
    return callback(err);
  });

  const linkAccount = primaryUser => {
    // Link the current logged in identity as a secondary into primaryUser as a primary
    console.log(`Linking secondary identity ${user.user_id} into primary identity ${primaryUser.user_id}`);

    // Update app, user metadata as Auth0 won't back this up in user.identities[x].profileData
    user.app_metadata = user.app_metadata || {};
    user.user_metadata = user.user_metadata || {};
    auth0.users.updateAppMetadata(primaryUser.user_id, user.app_metadata)
    .then(auth0.users.updateUserMetadata(primaryUser.user_id, Object.assign({}, user.user_metadata, primaryUser.user_metadata)))
    // Link the accounts
    .then(function() {
      fetch( userApiUrl + '/' + primaryUser.user_id + '/identities',
      {
        method: 'post',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken
        },
        body: JSON.stringify({ provider: user.identities[0].provider, user_id: String(user.identities[0].user_id) }),
      }).then( response => {
        if (!response.ok && response.status >= 400) {
          console.log("Error linking account: " + response.statusText);
          return callback(new Error('Error linking account: ' + response.statusText));
        }
        // Finally, swap user_id so that the current login process has the correct data
        context.primaryUser = primaryUser.user_id;
        context.primaryUserMetadata = primaryUser.user_metadata || {};
        return callback(null, user, context);
      });
    }).catch( err => {
      console.log("An unknown error occurred while linking accounts: " + err);
      return callback(err);
    });
  };
  const publishSNSMessage = message => {
    if (!("aws_logging_sns_topic_arn" in configuration) ||
        !("aws_logging_access_key_id" in configuration) ||
        !("aws_logging_secret_key" in configuration)) {
      console.log("Missing Auth0 AWS SNS logging configuration values");
      return false;
    }

    const SNS_TOPIC_ARN = configuration.aws_logging_sns_topic_arn;
    const ACCESS_KEY_ID = configuration.aws_logging_access_key_id;
    const SECRET_KEY = configuration.aws_logging_secret_key;

    let AWS = require('aws-sdk@2.5.3');
    let sns = new AWS.SNS({
      apiVersion: '2010-03-31',
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_KEY,
      region: 'us-west-2',
      logger: console,
    });
    const params = {
      Message: message,
      TopicArn: SNS_TOPIC_ARN,
    };
    sns.publish(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });

  };
}
