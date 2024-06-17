// mock Auth0 object
// This is a simple mock module object for spoofing the
// actually auth0 object that exists inside of Auth0 rule
// webtasks.  This can be expaned on to mimick the actual
// functions of the Auth0 object.

module.exports = {
  baseUrl: "https://example.com",
  accessToken: "testing",
  users: {
      updateAppMetadata: (user_id, app_metadata) => {
      return Promise.resolve(true);
    },
      updateUserMetadata: (user_id, app_userdata) => {
      return Promise.resolve(true);
    },
  }
};

