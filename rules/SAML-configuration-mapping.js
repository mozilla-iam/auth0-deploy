function (user, context, callback) {
  const CLIENTS = {
    'wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l': 'sage-intacct',  // Sage Intacct
    'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84': 'thinksmart',    // mozilla.tap.thinksmart.com
  }
  const client = CLIENTS[context.clientID];

  // if it's not a client that uses SAML, exit immediately
  if (!client) {
    return callback(null, user, context);
  }

  // `context.samlConfiguration` should always be set, but this in a protective measure
  // just in case
  context.samlConfiguration = context.samlConfiguration || {};

  switch(client) {
    case 'sage-intacct':
      user.company_name = 'MOZ Corp';

      context.samlConfiguration.mappings = {
        'Company Name': 'company_name',
        'emailAddress': 'email',
        'name':         'name',
      };

      break;
    case 'thinksmart':
      context.samlConfiguration.mappings = {
        'Email': 'email',
        'firstName': 'given_name',
        'lastName': 'family_name',
      };

      break;
  }

  return callback(null, user, context);
}
