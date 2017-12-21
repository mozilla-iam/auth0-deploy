# Rules
These are the rules for Auth0. They're ordered, so be careful!

# Secret storage.
Auth0 has secrets storage for rules builtin, though this repo does not provide or contain secrets.
This is the list of keys we're using for secrets:

- `configuration.duo_ikey_mozilla` Duo IKEY
- `configuration.duo_skey_mozilla` Duo SKEY
- `configuration.duo_apihost_mozilla`  Duo API Hostname
- `configuration.jwt_msgs_rsa_skey` JWT private key for error signing
- `configuration.jwt_msgs_rsa_pkey` JWT public key for error signing
- `configuration.personapi_url` PersonAPI URL
- `configuration.personapi_audience` PersonAPI Audience
- `configuration.webtask_clientid` Privileged Auth0 management API ClientID for rules
- `configuration.webtask_clientsecret` Privileged Auth0 management API Client Secret for rules
