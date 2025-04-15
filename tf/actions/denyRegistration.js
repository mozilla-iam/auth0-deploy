// Reject users from registering for an application (by client id) using a
// specific connection.
//
// This is a workaround for disabling a connection entirely for an application,
// since we may have allowed registrations already.
//
// If we instead disabled the connection then we'd break logins for users who
// only have that connection available.
//
// DEBT(bhee): LDAP's connection name is
// * `Mozilla-LDAP` on prod;
// * `Mozilla-LDAP-Dev` on dev.
//
// If we need to deny registrations on those, for some reason, we'll need to
// think of a better way. Connection Ids are not stable across tenants either.

exports.onExecutePreUserRegistration = async (event, api) => {
  const CLIENT_CONNECTIONS_DENYLIST = {
    // Matrix, IAM-1617
    pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F: ["email"],
  };

  const denylist = CLIENT_CONNECTIONS_DENYLIST[event.client.client_id] ?? [];

  if (denylist.includes(event.connection.name)) {
    return api.access.deny(
      `Not allowed to register for ${event.client.name} using ${event.connection.name}.`
    );
  }

  return;
};
