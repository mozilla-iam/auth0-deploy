const AWS = require("aws-sdk");

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "awsSaml");

  // Only continue on auth0 prod tenant
  if (event.tenant.id !== "auth") {
    console.log(`Skipping awsSAML; tenant is ${event.tenant.id}`);
    return;
  }

  var paramObj = {};

  const clientID = event.client.client_id || "";
  switch (clientID) {
    case "JR8HkyiM2i00ma2d1X2xfgdbEHzEYZbS":
      // IT billing account params
      paramObj.region = "us-west-2";
      paramObj.IdentityStoreId = event.secrets.AWS_IDENTITYSTORE_ID_IT;
      paramObj.accessKeyId = event.secrets.AWS_IDENTITYSTORE_ACCESS_ID_IT;
      paramObj.secretAccessKey = event.secrets.AWS_IDENTITYSTORE_ACCESS_KEY_IT;
      paramObj.awsGroups = [
        "fuzzing_team",
        "mozilliansorg_aws_billing_access",
        "mozilliansorg_cia-aws",
        "mozilliansorg_consolidated-billing-aws",
        "mozilliansorg_consolidated-billing-aws-readonly",
        "mozilliansorg_discourse-devs",
        "mozilliansorg_http-observatory-rds",
        "mozilliansorg_iam-admins",
        "mozilliansorg_iam-in-transition",
        "mozilliansorg_iam-in-transition-admin",
        "mozilliansorg_iam-readonly",
        "mozilliansorg_meao-admins",
        "mozilliansorg_mozilla-moderator-devs",
        "mozilliansorg_partinfra-aws",
        "mozilliansorg_pdfjs-testers",
        "mozilliansorg_pocket_cloudtrail_readers",
        "mozilliansorg_project-guardian-admins",
        "mozilliansorg_relay_developer",
        "mozilliansorg_searchfox-aws",
        "mozilliansorg_secops-aws-admins",
        "mozilliansorg_sre",
        "mozilliansorg_sumo-admins",
        "mozilliansorg_sumo-devs",
        "mozilliansorg_voice_aws_admin_access",
        "mozilliansorg_web-sre-aws-access",
        "mozilliansorg_webcompat-alexa-admins",
        "team_mdn",
        "team_netops",
        "team_opsec",
        "team_se",
        "team_secops",
        "voice-dev",
        "vpn_sumo_aws_devs"
      ];
      break;
    case "pQ0eb5tzwfYHnAtzGuk88pzxZ68szQtk":
      // Pocket Billing Account
      paramObj.region = "us-east-1";
      paramObj.IdentityStoreId = event.secrets.AWS_IDENTITYSTORE_ID_POCKET;
      paramObj.accessKeyId = event.secrets.AWS_IDENTITYSTORE_ACCESS_ID_POCKET;
      paramObj.secretAccessKey =
        event.secrets.AWS_IDENTITYSTORE_ACCESS_KEY_POCKET;
      paramObj.awsGroups = [
        "mozilliansorg_pocket_admin",
        "mozilliansorg_pocket_backend",
        "mozilliansorg_pocket_backup_admin",
        "mozilliansorg_pocket_backup_readonly",
        "mozilliansorg_pocket_cloudtrail_readers",
        "mozilliansorg_pocket_dataanalytics",
        "mozilliansorg_pocket_datalearning",
        "mozilliansorg_pocket_developer",
        "mozilliansorg_pocket_fin_ops",
        "mozilliansorg_pocket_frontend",
        "mozilliansorg_pocket_marketing",
        "mozilliansorg_pocket_mozilla_sre",
        "mozilliansorg_pocket_qa",
        "mozilliansorg_pocket_readonly",
        "mozilliansorg_pocket_sales",
        "mozilliansorg_pocket_ads",
        "mozilliansorg_pocket_aws_billing",
        "mozilliansorg_infrasec"
      ];
      break;
    case "jU8r4uSEF3fUCjuJ63s46dBnHAfYMYfj":
      // MoFo Billing Account
      paramObj.region = "us-east-2";
      paramObj.IdentityStoreId = event.secrets.AWS_IDENTITYSTORE_ID_MOFO;
      paramObj.accessKeyId = event.secrets.AWS_IDENTITYSTORE_ACCESS_ID_MOFO;
      paramObj.secretAccessKey =
        event.secrets.AWS_IDENTITYSTORE_ACCESS_KEY_MOFO;
      paramObj.awsGroups = [
        "mozilliansorg_mofo_aws_admins",
        "mozilliansorg_mofo_aws_community",
        "mozilliansorg_mofo_aws_everything",
        "mozilliansorg_mofo_aws_labs",
        "mozilliansorg_mofo_aws_projects",
        "mozilliansorg_mofo_aws_sandbox",
        "mozilliansorg_mofo_aws_secure",
        "mozilliansorg_infrasec"
      ];
      break;
    case "c0x6EoLdp55H2g2OXZTIUuaQ4v8U4xf9":
      // CloudServices billing account params
      paramObj.region = "us-west-2";
      paramObj.IdentityStoreId = event.secrets.AWS_IDENTITYSTORE_ID_CLOUDSERVICES;
      paramObj.accessKeyId = event.secrets.AWS_IDENTITYSTORE_ACCESS_ID_CLOUDSERVICES;
      paramObj.secretAccessKey = event.secrets.AWS_IDENTITYSTORE_ACCESS_KEY_CLOUDSERVICES;
      paramObj.awsGroups = [
        "mozilliansorg_aws_billing_access",
        "mozilliansorg_cloudservices_aws_admin",
        "mozilliansorg_cloudservices_aws_autograph_admin",
        "mozilliansorg_cloudservices_aws_autograph_dev",
        "mozilliansorg_cloudservices_aws_dev_developers",
        "mozilliansorg_cloudservices_aws_developer_services_dev",
        "mozilliansorg_cloudservices_aws_fxa_developers",
        "mozilliansorg_cloudservices_aws_taskcluster_devs",
        "mozilliansorg_infrasec"
      ];
      break;
    default:
      return; // Not an AWS login, continue auth pipeline
  }

  // Instantate and set Region
  var i = new AWS.IdentityStore({
    region: paramObj.region,
    apiVersion: "2020-06-15",
    accessKeyId: paramObj.accessKeyId,
    secretAccessKey: paramObj.secretAccessKey,
  });

  const IdentityStoreId = paramObj.IdentityStoreId;
  const userName = event.user.email;
  var AWSUserId = "";

  // This is a list of groups that are mapped to AWS groups
  const AWS_GROUPS = paramObj.awsGroups;

  // Filter the users Auth0 groups down to only those mapped to AWS groups
  function filterAWSGroups(groups) {
    var filteredGroups = groups.filter((x) => AWS_GROUPS.includes(x));
    return filteredGroups;
  }

  function userAuth0Groups(proposedGroups, existingGroups) {
    var addToGroup = proposedGroups.filter((x) => !existingGroups.includes(x));
    var removeFromGroup = existingGroups.filter(
      (x) => !proposedGroups.includes(x)
    );
    return { addToGroup: addToGroup, removeFromGroup: removeFromGroup };
  }

  function createGroupMemberships(addToGroup) {
    var creationPromises = [];
    for (var groupId of addToGroup) {
      var params = {
        IdentityStoreId: IdentityStoreId,
        GroupId: groupId,
        MemberId: {
          UserId: AWSUserId,
        },
      };
      creationPromises.push(i.createGroupMembership(params).promise());
    }
    return Promise.all(creationPromises);
  }

  function removeGroupMemberships(removeMembershipId) {
    var removalPromises = [];
    for (var membershipId of removeMembershipId) {
      var params = {
        IdentityStoreId: IdentityStoreId,
        MembershipId: membershipId,
      };
      removalPromises.push(i.deleteGroupMembership(params).promise());
    }
    return Promise.all(removalPromises);
  }

  function fetchAWSUUID() {
    var params = {
      Filters: [
        {
          AttributePath: "UserName",
          AttributeValue: userName,
        },
      ],
      IdentityStoreId: IdentityStoreId,
    };
    var userId = i.listUsers(params).promise();
    return userId; // returns promise
  }

  function fetchUsersAWSGroups(userUUID) {
    var params = {
      IdentityStoreId: IdentityStoreId,
      MemberId: {
        UserId: userUUID,
      },
      MaxResults: 50,
    };
    // TODO: handle pagenation!!!
    var userMembership = i.listGroupMembershipsForMember(params).promise();
    return userMembership;
  }

  function fetchGroupNameMap(groupList) {
    var groupPromises = [];
    for (var group of groupList) {
      var params = {
        GroupId: group.GroupId,
        IdentityStoreId: IdentityStoreId,
      };
      groupPromises.push(i.describeGroup(params).promise());
    }
    return Promise.all(groupPromises);
  }

  function getGroupIds(groupList) {
    var promisedGroupIds = [];
    for (var groupName of groupList) {
      var params = {
        IdentityStoreId: IdentityStoreId,
        AlternateIdentifier: {
          UniqueAttribute: {
            AttributePath: "DisplayName",
            AttributeValue: groupName,
          },
        },
      };
      promisedGroupIds.push(i.getGroupId(params).promise());
    }
    return Promise.all(promisedGroupIds);
  }

  function createUser() {
    var params = {
      IdentityStoreId: IdentityStoreId,
      DisplayName: event.user.name,
      UserName: event.user.email,
      Name: {
        FamilyName: event.user.family_name,
        GivenName: event.user.given_name,
      },
      Emails: [
        {
          Primary: true,
          Value: event.user.email,
        },
      ],
    };
    return i.createUser(params).promise();
  }

  // Main
  try {
    // Get the users group list filtered down to only AWS related groups
    const proposedGroups = filterAWSGroups(event.user.groups);

    // Fetch users AWS UUID
    const userObjList = await fetchAWSUUID();
    if (userObjList.Users.length === 0) {
      console.log(
        `[${IdentityStoreId}] Creating User (${userName}) in AWS IdentityStore`
      );
      AWSUserId = (await createUser()).UserId;
    } else {
      AWSUserId = userObjList.Users[0].UserId;
    }

    // Get users existing AWS group membership
    const usersAWSGroups = await fetchUsersAWSGroups(AWSUserId);

    const usersAWSGroupNames = await fetchGroupNameMap(
      usersAWSGroups.GroupMemberships
    );
    const existingGroups = usersAWSGroupNames.map((item) => item.DisplayName);

    // Diff the proposed groups and the existing groups
    const groupActionList = userAuth0Groups(proposedGroups, existingGroups);
    const addToGroup = groupActionList.addToGroup; // DisplayName list
    const removeFromGroup = groupActionList.removeFromGroup; // DisplayName list

    if (addToGroup.length > 0 || removeFromGroup.length > 0) {
      console.log(
        `[${IdentityStoreId}] Add user (${userName}) to: `,
        addToGroup
      );
      console.log(
        `[${IdentityStoreId}] Remove user (${userName}) from: `,
        removeFromGroup
      );

      const addToGroupIds = (await getGroupIds(addToGroup)).map(
        (item) => item.GroupId
      );

      // From the groupsmembership object, filter and map group ids to be removed from
      const removeGroupIds = usersAWSGroupNames
        .filter((item) => removeFromGroup.includes(item.DisplayName))
        .map((item) => item.GroupId);
      const removeMembershipId = usersAWSGroups.GroupMemberships.filter(
        (item) => removeGroupIds.includes(item.GroupId)
      ).map((item) => item.MembershipId);

      // Create group memberships
      const addPromise = createGroupMemberships(addToGroupIds);

      // Delete group memberships
      const removePromise = removeGroupMemberships(removeMembershipId);
      return Promise.all([addPromise, removePromise]);
    }

    return;
  } catch (err) {
    console.error(err);
    return api.access.deny(err);
  }
}
