const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('SAML-test-mozilla-com-google.js', true);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

    //user.myemail = user.email.replace("mozilla.com", "test.mozilla.com").replace("mozillafoundation.org", "test.mozillafoundation.org").replace("getpocket.com", "test-gsuite.getpocket.com");

const clientIDs = ['q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46'];

const mozillaEmailAddresses = [
  ['joe@mozilla.com', 'joe@test.mozilla.com'],
  ['jane@mozillafoundation.org', 'jane@test.mozillafoundation.org'],
  ['janice@getpocket.com', 'janice@test-gsuite.getpocket.com'],
];

const nonMozillaEmailAddresses = [
  'joe@example.com',
  'jane@allizom.org',
];

describe('Ensure rule does not apply when clientID does not match', () => {
  test('Rule does not change context object', () => {
    output = rule(_user, _context, configuration, Global);

    expect(output.context).toEqual(context);
    expect(output.user).toEqual(user);
  });
});

describe('Ensure SAML configuration', () => {
  test.each(clientIDs)('Given client %s, ensure SAML configuration', (clientID) => {
    _context.clientID = clientID;
    output = rule(_user, _context, configuration, Global);

    expect(output.context.samlConfiguration.mappings).toEqual({
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "myemail",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":   "myemail",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email":          "myemail",
    });

    expect(output.context.samlConfiguration.nameIdentifierFormat).toEqual("urn:oasis:names:tc:SAML:2.0:nameid-format:email");

  });
});

describe('Ensure mozilla email addresses are altered', () => {

  let matrix = clientIDs.flatMap((clientID) => mozillaEmailAddresses.map((emailAddress) => [clientID, emailAddress[0], emailAddress[1]]));
  test.each(matrix)('Given client %s and users email is %s, expect myemail property to be %s', (clientID, emailAddress, expectedEmailAddress) => {
    _user.email = emailAddress;
    _context.clientID = clientID;

    output = rule(_user, _context, configuration, Global);
    expect(output.user.myemail).toBe(expectedEmailAddress);
  });
});


describe('Ensure non-mozilla email addresses are NOT altered', () => {

  let matrix = clientIDs.flatMap((clientID) => nonMozillaEmailAddresses.map((emailAddress) => [clientID, emailAddress]));
  test.each(matrix)('Given client %s and user email is %s, expect myemail property to be the same as the email property', (clientID, emailAddress) => {
    _user.email = emailAddress;
    _context.clientID = clientID;

    output = rule(_user, _context, configuration, Global);
    expect(output.user.myemail).toBe(_user.email);
  });
});
