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

## Development

Install the dependencies:

```
npm install
```

Run the tests (ran on every pull request):

```
npm run tests
```

Format your code (ran on every pull request):

```
npm run format
# Or, if you're checking
npm run lint
```
