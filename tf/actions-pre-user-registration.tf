resource "auth0_trigger_actions" "pre_user_registration_flow" {
  trigger = "pre-user-registration"
  actions {
    id           = auth0_action.deny_registration.id
    display_name = auth0_action.deny_registration.name
  }
}

resource "auth0_action" "deny_registration" {
  name    = "denyRegistration"
  runtime = "node22"
  deploy  = true
  code    = file("${path.module}/actions/denyRegistration.js")
  supported_triggers {
    id      = "pre-user-registration"
    version = "v2"
  }
}
