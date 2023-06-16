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
- `configuration.auth0_aws_assests_s3_bucket` The AWS S3 bucket name of the bucket that stores AWS hosted Auth0 rule
  assets. These buckets ([`mozilla-infosec-auth0-rule-assets`](https://github.com/mozilla/security/blob/01dd8a08fdffe76286dd22fb4cde92430567e2d9/operations/cloudformation-templates/create_infosec_s3_buckets_us-west-2.yml#L113-L119)
  and [`mozilla-infosec-auth0-dev-rule-assets`](https://github.com/mozilla/security/blob/01dd8a08fdffe76286dd22fb4cde92430567e2d9/operations/cloudformation-templates/infosec_dev_s3_buckets_us-west-2.yml#L73-L79)
  are provisioned with CloudFormation. These buckets contains assets like
  - The [Group Role map file](https://github.com/mozilla-iam/federated-aws-cli/tree/master/cloudformation)) which 
    describes the relationship between AWS IAM roles across Mozilla AWS accounts and the user groups which are used in
    those role policies for access control decisions
- `configuration.auth0_aws_assests_access_key_id` The AWS IAM API Access Key ID of the dedicated service AWS IAM user
  which is used to authenticate for access to contents in the `auth0_aws_assests_s3_bucket`. This user is provisioned
  with the [`group_role_map_builder.yaml`](https://github.com/mozilla-iam/federated-aws-cli/blob/211bafd660928813c750ef240c2e3d2cb66ddba3/cloudformation/group_role_map_builder.yaml#L128-L149)
  CloudFormation template
- `configuration.auth0_aws_assests_access_secret_key` The AWS IAM API Secret Key of the dedicated service AWS IAM user.
- `configuration.CIS_access_key_id` The AWS IAM API Key Id for the dedicated Auth0 Publisher hook invocation function.
- `configuration.CIS_secret_access_key` The AWS IAM API Secret Key for the dicated Auth0 Publisher hook invocation
  function.

# Rules
- `aai.js` Sets the user AAI (Authenticator Assurance Indicator)
- `AccessRules.js` Reads apps.yml, verify it's signature, and uses it's setting to figure out if the user should be
  allowed to login or not. The RP should still do it's own access checks. This is what we call the 2 stages access
  validation (and this is stage 1)
- `AWS-Federated-AMR.js` Adds and `AMR` OIDC claim to the user containing the groups which they are a member of and
  which are used in AWS IAM Role policies to govern federated access to AWS accounts.
- `duosecurity.js` Ensure the user is authenticated with DuoSecurity when using an LDAP account
- `force-ldap-logins-over-ldap.js` Ensure LDAP users only login with LDAP (i.e. "Staff uses Staff login"). This
  forbids using passwordless, GitHub, etc. login methods with a `@mozilla.com` email for example.
- `CIS-Claims-fixups.js` Adds custom OIDC claims in our namespace, like groups or AAI
  or modified users.
  apps.yml file, which assume you have this group, historically
- `Global-Function-Declarations.js` A place to have a cache of functions. This cache dies when the webtasks die, so
  every 60s
- `SAML-test-mozilla-com-google.js` Ditto
- `SAML-thinksmart.js` Ditto
- `gcp-gsuite-SAML-claims.js` Ditto
- `default-deny-for-maintenance.js` A default "OFF" rule, that can be manually turned on to refuse all logins and
  indicate to the user that we're in maintenance mode. Used for emergencies only!
- `temporary-LDAP-re-reintegration.js` Temporary rule that reintegrates LDAP groups to the profile. This should be
  removed and replaced by person-api v2 calls eventually
  available.
  person-apiv2 is available.
- `link-users-by-email-with-metadata.js` Links user profiles by primary email (GH x@x.x and FxA x@x.x become the same
  profile). The user profile to be main (ie main user_id) is decided by ratcheting logic.
