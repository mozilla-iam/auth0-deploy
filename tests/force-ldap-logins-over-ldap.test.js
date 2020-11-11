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


test('whitelisted clients without enforcement', () => {
  output = rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('email account not verified', () => {
  const _user = require('./modules/users/user.js');
  _user.email_verified = false;

  output = rule(_user, context, configuration, Global);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2Rl');
  delete(context.redirect);
});

test('staff account not using ldap', () => {
  _context.connectionStrategy = 'not-ad';

  ['jdoe@mozilla.com', 'jdoe@mozillafoundation.org'].forEach(email => {
    _user.email = email;
    output = rule(_user, _context, configuration, Global);
    expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=');
  });
});

test('non-staff account not using ldap', () => {
  _context.connectionStrategy = 'not-ad';
  _user.email = "jdoe@example.com";

  output = rule(_user, _context, configuration, Global);

  expect(output.user).toEqual(_user);
});
