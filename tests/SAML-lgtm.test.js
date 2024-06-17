const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-lgtm.js', true);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

const clientIDs = ['Ury9HCvBS4B1SzAH8f3YASbbcGf5QlQf'];

const issuer = "https://auth.mozilla.auth0.com";
const encryptionPublicKey = "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAQ==\n-----END PUBLIC KEY-----\n";
const encryptionCert = "-----BEGIN CERTIFICATE-----\nMIIFqDCCA5CgAwIBAgIELygDFTANBgkqhkiG9w0BAQsFADCBhDELMAkGA1UEBhMC\nR0IxFDASBgNVBAgTC094Zm9yZHNoaXJlMQ8wDQYDVQQHEwZPeGZvcmQxEzARBgNV\nBAoTClNlbW1sZSBMdGQxDTALBgNVBAsTBExHVE0xKjAoBgNVBAMTIUxHVE0gQXV0\nby1HZW5lcmF0ZWQgT25lbG9naW4gY2VydDAeFw0xOTA1MjEwNjEyNTdaFw0yMjA1\nMjAwNjEyNTdaMIGEMQswCQYDVQQGEwJHQjEUMBIGA1UECBMLT3hmb3Jkc2hpcmUx\nDzANBgNVBAcTBk94Zm9yZDETMBEGA1UEChMKU2VtbWxlIEx0ZDENMAsGA1UECxME\nTEdUTTEqMCgGA1UEAxMhTEdUTSBBdXRvLUdlbmVyYXRlZCBPbmVsb2dpbiBjZXJ0\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAo0pAWRHxJ3NWnItdWa7G\nsmBt4sQF7TlBDGDNUB55ojtl29ifLMfijmElgiBDwDn0IuzI+hKMHSCHlmBFvLMq\nIqJ36J//PPx6wVnkzuiRjKirRKP5CCbchF/McHH2cMi8SVrX2a+zIefPkLVoxDub\nAITQpmos/g5AkD07U/Js+130gTY1QJdYeJOOxkuJ9Afsrd0rJWvULh6+I/saP7zu\nSNMpPqYOxACXkqqdUMkTUE4EMhVIqcuw1qUO09JRjrGOkS1NKE+x7u8vpbevst9q\nntPglJ0730xx5cVJKXwQDWMXsxC4RSlrI6FZyryez0bwq5UGO9oBvtFsVy+rIWj2\nVSdzw7tmkrhED4oCItapgFLsKQWrKiRsCaWZOnW2Fz+cWFkepgelHE/oOZGBv+k3\nIvNZr7MxYLPPJQ7p4SMmT+TLPWXWmRGpL9uqE8ZwvGrUF4R1GzEQrVFd2NxbKzuO\nPHYwiPzzJNJwME541jL5A1cqsayEAXy0YltGGnofNa1mfk2PmfqfzZPXp79QOwW/\nNXPKNKAPgFI5g7zHQvbmnlnrOzUn8jrOHhxfZmY+hkQ0Mtju7H4L5AKJ5Dn7p2nv\nkK4HIymsXOdcj6WUcTi88yZX2yTXDnYtglXUIBKJVks6WiuF/yrhiaT2HLWa8WF0\nkD+1uOvqgm9nCKm7H6zHk7MCAwEAAaMgMB4wDAYDVR0TBAUwAwEB/zAOBgNVHQ8B\nAf8EBAMCAQYwDQYJKoZIhvcNAQELBQADggIBAH/xAuVUXRDGo5vn/uERfssPc8Fa\nyL0wurpoy5jXVvYALSZouNGG26M6kJ+UTaxwBMm0zk3hGOE24qiIMNoDLupwsVFq\n8r9DsbD2hbcIqwzReI03KiKZ4PBBugV/I4nZVpu69yxk+lfNPW34CRYuRQGcISbA\nVIh5MS6fp2+7eCdxGCobLPMUmGSitgJUzUlvIIvvIyQ9mPP4S5MnIjNEnE7qolmz\nhPz2cLTJzRAVtOc2QAtMFEBysIXzJ5X3xkN750dflgHeo5voX07J/PEUN1vfTBBN\n8WJZBfqgNXauARnDCUsOrN+5NeBXmURiSrO+JGJu72Bwbabuw44EwrPap5otC/Hu\nTDIHJy/MnPmwXAhiW7jY9luNxtJL/9DfBEHNHU4AF3/0D90NU6artINqwKCebr/8\nlX4xmavcXRXh3EP6iqaCG+zpdyCquuE3GaCv48VY7WzKiajDE6abmy78nmu7nk++\n+7aGLMisf4CNIBDL9L6ZvdgHV2Oaom7h5P2L0Z0OfslE4C+IpAI+9lxcMzTOJHTf\n0khlXKceA5ky+1rne4IezyUbvwAKJ32M99yYRvCyevJW9XpoVQIYLc/iVbi5VjxL\nQGFqYSnLIlzudgiJq5x/24VqLB8EC5H+6XzLAzAolwYj/CKTBQsBIQqa/CKa6nOu\nyZliiPtDlnK3bBeY\n-----END CERTIFICATE-----\n";


describe('Ensure rule does not apply when clientID does not match', () => {
  test('Rule does not change context object', async () => {
    output = await rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});

describe('Ensure SAML configuration', () => {
  test.each(clientIDs)('Given client %s, ensure SAML configuration', async (clientID) => {
    _context.clientID = clientID;
    output = await rule(_user, _context, configuration, Global);

    expect(output.context.samlConfiguration.issuer).toEqual(issuer);
    expect(output.context.samlConfiguration.encryptionPublicKey).toEqual(encryptionPublicKey);
    expect(output.context.samlConfiguration.encryptionCert).toEqual(encryptionCert);
  });
});
