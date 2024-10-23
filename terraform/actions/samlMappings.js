exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "samlMappings");

  switch(event.client.client_id) {
    case "wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l": // sage-intacct
      api.samlResponse.setAttribute('Company Name', 'MOZ Corp');
      api.samlResponse.setAttribute('emailAddress', event.user.email);
      api.samlResponse.setAttribute('name', event.user.name);
      break;

    case "pUmRmcBrAJEdsgRTVXIW84jZoc3wtuYO": // planful-dev
      api.idToken.setCustomClaim("IdP Entity ID", "urn:auth-dev.mozilla.auth0.com")
      break;

    case "H5ddlJSCfGP8ab65EnWaB2sd541CJAlM": // planful
      api.idToken.setCustomClaim("IdP Entity ID", "auth.mozilla.auth0.com")
      break;

    // This can be move to the SAML settings of the application
    case "R4djNlyXSl3i8N2KXWkfylghDa9kFQ84": // thinksmart
      api.samlResponse.setAttribute('Email', event.user.email);
      api.samlResponse.setAttribute('firstName', event.user.given_name);
      api.samlResponse.setAttribute('lastName', event.user.family_name);
      break;

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1637117
    case "cEfnJekrSStxxxBascTjNEDAZVUPAIU2": // stripe-subplat
      const groupToStripeRoleMap = {
        //  LDAP group name          stripe_role_name           stripe_account_id
        'stripe_subplat_admin': [{'role': 'admin', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_developer': [{'role': 'developer', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_supportsp': [{'role': 'support_specialist', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_analyst': [{'role': 'analyst', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_viewonly': [{'role': 'view_only', 'account': 'acct_1EJOaaJNcmPzuWtR'}]
      };

      Object.keys(groupToStripeRoleMap).forEach((groupName) => {
        if (event.user.hasOwnProperty('groups') && event.user.groups.includes(groupName)) {
          groupToStripeRoleMap[groupName].forEach((roleInfo) => {
            api.samlResponse.setAttribute(`Stripe-Role-${roleInfo.account}`, roleInfo.role);
          });
        }
      });
      break;

    case "inoLoMyAEOzLX1cZOvubQpcW18pk4O1S": // acoustic-stage
    case "sBImsybtPPLyWlstD0SC35IwnAafE4nB": // acoustic-prod
      api.samlResponse.setAttribute('Nameid', event.user.email);
      api.samlResponse.setAttribute('email', event.user.email);
      api.samlResponse.setAttribute('firstName', event.user.given_name);
      api.samlResponse.setAttribute('lastName', event.user.family_name);
      break;

    case "eEAeYh6BMPfRyiSDax0tejjxkWi22zkP": // bitsight
      api.samlResponse.setAttribute('urn:oid:0.9.2342.19200300.100.1.3', event.user.email);
      api.samlResponse.setAttribute('urn:oid:2.5.4.3', event.user.given_name);
      api.samlResponse.setAttribute('urn:oid:2.5.4.4', event.user.family_name);
      // Assign BitSight roles based on group membership.
      // https://help.bitsighttech.com/hc/en-us/articles/360008185714-User-Roles
      // https://help.bitsighttech.com/hc/en-us/articles/231658167-SAML-Documentation
      // Possible values :
      //   Customer User
      //   Customer Admin
      //   Customer Group Admin
      //   Customer Portfolio Manager

      let bitsight_user_role;
      if (event.user.groups?.includes('mozilliansorg_bitsight-admins')) {
        bitsight_user_role = 'Customer Admin';
      } else if (event.user.groups?.includes('mozilliansorg_bitsight-users')) {
        bitsight_user_role = 'Customer Portfolio Manager';
      } else {
        bitsight_user_role = 'Customer User';
      }

      api.samlResponse.setAttribute('urn:oid:1.3.6.1.4.1.50993.1.1.2', bitsight_user_role);
      break;

    case "q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46": // Google (test.mozilla.com)
    case "uYFDijsgXulJ040Os6VJLRxf0GG30OmC":
      // This rule simply remaps @mozilla.com e-mail addresses to @test.mozilla.com to be used with the test.mozilla.com GSuite domain.
      // Be careful when adding replacements not to do "double-replacements" where a replace replaces another rule. If that happens,
      // you probably want to improve this code instead
      let myemail;
      if (event.client.client_id === "q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46") {
        myemail = event.user.email.replace("mozilla.com", "test.mozilla.com").replace("mozillafoundation.org", "test.mozillafoundation.org").replace("getpocket.com", "test-gsuite.getpocket.com");
      } else {
        myemail = event.user.email.replace("mozilla.com", "gcp.infra.mozilla.com").replace("mozillafoundation.org", "gcp.infra.mozilla.com").replace("getpocket.com", "gcp.infra.mozilla.com");
      }

      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", myemail);
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", myemail);
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email", myemail);
      api.samlResponse.setNameIdentifierFormat("urn:oasis:names:tc:SAML:2.0:nameid-format:email")
      break;

    case "RmsIEl3T3cZzpKhEmZv1XZDns0OvTzIy":
      // Vectra expects one and only one group which happens to map to a single role on the Vectra side
      // https://support.vectra.ai/s/article/KB-VS-1577

      api.samlResponse.setAttribute("https://schema.vectra.ai/role", "mozilliansorg_sec_network_detection");
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", event.user.email);
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", event.user.name);
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname", event.user.given_name);
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname", event.user.family_name);
      // TODO: this probably doesn't set the attribute to the upn claim.
      api.samlResponse.setAttribute("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn", "upn");
      break;

    case "gL08r5BRiweqf4aDQVX6xB4FHyFepFlM": // Navex - Stage
    case "iz2qSHo0lSv2nRZ8V3JnOESX5UR4dcpX": // Navex
      api.samlResponse.setAttribute("PARTITION", "MOZILLA");
      break;

    case "Ury9HCvBS4B1SzAH8f3YASbbcGf5QlQf":
      // This rule sets a specific public key to encrypt the SAML assertion generated from Auth0
      // and overrides the Issuer, because the client hardcodes a validation check for URL format
      // TODO: In actions, the issuer cannot be overridden

      //context.samlConfiguration.issuer = "https://auth.mozilla.auth0.com";
      api.samlResponse.setEncryptionPublicKey("-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAQ==\n-----END PUBLIC KEY-----\n");
      api.samlResponse.setEncryptionCert("-----BEGIN CERTIFICATE-----\nMIIFqDCCA5CgAwIBAgIELygDFTANBgkqhkiG9w0BAQsFADCBhDELMAkGA1UEBhMC\nR0IxFDASBgNVBAgTC094Zm9yZHNoaXJlMQ8wDQYDVQQHEwZPeGZvcmQxEzARBgNV\nBAoTClNlbW1sZSBMdGQxDTALBgNVBAsTBExHVE0xKjAoBgNVBAMTIUxHVE0gQXV0\nby1HZW5lcmF0ZWQgT25lbG9naW4gY2VydDAeFw0xOTA1MjEwNjEyNTdaFw0yMjA1\nMjAwNjEyNTdaMIGEMQswCQYDVQQGEwJHQjEUMBIGA1UECBMLT3hmb3Jkc2hpcmUx\nDzANBgNVBAcTBk94Zm9yZDETMBEGA1UEChMKU2VtbWxlIEx0ZDENMAsGA1UECxME\nTEdUTTEqMCgGA1UEAxMhTEdUTSBBdXRvLUdlbmVyYXRlZCBPbmVsb2dpbiBjZXJ0\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAaMgMB4wDAYDVR0TBAUwAwEB/zAOBgNVHQ8B\nAf8EBAMCAQYwDQYJKoZIhvcNAQELBQADggIBAH/xAuVUXRDGo5vn/uERfssPc8Fa\nyL0wurpoy5jXVvYALSZouNGG26M6kJ+UTaxwBMm0zk3hGOE24qiIMNoDLupwsVFq\n8r9DsbD2hbcIqwzReI03KiKZ4PBBugV/I4nZVpu69yxk+lfNPW34CRYuRQGcISbA\nVIh5MS6fp2+7eCdxGCobLPMUmGSitgJUzUlvIIvvIyQ9mPP4S5MnIjNEnE7qolmz\nhPz2cLTJzRAVtOc2QAtMFEBysIXzJ5X3xkN750dflgHeo5voX07J/PEUN1vfTBBN\n8WJZBfqgNXauARnDCUsOrN+5NeBXmURiSrO+JGJu72Bwbabuw44EwrPap5otC/Hu\nTDIHJy/MnPmwXAhiW7jY9luNxtJL/9DfBEHNHU4AF3/0D90NU6artINqwKCebr/8\nlX4xmavcXRXh3EP6iqaCG+zpdyCquuE3GaCv48VY7WzKiajDE6abmy78nmu7nk++\n+7aGLMisf4CNIBDL9L6ZvdgHV2Oaom7h5P2L0Z0OfslE4C+IpAI+9lxcMzTOJHTf\n0khlXKceA5ky+1rne4IezyUbvwAKJ32M99yYRvCyevJW9XpoVQIYLc/iVbi5VjxL\nQGFqYSnLIlzudgiJq5x/24VqLB8EC5H+6XzLAzAolwYj/CKTBQsBIQqa/CKa6nOu\nyZliiPtDlnK3bBeY\n-----END CERTIFICATE-----\n");
      break;

    case "x7TF6ZtJev4ktoHR4ObWmA9KeqGni6rq": // Braintree
      api.samlResponse.setAttribute("grant_all_merchant_accounts", "true");
      api.samlResponse.setAttribute("roles", event.user.app_metadata.groups);
      break;
  }

  return;
}
