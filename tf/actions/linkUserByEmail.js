/**
 * @title Link Accounts with Same Email Address while Merging Metadata
 * @overview Link any accounts that have the same email address while merging metadata.
 * @gallery true
 * @category access control
 *
 * This rule will link any accounts that have the same email address while merging metadata.
 * Source/Original: https://github.com/auth0/rules/blob/master/src/rules/link-users-by-email-with-metadata.js
 *
 * Please see https://github.com/mozilla-iam/mozilla-iam/blob/master/docs/deratcheting-user-flows.md#user-logs-in-with-the-mozilla-iam-system-for-the-first-time
 * for detailed explanation of what happens here.
 *
 */

const auth0Sdk = require("auth0");

exports.onExecutePostLogin = async (event, api) => {
  console.log("Running actions:", "linkUsersByEmail");

  // Check if email is verified, we shouldn't automatically
  // merge accounts if this is not the case.
  if (!event.user.email || !event.user.email_verified) {
    return;
  }

  const mgmtAuth0Domain =
    event.tenant.id === "dev"
      ? "dev.mozilla-dev.auth0.com"
      : "auth.mozilla.auth0.com";

  // Create an Auth0 Management API Client
  const ManagementClient = auth0Sdk.ManagementClient;
  const mgmtClient = new ManagementClient({
    domain: mgmtAuth0Domain,
    clientId: event.secrets.mgmtClientId,
    clientSecret: event.secrets.mgmtClientSecret,
    scope: "update:users",
  });

  // Since email addresses within auth0 are allowed to be mixed case and the /user-by-email search endpoint
  // is case sensitive, we need to search for both situations.  In the first search we search by "this" users email
  // which might be mixed case (or not).  Our second search is for the lowercase equivalent but only if two searches
  // would be different.
  const searchMultipleEmailCases = async () => {
    let userAccountsFound = [];

    // Push the
    userAccountsFound.push(
      mgmtClient.usersByEmail.getByEmail({ email: event.user.email })
    );

    // if this user is mixed case, we need to also search for the lower case equivalent
    if (event.user.email !== event.user.email.toLowerCase()) {
      userAccountsFound.push(
        mgmtClient.usersByEmail.getByEmail({
          email: event.user.email.toLowerCase(),
        })
      );
    }

    // await all json responses promises to resolve
    const allJSONResponses = await Promise.all(userAccountsFound);

    // flatten the array of arrays to get one array of profiles
    const mergedDataProfiles = allJSONResponses.reduce((acc, response) => {
      return acc.concat(response.data);
    }, []);

    return mergedDataProfiles;
  };

  const linkAccount = async (otherProfile) => {
    // sanity check if both accounts have LDAP as primary
    // we should NOT link these accounts and simply allow the user to continue logging in.
    if (
      event.user.user_id.startsWith("ad|Mozilla-LDAP") &&
      otherProfile.user_id.startsWith("ad|Mozilla-LDAP")
    ) {
      console.error(
        `Error: both ${event.user.user_id} and ${otherProfile.user_id} are LDAP Primary accounts. Linking will not occur.`
      );
      return; // Continue with user login without account linking
    }

    // LDAP takes priority being the primary identity
    // So we need to determine if one or neither are LDAP
    // If both are non-primary, linking order doesn't matter
    let primaryUser;
    let secondaryUser;

    if (event.user.user_id.startsWith("ad|Mozilla-LDAP")) {
      primaryUser = event.user;
      secondaryUser = otherProfile;
    } else {
      primaryUser = otherProfile;
      secondaryUser = event.user;
    }

    // Link the secondary account into the primary account
    console.log(
      `Linking secondary identity ${secondaryUser.user_id} into primary identity ${primaryUser.user_id}`
    );

    // We no longer keep the user_metadata nor app_metadata from the secondary account
    // that is being linked.  If the primary account is LDAP, then its existing
    // metadata should prevail.  And in the case of both, primary and secondary being
    // non-ldap, account priority does not matter and neither does the metadata of
    // the secondary account.

    // Link the accounts
    try {
      await mgmtClient.users.link(
        { id: String(primaryUser.user_id) },
        {
          provider: secondaryUser.identities[0].provider,
          user_id: secondaryUser.identities[0].user_id,
        }
      );

      // Auth0 Action api object provides a method for updating the current
      // authenticated user to the new user_id after account linking has taken place
      api.authentication.setPrimaryUser(primaryUser.user_id);
    } catch (err) {
      console.log("An unknown error occurred while linking accounts: " + err);
      throw err;
    }

    return;
  };

  // Main
  try {
    // Search for multiple accounts of the same user to link
    let userAccountList = await searchMultipleEmailCases();

    // Ignore non-verified users
    userAccountList = userAccountList.filter((u) => u.email_verified);

    if (userAccountList.length <= 1) {
      // The user logged in with an identity which is the only one Auth0 knows about
      // or no data returned
      // Do not perform any account linking
      return;
    }

    if (userAccountList.length === 2) {
      // Auth0 is aware of 2 identities with the same email address which means
      // that the user just logged in with a new identity that hasn't been linked
      // into the other existing identity.  Here we pass the other account to the
      // linking function

      await linkAccount(
        userAccountList.filter((u) => u.user_id !== event.user.user_id)[0]
      );
    } else {
      // data.length is > 2 which, post November 2020 when all identities were
      // force linked manually, shouldn't be possible
      var error_message =
        `Error linking account ${event.user.user_id} as there are ` +
        `over 2 identities with the email address ${event.user.email} ` +
        userAccountList.map((x) => x.user_id).join();
      console.error(error_message);
      throw new Error(error_message);
    }
  } catch (err) {
    console.log("An error occurred while linking accounts: " + err);
    return api.access.deny(err);
  }

  return;
};
