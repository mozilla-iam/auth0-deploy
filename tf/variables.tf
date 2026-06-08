variable "action_flow_dev" {
  type = list(string)
  default = [
    "continueEndPoint",
    "samlMappings",
    "gheGroups",
    "ensureLdapUsersUseLdap",
    "accessRules",
    "linkUserByEmail",
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
    "ensureLdapUsersUseLdap",
    "accessRules",
    "awsSaml",
    "linkUserByEmail",
    "activateNewUsersInCIS",
    "OIDCConformanceWorkaround"
  ]
}
