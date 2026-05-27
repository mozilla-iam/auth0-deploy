variable "action_flow_dev" {
  type = list(string)
  default = [
    "continueEndPoint",
    "samlMappings",
    "gheGroups",
    "linkUserByEmail",
    "ensureLdapUsersUseLdap",
    "accessRules",
    "activateNewUsersInCIS",
    "OIDCConformanceWorkaround",
    "configurationDumper"
  ]
}

variable "action_flow_prod" {
  type = list(string)
  default = [
    "continueEndPoint",
    "samlMappings",
    "gheGroups",
    "linkUserByEmail",
    "ensureLdapUsersUseLdap",
    "accessRules",
    "awsSaml",
    "activateNewUsersInCIS",
    "OIDCConformanceWorkaround"
  ]
}
