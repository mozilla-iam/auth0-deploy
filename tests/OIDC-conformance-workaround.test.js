const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('OIDC-conformance-workaround.js');


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

// This list should match what is being applied in the OIDC-conformance-workaround rule itself.
const clientsIDs = [
    'aDL5o9SZRaYTH5zzkGntT4l76qydMbZe', // sso dashboard allizom
    'UCOY390lYDxgj5rU8EeXRtN6EP005k7V', // sso dashboard prod
    'mc1l0G4sJI2eQfdWxqgVNcRAD9EAgHib', // sso dashboard allizom
    '2KNOUCxN8AFnGGjDCGtqiDIzq8MKXi2h', // sso dashboard allizom
  ];

describe('Ensure multiple clientID coverage', () => {
  test.each(
    clientsIDs
  )('given clientID %s, expect context.idToken.updated_at is an int', async (clientID) => {
    _context.clientID = clientID;;
    output = await rule(_user, _context, configuration, Global);

    expect(Number.isInteger(output.context.idToken.updated_at)).toBeTruthy();
    });
});

describe('Ensure Rule is not applied', () => {
  test('Ensure Rule does not apply when clientID is not covered', async () => {
    output = await rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});
