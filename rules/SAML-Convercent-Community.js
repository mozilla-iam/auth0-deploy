function (user, context, callback) {
  if (!user) {
    // If the user is not presented (i.e. a rule deleted it), just go on, since authenticate will always fail.
    return callback(null, null, context);
  }

  if (context.clientID !== 'j8FN0DB6RwrlfLhX4opVAZ2tDYbBiMMU') return callback(null, user, context); // app.convercent.com - community

  // This rule simply adds the string '+coonvercentcommunity' in front of the @ sign in the user's e-mail address.
  // Be careful when adding replacements not to do "double-replacements" where a replace replaces another rule. If that happens,
  // you probably want to improve this code instead
    // Ensure the `altString` is always right before the `@` of the email
    const altString = "+convercentcommunity";
   
  const emailSplit = user.email.split('@');
  const domain = emailSplit[emailSplit.length - 1].toLowerCase();
  const emailFirstPart = emailSplit[0].toLowerCase().split(altString)[0];
  
  user.alt_email = emailFirstPart+altString+'@'+domain

  context.samlConfiguration = context.samlConfiguration || {};

  context.samlConfiguration.mappings = {
     "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":     "myemail",
     "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":       "myemail",
     "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email":       "alt_email",
  };
  context.samlConfiguration.nameIdentifierFormat = "urn:oasis:names:tc:SAML:2.0:nameid-format:email";

  callback(null, user, context);
}
