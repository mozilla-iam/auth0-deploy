const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('force-ldap-logins-over-ldap.js');


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


test('whitelisted clients without enforcement', async () => {
  output = await rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('email account not verified', async () => {
  const _user = require('./modules/users/user.js');
  _user.email_verified = false;

  output = await rule(_user, context, configuration, Global);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2Rl');
  delete(context.redirect);
});

test('staff account not using ldap', async () => {
  _context.connectionStrategy = 'not-ad';

  ['jdoe@mozilla.com', 'jdoe@mozillafoundation.org'].forEach(async (email) => {
    _user.email = email;
    output = await rule(_user, _context, configuration, Global);
    expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=');
  });
});

test('non-staff account not using ldap', async () => {
  _context.connectionStrategy = 'not-ad';
  _user.email = "jdoe@example.com";
  _user.email_verified = true;
  modUser = _.cloneDeep(_user);
  modContext = _.cloneDeep(_context);

  output = await rule(_user, _context, configuration, Global);

  expect(output.user).toEqual(modUser);
  expect(output.context).toEqual(modContext);
});
