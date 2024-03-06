const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-Navex-partition-id.js', true);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});



const clientIDs = [
    'gL08r5BRiweqf4aDQVX6xB4FHyFepFlM', //Navex - Stage
    'iz2qSHo0lSv2nRZ8V3JnOESX5UR4dcpX', //Navex
  ];

describe('Ensure rule does not apply when clientID does not match', () => {
  test('Rule does not change context object', async () => {
    output = await rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});

describe('Ensure SAML mapping of multiple clientIDs', () => {
  test.each(clientIDs)('Ensure SAML configuration mappings for client %s', async (clientID) => {
    _context.clientID = clientID;
    output = await rule(_user, _context, configuration, Global);

    expect(output.context.samlConfiguration.mappings).toEqual({
      'PARTITION': 'partition_id',
    });
  });
});

describe('Ensure user parition id of multiple clientID coverage', () => {
  test.each(clientIDs)('Ensure user attrib partition_id for client %s', async (clientID) => {
    _context.clientID = clientID;
    output = await rule(_user, _context, configuration, Global);

    expect(output.user.partition_id).toEqual("MOZILLA");
  });
});
