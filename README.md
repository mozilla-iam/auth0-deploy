# auth0-actions

[Auth0 Actions](https://auth0.com/docs/customize/actions) used by the Mozilla IAM SSO system.
You can find more information about Auth0 at https://www.auth0.com

## Branches

`master`:
The master branch is used to manually deploy actions to the Production Auth0 tenant via Terraform

## Deployment & CI

Actions are deployed with Terraform

To deploy to the Auth0 dev tenant
Make sure `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are set for the dev tenant.
```
$ cd tf
$ terraform workspace dev
$ terraform plan -out=terraform-dev.plan
$ terraform apply terraform-dev.plan
```

To deploy to the Auth0 prod tenant, use the same procedure except with prod env credentials and the workspace set to `prod`

## Style

Please follow the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)

## Testing

Test are run by GitHub actions on every Pull Request.
To run the tests locally, first setup your testing environment.

This is a one time step

* `npm install`

Next run the tests

* `npm run tests` 

