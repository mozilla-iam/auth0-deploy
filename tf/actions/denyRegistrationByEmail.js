// Reject users from registering for an application (by client id) using email.
//
// This is a workaround for not being able to disable new registrations by
// email. If we instead disabled the email connection then we'd break logins
// for users who already have an account.
//
// DEBT(bhee): LDAP's connection name is
// * `Mozilla-LDAP` on prod;
// * `Mozilla-LDAP-Dev` on dev.
//
// If we need to deny registrations on those, for some reason, we'll need to
// think of a better way. Connection Ids are not stable across tenants either.

const auth0 = require("auth0");

exports.onExecutePreUserRegistration = async (event, api) => {
  const CLIENT_CONNECTIONS_DENYLIST = [
    // Matrix, IAM-1617
    "pFf6sBIfp4n3Wcs3F9Q7a9ry8MTrbi2F",
  ];

  if (event.connection.name != "email") {
    return;
  }

  // Exit early if it's not an application we care about.
  if (!CLIENT_CONNECTIONS_DENYLIST.includes(event.client.client_id)) {
    return;
  }

  var domain;
  if (event.tenant.id == "dev") {
    domain = "dev.mozilla-dev.auth0.com";
  } else if (event.tenant.id == "auth") {
    domain = "auth.mozilla.auth0.com";
  } else {
    return api.access.deny(
      `Action denyRegistrationByEmail does not support this tenant.`
    );
  }

  const mgmt = new auth0.ManagementClient({
    domain,
    clientId: event.secrets.mgmtClientId,
    clientSecret: event.secrets.mgmtClientSecret,
    scope: "read:users",
  });

  // On an API error we default to doors closed.
  const userExists = async (mgmt, email) => {
    try {
      const response = await mgmt.usersByEmail.getByEmail({
        email,
      });
      return response.data.length > 0;
    } catch (err) {
      return false;
    }
  };

  // The user exists already! Let them in.
  if (
    (await userExists(mgmt, event.user.email)) ||
    (await userExists(mgmt, event.user.email.toLowerCase()))
  ) {
    return;
  }

  return api.access.deny(
    `Not allowed to register for ${event.client.name} using ${event.connection.name}.`
  );
};
