const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-vectra.js');


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

const clientIDs = ['RmsIEl3T3cZzpKhEmZv1XZDns0OvTzIy'];

describe('Expect rule does not apply when clientID does not match', () => {
  test('Expect rule does not change context or user object', async () => {
    output = await rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});

describe('Ensure SAML configuration', () => {
  test.each(clientIDs)('Given client %s, ensure SAML configuration and vectra user group', async (clientID) => {
    _context.clientID = clientID;
    output = await rule(_user, _context, configuration, Global);

    expect(output.context.samlConfiguration.mappings).toEqual({
      "https://schema.vectra.ai/role": "vectra_group",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "email",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "given_name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "family_name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn": "upn"
    });

    expect(output.user.vectra_group).toEqual("mozilliansorg_sec_network_detection");

  });
});

