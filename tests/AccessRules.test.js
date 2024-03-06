const _ = require('lodash');

const querystring = require('querystring');
const jwt = require('jsonwebtoken');

const configuration = require('./modules/global/configuration.js');
const context = require('./modules/contexts/context.js');
const Global = require('./modules/global/global.js');
const user = require('./modules/users/user.js');

const loader = require('./modules/rule-loader.js');
const rule = loader.load('AccessRules.js');
const appsYaml = require('./modules/apps/apps.yml.js').load();


// jest setup to reset _user and _context, preventing tests from writing to objects
beforeEach(() => {
  _user = _.cloneDeep(user);
  _context = _.cloneDeep(context);
  output = undefined;
  _user.aai = [];
  fetch.resetMocks()
});


const decodeRedirect = (url) => {
  if (url) {
    // parse the redirect URL
    const parsedUrl = new URL(url);
    // parse the query parameters
    const queryParams = querystring.parse(parsedUrl.search.slice(1));
    // get the jsonwebtoken to be verifed
    const token = queryParams.error;
    // get public key to decode jsonwebtoken
    const pkey = Buffer.from(configuration.jwt_msgs_rsa_pkey, 'base64').toString('ascii');
    // decode the token and return the code
    return jwt.verify(token, pkey).code;
  }
  return undefined;
};

describe('Test group merges', () => {
  test('Expect user.groups to be a merged list of multiple group lists', async () => {

    fetch.mockResponse(appsYaml);
    _user.aai = ["2FA"];
    _user.groups = ["groups_1", "groups_2"];
    _user.ldap_groups = ["ldap_groups_1", "ldap_groups_2"];
    _user.app_metadata.groups = ["app_metadata_groups_1", "app_metadata_groups_2"];
    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    mergedGroups = [
      "everyone",
      "groups_1",
      "groups_2",
      "ldap_groups_1",
      "ldap_groups_2",
      "app_metadata_groups_1",
      "app_metadata_groups_2"
    ];
    // Ensure _user.groups is a subset of mergedGroups and vice versa
    expect(_user.groups).toEqual(expect.arrayContaining(mergedGroups));
    expect(mergedGroups).toEqual(expect.arrayContaining(_user.groups));
    // Additionally, check if they have the same length to ensure no duplicates
    expect(_user.groups).toHaveLength(mergedGroups.length);
  });
});


describe('Client does not exist in apps.yml', () => {
  test('Client id does not exist and aai is 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _user.aai = ["2FA"];
    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('Client id does not exist and aai is empty; expect not allowed', async () => {

    fetch.mockResponse(appsYaml);
    _user.aai = [];
    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000001', () => {
/*
 *  This client app is defined in apps.yml but no user or groups have been defined
 *  AAL defaults to MEDIUM
 *  Therfore, access is denied
 *  - application:
 *      authorized_groups: []
 *      authorized_users: []
 *      client_id: client00000000000000000000000001
 */
  test('No users, no groups defined; expect not allowed', async () => {


    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000001';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("notingroup");
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000002', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL defaults to MEDIUM
 *  - application:
 *     authorized_groups:
 *     - everyone
 *     authorized_users: []
 *     client_id: client00000000000000000000000002
 */
  test('User has no groups except everyone, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000002';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has no groups, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000002';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000003', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL defaults to MEDIUM
 *  - application:
 *      authorized_groups:
 *      - fakegroup1
 *      authorized_users: []
 *      client_id: client00000000000000000000000003
 */
  test('User has no groups, aai 2FA; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000003';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("notingroup");
  });
  test('User has matching group, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000003';
    _user.aai = [];
    _user.groups = ["fakegroup1"];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has matching group, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000003';
    _user.aai = ["2FA"];
    _user.groups = ["fakegroup1"];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has matching group, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000003';
    _user.aai = ["2FA"];
    _user.groups = ["fakegroup2"];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000004', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL defaults to MEDIUM
 *  - application:
 *      authorized_groups: []
 *      authorized_users:
 *      - joe@mozilla.com
 *      - jane@mozilla.com
 *      client_id: client00000000000000000000000004
 */
  test('User has no groups, aai 2FA; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000004';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("notingroup");
  });
  test('User has matching allowed email, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000004';
    _user.aai = [];
    _user.email = "joe@mozilla.com";
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has matching allowed email, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000004';
    _user.aai = ["2FA"];
    _user.email = "joe@mozilla.com";
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has matching allowed email, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000004';
    _user.aai = ["2FA"];
    _user.email = "jane@mozilla.com";
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000005', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL set to low
 *  - application:
 *      AAL: LOW
 *      authorized_groups:
 *      - everyone
 *      authorized_users: []
 *      client_id: client00000000000000000000000005
 */
  test('User has no groups, aai unset; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000005';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has no groups, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000005';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has no groups, aai HIGH_ASSURANCE_IDP; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000005';
    _user.aai = ["HIGH_ASSURANCE_IDP"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000006', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL set to Medium
 *  - application:
 *      AAL: MEDIUM
 *      authorized_groups:
 *      - everyone
 *      authorized_users: []
 *      client_id: client00000000000000000000000006
 */
  test('User has no groups, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000006';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has no groups, aai 2FA; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000006';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
  test('User has no groups, aai HIGH_ASSURANCE_IDP; expect allowed', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000006';
    _user.aai = ["HIGH_ASSURANCE_IDP"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be undefined
    expect(output.context.redirect?.url).toEqual(undefined);
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000007', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL set to HIGH
 *  - application:
 *      AAL: HIGH
 *      authorized_groups:
 *      - everyone
 *      authorized_users: []
 *      client_id: client00000000000000000000000006
 */
  test('User has no groups, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000007';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has no groups, aai 2FA; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000007';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has no groups, aai HIGH_ASSURANCE_IDP; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000007';
    _user.aai = ["HIGH_ASSURANCE_IDP"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
});

describe('Client is defined in apps.yml as client00000000000000000000000008', () => {
/*
 *  This client app is defined in apps.yml and has everyone group defined.
 *  AAL set to MAXIMUM
 *  - application:
 *      AAL: MAXIMUM
 *      authorized_groups:
 *      - everyone
 *      authorized_users: []
 *      client_id: client00000000000000000000000008
 */
  test('User has no groups, aai unset; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000008';
    _user.aai = [];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has no groups, aai 2FA; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000008';
    _user.aai = ["2FA"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
  test('User has no groups, aai HIGH_ASSURANCE_IDP; expect denied', async () => {

    fetch.mockResponse(appsYaml);
    _context.clientID = 'client00000000000000000000000008';
    _user.aai = ["HIGH_ASSURANCE_IDP"];
    _user.groups = [];
    _user.ldap_groups = [];
    _user.app_metadata.groups = [];

    output = await rule(_user, _context, configuration, Global, undefined, fetch);

    // expect redirect.url to be defined and the error code to match
    expect(output.context.redirect?.url).toBeDefined();
    expect(decodeRedirect(output.context.redirect?.url)).toEqual("aai_failed");
  });
});
