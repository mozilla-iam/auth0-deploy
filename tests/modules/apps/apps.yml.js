module.exports = {
  load: () => {
    const appsYaml = `
apps:
- application:
    # no group or user access defined
    authorized_groups: []
    authorized_users: []
    client_id: client00000000000000000000000001
- application:
    # everyone allowed
    authorized_groups:
    - everyone
    authorized_users: []
    client_id: client00000000000000000000000002
- application:
    # fakegroup1 allowed
    authorized_groups:
    - fakegroup1
    - fakegroup2
    authorized_users: []
    client_id: client00000000000000000000000003
- application:
    # no groups, only users joe and jane allowed
    authorized_groups: []
    authorized_users:
    - joe@mozilla.com
    - jane@mozilla.com
    client_id: client00000000000000000000000004
- application:
    # allow everyone; AAL is set to LOW
    AAL: LOW
    authorized_groups:
    - everyone
    authorized_users: []
    client_id: client00000000000000000000000005
- application:
    # allow everyone; AAL is set to MEDIUM
    AAL: MEDIUM
    authorized_groups:
    - everyone
    authorized_users: []
    client_id: client00000000000000000000000006
- application:
    # allow everyone; AAL is set to HIGH
    AAL: HIGH
    authorized_groups:
    - everyone
    authorized_users: []
    client_id: client00000000000000000000000007
- application:
    # allow everyone; AAL is set to MAXIMUM
    AAL: MAXIMUM
    authorized_groups:
    - everyone
    authorized_users: []
    client_id: client00000000000000000000000008
`;
    return appsYaml;
  }
}

