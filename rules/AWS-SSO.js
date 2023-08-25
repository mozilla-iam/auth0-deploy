function aws_scim(user, context, callback) {
  //const fetch = require('node-fetch');
  var istore = require('aws-sdk/clients/identitystore');
  require('aws-sdk/lib/maintenance_mode_message').suppress = true;

  // Instantate and set Region
  var i = new istore({
    region: 'us-west-2'
  });

  const IdentityStoreId = 'd-9267491fb7';
  const userName = user.email;
  var AWSUserId = "";

  // This is a list of groups that are mapped to AWS groups
  const AWS_GROUPS = [
    "mozilliansorg_pocket_mozilla_sre",
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
    "mozilliansorg_iam-in-transition",
    "mozilliansorg_iam-in-transition-admin",
    "mozilliansorg_meao-admins",
    "mozilliansorg_mofo_aws_admins",
    "mozilliansorg_mofo_aws_community",
    "mozilliansorg_mofo_aws_everything",
    "mozilliansorg_mofo_aws_labs",
    "mozilliansorg_mofo_aws_projects",
    "mozilliansorg_mofo_aws_sandbox",
    "mozilliansorg_mofo_aws_secure",
    "mozilliansorg_mozilla-moderator-devs",
    "mozilliansorg_partinfra-aws",
    "mozilliansorg_pdfjs-testers",
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
    "vpn_sumo_aws_devs",
  ];

  // Filter the users Auth0 groups down to only those mapped to AWS groups
  function filterAWSGRoups(groups) {
    var filteredGroups = groups.filter(x => AWS_GROUPS.includes(x));
    return filteredGroups;
  }

  function userAuth0Groups(proposedGroups, existingGroups) {
    var addToGroup = proposedGroups.filter(x => !existingGroups.includes(x));
    var removeFromGroup = existingGroups.filter(x => !proposedGroups.includes(x));
    return { "addToGroup": addToGroup, "removeFromGroup": removeFromGroup };
  }

  function createGroupMemberships(addToGroup) {
    console.log(addToGroup);
    var creationPromises = [];
    for (var groupId of addToGroup) {
      var params = {
        IdentityStoreId: IdentityStoreId,
        GroupId: groupId,
        MemberId: {
          UserId: AWSUserId
        }
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
        MembershipId: membershipId
      };
      removalPromises.push(i.deleteGroupMembership(params).promise());
    }
    return Promise.all(removalPromises);
  }

  function fetchAWSUUID() {
    var params = {
      AlternateIdentifier: {
        UniqueAttribute: {
          AttributePath: 'UserName',
          AttributeValue: userName
        }
      },
      IdentityStoreId: IdentityStoreId
    };
    var userId = i.getUserId(params).promise();
    console.log("Fetching users AWS UUID");
    return userId; // returns promise
  }

  function fetchUsersAWSGroups(userUUID) {
    console.log(`Fetching users group membership with ${userUUID}`);
    var params = {
      IdentityStoreId: IdentityStoreId,
      MemberId: {
        UserId: userUUID
      },
      MaxResults: 50
    };
    // TODO: handle pagenation!!!
    var userMembership = i.listGroupMembershipsForMember(params).promise();
    // console.log(Object.prototype.toString.call(userMembership));
    return userMembership;
  }

  function fetchGroupNameMap(groupList) {
    var groupPromises = [];
    for (var group of groupList) {
      var params = {
        GroupId: group.GroupId,
        IdentityStoreId: IdentityStoreId 
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
            AttributePath: 'DisplayName',
            AttributeValue: groupName
          }
        }
      };
      promisedGroupIds.push(i.getGroupId(params).promise()); 
    }
    return Promise.all(promisedGroupIds);
  }

  function createUser() {
    var params = {
      IdentityStoreId: IdentityStoreId,
      DisplayName: user.name,
      UserName: user.email,
      Name: {
        FamilyName: user.family_name,
        GivenName: user.given_name
      },
      Emails: [
        {
          Primary: true,
          Value: user.email
        }
      ]
    };
    return i.createUser(params).promise();
  }

  // Wrap the entire rule in an async function
  const asyncWrapper = async () => {
    // Get the users group list filtered down to only AWS related groups
    const proposedGroups = filterAWSGRoups(user.groups);
    
    // Fetch users AWS UUID
    const userIdObj = (await fetchAWSUUID().catch(error => {
      if (error.code === 'ResourceNotFoundException') {
      } else { throw error; }
    }));

    if (!userIdObj) {
      console.log("Create User");
      AWSUserId = (await createUser()).UserId;
    } else {
      AWSUserId = userIdObj.UserId;
    }
    console.log(AWSUserId);

    // Get users existing AWS group membership
    const usersAWSGroups = await fetchUsersAWSGroups(AWSUserId);
    console.log(usersAWSGroups);

    const usersAWSGroupNames = await fetchGroupNameMap(usersAWSGroups.GroupMemberships);
    const existingGroups = usersAWSGroupNames.map(item => item.DisplayName);

    // Diff the proposed groups and the existing groups
    const groupActionList = userAuth0Groups(proposedGroups, existingGroups);
    const addToGroup = groupActionList.addToGroup;  // DisplayName list
    const removeFromGroup = groupActionList.removeFromGroup;  // DisplayName list
    console.log("Add user to:", addToGroup);
    console.log("Remove user from:", removeFromGroup);

    const addToGroupIds = (await getGroupIds(addToGroup)).map(item => item.GroupId);
    console.log("Add to GroupIds:", addToGroupIds);

    // From the groupsmembership object, filter and map group ids to be removed from
    const removeGroupIds = usersAWSGroupNames.filter((item) => removeFromGroup.includes(item.DisplayName)).map(item => item.GroupId);
    console.log(removeGroupIds);
    const removeMembershipId = usersAWSGroups.GroupMemberships.filter((item) => removeGroupIds.includes(item.GroupId)).map(item => item.MembershipId);
    console.log("Remove membership: ", removeMembershipId);

    // Create group memberships
    const addPromise = createGroupMemberships(addToGroupIds);
    
    // Delete group memberships
    const removePromise = removeGroupMemberships(removeMembershipId);
    return Promise.all([addPromise, removePromise]);
  };

  asyncWrapper().then(response => {
    console.log(response);
  }).catch(error => {
    console.error(error);
  });
}
