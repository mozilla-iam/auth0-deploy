const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('default-deny-for-maintenance.js', false);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


// TODO: We could expand this more to ensure the url matches sso and ensure the
// the jwt matches "maintenancemode".
test('Ensure context.redirect.url is set and redirects to sso dashboard forbidden route', async () => {
  output = await rule(_user, _context, configuration, Global);

  expect(output.context.redirect.url).toMatch('https://sso.mozilla.com/forbidden?error=');
});
