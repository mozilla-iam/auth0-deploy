const _ = require('lodash');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('aai.js', true);


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
});

describe('Test default', () => {
  test('Expect aai and aal to be empty and UNKNOWN', () => {
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai).toEqual([]);
    expect(output.user.aal).toEqual("UNKNOWN");
  });
});


describe('Test for MFA when connection is Github', () => {

  let githubIdentity = {
    "profileData": {},
    "provider": "github",
    "user_id": 1234567890,
    "connection": "github",
    "isSocial": true
  };


  test('When MFA is true in user obj, expect AAI to contain 2FA', () => {
    _user.identities.push(githubIdentity);
    _context.connection = "github";
    _user.two_factor_authentication = true;
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When MFA is true in profileData, expect AAI to contain 2FA', () => {
    delete _user.two_factor_authentication;
    githubIdentity.profileData.two_factor_authentication = true;
    _user.identities.push(githubIdentity);
    _context.connection = "github";
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When MFA is false in user obj and profileData, expect AAI to not contain 2FA', () => {
    delete _user.two_factor_authentication;
    delete githubIdentity.profileData.two_factor_authentication;;
    _user.identities.push(githubIdentity);
    _context.connection = "github";
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(false);
  });

});

describe('Test for MFA when connection is firefoxaccounts', () => {

  let firefoxaccountsIdentity = {
    "profileData": {},
    "provider": "oauth2",
    "user_id": "firefoxaccounts|123456789012345678901234567890",
    "connection": "firefoxaccounts",
    "isSocial": true
  };

  test('When MFA is true in user obj, expect AAI to contain 2FA', () => {
    _user.identities.push(firefoxaccountsIdentity);
    _context.connection = "firefoxaccounts";
    _user.fxa_twoFactorAuthentication = true;

    _user.two_factor_authentication = true;
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When MFA is true in profileData, expect AAI to contain 2FA', () => {
    delete _user.fxa_twoFactorAuthentication;
    firefoxaccountsIdentity.profileData.fxa_twoFactorAuthentication = true;
    _user.identities.push(firefoxaccountsIdentity);
    _context.connection = "firefoxaccounts";
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When MFA is false in user obj and  profileData, expect AAI to contain 2FA', () => {
    delete _user.fxa_twoFactorAuthentication;
    delete firefoxaccountsIdentity.profileData.fxa_twoFactorAuthentication;
    _user.identities.push(firefoxaccountsIdentity);
    _context.connection = "firefoxaccounts";
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(false);
  });
});

describe('Test for MFA when connection is LDAP / DuoSecurity', () => {

  test('When duo is defined and context.multifactor is true, expect AAI to contain 2FA', () => {
    _context.multifactor = true;
    _user.multifactor = ["duo"];
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When duo is not defined but context.multifactor is true, expect AAI to contain 2FA', () => {
    _context.multifactor = true;
    _user.multifactor = [];
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(true);
  });

  test('When duo is defined but context.multifactor undefined, expect AAI to not contain 2FA', () => {
    delete _context.multifactor;
    _user.multifactor = ["duo"];
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(false);
  });

  test('When duo is not defined but context.multifactor is false, expect AAI to not contain 2FA', () => {
    _context.multifactor = false;
    _user.multifactor = [];
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(false);
  });

  test('When duo is not defined and context.multifactor is undefined, expect AAI to not contain 2FA', () => {
    delete _context.multifactor;
    _user.multifactor = [];
    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("2FA")).toEqual(false);
  });
});

describe('Test for MFA when connection is google', () => {

  test('When connection is google-oauth2, expect AAI to contain HIGH_ASSURANCE_IDP', () => {
    _context.connection = "google-oauth2";

    output = rule(_user, _context, configuration, Global);

    expect(output.user.aai.includes("HIGH_ASSURANCE_IDP")).toEqual(true);
  });
});

