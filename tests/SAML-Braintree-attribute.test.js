const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-Braintree-attribute.js', true);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

const clientIDs = ['x7TF6ZtJev4ktoHR4ObWmA9KeqGni6rq'];

describe('Ensure rule does not apply when clientID does not match', () => {
  test('Rule does not change context object', () => {
    output = rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});

describe('Ensure multiple clientID coverage', () => {
  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', (clientID) => {
    _context.clientID = clientID;
    output = rule(_user, _context, configuration, Global);

    expect(output.context.samlConfiguration.mappings).toEqual({
      'grant_all_merchant_accounts': 'grant_all_merchant_accounts',
      'roles': 'app_metadata.groups',
    });
  });
});
