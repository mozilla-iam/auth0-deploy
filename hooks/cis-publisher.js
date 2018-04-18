/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Required webtask secrets:
 * aws_access_key_id
 * aws_secret_access_key
 * aws_region (such as 'us-west-2')
 * aws_arn (ARN of CloudWatch destination)
 * api_url (CIS Publisher API URL)
 */

'use latest';

const request = require("request");
const AWS = require("aws-sdk");
const util = require("util");

/**
@param {object} cwe - Cloud Watch Events object - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatchEvents.html
@param {string} cwe._custom_arn - Custom overloaded string parameter that represent the ARN to send the logEvent to
@param {string} logEvent - a log event string that will be passed on to loggers
*/
const cislog = (cwe, logEvent) => {
  console.log(logEvent); // Local logging
  
  var params = {
    Entries: [
      {
        Detail: logEvent,
        DetailType: 'Auth0Logs',
        Resources: [
          cwe._custom_arn
        ],
        Source: 'Auth0',
        Time: new Date
      }
    ]
  };
  cwe.putEvents(params, function(err, data) {
    if (err) {
      console.log("cislog error, log event not sent: %s (%s)", err, err.stack);
    }
  });
};

/**
@param {object} user - The user being created
@param {string} user.tenant - Auth0 tenant name
@param {string} user.username - user name
@param {string} user.password - user's password
@param {string} user.email - email
@param {boolean} user.emailVerified - is e-mail verified?
@param {string} user.phoneNumber - phone number
@param {boolean} user.phoneNumberVerified - is phone number verified?
@param {object} context - Auth0 connection and other context info
@param {string} context.requestLanguage - language of the client agent
@param {object} context.connection - information about the Auth0 connection
@param {object} context.connection.id - connection id
@param {object} context.connection.name - connection name
@param {object} context.connection.tenant - connection tenant
@param {object} context.webtask - webtask context
@param {function} cb - function (error, response)
*/
module.exports = function (user, context, cb) {
  // Required to pass user over to next task
  var response = {};
  response.user = user;

  // CIS API
  var apiUrl =  context.webtask.secrets.api_url;

  // AWS
  var cwe = new AWS.CloudWatchEvents({region: context.webtask.secrets.aws_region,
                                     accessKeyId: context.webtask.secrets.aws_access_key_id,
                                     secretAccessKey: context.webtask.secrets.aws_secret_access_key});
  cwe._custom_arn = context.webtask.secrets.aws_arn;

  request({
    url: apiUrl+user.user_id,
    headers: {
      Authorization: 'Bearer '+context.webtask.secrets.accessToken
    },
  },
  function(err, fresponse, body) {
    if (err || fresponse.statusCode != 200) {
      cislog(cwe, util.format('Failed to query CIS Publisher API: %s (%d)', err, fresponse.statusCode));
    } else {
      cislog(cwe, util.format('Sent new user profile to CIS Publishing API: %s', user.user_id));
    }
  });

  cb(null, response);
};
