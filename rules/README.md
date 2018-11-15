# Rules
These are the rules for Auth0. They're ordered, so be careful!

# Secret storage.
Auth0 has secrets storage for rules builtin, though this repo does not provide or contain secrets.
This is the list of keys we're using for secrets (and abuse for certain configuration items):

- `configuration.duo_ikey_mozilla` Duo IKEY
- `configuration.duo_skey_mozilla` Duo SKEY
- `configuration.duo_apihost_mozilla`  Duo API Hostname
- `configuration.jwt_msgs_rsa_skey` JWT private key for error signing
- `configuration.jwt_msgs_rsa_pkey` JWT public key for error signing
- `configuration.personapi_url` PersonAPI URL
- `configuration.personapi_audience` PersonAPI Audience
- `configuration.webtask_clientid` Privileged Auth0 management API ClientID for rules
- `configuration.webtask_clientsecret` Privileged Auth0 management API Client Secret for rules
- `configuration.iam_well_kwown` The CIS well-known endpoint, such as https://auth.allizom.org/.well-known/mozilla-iam
- `configuration.iam_jwt_rsa_pkey` The access_file public RSA key which can verify the JWT containing `apps.yml` data

# Rules
- `aai.json` Sets the user AAI (Authenticator Assurance Indicator)
- `AccessRules.json` Reads apps.yml, verify it's signature, and uses it's setting to figure out if the user should be
  allowed to login or not. The RP should still do it's own access checks. This is what we call the 2 stages access
  validation (and this is stage 1)
- `duosecurity.json` Ensure the user is authenticated with DuoSecurity when using an LDAP account
- `force-ldap-logins-over-ldap.json` Ensure LDAP users only login with LDAP (i.e. "Staff uses Staff login"). This
  forbids using passwordless, GitHub, etc. login methods with a `@mozilla.com` email for example.
- `CIS-Claims-fixups.json` Adds custom OIDC claims in our namespace, like groups or AAI
- `Everyone-is-in-the-everyone-group.json` Adds all users in a group called `everyone` to function correctly with the
  apps.yml file, which assume you have this group, historically
- `Global-Function-Declarations.json` A place to have a cache of functions. This cache dies when the webtasks die, so
  every 60s
- `SAML-AWS-consolidatedbilling-readonly.json` Custom claim mapping for SAML
- `SAML-AWS-mozillaiam-account-readonly.json` Ditto
- `SAML-temporary-AWS-consolidatedbilling-admin.json` Ditto
- `SAML-test-mozilla-com-google.json` Ditto
- `SAML-thinksmart.json` Ditto
- `gcp-gsuite-SAML-claims.json` Ditto
- `default-deny-for-maintenance.json` A default "OFF" rule, that can be manually turned on to refuse all logins and
  indicate to the user that we're in maintenance mode. Used for emergencies only!
- `temporary-LDAP-re-reintegration.json` Temporary rule that reintegrates LDAP groups to the profile. This should be
  removed and replaced by person-api v2 calls eventually
- `temporary-hrdata.json` Temporary rule that adds HRIS data in a special `_HRData` structure until person-apiv2 is
  available.
- `temporary-hris-connector.json` Temporary rule that fix the missing `hris_is_staff` group for Mozillians.org, until
  person-apiv2 is available.
