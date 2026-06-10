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
  //
  // This code only ever cares about accounts with verified email addresses.
  const searchMultipleEmailCases = async () => {
    const userAccountsFound = [];

    // Push the results for the email as specified.
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

    return mergedDataProfiles.filter((u) => u.email_verified === true);
  };

  const linkAccount = async (primaryUser, secondaryUser) => {
    // Link the secondary account into the primary account
    console.log(
      `Linking secondary identity ${secondaryUser.user_id} into primary identity ${primaryUser.user_id}`
    );

    try {
      await mgmtClient.users.link(
        { id: String(primaryUser.user_id) },
        {
          provider: secondaryUser.identities[0].provider,
          user_id: secondaryUser.identities[0].user_id,
        }
      );
    } catch (err) {
      console.error("An unknown error occurred while linking accounts:", err);
      throw err;
    }

    return;
  };

  // Main
  try {
    // Search for multiple accounts of the same user to link
    const userAccountList = await searchMultipleEmailCases();

    if (userAccountList.length <= 1) {
      // The user logged in with an identity which is the only one Auth0 knows about
      // or no data returned
      // Do not perform any account linking
      return;
    }

    // We found multiple user accounts.  Let's break it down:
    const userAccountListLdapList = userAccountList.filter((u) =>
      u.user_id.startsWith("ad|Mozilla-LDAP")
    );

    // There should never be more than one LDAP account found with the same name.
    // If there is, we wouldn't know what to do in automation, so log it.
    if (userAccountListLdapList.length > 1) {
      const userstring = userAccountListLdapList
        .map((u) => u.user_id)
        .join(" ");
      console.error(
        `Error: ${userstring} are LDAP Primary accounts. Linking will not occur.`
      );
      return; // Continue with user login without account linking
    }

    // While it's unlikely we'll ever need to merge many accounts in one go, 2024-2026 proved
    // we can absolutely get ourselves into such a situation, so let's fix that.  Allow
    // multiple merges into one main profile.
    let mainProfile;
    let mergeList;
    if (userAccountListLdapList.length === 1) {
      // There is only one LDAP profile, so merge the non-LDAP users into the LDAP user.
      // This should be an obvious decision.
      // We do not keep the user_metadata or app_metadata from the secondary account(s).
      // The LDAP account's metadata should prevail.
      mainProfile = userAccountListLdapList[0];
      mergeList = userAccountList.filter(
        (u) => !u.user_id.startsWith("ad|Mozilla-LDAP")
      );
    } else if (userAccountListLdapList.length === 0) {
      // There is no LDAP profile, so merge into the other users into the current event's user.
      // Think about this one a bit.  Clearly if there was an LDAP user, we'd prefer that.
      //
      // But here, you have a kind of 'now what?' path.   Do you:
      // * merge an older user into the current-event user?  You risk losing any metadata
      // from an older user.
      // * merge the current user into an older user?  You basically prefer the first user
      // identity that was ever found, and never move off of it.
      //
      // Honestly, there's no good choice here.  Each has pitfalls.
      // CAUTION / DEBT?
      // The merge of two non-LDAPs could be a long-lurking bug: if both accounts have groups
      // on PMO, that completely desyncs from PMO and then nothing good will happen.
      mainProfile = event.user;
      mergeList = userAccountList.filter(
        (u) => u.user_id !== event.user.user_id
      );
    } else {
      // This is unnecessary but wards off any mistaken fallthroughs.
      const error_message = "Impossible Default Case reached";
      console.error(error_message);
      throw new Error(error_message);
    }

    for (const mergeProfile of mergeList) {
      await linkAccount(mainProfile, mergeProfile);
    }

    // Auth0 Action api object provides a method for updating the current
    // authenticated user to the new user_id after account linking has taken place.
    // This can only be called once per transaction, so we call it at the end
    // once we've merged all profiles.
    api.authentication.setPrimaryUser(mainProfile.user_id);
  } catch (err) {
    console.error("An error occurred while linking accounts:", err);
    return api.access.deny(err.message || String(err));
  }

  return;
};
