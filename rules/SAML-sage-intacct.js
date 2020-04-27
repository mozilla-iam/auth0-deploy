function (user, context, callback) {
  const ALLOWED_CLIENTIDS = [
    'wgh8S9GaE7sJ4i0QrAzeMxFXgWZYtB0l',  // Sage Intacct
  ];

  if (ALLOWED_CLIENTIDS.includes(context.clientID)) {
    user.company_name = "Mozilla";

    context.samlConfiguration.mappings = {
      "Company Name": "company_name",
      "emailAddress": "email",
      "name":         "name",
    };
  }

  return callback(null, user, context);
}
