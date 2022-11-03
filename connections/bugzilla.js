function bugzillaConnection(access_token, ctx, callback) {
  request.get('https://bugzilla.allizom.org/api/user/profile', {
    'headers': {
      'Authorization': 'Bearer ' + access_token,
      'User-Agent': 'Auth0'
    }
  },
  function(e, r, b) {
    if (e) {
      return callback(e);
    }
    if (r.statusCode !== 200) {
      return callback(new Error(`StatusCode: ${r.statusCode}`));
    }
    var profile = JSON.parse(b);
    callback(null, {
      user_id: profile.id,
      bugzilla_nickname: profile.nick,
      name: profile.name,
      email: profile.login,
      email_verified: true
    });
  });
}
