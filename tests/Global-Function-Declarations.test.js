const _ = require('lodash');

const querystring = require('querystring');
const jwt = require('jsonwebtoken');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('Global-Function-Declarations.js');


// Simple URL format string validator
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
  // reset rcontext between tests
  rcontext = undefined;
  // delete the postError function so the Global rule can actually set it
  delete Global.postError;
});


test('Expect context and user objects to be unchanged', async () => {
  output = await rule(_user, _context, configuration, Global);

  expect(output.user).toEqual(user);
  expect(output.context).toEqual(context);
});

describe('Test continue endpoint', () => {
  test('Expect an UnauthorizedError to be raised if context.protocol is redirect-callback', async () => {
    _context.protocol = "redirect-callback";
    output = await rule(_user, _context, configuration, Global);

    expect(output._.name).toEqual("UnauthorizedError");
  });

});

describe('Test postError function', () => {
  test('Expect global.postError to be set as a function', async () => {
    output = await rule(_user, _context, configuration, Global);

    expect(typeof(output.global.postError) === 'function').toEqual(true);
  });


  test('Expect postError to set context.redirect.url with a valid URL', async () => {
    output = await rule(_user, _context, configuration, Global);
    rcontext = output.global.postError('testing', _context);

    expect(isValidUrl(rcontext.redirect.url)).toEqual(true);
  });

  test('Expect postError to set context.redirect.url with a set URL prefix', async () => {
    output = await rule(_user, _context, configuration, Global);
    rcontext = output.global.postError('testing', _context);

    expect(rcontext.redirect.url.startsWith("https://sso.mozilla.com/forbidden?error=")).toEqual(true);
  });

  test('Expect postError redirect.url to contain a valid jsonwebtoken', async () => {
    output = await rule(_user, _context, configuration, Global);

    rcontext = output.global.postError('testing', _context);
    // parse the redirect URL
    const parsedUrl = new URL(rcontext.redirect.url);
    // parse the query parameters
    const queryParams = querystring.parse(parsedUrl.search.slice(1));
    // get the jsonwebtoken to be verifed
    const token = queryParams.error;
    // get public key to decode jsonwebtoken
    const pkey = Buffer.from(configuration.jwt_msgs_rsa_pkey, 'base64').toString('ascii');
    // decode the token
    const decoded = jwt.verify(token, pkey);

    expect(decoded.code === 'testing').toEqual(true);
  });
});
