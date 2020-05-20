const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('HRIS-is-staff.js');


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});


test('clientID is not in list', () => {
  output = rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(context); 
  expect(output.user).toEqual(user); 
});

test('clientID in list', () => {
  _context.clientID = 'UCOY390lYDxgj5rU8EeXRtN6EP005k7V';
  __context = _.cloneDeep(_context);

  output = rule(_user, _context, configuration, Global);

  expect(output.context).toEqual(__context); 
});

test('clientID in list, user does not have hris_is_staff set', () => {
  _context.clientID = 'UCOY390lYDxgj5rU8EeXRtN6EP005k7V';

  output = rule(_user, _context, configuration, Global);

  expect(output.user.groups).toEqual([...user.groups, 'hris_is_staff']); 
  expect(output.user.app_metadata.groups).toEqual([...user.app_metadata.groups, 'hris_is_staff']); 
});

test('clientID in list, user does not get hris_is_staff set twice', () => {
  _context.clientID = 'UCOY390lYDxgj5rU8EeXRtN6EP005k7V';
  _user.groups = [..._user.groups, 'hris_is_staff'];
  _user.app_metadata.groups = [..._user.app_metadata.groups, 'hris_is_staff'];

  output = rule(_user, _context, configuration, Global);

  expect(output.user.groups).toEqual([...user.groups, 'hris_is_staff']);
  expect(output.user.app_metadata.groups).toEqual([...user.app_metadata.groups, 'hris_is_staff']);
});
