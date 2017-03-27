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
        error_login_confirmation_message = 'We were unable to send the email : error in email - email format validation failed: {0}'\
            .format(invalid_email)
        assert error_login_confirmation_message == auth0.passwordless_login_confirmation_message
