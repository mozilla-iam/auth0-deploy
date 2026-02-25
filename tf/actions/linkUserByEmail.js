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

// A wrapper around getByEmail to retry any time it fails. The SDK already has
// some code to deal with retrying, though it does not cover issues like
// transient network errors.
//
// https://github.com/auth0/node-auth0/blob/1e0fbf0e9aeafffa680360a7b324575ff6f1830c/src/lib/retry.ts#L56
async function userLookupWithGlobalRetry(mgmtClient, email) {
  let error;
  for (var retries = 0; retries < 3; retries++) {
    try {
      return await mgmtClient.usersByEmail.getByEmail({ email });
    } catch (err) {
      console.error(
        `Failed lookup for ${email}`,
        err.errorCode,
        err.statusCode,
        err.error
      );
      error = err;
    }
  }
  throw error;
}

// Since email addresses within auth0 are allowed to be mixed case and the /user-by-email search endpoint
// is case sensitive, we need to search for both situations.  In the first search we search by "this" users email
// which might be mixed case (or not).  Our second search is for the lowercase equivalent but only if two searches
// would be different.
async function searchMultipleEmailCases(mgmtClient, email) {
  let userAccountsFound = [];

  userAccountsFound.push(userLookupWithGlobalRetry(mgmtClient, email));

  // if this user is mixed case, we need to also search for the lower case equivalent
  if (email !== email.toLowerCase()) {
    userAccountsFound.push(
      userLookupWithGlobalRetry(mgmtClient, email.toLowerCase())
    );
  }

  // await all json responses promises to resolve
  const allJSONResponses = await Promise.all(userAccountsFound);

  // flatten the array of arrays to get one array of profiles
  const mergedDataProfiles = allJSONResponses.reduce((acc, response) => {
    return acc.concat(response.data);
  }, []);

  return mergedDataProfiles;
}

async function linkAccount(api, mgmtClient, originalProfile, otherProfile) {
  // sanity check if both accounts have LDAP as primary
  // we should NOT link these accounts and simply allow the user to continue logging in.
  if (
    originalProfile.user_id.startsWith("ad|Mozilla-LDAP") &&
    otherProfile.user_id.startsWith("ad|Mozilla-LDAP")
  ) {
    console.error(
      `Error: both ${originalProfile.user_id} and ${otherProfile.user_id} are LDAP Primary accounts. Linking will not occur.`
    );
    return; // Continue with user login without account linking
  }

  // LDAP takes priority being the primary identity
  // So we need to determine if one or neither are LDAP
  // If both are non-primary, linking order doesn't matter
  let primaryUser;
  let secondaryUser;

  if (originalProfile.user_id.startsWith("ad|Mozilla-LDAP")) {
    primaryUser = originalProfile;
    secondaryUser = otherProfile;
  } else {
    primaryUser = otherProfile;
    secondaryUser = originalProfile;
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
  } catch (err) {
    console.error(
      "An unknown error occurred while linking accounts:",
      err.errorCode,
      err.statusCode,
      err.error
    );
    throw err;
  }
  // Auth0 Action api object provides a method for updating the current
  // authenticated user to the new user_id after account linking has taken place
  api.authentication.setPrimaryUser(primaryUser.user_id);
  return;
}

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

  // Main
  let candidateUserAccountList;

  try {
    // Search for multiple accounts of the same user to link
    candidateUserAccountList = await searchMultipleEmailCases(
      mgmtClient,
      event.user.email
    );
  } catch (err) {
    console.error(`Could not look up email for ${event.user.email}`);
    return api.access.deny(
      "Please contact support or the IAM team. (err=link-lookup)"
    );
  }

  // Ignore non-verified users
  let userAccountList = candidateUserAccountList.filter(
    (u) => u.email_verified
  );

  if (userAccountList.length <= 1) {
    // The user logged in with an identity which is the only one Auth0 knows about
    // or no data returned
    // Do not perform any account linking
    return;
  }

  if (userAccountList.length === 2) {
    const candidateUserId = userAccountList.filter(
      (u) => u.user_id !== event.user.user_id
    )[0];
    try {
      return await linkAccount(api, mgmtClient, event.user, candidateUserId);
    } catch (err) {
      console.error(
        `Could not link ${event.user.user_id} with ${candidateUserId}`
      );
      return api.access.deny(
        "Please contact support or the IAM team. (err=link-link)"
      );
    }
  }

  // Auth0 is aware of 2 identities with the same email address which means
  // that the user just logged in with a new identity that hasn't been linked
  // into the other existing identity.  Here we pass the other account to the
  // linking function

  // data.length is > 2 which, post November 2020 when all identities were
  // force linked manually, shouldn't be possible
  var error_message =
    `Error linking account ${event.user.user_id} as there are ` +
    `over 2 identities with the email address ${event.user.email} ` +
    userAccountList.map((x) => x.user_id).join();
  console.error(error_message);
  return api.access.deny(error_message);
};
