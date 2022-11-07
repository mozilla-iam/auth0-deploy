function aai(user, context, callback) {
  // AAI (AUTHENTICATOR ASSURANCE INDICATOR)
  // Sets the AAI for the user. This is later used by the AccessRules.js rule which also sets the AAL.

  user.aai = [];
  // We go through each possible attribute as auth0 will translate these differently in the main profile 
  // depending on the connection type

  function getProfileData(connection) {
   // Return a single identity by connection name, from the user structure
   var i = 0;
   for (i=0; i < user.identities.length; i++) {
     var cid = user.identities[i];
     if (cid.connection === connection) {
       return cid.profileData;
     }
   }
    return undefined;
  }

  const profileData = getProfileData(context.connection);

  //GitHub attribute
  if (context.connection === "github") {
    if ((user.two_factor_authentication !== undefined) && (user.two_factor_authentication === true)) {
      Array.prototype.push.apply(user.aai, ["2FA"]);
    } else if ((profileData !== undefined) && (profileData.two_factor_authentication === true)) {
      Array.prototype.push.apply(user.aai, ["2FA"]);
    }
  // Firefox Accounts
  } else if (context.connection === "firefoxaccounts") {
    if ((user.fxa_twoFactorAuthentication !== undefined) && (user.fxa_twoFactorAuthentication === true)) {
      Array.prototype.push.apply(user.aai, ["2FA"]);
    } else if ((profileData !== undefined) && (profileData.fxa_twoFactorAuthentication === true)) {
      Array.prototype.push.apply(user.aai, ["2FA"]);
    }
  // LDAP/DuoSecurity
  } else if ((context.multifactor !== undefined) && (context.multifactor || user.multifactor[0] === "duo")) {
    Array.prototype.push.apply(user.aai, ["2FA"]);
  } else if (context.connection === 'google-oauth2') {
    // We set Google to HIGH_ASSURANCE_IDP which is a special indicator, this is what it represents:
    // - has fraud detection
    // - will inform users when their account is used or logged through push notifications on their devices
    // - will actively block detected fraudulent logins even with correct credentials
    // - will fallback to phone 2FA in most cases (old accounts may still bypass that in some cases)
    // - will fallback to phone 2FA on all recent accounts
    // Note that this is not the same as "2FA" and other indicators, as we simply do not have a technically accurate
    // indicator of what the authenticator supports at this time for Google accounts
    Array.prototype.push.apply(user.aai, ["HIGH_ASSURANCE_IDP"]);
  } else {
    // Ensure all users have some AAI and AAL attributes, even if its empty
    user.aai = user.aai || [];
    user.aal = user.aal || "UNKNOWN";
  }
  callback(null, user, context);
}
