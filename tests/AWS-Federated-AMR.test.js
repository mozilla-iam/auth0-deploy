const context = require('./modules/contexts/context.js');
const user = require('./modules/users/user.js');

const testAMR = (description, awsGroups, userGroups, expectedAMR) => {
  test(description, () => {
    const loader = require('./modules/rule-loader.js');

    // AWS groups are object where each key is a pattern match string, and it maps
    // to an array of role ARNs. To simplify things for the test we'll accept a simple
    // array and map into blank ARNs
    awsGroups = awsGroups.reduce((k, v) => ({...k, [v]: []}), {});

    // stringify the awsGroup for injection into the rule loader
    awsGroups = JSON.stringify(awsGroups);

    // load the rule
    const rule = loader.load(
      'AWS-Federated-AMR.js',
      `global.awsGroupRoleMap = ${awsGroups};`
    );

    // set the user groups
    user.groups = userGroups;

    const output = rule(user, context, loader.handler);

    // the first element is always '', blame auth0
    expect(output.context.idToken.amr).toEqual(['', ...expectedAMR]);
  });
};

// set the context and user groups necessary for the tests to function
context.clientID = 'xRFzU2bj7Lrbo3875aXwyxIArdkq1AOT';  // force to Federated AWS CLI auth0-dev
let userGroups = ['normal_user_group_1', 'qa_team_3_member_2', 'secret_admin_group_2'];

testAMR(
  'aws rolemap without any matches',
  ['nonexistent_group_6', 'does_not_exist_8', 'aGkgZ2VuZSwga2FuZw'],
  userGroups,
  []
);

testAMR(
  'aws rolemap contains only groups without wildcard characters',
  ['nonexistent_group_6', 'normal_user_group_1', 'secret_admin_group_2'],
  userGroups,
  ['normal_user_group_1', 'secret_admin_group_2']
);

testAMR(
  'aws rolemap contains single question mark group',
  ['normal_user_group_?'],
  userGroups,
  ['normal_user_group_1']
);

testAMR(
  'aws rolemap contains single asterisk',
  ['normal_*_group_1'],
  userGroups,
  ['normal_user_group_1']
);

testAMR(
  'aws rolemap contains multiple asterisks',
  ['normal_*_group*'],
  userGroups,
  ['normal_user_group_1']
);

testAMR(
  'aws rolemap contains asterisk and question mark',
  ['normal_*_group_?'],
  userGroups,
  ['normal_user_group_1']
);

testAMR(
  'aws rolemap contains multiple groups with asterisks and wildcards',
  ['normal_*_group_?', '??_team*'],
  userGroups,
  ['normal_user_group_1', 'qa_team_3_member_2']
);

testAMR(
  'aws rolemap contains only asterisk',
  ['*'],
  userGroups,
  ['normal_user_group_1', 'qa_team_3_member_2', 'secret_admin_group_2']
);

testAMR(
  'aws rolemap contains multiple asterisks in a row',
  ['***'],
  userGroups,
  ['normal_user_group_1', 'qa_team_3_member_2', 'secret_admin_group_2']
);

// different user group than above
testAMR(
  'aws rolemap contains group with plus sign',
  ['normal_user_group+plus_sign'],
  ['normal_user_group+plus_sign'],
  ['normal_user_group+plus_sign']
);

// test if auth0 is setup incorrectly
test('error: auth0 configuration is missing AWS Federated AMR rule configuration values', () => {
  let loader = require('./modules/rule-loader.js');
  let rule = loader.load(
    'AWS-Federated-AMR.js',
    `
    delete configuration.auth0_aws_assests_access_key_id;
    `,
    false
  );

  expect(() => { rule(user, context, loader.handler) }).toThrowError(
    new Error("Missing Auth0 AWS Federated AMR rule configuration values")
  );
});

test('error: cannot fetch group role map from aws', () => {
  let loader = require('./modules/rule-loader.js');
  let rule = loader.load(
    'AWS-Federated-AMR.js',
    `
    delete global.awsGroupRoleMap;
    configuration.auth0_aws_assests_access_key_id = "fake_access_key";
    `,
    false
  );

  output = expect(rule(user, context, loader.handler)).resolves;

  output.toHaveProperty('context.idToken.amr', ['']);
  output.toHaveProperty('context.idTokenError', 'Could not fetch AWS group role map from S3');
});