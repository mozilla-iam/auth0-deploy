// Required Libraries
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "ensureLdapLoginsUseLdap");

  // Retrieve and return a secret from AWS Secrets Manager
  const getSecrets = async (AWS, accessKeyId, secretAccessKey) => {
    try {
      if (!accessKeyId || !secretAccessKey) {
        throw new Error("AWS access keys are not defined.");
      }

      // set AWS config so we can retrieve secrets
      AWS.config.update({
        region: "us-west-2",
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      });

      const secretsManager = new AWS.SecretsManager();
      const secretPath =
        event.tenant.id === "dev"
          ? "/iam/auth0/dev/actions"
          : "/iam/auth0/prod/actions";
      const data = await secretsManager
        .getSecretValue({ SecretId: secretPath })
        .promise();
      // handle string or binary
      if ("SecretString" in data) {
        return JSON.parse(data.SecretString);
      } else {
        let buff = Buffer.from(data.SecretBinary, "base64");
        return buff.toString("ascii");
      }
    } catch (err) {
      console.log("getSecrets:", err);
      throw err;
    }
  };

  const accessKeyId = event.secrets.accessKeyId;
  const secretAccessKey = event.secrets.secretAccessKey;
  const secrets = await getSecrets(AWS, accessKeyId, secretAccessKey);
  const jwtMsgsRsaSkey = secrets.jwtMsgsRsaSkey;

  // postError(code)
  // @code string with an error code for the SSO Dashboard to display
  // Returns rcontext with redirect set to the error
  const postError = (code, prefered_connection_arg) => {
    try {
      const prefered_connection = prefered_connection_arg || ""; // Optional arg
      if (!jwtMsgsRsaSkey) {
        throw new Error("jwtMsgsRsaSkey is not defined.");
      }
      // Token is valid from 30s ago, to 1h from now
      const skey = Buffer.from(jwtMsgsRsaSkey, "base64").toString("ascii");
      const token = jwt.sign(
        {
          client: event.client.name,
          code: code,
          connection: event.connection.name,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 30,
          preferred_connection_name: prefered_connection,
          redirect_uri: event.transaction.redirect_uri,
        },
        skey,
        { algorithm: "RS256" }
      );

      const domain =
        event.tenant.id === "dev" ? "sso.allizom.org" : "sso.mozilla.com";
      const forbiddenUrl = new URL(`https://${domain}/forbidden`);
      forbiddenUrl.searchParams.set("error", token);
      api.redirect.sendUserTo(forbiddenUrl.href);

      return;
    } catch (err) {
      console.log("postError:", err);
      throw err;
    }
  };

  const WHITELIST = [
    "HvN5D3R64YNNhvcHKuMKny1O0KJZOOwH", // mozillians.org account verification
    "t9bMi4eTCPpMp5Y6E1Lu92iVcqU0r1P1", // https://web-mozillians-staging.production.paas.mozilla.community Verification client
    "jijaIzcZmFCDRtV74scMb9lI87MtYNTA", // mozillians.org Verification Client
  ];

  // The domain strings in this array should always be declared here in lowercase
  const MOZILLA_STAFF_DOMAINS = [
    "mozilla.com", // Main corp domain
    "mozillafoundation.org", // Mozilla Foundation domain
    "mozilla.org", // Mozilla Organization domain
    "getpocket.com", // Pocket domain
    "thunderbird.net", // MZLA domain
    "readitlater.com",
    "mozilla-japan.org",
    "mozilla.ai",
    "mozilla.vc",
  ];

  // Sanity checks
  if (!event.user.email_verified) {
    console.log(
      `Primary email not verified, can't let the user in. This should not happen.`
    );
    postError("primarynotverified");
  }

  // Ignore whitelisted clients
  if (WHITELIST.includes(event.client.client_id)) {
    console.log(
      `Whitelisted client ${event.client.client_id}, no login enforcement taking place`
    );
    return;
  }

  // 'ad' is LDAP - Force LDAP users to log with LDAP here
  if (event.connection.strategy !== "ad") {
    for (let domain of MOZILLA_STAFF_DOMAINS) {
      // we need to sanitize the email address to lowercase before matching so we can catch users with upper/mixed case email addresses
      if (event.user.email.toLowerCase().endsWith(domain)) {
        const msg = `Staff or LDAP user attempted to login with the wrong login method. We only allow ad (LDAP) for staff: ${event.user.email}`;
        console.log(msg);
        postError("staffmustuseldap");
        return;
      }
    }
  }

  return;
};
