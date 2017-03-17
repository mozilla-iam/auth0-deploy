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
