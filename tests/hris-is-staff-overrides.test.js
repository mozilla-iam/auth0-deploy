const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('hris-is-staff overrides.js', false);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


test('Test Placeholder', () => {
  // Inject the empty AAI array attribute.  This is normally setup in the aai.js rule
  _user.aai = [];
  output = rule(_user, _context, configuration, Global);

  expect(true).toEqual(true);
});
