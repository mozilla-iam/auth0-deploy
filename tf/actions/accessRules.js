// Required Libraries
const YAML = require("js-yaml");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "accessRules");

  // Retrieve and return a secret from AWS Secrets Manager
  const getSecrets = async () => {
    try {
      if (!event.secrets.accessKeyId || !event.secrets.secretAccessKey) {
        throw new Error("AWS access keys are not defined.");
      }

      // Set up AWS client
      AWS.config.update({
        region: "us-west-2",
        accessKeyId: event.secrets.accessKeyId,
        secretAccessKey: event.secrets.secretAccessKey,
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

  // Load secrets
  const secrets = await getSecrets();
  const jwtMsgsRsaSkey = secrets.jwtMsgsRsaSkey;

  // postError(code)
  // @code string with an error code for the SSO Dashboard to display
  // @rcontext the current Auth0 rule context (passed from the rule)
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

  if (!event.user.email_verified) {
    console.log(
      `User primary email NOT verified, refusing login for ${event.user.email}`
    );
    // This post error is broken in sso dashboard
    postError("primarynotverified", event, api, jwt, jwtMsgsRsaSkey);
    return;
  }

  const namespace = "https://sso.mozilla.com/claim";

  // MFA bypass for special service accounts
  const mfaBypassAccounts = [
    "moc+servicenow@mozilla.com", // MOC see: https://bugzilla.mozilla.org/show_bug.cgi?id=1423903
    "moc-sso-monitoring@mozilla.com", // MOC see: https://bugzilla.mozilla.org/show_bug.cgi?id=1423903
  ];

  const duoConfig = {
    host: event.secrets.duo_apihost_mozilla,
    ikey: event.secrets.duo_ikey_mozilla,
    skey: event.secrets.duo_skey_mozilla,
    username: event.user.email,
  };

  // Check if array A has any occurrence from array B
  const hasCommonElements = (A, B) => {
    return A.some((element) => B.includes(element));
  };

  // Process the access cache decision
  const access_decision = (access_rules, access_file_conf) => {
    // Ensure we have the correct group data
    const app_metadata_groups = event.user.app_metadata.groups || [];
    const ldap_groups = event.user.ldap_groups || [];
    const user_groups = event.user.groups || [];

    // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
    // Here we iterate over all possible user identities and build an array of all groups from them
    let _identity;
    let identityGroups = [];
    // Iterate over each identity
    for (let x = 0, len = event.user.identities.length; x < len; x++) {
      // Get profile for the given identity
      _identity = event.user.identities[x];
      // If the identity contains profileData
      if ("profileData" in _identity) {
        // If profileData contains a groups array
        if ("groups" in _identity.profileData) {
          // Merge the group arry into identityGroups
          identityGroups.push(..._identity.profileData.groups);
        }
      }
    }

    // Collect all variations of groups and merge them together for access evaluation
    let groups = [
      ...user_groups,
      ...app_metadata_groups,
      ...ldap_groups,
      ...identityGroups,
    ];

    // Inject the everyone group and filter for duplicates
    groups.push("everyone");
    groups = groups.filter(
      (value, index, array) => array.indexOf(value) === index
    );

    // If the only scopes requested are neither profile nor any scope beginning with
    // https:// then do not overload with custom claims
    const scopes_requested = event.transaction.requested_scopes || [];

    let fixup_needed = (scope) => {
      return scope === "profile" || scope.startsWith("https://");
    };

    if (scopes_requested.some(fixup_needed)) {
      console.log(
        `Client ${event.client.client_id} requested ${scopes_requested}, therefore adding custom claims`
      );
      api.idToken.setCustomClaim("email_aliases", undefined);
      api.idToken.setCustomClaim("dn", undefined);
      api.idToken.setCustomClaim("organizationUnits", undefined);
      api.idToken.setCustomClaim(`${namespace}/groups`, groups);

      const claimMsg =
        "Please refer to https://github.com/mozilla-iam/person-api in order to query Mozilla IAM CIS user profile data";
      api.idToken.setCustomClaim(`${namespace}/README_FIRST`, claimMsg);
    }

    //// === Actions don't allow modifying the event.user
    //// Update user.groups with new merged values
    //user.groups = groups;

    // This is used for authorized user/groups
    let authorized = false;

    // Defaut app requested aal to MEDIUM for all apps which do not have this set in access file
    let required_aal = "MEDIUM";

    const apps = access_rules.filter(
      (a) =>
        (a.application.client_id ?? "").indexOf(event.client.client_id) >= 0
    );

    // Default deny for apps we don't define in
    // https://github.com/mozilla-iam/sso-dashboard-configuration/blob/master/apps.yml
    if (apps.length == 0) {
        console.log(`No access rules defined for ${event.client.client_id}`);
        return "notingroup";
    }

    // Check users and groups.
    for (let i = 0; i < apps.length; i++) {
      let app = apps[i].application;

      //Handy for quick testing in dev (overrides access rules)
      //var app = {'client_id': 'pCGEHXW0VQNrQKURDcGi0tghh7NwWGhW', // This is testrp social-ldap-pwless
      //           'authorized_users': ['gdestuynder@mozilla.com'],
      //           'authorized_groups': ['okta_mfa'],
      //           'aal': 'LOW'
      //          };

      if (app.client_id && app.client_id.indexOf(event.client.client_id) >= 0) {
        // If there are multiple applications in apps.yml with the same client_id
        // then this expiration of access check will only run against the first
        // one encountered. This matters if there are multiple applications, using
        // the same client_id, and asserting different expire_access_when_unused_after
        // values.

        // Set app AAL (AA level) if present
        required_aal = app.AAL || required_aal;

        // AUTHORIZED_{GROUPS,USERS}
        // XXX this authorized_users SHOULD BE REMOVED as it's unsafe (too easy to make mistakes). USE GROUPS.
        // XXX This needs to be fixed in the dashboard first
        // Empty users or groups (length == 0) means no access in the dashboard apps.yml world
        if (
          app.authorized_users.length === 0 &&
          app.authorized_groups.length === 0
        ) {
          const msg =
            `Access denied to ${event.client.client_id} for user ${event.user.email} (${event.user.user_id})` +
            ` - this app denies ALL users and ALL groups")`;
          console.log(msg);
          return "notingroup";
        }

        // Check if the user is authorized to access
        // A user is authorized if they are a member of any authorized_groups or if they are one of the authorized_users
        if (
          app.authorized_users.length > 0 &&
          app.authorized_users.indexOf(event.user.email) >= 0
        ) {
          authorized = true;
          // Same dance as above, but for groups
        } else if (
          app.authorized_groups.length > 0 &&
          hasCommonElements(app.authorized_groups, groups)
        ) {
          authorized = true;
        } else {
          authorized = false;
        }

        if (!authorized) {
          const msg =
            `Access denied to ${event.client.client_id} for user ${event.user.email} (${event.user.user_id})` +
            ` - not in authorized group or not an authorized user`;
          console.log(msg);
          return "notingroup";
        }
      } // correct client id / we matched the current RP
    } // for loop / next rule in apps.yml

    // AAI (AUTHENTICATOR ASSURANCE INDICATOR)
    // Sets the AAI for the user. This is later used by the AccessRules.js rule which also sets the AAL.

    // We go through each possible attribute as auth0 will translate these differently in the main profile
    // depending on the connection type

    const getProfileData = (connection) => {
      // Return a single identity by connection name, from the user structure
      var i = 0;
      for (i = 0; i < event.user.identities.length; i++) {
        var cid = event.user.identities[i];
        if (cid.connection === connection) {
          return cid.profileData;
        }
      }

      return undefined;
    }; // getProfileData func

    // Ensure all users have some AAI and AAL attributes, even if its empty
    let aai = [];
    let aal = "UNKNOWN";

    // Allow certain LDAP service accounts to fake their MFA. For all other LDAPi accounts, enforce MFA
    if (event.connection.strategy === "ad") {
      if (mfaBypassAccounts.includes(event.user.email)) {
        console.log(
          `LDAP service account (${event.user.email}) is allowed to bypass MFA`
        );
        aai.push("2FA");
      } else {
        api.multifactor.enable("duo", {
          providerOptions: duoConfig,
          allowRememberBrowser: true,
        });
        console.log(
          `duosecurity: ${event.user.email} is in LDAP and requires 2FA check`
        );
      }
    }

    const profileData = getProfileData(event.connection.name);

    //GitHub attribute
    if (event.connection.name === "github") {
      if (
        event.user.two_factor_authentication !== undefined &&
        event.user.two_factor_authentication === true
      ) {
        aai.push("2FA");
      } else if (
        profileData !== undefined &&
        profileData.two_factor_authentication === true
      ) {
        aai.push("2FA");
      }
      // Firefox Accounts
    } else if (event.connection.name === "firefoxaccounts") {
      if (
        event.user.fxa_twoFactorAuthentication !== undefined &&
        event.user.fxa_twoFactorAuthentication === true
      ) {
        aai.push("2FA");
      } else if (
        profileData !== undefined &&
        profileData.fxa_twoFactorAuthentication === true
      ) {
        aai.push("2FA");
      }
      // LDAP/DuoSecurity
    } else if (
      event.user.multifactor !== undefined &&
      event.user.multifactor[0] === "duo"
    ) {
      aai.push("2FA");
    } else if (event.connection.name === "google-oauth2") {
      // We set Google to HIGH_ASSURANCE_IDP which is a special indicator, this is what it represents:
      // - has fraud detection
      // - will inform users when their account is used or logged through push notifications on their devices
      // - will actively block detected fraudulent logins even with correct credentials
      // - will fallback to phone 2FA in most cases (old accounts may still bypass that in some cases)
      // - will fallback to phone 2FA on all recent accounts
      // Note that this is not the same as "2FA" and other indicators, as we simply do not have a technically accurate
      // indicator of what the authenticator supports at this time for Google accounts
      aai.push("HIGH_ASSURANCE_IDP");
    }

    // AAI (AUTHENTICATOR ASSURANCE INDICATOR) REQUIREMENTS
    //
    // Note that user.aai is set in another rule (rules/aai.js)
    // This file sets the user.aal (authenticator assurance level) which is the result of a map lookup against user.aai
    //
    // Mapping logic and verification
    // Ex: our mapping says 2FA for MEDIUM AAL and app AAL is MEDIUM as well, and the user has 2FA AAI, looks like:
    // access_file_conf.aai_mapping['MEDIUM'] = ['2FA'];
    // app.AAL = 'MEDIUM;
    // user.aai = ['2FA'];
    // Thus user should be allowed for this app (it requires MEDIUM, and MEDIUM requires 2FA, and user has 2FA
    // indeed)
    //
    let aai_pass = false;
    if (access_file_conf.aai_mapping !== undefined) {
      // 1 Set user.aal
      // maps = [ "LOW", "MEDIUM", ...
      // aal_nr = position in the maps (aai_mapping[maps[aal_nr=0]] is "LOW" for.ex)
      // aai_nr = position in the array of AAIs (aai_mapping[maps[aal_nr=0]] returns ["2FA", .., aai_nr=0 would be the
      // position for "2FA")
      // Note that the list is ordered so that the highest AAL always wins
      const maps = Object.keys(access_file_conf.aai_mapping);
      for (let aal_nr = 0; aal_nr < maps.length; aal_nr++) {
        for (
          let aai_nr = 0;
          aai_nr < access_file_conf.aai_mapping[maps[aal_nr]].length;
          aai_nr++
        ) {
          let cur_aai = access_file_conf.aai_mapping[maps[aal_nr]][aai_nr];
          if (aai.indexOf(cur_aai) >= 0) {
            aal = maps[aal_nr];
            console.log(`User AAL set to ${aal} because AAI contains ${aai}`);
            break;
          }
        }
      }
      // 2 Check if user.aal is allowed for this RP
      if (access_file_conf.aai_mapping[required_aal].length === 0) {
        console.log(
          "No required indicator in aai_mapping for this RP (mapping empty for this AAL), access will be granted"
        );
        aai_pass = true;
      } else {
        for (let y = 0; y < aai.length; y++) {
          let this_aai = aai[y];
          if (
            access_file_conf.aai_mapping[required_aal].indexOf(this_aai) >= 0
          ) {
            console.log(
              "User AAL is included in this RP's AAL requirements, access will be granted"
            );
            aai_pass = true;
            break;
          }
        }
      }
    }

    // Set AAI & AAL claims in idToken
    api.idToken.setCustomClaim(`${namespace}/AAI`, aai);
    api.idToken.setCustomClaim(`${namespace}/AAL`, aal);

    if (!aai_pass) {
      const msg =
        `Access denied to ${event.client.client_id} for user ${event.user.email} (${event.user.user_id}) - due to` +
        ` Identity Assurance Level being too low for this RP. Required AAL: ${required_aal} (${aai_pass})`;
      console.log(msg);
      return "aai_failed";
    }

    // We matched no rule, access is granted
    return true;
  };

  const access_file_conf = {
    aai_mapping: {
      LOW: [],
      MEDIUM: ["2FA", "HIGH_ASSURANCE_IDP"],
      HIGH: ["HIGH_NOT_IMPLEMENTED"],
      MAXIMUM: ["MAXIMUM_NOT_IMPLEMENTED"],
    },
  };

  // This function pulls the apps.yml and returns a promise to yield the application list
  async function getAppsYaml(url) {
    try {
      const response = await fetch(url);
      const data = await response.text();
      const yamlContent = YAML.load(data);
      return yamlContent.apps;
    } catch (error) {
      console.error("Error fetching apps.yml:", error);
      throw error;
    }
  }

  // Main try
  try {
    const cdnUrl = "https://cdn.sso.mozilla.com/apps.yml";
    const appsYaml = await getAppsYaml(cdnUrl);
    const decision = access_decision(appsYaml, access_file_conf);

    if (decision === true) {
      return; // Allow login to continue
    } else {
      // Go back to the shadow.  You shall not pass!
      postError(decision);
      return;
    }
  } catch (err) {
    // All error should be caught here and we return the callback handler with the error
    console.log("AccessRules:", err);
    return api.access.deny(err);
  }
};
