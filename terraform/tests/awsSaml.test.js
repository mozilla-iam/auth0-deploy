const _ = require('lodash');

const eventObj = require('./modules/event.json');
const { onExecutePostLogin } = require('../actions/awsSaml.js');

jest.mock('node-fetch');

const compileGroups = async (_event) => {
  // Ensure we have the correct group data
  const app_metadata_groups = _event.user.app_metadata.groups || [];
  const ldap_groups = _event.user.ldap_groups || [];
  const user_groups = _event.user.groups || [];

  // With account linking its possible that LDAP is not the main account on contributor LDAP accounts
  // Here we iterate over all possible user identities and build an array of all groups from them
  let _identity;
  let identityGroups = [];
  // Iterate over each identity
  for (let x = 0, len = _event.user.identities.length; x<len; x++) {
    // Get profile for the given identity
    _identity = _event.user.identities[x];
    // If the identity contains profileData
    if ("profileData" in _identity) {
      // If profileData contains a groups array
      if ("groups" in _identity.profileData) {
        // Merge the group arry into identityGroups
        identityGroups.push(..._identity.profileData.groups);
      }
    }
  }

  // Collect all variations of groups and merge them together for access evaluation
  let groups = [...user_groups, ...app_metadata_groups, ...ldap_groups, ...identityGroups];

  // Inject the everyone group and filter for duplicates
  groups.push("everyone");
  groups = groups.filter((value, index, array) => array.indexOf(value) === index);
  return groups;
};


beforeEach(() => {
  _event = _.cloneDeep(eventObj);
  _event.user.aai = [];
  _event.secrets = {};
  _event.secrets.accessKeyId = "fakefakefakefake";
  _event.secrets.secretAccessKey = "fakefakefakefake";
  _event.transaction.redirect_uri = undefined;

  api = {
    idToken: {
      setCustomClaim: jest.fn()
    },
    access: {
      deny: jest.fn()
    },
    redirect: {
      sendUserTo: jest.fn()
    }
  };

  // Spy on console
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

//createGroupMembership
//deleteGroupMembership
//listUsers
//listGroupMembershipsForMember
//describeGroup
//getGroupId
//createUser


const clientGroupMaps = [
  { 'JR8HkyiM2i00ma2d1X2xfgdbEHzEYZbS': [
      "aws_095732026120_poweruser",
      "aws_104923852476_admin",
      "aws_320464205386_admin",
      "aws_320464205386_read_only",
      "aws_359555865025_admin",
      "aws_558986605633_admin",
      "aws_622567216674_admin",
      "aws_839739216564_admin",
      "aws_consolidatedbilling_admin",
      "aws_consolidatedbilling_read_only",
      "aws_discourse_dev",
      "fuzzing_team",
      "mozilliansorg_aws_billing_access",
      "mozilliansorg_cia-aws",
      "mozilliansorg_consolidated-billing-aws",
      "mozilliansorg_devtools-code-origin-access",
      "mozilliansorg_http-observatory-rds",
      "mozilliansorg_iam-in-transition",
      "mozilliansorg_iam-in-transition-admin",
      "mozilliansorg_meao-admins",
      "mozilliansorg_mozilla-moderator-devs",
      "mozilliansorg_partinfra-aws",
      "mozilliansorg_pdfjs-testers",
      "mozilliansorg_pocket_cloudtrail_readers",
      "mozilliansorg_searchfox-aws",
      "mozilliansorg_secops-aws-admins",
      "mozilliansorg_voice_aws_admin_access",
      "mozilliansorg_web-sre-aws-access",
      "team_infra",
      "team_mdn",
      "team_netops",
      "team_opsec",
      "team_se",
      "team_secops",
      "voice-dev",
      "vpn_sumo_aws_devs"
  ]},
  { 'pQ0eb5tzwfYHnAtzGuk88pzxZ68szQtk': [
      "mozilliansorg_pocket_admin",
      "mozilliansorg_pocket_backend",
      "mozilliansorg_pocket_backup_admin",
      "mozilliansorg_pocket_backup_readonly",
      "mozilliansorg_pocket_cloudtrail_readers",
      "mozilliansorg_pocket_dataanalytics",
      "mozilliansorg_pocket_datalearning",
      "mozilliansorg_pocket_developer",
      "mozilliansorg_pocket_frontend",
      "mozilliansorg_pocket_marketing",
      "mozilliansorg_pocket_mozilla_sre",
      "mozilliansorg_pocket_qa",
      "mozilliansorg_pocket_readonly",
      "mozilliansorg_pocket_sales",
      "mozilliansorg_pocket_ads",
      "mozilliansorg_pocket_aws_billing"
  ]},
  { 'jU8r4uSEF3fUCjuJ63s46dBnHAfYMYfj': [
      "mozilliansorg_mofo_aws_admins",
      "mozilliansorg_mofo_aws_community",
      "mozilliansorg_mofo_aws_everything",
      "mozilliansorg_mofo_aws_labs",
      "mozilliansorg_mofo_aws_projects",
      "mozilliansorg_mofo_aws_sandbox",
      "mozilliansorg_mofo_aws_secure"
  ]},
  { 'c0x6EoLdp55H2g2OXZTIUuaQ4v8U4xf9': [
      "mozilliansorg_cloudservices_aws_admin"
  ]},
];

describe('Basic tests', () => {
  it('should be defined', () => {
    expect(onExecutePostLogin).toBeDefined();
  });

  it('should execute without throwing', async () => {
    await expect(onExecutePostLogin(_event, api)).resolves.not.toThrow();
  });
});
