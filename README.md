# auth0-tests
Automated tests for auth0 login in https://testrp.security.allizom.org/

## Operational details

These tests are run in the `mozilla-iam` (320464205386) AWS account in the
`us-west-2` region via the [`auth0-tests-staging`][1] AWS CodeBuild project.

## To create a local `variables.json`

If you'd like to run these tests locally (not in CodeBuild)
you can either create a `variables.json` file based on [`variables.example.json`](variables.example.json)
or run [`params2json.py`](params2json.py) to fetch the variables from AWS SSM
Parameter store and store them in a `variables.json` file locally

## To run a single test

`tox -e py36 tests/test_account.py::TestAccount::test_login_passwordless`

## To run a single test on production

`PYTEST_BASE_URL=https://prod.testrp.security.allizom.org tox -e py36 tests/test_account.py::TestAccount::test_login_passwordless`

## How to generate a TOTP code from an MFA secret

Assuming you have the MFA secret in `variables.json` if you'd like to manually
generate a TOTP code from the secret you can run

`oathtool -b --totp "the_secret_goes_here"`

Make sure that the command doesn't end up in your bash history, leaking the
secret

[1]: https://us-west-2.console.aws.amazon.com/codesuite/codebuild/projects/auth0-tests-staging/history?region=us-west-2
