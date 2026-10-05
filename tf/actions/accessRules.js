// Required Libraries
const YAML = require("js-yaml");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");

// [Risk levels] to accepted authentication assurance indicators map. The
// ordering of keys matters here.
//
// Bhee thinks that in theory these should have mapped to Authentication Method
// References (AMR) defined by [IANA]. But, we can't really depend on other IdPs
// to provide that value for us (*cough* Google *cough*). And so, the entries
// themselves are Mozilla's flavour of AMR.
//
// The main thing here is that, for things we control (2FA, POP), we're able to
// guarantee some properties of an authenticator for Mozillians hooked up to
// Duo.
//
// [Risk levels]: https://infosec.mozilla.org/guidelines/risk/standard_levels
// [IANA]: www.iana.org/assignments/authentication-method-reference-values
const RISK_LEVELS = {
  // No 2nd factor required.
  LOW: [],
  // Second factor required. Examples:
  // * Google Authenticator (TOTP)
  // * RP's authenticator settings (Google)
  //
  // Explanation of values:
  //
  // * 2FA: (any) 2nd factor -- e.g. totp, hotp, hwk, swk, WebAuthn, passkey;
  // * HIGH_ASSURANCE_IDP: something we made up to indicate Google said "yeah,
  //   they MFA'd".
  MEDIUM: ["2FA", "HIGH_ASSURANCE_IDP"],
  // We don't implement anything for HIGH nor MAXIMUM. We might at some point,
  // because there are different [kinds of risks].
  //
  // [kinds of risks]: https://infosec.mozilla.org/guidelines/assessing_security_risk
  HIGH: ["HIGH_NOT_IMPLEMENTED"],
  MAXIMUM: ["MAXIMUM_NOT_IMPLEMENTED"],
};

// Each `requiredAal` is a separate Duo application whose policy guarantees
// that indicator. There are only three supported indicator apps defined:
//
// * WEBAUTHN: platform authenticators, roaming authenticators;
// * ROAMAUTH: only roaming authenticators;
// * the default, which allows a variety.
//
// Only the default indicator will remember the user, because authorizing with
// a stricter policy is fine.
const duoProviderOptions = (email, secrets, requiredAal) => {
  if (requiredAal === "WEBAUTHN") {
    return {
      providerOptions: {
        host: secrets.duo_apihost_mozilla,
        ikey: secrets.duo_ikey_mozilla_webauthn,
        skey: secrets.duo_skey_mozilla_webauthn,
      },
      allowRememberBrowser: false,
    };
  } else if (requiredAal === "ROAMAUTH") {
    return {
      providerOptions: {
        host: secrets.duo_apihost_mozilla,
        ikey: secrets.duo_ikey_mozilla_roam,
        skey: secrets.duo_skey_mozilla_roam,
      },
      allowRememberBrowser: false,
    };
  }
  return {
    providerOptions: {
      host: secrets.duo_apihost_mozilla,
      ikey: secrets.duo_ikey_mozilla,
      skey: secrets.duo_skey_mozilla,
      username: email,
    },
    allowRememberBrowser: true,
  };
};

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
        const buff = Buffer.from(data.SecretBinary, "base64");
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
    "shared-deng-playstore@mozilla.com", // See: https://mozilla-hub.atlassian.net/browse/IAM-1938
  ];

  // Check if array A has any occurrence from array B
  const hasCommonElements = (A, B) => {
    return A.some((element) => B.includes(element));
  };

  // Return a single identity by connection name, from the user structure
  const getProfileData = (connection) => {
    var i = 0;
    for (i = 0; i < event.user.identities.length; i++) {
      const cid = event.user.identities[i];
      if (cid.connection === connection) {
        return cid.profileData;
      }
    }
    return undefined;
  };

  // Sometimes we need to add custom claims to the various tokens we hand
  // out.
  const groupsSetCustomClaims = (groups) => {
    // If the only scopes requested are neither profile nor any scope beginning with
    // https:// then do not overload with custom claims
    const scopes_requested = event.transaction.requested_scopes || [];

    const fixup_needed = (scope) => {
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
  };

  // Collect all variations of groups and merge them together for access
  // evaluation.
  const groupsGather = () => {
    // Ensure we have the correct group data
    const app_metadata_groups = event.user.app_metadata.groups || [];
    const ldap_groups = event.user.ldap_groups || [];
    const user_groups = event.user.groups || [];
    // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
    // Here we iterate over all possible user identities and build an array of all groups from them
    let _identity;
    const identityGroups = [];
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
    const all_groups = [
      ...user_groups,
      ...app_metadata_groups,
      ...ldap_groups,
      ...identityGroups,
      // A default group, added to everyone.
      "everyone",
    ];
    // Filter for duplicates
    return all_groups.filter(
      (value, index, array) => array.indexOf(value) === index
    );
  };

  const deny = (reason) => {
    return {
      granted: false,
      denied: {
        reason,
      },
    };
  };

  // Process the access cache decision.
  // Note that applications may be defined multiple times in the access rules.
  //
  // When access is granted, the AAL (sic, read as: risk) from the rule is
  // used, meaning different groups can be subjected to different MFA
  // requirements.
  //
  // The one exception is that: if any apps say _no_ users nor groups should
  // have access, then we bail early.
  const access_decision = (groups, access_rules, risk_levels) => {
    // This is used for authorized user/groups
    let authorized = false;

    // The default AAL / risk level for an application.
    const risk_default = "MEDIUM";

    // The app defines this AAL / risk. If all authz checks pass, the user will
    // be trusted with at least this risk level.
    let risk;

    // The apps.yml entry which authorized the user.
    let matched_app;

    // Only look at rules which match our client_id.
    const apps = access_rules
      .filter(
        (a) =>
          (a.application.client_id ?? "").indexOf(event.client.client_id) >= 0
      )
      .map((a) => a.application);

    // Default deny for apps we don't define in
    // https://github.com/mozilla-iam/sso-dashboard-configuration/blob/master/apps.yml
    if (apps.length === 0) {
      console.log(`No access rules defined for ${event.client.client_id}`);
      return deny("notingroup");
    }

    // XXX This needs to be fixed in the dashboard first. Empty users
    // or groups (length == 0) means no access in the dashboard
    // apps.yml world.
    const deny_all =
      apps.find(
        (a) =>
          a.authorized_users.length === 0 && a.authorized_groups.length === 0
      ) !== undefined;
    if (deny_all) {
      console.log(
        `Access denied to ${event.client.client_id} for user ` +
          `${event.user.email} (${event.user.user_id})` +
          ` - this app denies ALL users and ALL groups")`
      );
      return deny("notingroup");
    }

    // Check users and groups.
    for (const app of apps) {
      //Handy for quick testing in dev (overrides access rules)
      //var app = {'client_id': 'pCGEHXW0VQNrQKURDcGi0tghh7NwWGhW', // This is testrp social-ldap-pwless
      //           'authorized_users': ['gdestuynder@mozilla.com'],
      //           'authorized_groups': ['okta_mfa'],
      //           'aal': 'LOW'
      //          };

      // AUTHORIZED_{GROUPS,USERS}
      //
      // XXX this authorized_users SHOULD BE REMOVED as it's unsafe (too
      // easy to make mistakes). USE GROUPS.

      // Check if the user is authorized to access.
      // A user is authorized if they are a member of any authorized_groups
      // or if they are one of the authorized_users.
      if (
        app.authorized_users.length > 0 &&
        app.authorized_users.indexOf(event.user.email) >= 0
      ) {
        console.log(`${event.user.user_id} was in authorized_users`);
        risk = app.AAL || risk_default;
        authorized = true;
        matched_app = app;
        break;
        // Same dance as above, but for groups
      } else if (
        app.authorized_groups.length > 0 &&
        hasCommonElements(app.authorized_groups, groups)
      ) {
        console.log(`${event.user.user_id} was in authorized_groups`);
        risk = app.AAL || risk_default;
        authorized = true;
        matched_app = app;
        break;
      }
    } // for loop / next rule in apps.yml

    if (!authorized) {
      console.log(
        `Access denied to ${event.client.client_id} for user ` +
          `${event.user.email} (${event.user.user_id}) - not in ` +
          "authorized group or not an authorized user"
      );
      return deny("notingroup");
    }

    // STEP-UP
    //
    // An app may declare that some authorized users or groups need a stronger
    // second factor. When the user matches, the required indicator selects
    // which Duo application they're sent to.
    //
    // These values are somewhat trusted, because we have tests in
    // sso-dashboard-configuration.
    const stepUpIndicator = (step_up) => {
      if (step_up === undefined) {
        return undefined;
      }
      const userMatches = (step_up.matching_users ?? []).includes(
        event.user.email
      );
      const groupMatches = hasCommonElements(
        step_up.matching_groups ?? [],
        groups
      );
      const matches = userMatches || groupMatches;
      return matches ? step_up.required_indicator : undefined;
    };

    const requiredIndicator = stepUpIndicator(matched_app.step_up);
    if (requiredIndicator !== undefined) {
      console.log(
        `step-up: ${event.user.email} requires ${requiredIndicator} for ${event.client.client_id}`
      );
    }

    // AAI (AUTHENTICATOR ASSURANCE INDICATOR)
    // Sets the AAI for the user.
    //
    // We go through each possible attribute as Auth0 will translate these
    // differently in the main profile depending on the connection type.

    // Ensure all users have some AAI and AAL attributes, even if its empty.
    const aai = [];
    let trust = "UNKNOWN";
    let enableDuo = false;

    // Allow certain LDAP service accounts to fake their MFA. For all other LDAPi accounts, enforce MFA
    if (event.connection.strategy === "ad") {
      if (mfaBypassAccounts.includes(event.user.email)) {
        console.log(
          `LDAP service account (${event.user.email}) is allowed to bypass MFA`
        );
        aai.push("2FA");
      } else {
        enableDuo = true;
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

    // AUTHENTICATOR ASSURANCE INDICATOR (AAI) REQUIREMENTS
    //
    // Mapping logic and verification
    // Ex: our mapping says 2FA for MEDIUM AAL and app AAL is MEDIUM as well,
    // and the user has 2FA AAI, looks like:
    //
    // ```
    // risk_levels['MEDIUM'] = ['2FA'];
    // app.AAL = 'MEDIUM;
    // user.aai = ['2FA'];
    // ```
    //
    // Thus user should be allowed for this app (it requires MEDIUM, and MEDIUM
    // requires 2FA, and user has 2FA indeed).
    let aai_pass = false;
    // 1 Set user.aal
    // maps = [ "LOW", "MEDIUM", ...
    // aal_nr = position in the maps (aai_mapping[maps[aal_nr=0]] is "LOW" for.ex)
    // aai_nr = position in the array of AAIs (aai_mapping[maps[aal_nr=0]] returns ["2FA", .., aai_nr=0 would be the
    // position for "2FA")
    // Note that the list is ordered so that the highest AAL always wins
    for (const risk_level_name of Object.keys(risk_levels)) {
      for (const factor of risk_levels[risk_level_name]) {
        if (aai.includes(factor)) {
          trust = risk_level_name;
          console.log(`User AAL set to ${trust} because AAI contains ${aai}`);
          break;
        }
      }
    }
    // 2 Check if user.aal is allowed for this RP
    if (risk_levels[risk].length === 0) {
      console.log(
        "No required indicator in aai_mapping for this RP (mapping empty for this AAL), access will be granted"
      );
      aai_pass = true;
    } else {
      for (const indicator of aai) {
        if (risk_levels[risk].includes(indicator)) {
          console.log(
            "User AAL is included in this RP's AAL requirements, access will be granted"
          );
          aai_pass = true;
          break;
        }
      }
    }

    if (!aai_pass) {
      const msg =
        `Access denied to ${event.client.client_id} for user ${event.user.email} (${event.user.user_id}) - due to` +
        ` Identity Assurance Level being too low for this RP. Required AAL: ${risk} (${aai_pass})`;
      console.log(msg);
      return deny("aai_failed");
    }

    // We matched no rule, access is granted
    return {
      granted: true,
      enableDuo,
      aai,
      trust,
      requiredIndicator,
    };
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
    const groups = groupsGather();
    const decision = access_decision(groups, appsYaml, RISK_LEVELS);
    // Refresh token exchanges are non-interactive, and are minted when a user
    // has already completed the MFA challenge.
    const isRefreshTokenFlow =
      event.transaction?.protocol === "oauth2-refresh-token";

    if (decision.granted) {
      if (decision.enableDuo && !isRefreshTokenFlow) {
        api.multifactor.enable(
          "duo",
          duoProviderOptions(
            event.user.email,
            event.secrets,
            decision.requiredIndicator
          )
        );
      }
      // Set groups, AAI, and AAL claims in idToken
      api.idToken.setCustomClaim(`${namespace}/AAI`, decision.aai);
      api.idToken.setCustomClaim(`${namespace}/AAL`, decision.trust);
      groupsSetCustomClaims(groups);
      return;
    }

    // Go back to the shadow.  You shall not pass!
    return postError(decision.denied.reason);
  } catch (err) {
    // All error should be caught here and we return the callback handler with the error
    console.log("AccessRules:", err);
    return api.access.deny(err);
  }
};
