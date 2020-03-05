const loader = require('./modules/rule-loader.js');
const rule = loader.load('force-ldap-logins-over-ldap.js');

const context = require('./modules/contexts/context.js');
const user = require('./modules/users/user.js');
const userEmailNotVerified = require('./modules/users/email-not-verified.js');


var output;

test('whitelisted clients without enforcement', () => {
  output = rule(user, context, loader.handler);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('email account not verified', () => {
  output = rule(userEmailNotVerified, context, loader.handler);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2Rl');
  delete(context.redirect);
});

test('staff account not using ldap', () => {
  context.connectionStrategy = 'not-ad';

  ['jdoe@mozilla.com', 'jdoe@mozillafoundation.org'].forEach(email => {
    user.email = email;
    output = rule(user, context, loader.handler);
    expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=');
    delete(context.redirect);
  });
});

test('non-staff account not using ldap', () => {
  context.connectionStrategy = 'not-ad';
  user.email = "jdoe@example.com";

  output = rule(user, context, loader.handler);

  expect(output.user).toEqual(user);
});
