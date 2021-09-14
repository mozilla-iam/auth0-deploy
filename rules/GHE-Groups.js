function (user, context, callback) {  
  const applicationGroupMapping = {
    'EnEylt4OZW6i7yCWzZmCxyCxDRp6lOY0': 'mozilliansorg_ghe_saml-test-integrations_users',
  };
  
  // We only care about SSO applications that exist in the applicationGroupMapping
  // If the SSO ID is undefined in applicationGroupMapping, skip processing and return callback()
  if(applicationGroupMapping[context.clientID] !== undefined){
    // If the SSO application is one this ruleset cares about, confirm that the
    // user groups include the proper mapping from the hash
    if(!user.app_metadata.groups.includes(applicationGroupMapping[context.clientID])){
        // End goal is to possibly have conditional endpoint pages on mana that we'll redirect to on and org by or bases.
        // Until then we'll just redirect back to the sso dashboard until the pages are built out.

        context.redirect = {
   				url: "https://sso.mozilla.com"
 				};
    }
  }
  return callback(null, user, context);
}