const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('restricted-users.js');

const restricted_users = 'restricted@mozilla.com,restricted@mozilla.org';


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;

  // we're counting calls to functions, so need to reset before each test
  jest.clearAllMocks();
});

// mocking the auth0 global
const auth0 = {
  users: {
    updateAppMetadata: jest.fn(),
    updateUserMetadata: jest.fn(),
  }
}

test('exit if configuration.restricted_users not set', () => {
  output = rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('email address not restricted', () => {
  output = rule(_user, _context, {...configuration, restricted_users}, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

// now, set the user email address to a restricted email address
test('restricted email address with disallowed relier (RP)', () => {
  _user.email = 'restricted@mozilla.org';

  output = rule(_user, _context, {...configuration, restricted_users}, Global, auth0);

  // call into the auth0 libraries to update app and user metadata
  expect(auth0.users.updateAppMetadata.mock.calls.length).toBe(1);
  expect(auth0.users.updateUserMetadata.mock.calls.length).toBe(1);

  // overwrite groups everywhere possible
  expect(output.context.idToken['https://sso.mozilla.com/claim/groups']).toEqual(['IntranetWiki'])
  expect(output.user.app_metadata.groups).toEqual(['IntranetWiki'])
  expect(output.user.groups).toEqual(['IntranetWiki'])
  expect(output.user.ldap_groups).toEqual(['IntranetWiki'])

  // set flag on user to be restricted
  expect(output.user.user_metadata.restricted_user).toBe(true);

  // redirect to forbidden page
  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=');
});

// same as above, but an allowed RP doesn't redirect
test('restricted email address with allowed relier (RP)', () => {
  _context.clientID = 'FeqjZfpOqMIkcGKkd2fDjpnm5oSsOOZ2';
  _user.email = 'restricted@mozilla.org';

  output = rule(_user, _context, {...configuration, restricted_users}, Global, auth0);

  // call into the auth0 libraries to update app and user metadata
  expect(auth0.users.updateAppMetadata.mock.calls.length).toBe(1);
  expect(auth0.users.updateUserMetadata.mock.calls.length).toBe(1);

  // overwrite groups everywhere possible
  expect(output.context.idToken['https://sso.mozilla.com/claim/groups']).toEqual(['IntranetWiki'])
  expect(output.user.app_metadata.groups).toEqual(['IntranetWiki'])
  expect(output.user.groups).toEqual(['IntranetWiki'])
  expect(output.user.ldap_groups).toEqual(['IntranetWiki'])

  // set flag on user to be restricted
  expect(output.user.user_metadata.restricted_user).toBe(true);

  // no redirect to forbidden page
  expect(output.context.redirect).toBeUndefined();
});
