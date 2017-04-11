import pytest
from tests import conftest
from pages.home_page import Homepage


class TestAccount:

    @pytest.mark.nondestructive
    def test_login_with_ldap(self, base_url, selenium, ldap_user):
        homepage = Homepage(base_url, selenium)
        two_factor_authentication_page = homepage.login_with_ldap(ldap_user['email'], ldap_user['password'])
        passcode = conftest.passcode(ldap_user['secret_seed'])
        authentication_status_page = two_factor_authentication_page.enter_passcode(passcode)
        assert authentication_status_page.is_logout_button_displayed
        authentication_status_page.click_logout()
        assert homepage.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_passwordless(self, base_url, selenium, passwordless_user):
        homepage = Homepage(base_url, selenium)
        authentication_status_page = homepage.login_passwordless(passwordless_user['email'])
        assert authentication_status_page.is_logout_button_displayed
        authentication_status_page.click_logout()
        assert homepage.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_with_github(self, base_url, selenium, github_user):
        homepage = Homepage(base_url, selenium)
        authentication_status_page = homepage.login_with_github(github_user['username'], github_user['password'])
        assert authentication_status_page.is_logout_button_displayed
        authentication_status_page.click_logout()
        assert homepage.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_with_google(self, base_url, selenium, google_user):
        homepage = Homepage(base_url, selenium)
        authentication_status_page = homepage.login_with_google(google_user['email'], google_user['password'])
        assert authentication_status_page.is_logout_button_displayed
        authentication_status_page.click_logout()
        assert homepage.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_cannot_login_passwordless_if_email_in_invalid_format(self, base_url, selenium):
        homepage = Homepage(base_url, selenium)
        auth0 = homepage.click_sign_in_button()
        auth0.click_login_with_email()
        invalid_email = "invalidmail"
        auth0.enter_email(invalid_email)
        auth0.click_send_email()
        error_login_confirmation_message = 'We were unable to send the email. Please ensure you submitted a correctly formatted e-mail address.'\
            .format(invalid_email)
        assert error_login_confirmation_message == auth0.passwordless_login_confirmation_message

    @pytest.mark.nondestructive
    def test_cannot_login_with_ldap_if_email_or_password_empty(self, base_url, selenium, ldap_user):
        homepage = Homepage(base_url, selenium)
        auth0 = homepage.click_sign_in_button()
        auth0.click_login_with_ldap()
        auth0.enter_ldap_email(ldap_user['email'])
        auth0.click_login_button()
        assert "Can't be blank" == auth0.ldap_password_input_error_message
        auth0.delete_ldap_email()
        auth0.enter_ldap_password(ldap_user['password'])
        auth0.click_login_button()
        assert "Can't be blank" == auth0.ldap_email_input_error_message

    @pytest.mark.nondestructive
    def test_cannot_login_with_ldap_if_email_or_password_not_correct(self, base_url, selenium, ldap_user):
        homepage = Homepage(base_url, selenium)
        auth0 = homepage.click_sign_in_button()
        auth0.click_login_with_ldap()
        auth0.enter_ldap_email(ldap_user['email'])
        auth0.enter_ldap_password('invalid')
        auth0.click_login_button()
        ldap_global_error_message = "WRONG EMAIL OR PASSWORD. DID YOU USE YOUR PRIMARY MOZILLA EMAIL AND CORRECT LDAP PASSWORD?"
        auth0.wait_for_error_message_shown(ldap_global_error_message)
        auth0.delete_ldap_email()
        auth0.enter_ldap_email('invalid@mozilla.com')
        auth0.enter_ldap_password(ldap_user['password'])
        auth0.click_login_button()
        auth0.wait_for_error_message_shown(ldap_global_error_message)

    @pytest.mark.nondestructive
    def test_cannot_login_with_github_if_password_incorrect(self, base_url, selenium, github_user):
        homepage = Homepage(base_url, selenium)
        auth0 = homepage.click_sign_in_button()
        auth0.click_login_with_github()
        auth0.enter_github_username(github_user['username'])
        auth0.enter_github_password("invalid")
        auth0.click_github_sign_in()
        assert "Incorrect username or password." == auth0.github_login_error_message

    @pytest.mark.nondestructive
    def test_cannot_login_with_gmail_if_email_or_password_incorrect(self, base_url, selenium, google_user):
        homepage = Homepage(base_url, selenium)
        auth0 = homepage.click_sign_in_button()
        auth0.click_login_with_google()
        auth0.enter_google_email("invalid_email")
        auth0.click_next()
        assert "Sorry, Google doesn't recognize that email." == auth0.google_email_input_error_message
        auth0.enter_google_email(google_user['email'])
        auth0.click_next()
        auth0.enter_google_password('invalid')
        auth0.click_google_sign_in()
        assert "Wrong password. Try again." == auth0.google_password_input_error_message
