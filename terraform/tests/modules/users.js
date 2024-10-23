// all sensitive data in this file is fake
const ldapUser = {
  "app_metadata": {
    "groups": [
      "all_ldap_users",
      "everyone",
      "fakegroup1",
      "fakegroup2"
    ]
  },
  "clientID": "fakefakefakefakefakefakefakefake",
  "created_at": "2017-06-16T19:59:19.553Z",
  "dn": "mail=jdoe@mozilla.com,o=com,dc=mozilla",
  "email": "jdoe@mozilla.com",
  "email_aliases": "jane@mozilla.com",
  "email_verified": true,
  "emails": [
    "jdoe@mozilla.com",
    "jane@mozilla.com"
  ],
  "family_name": "Doe",
  "given_name": "Jane",
  "global_client_id": "fakefakefakefakefakefakefakefake",
  "groups": [
      "all_ldap_users",
      "everyone",
      "fakegroup1",
      "fakegroup2"
  ],
  "identities": [
    {
      "connection": "Mozilla-LDAP-Dev",
      "isSocial": false,
      "provider": "ad",
      "user_id": "Mozilla-LDAP-Dev|jdoe"
    }
  ],
  "ldap_groups": [
      "all_ldap_users",
      "fakegroup1",
      "fakegroup2"
  ],
  "multifactor": [
    "duo"
  ],
  "name": "Jane Doe",
  "nickname": "Jane Doe",
  "organizationUnits": "mail=jdoe@mozilla.com,o=com,dc=mozilla",
  "picture": "https://s.gravatar.com/avatar/fakefakefakefake",
  "updated_at": "2020-02-21T22:32:45.659Z",
  "user_id": "ad|Mozilla-LDAP-Dev|jdoe"
};

const emailUser = {
  "created_at": "2024-09-11T16:16:20.229Z",
  "email": "jdoe@mozilla.com",
  "email_verified": true,
  "identities": [
      {
          "user_id": "fakefakefakefakefake",
          "provider": "email",
          "connection": "email",
          "isSocial": false
      }
  ],
  "name": "jdoe@mozilla.com",
  "nickname": "jdoe",
  "updated_at": "2024-09-11T16:16:20.229Z",
  "user_id": "email|fakefakefakefakefake",
  "blocked_for": [],
  "guardian_authenticators": [],
  "passkeys": []
};

const firefoxaccountUser = {
    "acr": "AAL2",
    "amr": [
        "pwd",
        "otp"
    ],
    "created_at": "2024-09-11T16:21:54.290Z",
    "email": "jdoe@mozilla.com",
    "email_verified": true,
    "fxa_sub": "fakefakefakefakefake",
    "fxa_twoFactorAuthentication": true,
    "identities": [
        {
            "user_id": "firefoxaccounts|fakefakefakefakefake",
            "provider": "oauth2",
            "connection": "firefoxaccounts",
            "isSocial": true
        }
    ],
    "name": "jdoe@mozilla.com",
    "nickname": "jdoe",
    "picture": "https://profile.accounts.firefox.com/v1/avatar/fakefakefakefake",
    "preferredLanguage": "en-US,en;q=0.9",
    "updated_at": "2024-09-11T16:21:54.290Z",
    "user_id": "oauth2|firefoxaccounts|fakefakefakefakefake",
    "blocked_for": [],
    "guardian_authenticators": [],
    "passkeys": []
};

module.exports = { ldapUser, emailUser, firefoxaccountUser };
