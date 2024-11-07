data "google_secret_manager_secret_version" "secret-json" {
  secret  = "auth0-deploy-${terraform.workspace}"
  project = "iam-auth0"
}

locals {
  parsed_secrets = jsondecode(base64decode(data.google_secret_manager_secret_version.secret-json.secret_data))

  action_map = {
    continueEndPoint = {
      id           = auth0_action.continueEndPoint.id
      display_name = auth0_action.continueEndPoint.name
    }
    samlMappings = {
      id           = auth0_action.samlMappings.id
      display_name = auth0_action.samlMappings.name
    }
    gheGroups = {
      id           = auth0_action.gheGroups.id
      display_name = auth0_action.gheGroups.name
    }
    ensureLdapUsersUseLdap = {
      id           = auth0_action.ensureLdapUsersUseLdap.id
      display_name = auth0_action.ensureLdapUsersUseLdap.name
    }
    accessRules = {
      id           = auth0_action.accessRules.id
      display_name = auth0_action.accessRules.name
    }
    awsSaml = {
      id           = auth0_action.awsSaml.id
      display_name = auth0_action.awsSaml.name
    }
    linkUserByEmail = {
      id           = auth0_action.linkUserByEmail.id
      display_name = auth0_action.linkUserByEmail.name
    }
    activateNewUsersInCIS = {
      id           = auth0_action.activateNewUsersInCIS.id
      display_name = auth0_action.activateNewUsersInCIS.name
    }
    OIDCConformanceWorkaround = {
      id           = auth0_action.OIDCConformanceWorkaround.id
      display_name = auth0_action.OIDCConformanceWorkaround.name
    }
    configurationDumper = {
      id           = auth0_action.configurationDumper.id
      display_name = auth0_action.configurationDumper.name
    }
  }

  action_flow = terraform.workspace == "prod" ? var.action_flow_prod : var.action_flow_dev
}

resource "auth0_trigger_actions" "login_flow" {
  trigger = "post-login"

  dynamic "actions" {
    for_each = local.action_flow
    content {
      id           = local.action_map[actions.value].id
      display_name = local.action_map[actions.value].display_name
    }
  }
}

resource "auth0_action" "continueEndPoint" {
  name    = format("continueEndPoint")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/continueEndPoint.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
}

resource "auth0_action" "samlMappings" {
  name    = format("samlMappings")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/samlMappings.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
}

resource "auth0_action" "gheGroups" {
  name    = format("gheGroups")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/gheGroups.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "node-fetch"
    version = "2.7.0"
  }

  secrets {
    name  = "personapi_audience"
    value = local.parsed_secrets["gheGroups_personapi_audience"]
  }

  secrets {
    name  = "personapi_read_profile_api_client_id"
    value = local.parsed_secrets["gheGroups_personapi_read_profile_api_client_id"]
  }

  secrets {
    name  = "personapi_read_profile_api_secret"
    value = local.parsed_secrets["gheGroups_personapi_read_profile_api_secret"]
  }

  secrets {
    name  = "personapi_url"
    value = local.parsed_secrets["gheGroups_personapi_url"]
  }

  secrets {
    name  = "personapi_oauth_url"
    value = local.parsed_secrets["gheGroups_personapi_oauth_url"]
  }
}

resource "auth0_action" "ensureLdapUsersUseLdap" {
  name    = format("ensureLdapUsersUseLdap")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/ensureLdapUsersUseLdap.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "aws-sdk"
    version = "2.1646.0"
  }

  dependencies {
    name    = "jsonwebtoken"
    version = "9.0.2"
  }

  secrets {
    name  = "accessKeyId"
    value = local.parsed_secrets["ensureLdapUsersUseLdap_accessKeyId"]
  }

  secrets {
    name  = "secretAccessKey"
    value = local.parsed_secrets["ensureLdapUsersUseLdap_secretAccessKey"]
  }
}

resource "auth0_action" "accessRules" {
  name    = format("accessRules")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/accessRules.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "node-fetch"
    version = "2.7.0"
  }

  dependencies {
    name    = "jsonwebtoken"
    version = "9.0.2"
  }

  dependencies {
    name    = "js-yaml"
    version = "4.1.0"
  }

  dependencies {
    name    = "aws-sdk"
    version = "2.1646.0"
  }

  secrets {
    name  = "duo_apihost_mozilla"
    value = local.parsed_secrets["duoSecurity_duo_apihost"]
  }

  secrets {
    name  = "duo_ikey_mozilla"
    value = local.parsed_secrets["duoSecurity_duo_ikey"]
  }

  secrets {
    name  = "duo_skey_mozilla"
    value = local.parsed_secrets["duoSecurity_duo_skey"]
  }

  secrets {
    name  = "accessKeyId"
    value = local.parsed_secrets["accessRules_accessKeyId"]
  }

  secrets {
    name  = "secretAccessKey"
    value = local.parsed_secrets["accessRules_secretAccessKey"]
  }
}

resource "auth0_action" "awsSaml" {
  name    = format("awsSaml")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/awsSaml.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "aws-sdk"
    version = "2.1416.0"
  }

  secrets {
    name  = "AWS_IDENTITYSTORE_ID_IT"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ID_IT"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_ID_IT"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_ID_IT"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_KEY_IT"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_KEY_IT"]
  }

  secrets {
    name  = "AWS_IDENTITYSTORE_ID_POCKET"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ID_POCKET"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_ID_POCKET"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_ID_POCKET"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_KEY_POCKET"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_KEY_POCKET"]
  }

  secrets {
    name  = "AWS_IDENTITYSTORE_ID_MOFO"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ID_MOFO"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_ID_MOFO"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_ID_MOFO"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_KEY_MOFO"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_KEY_MOFO"]
  }

  secrets {
    name  = "AWS_IDENTITYSTORE_ID_CLOUDSERVICES"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ID_CLOUDSERVICES"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_ID_CLOUDSERVICES"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_ID_CLOUDSERVICES"]
  }
  secrets {
    name  = "AWS_IDENTITYSTORE_ACCESS_KEY_CLOUDSERVICES"
    value = local.parsed_secrets["awsSaml_AWS_IDENTITYSTORE_ACCESS_KEY_CLOUDSERVICES"]
  }
}

resource "auth0_action" "linkUserByEmail" {
  name    = format("linkUserByEmail")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/linkUserByEmail.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "auth0"
    version = "4.6.0"
  }

  secrets {
    name  = "mgmtClientId"
    value = local.parsed_secrets["linkUserByEmail_mgmtClientId"]
  }

  secrets {
    name  = "mgmtClientSecret"
    value = local.parsed_secrets["linkUserByEmail_mgmtClientSecret"]
  }
}

resource "auth0_action" "activateNewUsersInCIS" {
  name    = format("activateNewUsersInCIS")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/activateNewUsersInCIS.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  dependencies {
    name    = "node-fetch"
    version = "2.7.0"
  }

  dependencies {
    name    = "jsonwebtoken"
    version = "9.0.2"
  }

  dependencies {
    name    = "aws-sdk"
    version = "2.1646.0"
  }

  secrets {
    name  = "accessKeyId"
    value = local.parsed_secrets["activateNewUsersInCIS_accessKeyId"]
  }

  secrets {
    name  = "secretAccessKey"
    value = local.parsed_secrets["activateNewUsersInCIS_secretAccessKey"]
  }

  secrets {
    name  = "changeapi_url"
    value = local.parsed_secrets["activateNewUsersInCIS_changeapi_url"]
  }

  secrets {
    name  = "personapi_client_id"
    value = local.parsed_secrets["activateNewUsersInCIS_personapi_client_id"]
  }

  secrets {
    name  = "personapi_client_secret"
    value = local.parsed_secrets["activateNewUsersInCIS_personapi_client_secret"]
  }

  secrets {
    name  = "personapi_url"
    value = local.parsed_secrets["activateNewUsersInCIS_personapi_url"]
  }

  secrets {
    name  = "personapi_audience"
    value = local.parsed_secrets["activateNewUsersInCIS_personapi_audience"]
  }

  secrets {
    name  = "personapi_oauth_url"
    value = local.parsed_secrets["activateNewUsersInCIS_personapi_oauth_url"]
  }
}

resource "auth0_action" "OIDCConformanceWorkaround" {
  name    = format("OIDCConformanceWorkaround")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/OIDCConformanceWorkaround.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
}

resource "auth0_action" "configurationDumper" {
  name    = format("configurationDumper")
  runtime = "node18"
  deploy  = true
  code    = file("${path.module}/actions/configurationDumper.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
}
