# auth0-rules
Rules used for the Auth0 instances of Mozilla.
You can find more information about Auth0 at https://www.auth0.com

The rules are snippets of javascript code running as webtasks (https://www.webtasks.io), which modify the authentication flow of users in Auth0.

## Branches

`master`:
The master branch is used for development of rules which are auto-deployed on https://manage-dev.mozilla.auth0.com/

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

### Style

The primary goal is to follow the style of the [Auth0 example rules](https://github.com/auth0/rules/tree/master/src/rules).
This appears to follow the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
in some ways as there are trailing semi-colon characters. In other ways the 
Auth0 rules do not follow the Google style as some contain [`var` declarations](https://google.github.io/styleguide/jsguide.html#features-use-const-and-let)
Try to follow the Google style in the Mozilla rules in this repo.

### Development cycle

This is the cycle today. In the future we hopefully add CI driven tests. 
This cycle could be improved.

Please note that for any large change (i.e. anything but a single rule change), it is recommended to backup the current rules before deploying. You can do this by following the run-book at https://mana.mozilla.org/wiki/display/SECURITY/Create+and+reload+auth0+rules+backup

1. Write a rule in your local fork of the repo
2. Run `uploader_rules.py -r rules` to deploy the uncommitted rule to auth0-dev
3. Do manual testing in auth0-dev to determine if the rule does what you want
4. Iterate steps 1-3 until you have a rule that works
5. Remove the new rule from auth0-dev. This could be done by checking out 
   master (which doesn't have the rule) and again running `uploader_rules.py -r rules`
6. Push your branch to your fork and create a PR with your new rule, requesting 
   a review of the PR.
7. Someone reviews the PR, either suggesting changes or approving
8. Merge the PR
9. CI deploys the PR to auth0-dev
   * This CI runs in AWS CodeBuild in the `mozilla-iam` (320464205386) AWS
     account in the `us-west-2` region in the AWS CodeBuild project
     `auth0-deploy-stage`.
   * The CodeBuild project follows the [`buildspec.yml`](buildspec.yml) which
     calls the [`Makefile`](Makefile) which calls the 
     [`uploader_rules.py`](https://github.com/mozilla-iam/auth0-ci/blob/master/uploader_rules.py)
     tool which is installed from the [`auth0-ci`](https://github.com/mozilla-iam/auth0-ci)
     project.
10. Manually test again in auth0-dev to validate that the rule works. This is 
    the stage to do more thorough testing as this is the last step before
    production deployment
11. If testing validates the rule is good, create a second PR from `master` to
    `production`, requesting review and referencing in the text of the PR the
    first PR which contains the initial review. Ideally the changes in the first
    dev PR and this prod PR will be the same and the reviewer can leverage
    the dev PR's review. If that's not the case a new thorough review would be
    needed.
12. During change window, merge the PR. Now you have to manually run the Codebuild job `auth0-deploy-prod` which will deploy the rules to the Auth0 production instance. You can do this using the AWS cli running `aws codebuild start-build --project-name auth0-deploy-prod`, or using the AWS UI console navigating to Codebuild, choosing 'auth0-deploy-prod', pressing 'Start build' and pressing again 'Start build' in the next screen. Once the job finish successfully, all the rules should be uploaded to Auth0 prod.
13. [Test in prod](https://mana.mozilla.org/wiki/display/SECURITY/Auth0+manual+testing) to make sure everything works and rollback if it doesn't.  

## Known Issues

### Auth0 Rule Web UI jshint configuration

The Auth0 web UI where you can view and modify rules, for example at
https://manage-dev.mozilla.auth0.com/dashboard/pi/auth-dev/rules
has a jshint built in which isn't aware that Auth0 rules are run under
Node version `8.11.4` and as a result shows errors for things like
`require` and `let`. To work around this add this to the top of your rule

```
/*jshint esversion: 6 */
```

### Auth0 Rule Web UI save button

The Auth0 web UI where you can view and modify rules, for example at
https://manage-dev.mozilla.auth0.com/dashboard/pi/auth-dev/rules
when you click the `Save` button, a green banner saying
`The rule script has been saved` shows up. The content however won't
always be saved and the `Save` button won't always turn from blue to
gray. If waiting on the page for the async save to complete isn't working
you can click the `Save` button a second time.
