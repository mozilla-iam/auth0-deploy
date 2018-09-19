# auth0-rules
Rules used for the Auth0 instances of Mozilla.
You can find more information about Auth0 at https://www.auth0.com

The rules are snippets of javascript code running as webtasks (https://www.webtasks.io), which modify the authentication flow of users in Auth0.

## Branches

`master`:
The master branch is used for development of rules and are auto-deployed on https://manage-dev.mozilla.auth0.com/

`production`:
/!\ The production branch uses merges from the master branch and are used for production. These are auto-deployed on https://manage.mozilla.auth0.com/

## Deployment & CI

Rules are deployed with `auth0-ci` <https://github.com/mozilla-iam/auth0-ci> after CI has completed.
For testing, this looks like this:

```
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt
$ uploader_rules.py <args>
```

## Development

How do I know which nodejs modules are available to me?

At this time Auth0 runs nodejs8. The module list that is cached inside webtasks is listed here:
https://auth0-extensions.github.io/canirequire/#rsa
