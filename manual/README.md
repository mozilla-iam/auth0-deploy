# manual

This area is for manual-deploy of specific files, when auth0 does not yet support auto-deployment.
Ideally these should be moved to directories that can auto-deploy the code/templates/etc. in the future.

This mean any change to files in this directory will need to be manually mirrored in the auth0 setup.

## social-fxa.js : Firefox Accounts Custom Social Connection

This adds support in Auth0 for Firefox Accounts (FxA) as an [Auth0 Connection](https://auth0.com/docs/applications/connections)
(aka IdP).

### How to deploy the code

1. Log into the Auth0 management UI
2. Click `Extensions` in the left hand list of sections
3. In the Extensions list, click `Custom Social Connections`
4. Delegate permissions to this Extension when prompted
5. In the new `Custom Social Connections` window click `Firefoxaccounts`
6. Copy and paste the `social-fxa.js` code into the `Fetch User Profile Script` textbox

### How to manage the service

***Attempting to manage this extension with Firefox will not work. You must use Chrome or fake a Chrome User-Agent***

![Chrome Logo](https://www.google.com/chrome/static/images/chrome-logo.svg)

1. Log into the Auth0 management UI
2. Click `Extensions` in the left hand list of sections
3. In the Extensions list, click `Custom Social Connections`
4. Delegate permissions to this Extension when prompted
5. In the new `Custom Social Connections` window click `Firefoxaccounts`
6. Click the `Apps` tab
  * From here you can affect which [Auth0 Applications](https://auth0.com/docs/applications)
    will have Firefox Accounts enabled or disabled as an allowed Auth0 Connection type
  * The grey and green switches to the right of the list of applications can be clicked to change
    whether Firefox Accounts is enabled.
    
## passwordless.html

## maintenance.html