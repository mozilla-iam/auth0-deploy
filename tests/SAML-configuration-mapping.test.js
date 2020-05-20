const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-configuration-mapping.js');


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


test('client does not use SAML configuration mappings', () => {
  output = rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('Sage Intacct', () => {
  _context.clientID = 'wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l';
  output = rule(_user, _context, configuration, Global);

  expect(output.context.samlConfiguration.mappings).toEqual({
    'Company Name': 'company_name',
    'emailAddress': 'email',
    'name': 'name',
  });

  expect(output.user.company_name).toEqual('MOZ Corp'); 
});

test('Thinksmart', () => {
  _context.clientID = 'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84';
  output = rule(_user, _context, configuration, Global);

  expect(output.context.samlConfiguration.mappings).toEqual({
    'Email': 'email',
    'firstName': 'given_name',
    'lastName': 'family_name',
  });
});
