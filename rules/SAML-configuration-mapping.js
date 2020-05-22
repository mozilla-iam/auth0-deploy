function (user, context, callback) {
  const CLIENTS = {
    'wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l': 'sage-intacct',    // Sage Intacct
    'R4djNlyXSl3i8N2KXWkfylghDa9kFQ84': 'thinksmart',      // mozilla.tap.thinksmart.com
    'cEfnJekrSStxxxBascTjNEDAZVUPAIU2': 'stripe-subplat',  // Stripe - subplat
  };
  const client = CLIENTS[context.clientID];

  // if it's not a client that uses SAML, exit immediately
  if (!client) {
    return callback(null, user, context);
  }

  // `context.samlConfiguration` should always be set
  // but this is a protective measure just in case
  context.samlConfiguration = context.samlConfiguration || {};

  switch(client) {
    case 'sage-intacct':
      user.company_name = 'MOZ Corp';

      context.samlConfiguration.mappings = {
        'Company Name': 'company_name',
        'emailAddress': 'email',
        'name': 'name',
      };

      break;
    case 'thinksmart':
      context.samlConfiguration.mappings = {
        'Email': 'email',
        'firstName': 'given_name',
        'lastName': 'family_name',
      };

      break;
    case 'stripe-subplat':
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1637117
      var groupToStripeRoleMap = {
        //  LDAP group name
        'stripe_subplat_admin': [
          //   stripe_role_name           stripe_account_id
          {'role': 'admin', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_developer': [
          {'role': 'developer', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_supportsp': [
          {'role': 'support_specialist', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_analyst ': [
          {'role': 'analyst', 'account': 'acct_1EJOaaJNcmPzuWtR'}],
        'stripe_subplat_viewonly ': [
          {'role': 'view_only', 'account': 'acct_1EJOaaJNcmPzuWtR'}]
      };
      context.samlConfiguration = context.samlConfiguration || {};
      context.samlConfiguration.mappings = context.samlConfiguration.mappings || {};
      Object.keys(groupToStripeRoleMap).forEach((groupName) => {
        if (user.hasOwnProperty('groups') && user.groups.includes(groupName)) {
          Object.keys(groupToStripeRoleMap[groupName]).forEach((roleInfo) => {
            user.app_metadata[roleInfo['account']] = roleInfo['role'];
          });
          context.samlConfiguration.mappings['Stripe-Role-' + roleInfo['account']] = 'app_metadata.' + roleInfo['account'];
        }
      });
    }
  }

  return callback(null, user, context);
}
