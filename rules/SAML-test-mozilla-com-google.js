async function SAMLTestMozillaComGoogle(user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  if (context.clientID === 'q0tFB9QyFIKqPOOKvkFnHMj2VwrLjX46') {

    // This rule simply remaps @mozilla.com e-mail addresses to @test.mozilla.com to be used with the test.mozilla.com GSuite domain.
    // Be careful when adding replacements not to do "double-replacements" where a replace replaces another rule. If that happens,
    // you probably want to improve this code instead
    user.myemail = user.email.replace("mozilla.com", "test.mozilla.com").replace("mozillafoundation.org", "test.mozillafoundation.org").replace("getpocket.com", "test-gsuite.getpocket.com");

    context.samlConfiguration = context.samlConfiguration || {};

    context.samlConfiguration.mappings = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "myemail",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":   "myemail",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email":          "myemail",
    };
    context.samlConfiguration.nameIdentifierFormat = "urn:oasis:names:tc:SAML:2.0:nameid-format:email";

    return callback(null, user, context);
  }

  return callback(null, user, context);
}
