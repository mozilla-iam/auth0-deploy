const _ = require('lodash');
const auth0Sdk = require('auth0');

const idTokenObj = require('./modules/idToken.json');
const eventObj = require('./modules/event.json');
const { onExecutePostLogin } = require('../actions/samlMappings.js');

// Mock auth0 module
jest.mock('auth0');

// Take all log enteries and combine them into a single array
const combineLog = (consoleLogs) => {
  let combinedLog = [];
  for (let i = 0; i < consoleLogs.length; i++) {
    singleStr = consoleLogs[i].join(' ');
    combinedLog.push(singleStr);
  }
  return combinedLog;
}

// Function to extract matching key-value pairs
const extractMatchingPairs = (objToSearch, objToFind) => {
  const result = {};

  Object.keys(objToFind).forEach(key => {
    if (objToSearch.hasOwnProperty(key) && objToSearch[key] === objToFind[key]) {
      result[key] = objToSearch[key];
    }
  });

  return result;
};

beforeEach(() => {
  // Clone the event object to be used before each test
  _event   = _.cloneDeep(eventObj);
  _idToken = _.cloneDeep(idTokenObj);
  _samlAttributes = {};

  // Make sure redirect_url is undefined before each test
  _event.transaction.redirect_uri = undefined;

  // Set the default connection type
  _event.connection.name = "email";

  // Mock auth0 api object
  api = {
    idToken: {
      setCustomClaim: jest.fn()
    },
    samlResponse: {
      setAttribute: jest.fn(),
      setNameIdentifierFormat: jest.fn(),
      setEncryptionPublicKey: jest.fn(),
      setEncryptionCert: jest.fn()
    }
  };

  // Mock api.idToken.setCustomClaim
  api.idToken.setCustomClaim.mockImplementation((key, value) => {
    _idToken[key] = value;
  });

  // Mock api.samlResponse.setAttribute
  api.samlResponse.setAttribute.mockImplementation((key, value) => {
    _samlAttributes[key] = value;
  });

  // Mock api.samlResponse.setNameIdentifierFormat
  api.samlResponse.setNameIdentifierFormat.mockImplementation(value => {
    _samlAttributes["NameIdentifierFormat"] = value;
  });

  // Mock api.samlResponse.setEncryptionPublicKey
  api.samlResponse.setEncryptionPublicKey.mockImplementation(value => {
    _samlAttributes["EncryptionPublicKey"] = value;
  });

  // Mock api.samlResponse.setEncryptionCert
  api.samlResponse.setEncryptionCert.mockImplementation(value => {
    _samlAttributes["EncryptionCert"] = value;
  });

  // Spy on console
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});


afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("Expect onExecutePostLogin to be defined", async () => {
  // Expect onExecutePostLogin to be defined
  expect(onExecutePostLogin).toBeDefined();
});

test('Client ID does not match, no SAML attributes set', async () => {
  // Execute onExecutePostLogin
  await onExecutePostLogin(_event, api);

  // Expect linking not to have been called
  expect(api.idToken.setCustomClaim).not.toHaveBeenCalled();
  expect(api.samlResponse.setAttribute).not.toHaveBeenCalled();
  expect(_samlAttributes).toEqual({});

});

describe('Tines SAML tests', () => {
  const clientIDs = ['cPH0znP4n74JvPf9Efc1w6O8KQWwT634'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    _event.user.app_metadata = {};
    _event.user.app_metadata.groups = [
      'mozilliansorg_sec_tines-admin',
      'foo',
      'mozilliansorg_sec_tines-access',
      'bar',
      'team_moco',
      'team_mofo',
      'team_mzla',
      'team_mzai',
      'team_mzvc'
    ];

    expectedSamlAttributes = {
      "http://sso.mozilla.com/claim/groups": [
        'mozilliansorg_sec_tines-admin',
        'mozilliansorg_sec_tines-access',
        'team_moco',
        'team_mofo',
        'team_mzla',
        'team_mzai',
        'team_mzvc'
      ],
      "http://schemas.xmlsoap.org/claims/Group": null
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Sage Intacct SAML tests', () => {
  const clientIDs = ['wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedSamlAttributes = {
      "Company Name": "MOZ Corp",
      "emailAddress": _event.user.email,
      'name': _event.user.name
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Sage Intacct SAML tests', () => {
  const clientIDs = ['wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedSamlAttributes = {
      "Company Name": "MOZ Corp",
      "emailAddress": _event.user.email,
      'name': _event.user.name
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Braintree SAML tests', () => {
  const clientIDs = ['x7TF6ZtJev4ktoHR4ObWmA9KeqGni6rq'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedSamlAttributes = {
      'grant_all_merchant_accounts': "true",
      'roles': _event.user.app_metadata?.groups
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Planful-dev SAML tests', () => {
  const clientIDs = ['pUmRmcBrAJEdsgRTVXIW84jZoc3wtuYO'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedIdTokenAttributes = {
      'IdP Entity ID': "urn:auth-dev.mozilla.auth0.com",
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    const idTokenMatches = extractMatchingPairs(_idToken, expectedIdTokenAttributes);
    expect(api.idToken.setCustomClaim).toHaveBeenCalled();
    expect(idTokenMatches).toStrictEqual(expectedIdTokenAttributes);
  });
});

describe('Planful SAML tests', () => {
  const clientIDs = ['H5ddlJSCfGP8ab65EnWaB2sd541CJAlM'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedIdTokenAttributes = {
      'IdP Entity ID': "auth.mozilla.auth0.com",
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    const idTokenMatches = extractMatchingPairs(_idToken, expectedIdTokenAttributes);
    expect(api.idToken.setCustomClaim).toHaveBeenCalled();
    expect(idTokenMatches).toStrictEqual(expectedIdTokenAttributes);
  });
});


describe('Thinksmart SAML tests', () => {
  const clientIDs = ['R4djNlyXSl3i8N2KXWkfylghDa9kFQ84'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedSamlAttributes = {
      'Email': _event.user.email,
      'firstName': _event.user.given_name,
      'lastName': _event.user.family_name
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Stripe-Subplat SAML tests', () => {
  const clientIDs = ['cEfnJekrSStxxxBascTjNEDAZVUPAIU2'];
  const roles = [
    { group: "stripe_subplat_admin", role: "admin" },
    { group: "stripe_subplat_developer", role: "developer" },
    { group: "stripe_subplat_supportsp", role: "support_specialist" },
    { group: "stripe_subplat_analyst", role: "analyst" },
    { group: "stripe_subplat_viewonly", role: "view_only" },
    { group: undefined, role: undefined }
  ];


  const maps = clientIDs.flatMap( clientID => roles.map(role => [ clientID, role ]));
  test.each(maps)('Ensure SAML configuration mappings for client %s', async ( clientID, { role, group }) => {
    _event.client.client_id = clientID;

    if (group !== undefined ) {
      _event.user.groups = _event.user.groups || [];
      _event.user.groups.push(group);
      expectedSamlAttributes = {
        "Stripe-Role-acct_1EJOaaJNcmPzuWtR": role
      };
    } else {
      delete _event.user.groups;
      expectedSamlAttributes = {};
    }

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    if (group !== undefined ) {
      expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    } else {
      expect(api.samlResponse.setAttribute).not.toHaveBeenCalled();
    }
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Acoustic SAML tests', () => {
  const clientIDs = ['inoLoMyAEOzLX1cZOvubQpcW18pk4O1S', 'sBImsybtPPLyWlstD0SC35IwnAafE4nB'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    expectedSamlAttributes = {
      'Nameid': _event.user.email,
      'email': _event.user.email,
      'firstName': _event.user.given_name,
      'lastName': _event.user.family_name
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Bitsight SAML tests', () => {
  const clientIDs = ['eEAeYh6BMPfRyiSDax0tejjxkWi22zkP'];
  const bitSightRoles = [
    { role: 'Customer Admin', group: 'mozilliansorg_bitsight-admins' },
    { role: 'Customer Portfolio Manager', group: 'mozilliansorg_bitsight-users' },
    { role: 'Customer User', group: undefined }
  ];

  const maps = clientIDs.flatMap(clientID => bitSightRoles.map(role => [clientID, role] ));

  test.each(maps)('Ensure SAML configuration mappings for client %s', async (clientID, {role, group}) => {
    _event.client.client_id = clientID;

    if ( group !== undefined ) {
      _event.user.groups = _event.user.groups || [];
      _event.user.groups.push(group);
    }

    const expectedSamlAttributes = {
      'urn:oid:0.9.2342.19200300.100.1.3': _event.user.email,
      'urn:oid:2.5.4.3': _event.user.given_name,
      'urn:oid:2.5.4.4': _event.user.family_name,
      'urn:oid:1.3.6.1.4.1.50993.1.1.2': role
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Google SAML tests', () => {
  const clientIDs = ['q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46','uYFDijsgXulJ040Os6VJLRxf0GG30OmC'];
  const domains = ["mozilla.com", "mozillafoundation.org", "getpocket.com"];

  const maps = clientIDs.flatMap(clientID => domains.map(domain => [clientID, domain]));

  test.each(maps)('Ensure SAML configuration mappings for client %s with %s', async (clientID, domain) => {
    _event.client.client_id = clientID;
    _event.user.email = `jdoe@${domain}`;

    let domainReplacedEmail = undefined;
    if (clientID == "q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46") {
      domainReplacedEmail = _event.user.email
        .replace("mozilla.com", "test.mozilla.com")
        .replace("mozillafoundation.org", "test.mozillafoundation.org")
        .replace("getpocket.com", "test-gsuite.getpocket.com");
    } else if (clientID == "uYFDijsgXulJ040Os6VJLRxf0GG30OmC") {
      domainReplacedEmail = _event.user.email
        .replace("mozilla.com", "gcp.infra.mozilla.com")
        .replace("mozillafoundation.org", "gcp.infra.mozilla.com")
        .replace("getpocket.com", "gcp.infra.mozilla.com");
    }

    const expectedSamlAttributes = {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': domainReplacedEmail,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': domainReplacedEmail,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email': domainReplacedEmail,
      'NameIdentifierFormat': 'urn:oasis:names:tc:SAML:2.0:nameid-format:email'
    };
    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('Vectra SAML tests', () => {
  const clientIDs = ['RmsIEl3T3cZzpKhEmZv1XZDns0OvTzIy'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    const expectedSamlAttributes = {
      'https://schema.vectra.ai/role': 'mozilliansorg_sec_network_detection',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': _event.user.email,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': _event.user.name,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': _event.user.given_name,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': _event.user.family_name,
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn': 'upn'
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});


describe('Navex SAML tests', () => {
  const clientIDs = ['gL08r5BRiweqf4aDQVX6xB4FHyFepFlM', 'iz2qSHo0lSv2nRZ8V3JnOESX5UR4dcpX'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    const expectedSamlAttributes = {
      "PARTITION": "MOZILLA"
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});

describe('LGTM SAML tests', () => {
  const clientIDs = ['Ury9HCvBS4B1SzAH8f3YASbbcGf5QlQf'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

   //   //context.samlConfiguration.issuer = "https://auth.mozilla.auth0.com";
   const _encryptionPublicKey = "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAQ==\n-----END PUBLIC KEY-----\n";
   const _encryptionCert = "-----BEGIN CERTIFICATE-----\nMIIFqDCCA5CgAwIBAgIELygDFTANBgkqhkiG9w0BAQsFADCBhDELMAkGA1UEBhMC\nR0IxFDASBgNVBAgTC094Zm9yZHNoaXJlMQ8wDQYDVQQHEwZPeGZvcmQxEzARBgNV\nBAoTClNlbW1sZSBMdGQxDTALBgNVBAsTBExHVE0xKjAoBgNVBAMTIUxHVE0gQXV0\nby1HZW5lcmF0ZWQgT25lbG9naW4gY2VydDAeFw0xOTA1MjEwNjEyNTdaFw0yMjA1\nMjAwNjEyNTdaMIGEMQswCQYDVQQGEwJHQjEUMBIGA1UECBMLT3hmb3Jkc2hpcmUx\nDzANBgNVBAcTBk94Zm9yZDETMBEGA1UEChMKU2VtbWxlIEx0ZDENMAsGA1UECxME\nTEdUTTEqMCgGA1UEAxMhTEdUTSBBdXRvLUdlbmVyYXRlZCBPbmVsb2dpbiBjZXJ0\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAaMgMB4wDAYDVR0TBAUwAwEB/zAOBgNVHQ8B\nAf8EBAMCAQYwDQYJKoZIhvcNAQELBQADggIBAH/xAuVUXRDGo5vn/uERfssPc8Fa\nyL0wurpoy5jXVvYALSZouNGG26M6kJ+UTaxwBMm0zk3hGOE24qiIMNoDLupwsVFq\n8r9DsbD2hbcIqwzReI03KiKZ4PBBugV/I4nZVpu69yxk+lfNPW34CRYuRQGcISbA\nVIh5MS6fp2+7eCdxGCobLPMUmGSitgJUzUlvIIvvIyQ9mPP4S5MnIjNEnE7qolmz\nhPz2cLTJzRAVtOc2QAtMFEBysIXzJ5X3xkN750dflgHeo5voX07J/PEUN1vfTBBN\n8WJZBfqgNXauARnDCUsOrN+5NeBXmURiSrO+JGJu72Bwbabuw44EwrPap5otC/Hu\nTDIHJy/MnPmwXAhiW7jY9luNxtJL/9DfBEHNHU4AF3/0D90NU6artINqwKCebr/8\nlX4xmavcXRXh3EP6iqaCG+zpdyCquuE3GaCv48VY7WzKiajDE6abmy78nmu7nk++\n+7aGLMisf4CNIBDL9L6ZvdgHV2Oaom7h5P2L0Z0OfslE4C+IpAI+9lxcMzTOJHTf\n0khlXKceA5ky+1rne4IezyUbvwAKJ32M99yYRvCyevJW9XpoVQIYLc/iVbi5VjxL\nQGFqYSnLIlzudgiJq5x/24VqLB8EC5H+6XzLAzAolwYj/CKTBQsBIQqa/CKa6nOu\nyZliiPtDlnK3bBeY\n-----END CERTIFICATE-----\n";
    const expectedSamlAttributes = {
      EncryptionCert: _encryptionCert,
      EncryptionPublicKey: _encryptionPublicKey,
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setEncryptionCert).toHaveBeenCalled();
    expect(api.samlResponse.setEncryptionPublicKey).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});


describe('Braintree SAML tests', () => {
  const clientIDs = ['x7TF6ZtJev4ktoHR4ObWmA9KeqGni6rq'];

  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _event.client.client_id = clientID;

    const expectedSamlAttributes = {
      "grant_all_merchant_accounts": "true",
      "roles": _event.user.app_metadata.groups
    };

    // Execute onExecutePostLogin
    await onExecutePostLogin(_event, api);

    expect(api.samlResponse.setAttribute).toHaveBeenCalled();
    expect(_samlAttributes).toEqual(expectedSamlAttributes);
  });
});
