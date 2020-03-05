const loader = require('./modules/rule-loader.js');
const rule = loader.load('duosecurity.js');

const context = require('./modules/contexts/context.js');
const user = require('./modules/users/user.js');
const userEmailNotVerified = require('./modules/users/email-not-verified.js');
const userWhitelisted = require('./modules/users/duosecurity-whitelisted.js');


var output;

test('user in LDAP (ad) requires 2FA', () => {
  output = rule(user, context, loader.handler);

  expect(output.context.multifactor.provider).toEqual('duo');
  expect(output.context.multifactor.username).toEqual(user.email);
});

test('whitelisted account has no duo', () => {
  output = rule(userWhitelisted, context, loader.handler);

  expect(output.context.multifactor).toEqual(true); 
});

test('email account not verified', () => {
  output = rule(userEmailNotVerified, context, loader.handler);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden');
});
