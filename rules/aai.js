function (user, context, callback) {
  // AAI (AUTHENTICATOR ASSURANCE INDICATOR)
  // Sets the AAI for the user. This is later used by the AccessRules.js rule for example

  user.aai = [];
  if ((context.connection === 'github') && (user.two_factor_authentication === true)) {
    Array.prototype.push.apply(user.aai, ["2FA"]);
  } else if ((context.connection === 'firefoxaccounts') && (user.fxa_twoFactorAuthentication === true)) {
    Array.prototype.push.apply(user.aai, ["2FA"]);
  } else if ((context.connectionStrategy === 'ad') && (user.multifactor[0] === "duo")) {
    Array.prototype.push.apply(user.aai, ["2FA"]);
  } else if (context.connection === 'google-oauth2') {
    // We set Google to HIGH_ASSURANCE_IDP which is a special indicator, this is what it represents:
    // - has fraud detection
    // - will inform users when their account is used or logged through push notifications on their devices
    // - will actively block detected fraudulous logins even with correct credentials
    // - will fallback to phone 2FA in most cases (old accounts may still bypass that in some cases)
    // - will fallback to phone 2FA on all recent accounts
    // Note that this is not the same as "2FA" and other indicators, as we simply do not have a technically accurate
    // indicator of what the authenticator supports at this time for Google accounts
    Array.prototype.push.apply(user.aai, ["HIGH_ASSURANCE_IDP"]);
  }
}
