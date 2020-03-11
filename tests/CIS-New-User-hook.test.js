const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('CIS-New-User-hook.js', false);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _configuration = _.cloneDeep(configuration);
  _context = _.cloneDeep(context);
  _user = _.cloneDeep(user);
  output = undefined;
});


test('error: invalid lambda settings', () => {
  _context.connection = 'github';
  _user.created_at = new Date().toISOString();

  // we have to deep copy these again, because of the way that rules directly modify state
  _contextCopy = _.cloneDeep(_context);
  _userCopy = _.cloneDeep(_user);

  return rule(_user, _context, configuration, Global).then(output => {
    expect(output.context._log.error[0]).toContain('Error: Unable to invoke CIS new user lambda hook:');

    // we have to delete the log, or the tests below will fail
    delete output.context._log;

    expect(output.context).toEqual(_contextCopy);
    expect(output.user).toEqual(_userCopy);
  });
});

test('error: missing CIS new user hook configuration variables', () => {
  delete _configuration.CIS_hook_arn;

  output = rule(_user, _context, _configuration, Global);

  expect(output.context._log.error[0]).toContain('Error: CIS hook configuration values are missing.');

  // we have to delete the log, or the tests below will fail
  delete output.context._log;

  expect(output.context).toEqual(context);
  expect(output.user).toEqual(user);
});

test(`users in LDAP don't call the new user hook`, () => {
  _context.connection = 'Mozilla-LDAP foo bar';
  _contextCopy = _.cloneDeep(_context);

  output = rule(_user, _context, _configuration, Global);

  expect(output.context._log.log).toEqual([]);
  expect(output.context._log.error).toEqual([]);

  // we have to delete the log, or the tests below will fail
  delete output.context._log;

  expect(output.context).toEqual(_contextCopy);
  expect(output.user).toEqual(user);
});


test(`old users don't call the new user hook`, () => {
  _context.connection = 'github';
  _user.created_at = new Date('1970').toISOString();

  _contextCopy = _.cloneDeep(_context);
  _userCopy = _.cloneDeep(_user);

  output = rule(_user, _context, _configuration, Global);

  expect(output.context._log.log).toEqual([]);
  expect(output.context._log.error).toEqual([]);

  // we have to delete the log, or the tests below will fail
  delete output.context._log;

  expect(output.context).toEqual(_contextCopy);
  expect(output.user).toEqual(_userCopy);
});