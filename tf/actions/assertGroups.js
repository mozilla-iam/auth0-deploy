/* This is only for groups. Other customizations are still dealt with in
 * `samlMappings.js`.
 *
 * The reason to pull this out into its own action is because this logic
 * is duplicated across `accessRules.js` as well. This cause(s/d) OIDC and
 * SAML to say a user is in different groups -- namely "everyone".
 *
 * We'll, of course, still need to access a user's groups for authz, but this
 * action's primary concern is ensuring RPs get an accurate list. So not
 * _everything_ related to groups should be here.
 *
 * TODO: port the other customizations over from samlMappings.js
 * TODO: port the id token assertion over from accessRules.js
 * TODO: without ^^^^^ this can't be merged.
 */
const auth0 = require("auth0");

const SAML_ATTRIBUTE_GROUP = "http://schemas.xmlsoap.org/claims/Group";
const JWT_CLAIM_GROUP = "https://sso.mozilla.com/claim/groups";

// Node 18 doesn't have `Set.prototype.intersection`, so we'll need a shim.
// Once we're on Node 22 we can remove this and use stuff like:
//
// ```
// [...needles.intersection(haystack)]
// ```
//
// See also:
// * https://nodejs.org/en/blog/announcements/v22-release-announce#v8-update-to-124
const oldJsSetIntersect = (needles, haystack) => {
  return new Set([...haystack].filter((h) => needles.has(h)));
};

const tines = (groups) => {
  const tineGroups = new Set([
    "mozilliansorg_sec_tines-admin",
    "mozilliansorg_sec_tines-access",
    "team_moco",
    "team_mofo",
    "team_mozorg",
    "team_mzla",
    "team_mzai",
    "team_mzvc",
  ]);
  return {
    groups: [...oldJsSetIntersect(tineGroups, groups)],
    saml: {
      create: ["http://sso.mozilla.com/claim/groups"],
      remove: [SAML_ATTRIBUTE_GROUP],
    },
  };
};

const identity = (groups) => {
  return {
    groups: [...groups],
  };
};

// Should return something in the shape of:
//
// ```
// {
//   groups: list<string>,
//   saml?: {
//     create?: list<string>,
//     remove?: list<string>,
//   }
// ```
const customize = (clientId) => {
  switch (clientId) {
    case "cPH0znP4n74JvPf9Efc1w6O8KQWwT634":
    case "cDof40r4Uvde1xGs8i30HYnekOkIglN6":
      return tines;
    default:
      return identity;
  }
};

// The SAML bits are a bit more complicated. We allow:
//
// * creating multiple attributes for groups;
// * removing multiple attributes for groups.
//
// If the customization function doesn't tell us the attribute name to use for
// groups, we'll read it from how the SAML addon is configured.
const samlDo = async (event, saml, groups) => {
  const domain =
    event.tenant.id === "prod"
      ? "auth.mozilla.auth0.com"
      : "dev.mozilla-dev.auth0.com";
  const mgmt = new auth0.ManagementClient({
    domain,
    clientId: event.secrets.mgmtClientId,
    clientSecret: event.secrets.mgmtClientSecret,
    scopes: "read:clients",
  });
  // Specify all group attributes to assert in `saml.create`.
  // If none are specified, we'll use whatever the default is.
  if (saml.create) {
    for (const c of saml.create) {
      api.samlResponse.setAttribute(c, groups);
    }
  } else {
    const client = await mgmt.clients.get(event.client.client_id);
    // Auth0 allows you to specify an array in the mappings. But, that's not
    // very common.
    const samlAttributeGroup =
      client.addons?.samlp?.mappings?.groups || SAML_ATTRIBUTE_GROUP;
    if (typeof samlAttributeGroup === "string") {
      api.samlResponse.setAttribute(samlAttributeGroup, groups);
    } else if (Array.isArray(samlAttributeGroup)) {
      for (const m of samlAttributeGroup) {
        api.samlResponse.setAttribute(m, groups);
      }
    }
  }
  if (saml.remove) {
    for (const r of saml.remove) {
      api.samlResponse.setAttribute(r, null);
    }
  }
};

exports.onExecutePostLogin = async (event, api) => {
  // Get a list of all the groups associated with this user.
  const groupsAll = new Set([
    ...(event.user.app_metadata?.groups || []),
    ...(event.user.ldap_groups || []),
    ...(event.user.groups || []),
    "everyone",
  ]);
  const groupsCustomizationFn = customize(event.client.client_id);
  const { groups, saml } = groupsCustomizationFn(groupsAll);
  // ref: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-event-object#param-protocol
  if (event.transaction.protocol === "samlp") {
    await samlDo(event, saml, groups);
  } else {
    api.idToken.setCustomClaim(JWT_CLAIM_GROUP, groups);
  }
};
