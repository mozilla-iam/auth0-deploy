const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('CIS-Claims-fixups.js', false);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


test('Expect custom claims in idToken to match', async () => {
  output = await rule(_user, _context, configuration, Global);

  const idToken = {
    'https://sso.mozilla.com/claim/groups': [ 'all_ldap_users', 'everyone', 'fakegroup1', 'fakegroup2' ],
    'https://sso.mozilla.com/claim/AAI': [],
    'https://sso.mozilla.com/claim/AAL': 'UNKNOWN',
    'https://sso.mozilla.com/claim/README_FIRST': 'Please refer to https://github.com/mozilla-iam/person-api in order to query Mozilla IAM CIS user profile data'
  };

  expect(output.context.idToken).toEqual(idToken);
});

test('When neither profile or custom claim is in scope, expect no custom claims in idToken to match', async () => {

  _context.request.query.scope = "";
  output = await rule(_user, _context, configuration, Global);

  expect(output.context.idToken).toEqual({});
});
