rules = require('./modules/rule-loader.js');
duosecurity = rules.load('duosecurity.js');

context = require('./modules/contexts/context.js');
user = require('./modules/users/user.js');
userEmailNotVerified = require('./modules/users/email-not-verified.js');
userWhitelisted = require('./modules/users/duosecurity-whitelisted.js');


var output;

test('user in LDAP (ad) requires 2FA', () => {
  output = duosecurity(user, context, rules.callbackHandler);

  expect(output.context.multifactor.provider).toEqual('duo');
  expect(output.context.multifactor.username).toEqual(user.email);
});

test('whitelisted account has no duo', () => {
  output = duosecurity(userWhitelisted, context, rules.callbackHandler);

  expect(output.context.multifactor).toEqual(true); 
});

test('email account not verified', () => {
  output = duosecurity(userEmailNotVerified, context, rules.callbackHandler);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden');
});
