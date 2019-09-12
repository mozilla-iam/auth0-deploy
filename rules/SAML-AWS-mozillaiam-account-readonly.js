function (user, context, callback) {
  var CLIENT_IDS = [
    "2lTZtlpqx4bslng167l1BBqTMusCAJkZ" // AWS Account Federated Access Dev
  ];
  // TODO : Move this data to an external version json file hosted in S3
  // possibly a set of files that are owned by AWS account holders that is then aggregated into a single file
  // Create an IAM User that can read that file and api keys for that user
  // Add the api keys to an Auth0 secret
  // Use Auth0 webtask storage to cache the file locally : https://webtask.io/docs/storage
  // Test for content in the storage cache and re-fetch if missing
  var DATA = {
    "accounts": {
      "320464205386" : "arn:aws:iam::320464205386:saml-provider/auth0-prod"
    },
    "account_role_group_mapping" : {
      "320464205386" : {
        "arn:aws:iam::320464205386:role/FederatedAWSAccountRead" : [
          "mozilliansorg_mozilla-iam-aws-access",
          "mozilla-iam-aws-access-read-only"
        ],
        "arn:aws:iam::320464205386:role/FederatedAWSAccountAdmin" : [
          "mozilliansorg_mozilla-iam-aws-access"
        ]

      }
    }
  };
  var awsRole = [];
  var intersects = function(a1, a2) {
    return a1.filter(function(n) {
      return a2.indexOf(n) !== -1;
    });
  };
  if (CLIENT_IDS.indexOf(context.clientID) >= 0) {
    for (var account in DATA.account_role_group_mapping) {
      for (var roleArn in DATA.account_role_group_mapping[account]) {
        if (user.hasOwnProperty("groups") && intersects(
            DATA.account_role_group_mapping[account][roleArn],
            user.groups).length > 0) {
          awsRole.push(roleArn + "," + DATA.accounts[account]);
        }
      }
    }
    user.awsRole = awsRole;
    user.awsRoleSession = user.email;
    context.samlConfiguration.mappings = {
      "https://aws.amazon.com/SAML/Attributes/Role": "awsRole",
      "https://aws.amazon.com/SAML/Attributes/RoleSessionName": "awsRoleSession"
    };
  }
  callback(null, user, context);
}
