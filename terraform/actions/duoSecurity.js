const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "duoSecurity");

  if (event.transaction.protocol === "oauth2-refresh-token") {
    return;
  }

  // Retrieve and return a secret from AWS Secrets Manager
  const getSecrets = async (accessKeyId, secretAccessKey) => {
    try {

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS access keys are not defined.');
      }

      // set AWS config so we can retrieve secrets
      AWS.config.update({
        region: 'us-west-2',
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      });

      const secretsManager = new AWS.SecretsManager();
      const secretPath = event.tenant.id === "dev" ? "/iam/auth0/dev/actions" : "/iam/auth0/prod/actions";
      const data = await secretsManager.getSecretValue({ SecretId: secretPath }).promise();
      // handle string or binary
      if ('SecretString' in data) {
        return JSON.parse(data.SecretString);
      } else {
        let buff = Buffer.from(data.SecretBinary, 'base64');
        return buff.toString('ascii');
      }
    } catch (err) {
      console.log("getSecrets:", err);
      throw err;
    };
  }
  // Load secrets
  const accessKeyId = event.secrets.accessKeyId;
  const secretAccessKey = event.secrets.secretAccessKey;
  // Load secrets from AWS Secrets Manager
  const secrets = await getSecrets(accessKeyId, secretAccessKey);
  const jwtMsgsRsaSkey = secrets.jwtMsgsRsaSkey;

  // postError(code)
  // @code string with an error code for the SSO Dashboard to display
  // Returns rcontext with redirect set to the error
  const postError = (code, prefered_connection_arg) => {
    try {
      const prefered_connection = prefered_connection_arg || ""; // Optional arg
      if (!jwtMsgsRsaSkey) {
        throw new Error('jwtMsgsRsaSkey is not defined.');
      }
      // Token is valid from 30s ago, to 1h from now
      const skey = Buffer.from(jwtMsgsRsaSkey, 'base64').toString('ascii');
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
        { algorithm: 'RS256' }
      );

      const domain = event.tenant.id === "dev" ? "sso.allizom.org" : "sso.mozilla.com";
      const forbiddenUrl = new URL(`https://${domain}/forbidden`);
      forbiddenUrl.searchParams.set("error", token);
      api.redirect.sendUserTo(forbiddenUrl.href);

      return;
    } catch (err) {
      console.log("postError:", err);
      throw err;
    }
  }

  try {
    // Any user logging in with LDAP (ad) requires MFA authentication.
    // Skip this action if the connection is not LDAP
    if (event.connection.strategy !== 'ad') {
      return;
    }


    if (!event.user.email_verified) {
      const msg = `duosecurity: user primary email NOT verified, refusing login for ${event.user.email}`;
      console.log(msg);
      // This post error is broken in sso dashboard
      postError("primarynotverified", event, api, jwt, jwtMsgsRsaSkey);
      return;
    }

    const duoConfig = {
      "host": event.secrets.duo_apihost_mozilla,
      "ikey": event.secrets.duo_ikey_mozilla,
      "skey": event.secrets.duo_skey_mozilla,
      "username": event.user.email,
    };

    api.multifactor.enable("duo", { "providerOptions": duoConfig, "allowRememberBrowser": true });

    console.log(`duosecurity: ${event.user.email} is in LDAP and requires 2FA check`);

    return;
  } catch (err) {
    console.log("duoSecurity", err);
    throw err;
  }
}
