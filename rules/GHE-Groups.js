function (user, context, callback) {  
  const applicationGroupMapping = {
    'EnEylt4OZW6i7yCWzZmCxyCxDRp6lOY0': 'mozilliansorg_ghe_saml-test-integrations_users',
  };
  
  if(applicationGroupMapping[context.clientID] !== undefined){
    if(!user.app_metadata.groups.includes(applicationGroupMapping[context.clientID])){
        context.redirect = {
   				url: "https://sso.mozilla.com"
 				};
    }
  }
  return callback(null, user, context);
}