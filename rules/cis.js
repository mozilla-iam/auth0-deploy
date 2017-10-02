function (user, context, callback) {
  // CIS is our only functionality that can set app_metadata
  // Auth0 auto-integrate user.app_metadata.* into user.*
  // This rule cleans up the left overs for conciseness, clarity and size
  // (in particular this affects the id_token size, that goes onto GET queries
  // which are limited to 8k-if-not-less depending on the httpd server
  // settings)
  // Additional integration into user.app_metadata itself is at:
  // https://github.com/mozilla-iam/cis_functions/tree/master/functions/idvtoauth0

  var namespace = 'https://sso.mozilla.com/claim/';

  if (user.app_metadata !== undefined) {

    // Force re-integrate LDAP groups until we have a LDAP CIS publisher
    // See https://github.com/mozilla-iam/cis_functions/blob/master/functions/idvtoauth0/main.py#L87
    // which this very code below supersedes as idvauth0 code only gets triggered if a profile is being actively published
    var request = require('request@2.56.0');
    var index = 0;
    var extend = require('extend');
    var userApiUrl = auth0.baseUrl + '/users/';
    var ugroups = user.app_metadata.groups;

    request({
      url: userApiUrl+user.user_id,
      headers: {
        Authorization: 'Bearer ' + auth0.accessToken
      },
    },
    function(err, response, body) {
      if (!err) {
        var udata = JSON.parse(body);

        // Add non-LDAP groups to new_groups
        var new_groups = [];
        for (index = 0; index < ugroups.length; ++index) {
          var cur_grp = ugroups[index];
          if (cur_grp === null) {
            console.log("CIS: Group data contained null entries in array, that's not normal");
            continue;
          }
          // Don't remove non-LDAP groups
          if (cur_grp.substr(0,14) === 'mozilliansorg_') {
            new_groups.push(cur_grp);
          } else if (cur_grp.substr(0,5) === 'hris_') {
            new_groups.push(cur_grp);
          }
        }

        // Re-add groups that are in LDAP (ie udata.groups)
        for (index = 0; index < udata.groups.length; ++index) {
            new_groups.push(udata.groups[index]);
        }
        return cb(new_groups);
      } else {
        console.log('CIS: Error while parsing user groups for user '+user.user_id+': '+err);
        return cb();
      }
      console.log('CIS: HTTP Error while parsing user groups for user '+user.user_id+': '+err);
      return cb();
    });
  }

  // Ensure this is always called or the webtask will timeout
  function cb(new_groups) {
    if (new_groups !== undefined) {
      user.groups = new_groups;
      user.app_metadata.groups = new_groups;
      // Save app_metadata changes
      auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
        .catch(function(err){
          console.log('CIS: Error updating app_metadata (groups) for user '+user.user_id+': '+err);     
      });
    }

    // Import entire CIS profile to an "OIDC conformant" namespace"
    context.idToken[namespace+'cis'] = user.app_metadata;
    user.app_metadata = undefined;
    user.email_aliases = undefined;
    user.dn = undefined;
    user.organizationUnits = undefined;

    callback(null, user, context);
  }
}
