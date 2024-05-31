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

async function linkUsersByEmailWithMetadata(user, context, callback) {
  const fetch = require('node-fetch@2.6.1');

  // Check if email is verified, we shouldn't automatically
  // merge accounts if this is not the case.
  if (!user.email || !user.email_verified) {
    return callback(null, user, context);
  }

  const userApiUrl = auth0.baseUrl + '/users';

  const opts = {
    headers: {
      Authorization: 'Bearer ' + auth0.accessToken,
    },
  };

  // Since email addresses within auth0 are allowed to be mixed case and the /user-by-email search endpoint
  // is case sensitive, we need to search for both situations.  In the first search we search by "this" users email
  // which might be mixed case (or not).  Our second search is for the lowercase equivalent but only if two searches
  // would be different.
  const searchMultipleEmailCases = async () => {
    const emailUrl = new URL('/api/v2/users-by-email', auth0.baseUrl);
    emailUrl.searchParams.append('email', user.email);

    const emailUrlToLower = new URL('/api/v2/users-by-email', auth0.baseUrl);
    emailUrlToLower.searchParams.append('email', user.email.toLowerCase());

    let fetchPromiseArray = [fetch(emailUrl.toString(), opts)];
    // if this user is mixed case, we need to also search for the lower case equivalent
    if (user.email !== user.email.toLowerCase()) {
      fetchPromiseArray.push(...fetch(emailUrlToLower.toString(), opts));
    }
    // Call one (or two) api calls to the /user-by-email api endpoint
    const responsePromises = await Promise.all(fetchPromiseArray);

    // Map each response to its JSON conversion promise
    const jsonPromises = responsePromises.map(response => {
      if (!response.ok) {
        return callback(new Error('API Call failed: ' + response.body));
      }
      return response.json();
    });

    // await all json responses promises to resolve
    const allResponses = await Promise.all(jsonPromises);

    // flatten the array of arrays to get one array of profiles
    const mergedProfiles = allResponses.flat();

    return mergedProfiles;
  };

  const linkAccount = (otherProfile) => {
    // sanity check if both accounts have LDAP as primary
    // we should NOT link these accounts and simply allow the user to continue logging in.
    if (user.user_id.startsWith('ad|Mozilla-LDAP') && otherProfile.user_id.startsWith('ad|Mozilla-LDAP')) {
      console.error(`Error: both ${user.user_id} and ${otherProfile.user_id} are LDAP Primary accounts. Linking will not occur.`);
      return callback(null, user, context); // Continue with user login without account linking
    }
    // LDAP takes priority being the primary identity
    // So we need to determine if one or neither are LDAP
    // If both are non-primary, linking order doesn't matter
    var primaryUser = {};
    var secondaryUser = {};
    if (user.user_id.startsWith('ad|Mozilla-LDAP')) {
      primaryUser = user;
      secondaryUser = otherProfile;
    } else {
      primaryUser = otherProfile;
      secondaryUser = user;
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
      fetch(userApiUrl + '/' + primaryUser.user_id + '/identities', {
        method: 'post',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: secondaryUser.identities[0].provider,
          user_id: String(secondaryUser.identities[0].user_id),
        }),
      }).then((response) => {
        if (!response.ok && response.status >= 400) {
          console.log('Error linking account: ' + response.statusText);
          return callback(
            new Error('Error linking account: ' + response.statusText)
          );
        }
        // Finally, swap user_id so that the current login process has the correct data
        context.primaryUser = primaryUser.user_id;
        context.primaryUserMetadata = primaryUser.user_metadata || {};
        return callback(null, user, context);
      });
    } catch(err) {
      console.log('An unknown error occurred while linking accounts: ' + err);
      return callback(err);
    }
  };

  // Search for multiple accounts of the same user to link
  searchMultipleEmailCases()
    .then((data) => {
      // Ignore non-verified users
      data = data.filter((u) => u.email_verified);

      if (data.length <= 1) {
        // The user logged in with an identity which is the only one Auth0 knows about
        // or no data returned
        // Do not perform any account linking
        return callback(null, user, context);
      }

      if (data.length === 2) {
        // Auth0 is aware of 2 identities with the same email address which means
        // that the user just logged in with a new identity that hasn't been linked
        // into the other existing identity.  Here we pass the other account to the
        // linking function
        linkAccount(data.filter((u) => u.user_id !== user.user_id)[0]);
      } else {
        // data.length is > 2 which, post November 2020 when all identities were
        // force linked manually, shouldn't be possible
        var error_message =
          `Error linking account ${user.user_id} as there are ` +
          `over 2 identities with the email address ${user.email} ` +
          data.map((x) => x.user_id).join();
        console.log(error_message);
        return callback(new Error(error_message));
      }
    })
    .catch((err) => {
        console.log('An unknown error occurred while linking accounts: ' + err);
        return callback(err);
    });
}
