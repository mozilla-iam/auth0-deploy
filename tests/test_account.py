import pytest

from pages.sso_dashboard import SsoDashboard
from pages.homepage_testrp import HomepageTestRp


class TestAccount:

    # Fixture arguments for each test come from
    #   conftest.py : https://docs.pytest.org/en/2.7.3/plugins.html?highlight=re#conftest-py-local-per-directory-plugins
    #   pytest-selenium plugin for "selenium"
    #   pytest-base-url plugin for "base_url"
    @pytest.mark.nondestructive
    def test_login_with_ldap(self, base_url, selenium, ldap_user):
        test_rp = HomepageTestRp(base_url, selenium)
        test_rp.login_with_ldap(ldap_user['email'], ldap_user['password'], ldap_user['secret_seed'])
        assert test_rp.is_logout_button_displayed, 'interactive LDAP login failed as the logout button is not present after logging in'
        test_rp.click_logout()
        assert test_rp.is_sign_in_button_displayed, 'logout failed as the sign in button is not present after clicking logout'
        test_rp.click_login()
        assert test_rp.is_logout_button_displayed, 'autologin failed as the logout button is not shown after clicking the login button '


    @pytest.mark.nondestructive
    def test_login_passwordless(self, base_url, selenium, passwordless_user):
        test_rp = HomepageTestRp(base_url, selenium)
        test_rp.login_passwordless(passwordless_user['email'])
        assert test_rp.is_logout_button_displayed
        test_rp.click_logout()
        assert test_rp.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_with_github(self, base_url, selenium, github_user):
        test_rp = HomepageTestRp(base_url, selenium)
        test_rp.login_with_github(github_user['username'], github_user['password'], github_user['secret_seed'])
        assert test_rp.is_logout_button_displayed
        test_rp.click_logout()
        assert test_rp.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_with_firefox_accounts(self, base_url, selenium, firefox_accounts_users):
        test_rp = HomepageTestRp(base_url, selenium)
        if base_url == 'https://aai-low-social-ldap-pwless.testrp.security.allizom.org':
            firefox_accounts_user = firefox_accounts_users['stage']
        else:
            firefox_accounts_user = firefox_accounts_users['prod']
        test_rp.login_with_firefox_accounts(
            firefox_accounts_user['email'],
            firefox_accounts_user['password'],
            firefox_accounts_user['secret_seed'])
        assert test_rp.is_logout_button_displayed
        test_rp.click_logout()
        assert test_rp.is_sign_in_button_displayed

    @pytest.mark.nondestructive
    def test_login_with_google(self, base_url, selenium, google_user):
        test_rp = HomepageTestRp(base_url, selenium)
        test_rp.login_with_google(google_user['email'], google_user['password'], google_user['secret_seed'])
        assert test_rp.is_logout_button_displayed
        test_rp.click_logout()
        assert test_rp.is_sign_in_button_displayed

    # This test, as of March 2020, no longer works as it appears Auth0 no longer
    # alerts when a user enters an invalid email address.
    # @pytest.mark.nondestructive
    # def test_cannot_login_passwordless_if_email_in_invalid_format(self, base_url, selenium):
    #     test_rp = HomepageTestRp(base_url, selenium)
    #     auth0 = test_rp.auth
    #     invalid_email = "invalid@mail"
    #     auth0.enter_email(invalid_email)
    #     auth0.click_email_enter()
    #     auth0.click_send_email()
    #     error_login_confirmation_message = 'Error In Email - Email Format Validation Failed: Invalid@mail'
    #     assert auth0.passwordless_login_confirmation_message == error_login_confirmation_message

    @pytest.mark.nondestructive
    def test_cannot_login_with_ldap_if_email_not_correct(self, base_url, selenium, ldap_user):
        test_rp = HomepageTestRp(base_url, selenium)
        auth0 = test_rp.auth
        auth0.enter_email(ldap_user['email'])
        auth0.click_email_enter()
        auth0.enter_ldap_password('invalid')
        auth0.click_enter_button()
        ldap_global_error_message = "Wrong Email Or Password."
        auth0.wait_for_error_message_shown()
        assert auth0.ldap_error_message == ldap_global_error_message

    @pytest.mark.nondestructive
    def test_cannot_login_with_ldap_if_password_not_correct(self, base_url, selenium, ldap_user):
        test_rp = HomepageTestRp(base_url, selenium)
        auth0 = test_rp.auth
        auth0.enter_email('invalid@mozilla.com')
        auth0.click_email_enter()
        auth0.enter_ldap_password(ldap_user['password'])
        auth0.click_enter_button()
        ldap_global_error_message = "Wrong Email Or Password."
        auth0.wait_for_error_message_shown()
        assert auth0.ldap_error_message == ldap_global_error_message

    @pytest.mark.nondestructive
    def test_github_autologin(self, base_url, selenium, github_user):
        sso_dashboard = SsoDashboard(base_url, selenium)
        sso_dashboard.login_with_github(github_user['username'], github_user['password'], github_user['secret_seed'])
        discourse = sso_dashboard.click_discourse()
        assert discourse.is_avatar_displayed
