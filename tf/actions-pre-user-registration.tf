resource "auth0_trigger_actions" "pre_user_registration_flow" {
  trigger = "pre-user-registration"
  actions {
    id           = auth0_action.deny_registration_by_email.id
    display_name = auth0_action.deny_registration_by_email.name
  }
}

# DEBT(bhee): Maybe mint new secrets for this action.
resource "auth0_action" "deny_registration_by_email" {
  name    = "denyRegistrationByEmail"
  runtime = "node22"
  deploy  = true
  code    = file("${path.module}/actions/denyRegistrationByEmail.js")
  supported_triggers {
    id      = "pre-user-registration"
    version = "v2"
  }
  dependencies {
    name    = "auth0"
    version = "4.9.0"
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
