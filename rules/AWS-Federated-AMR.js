function (user, context, callback) {
  var WHITELIST = ['7PQFR1tyqr6TIqdHcgbRcYcbmbgYflVE', // ldap-pwless.testrp.security.allizom.org
                   'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT', // Federated AWS CLI auth0-dev
                   'N7lULzWtfVUDGymwDs0yDEq6ZcwmFazj', // Federated AWS CLI auth0-prod
  ];
  if (WHITELIST.indexOf(context.clientID) >= 0) {
    const request = require('request');
    var aws_groups;
    console.log("Enriching id_token with amr for AWS Federated CLI");
    // Amazon will read in the id token's `amr` list and allow you to match on policies with a string condition.
    // See
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html#Conditions_String
    //
    // Note that this abuses the `amr` value (see https://tools.ietf.org/html/rfc8176) as these are not listed as
    // registered values, and that groups are not authentication methods.
    //
    // NOTES:
    // - Amazon will accept an id_token of MAXIMUM 2048 bytes
    // - Amazon will process an `amr` value in that token that results in a certain unknown maximum size. Through
    // experimenting with sizes, this is about 26 groups of "reasonable size" (15-20 characters). This means we
    // shouldn't send too many groups in the `amr` or things will fail.

    // Fetching valid groups as we need to reduce `amr` 
    // NOTE: This rule REQUIRES configuration.aws_mapping_url to be set. The file looks like this:
    // {
    //  "team_opsec": [
    //    "arn:aws:iam::656532927350:role/gene-test-federated-role-mozlando"
    //  ],
    //  "vpn_eis_automation" : [
    //      "arn:aws:iam::656532927350:role/federated-aws-cli-test-may2019"
    //    ]
    // }
    var options = { method: 'GET', url: configuration.aws_mapping_url };
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      if (response.statusCode !== 200) {
        console.log('Could not fetch AWS amr mappings URL: '+response.statusCode);
      } else {
        aws_groups = Object.keys(JSON.parse(body));
        user.groups = user.groups || [];
        context.idToken.amr = user.groups.filter(function(n) { return aws_groups.indexOf(n)  > -1 ;});
        console.log("Returning idToken with idToken.amr size == "+context.idToken.amr.length+" (should be ~< 26 and idToken < 2048) for user_id "+user.user_id);
        return callback(null, user, context);
      }
    });
  } else {
    return callback(null, user, context);
  }
}
