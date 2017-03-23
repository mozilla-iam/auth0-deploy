from selenium.webdriver.common.by import By

from pages.auth0 import Auth0
from pages.base import Base
from pages.two_factor_authentication_page import TwoFactorAuthenticationPage
from pages.authentication_status_page import AuthenticationStatusPage
from tests import conftest


class Homepage(Base):
    _sign_in_button = (By.CSS_SELECTOR, '.btn-signin.btn-signin-red')

    def __init__(self, base_url, selenium, open_url=True):
        Base.__init__(self, base_url, selenium)
        if open_url:
            self.selenium.get(self.base_url)

    @property
    def is_sign_in_button_displayed(self):
        return self.is_element_visible(*self._sign_in_button)

    def click_sign_in_button(self):
        self.selenium.find_element(*self._sign_in_button).click()

    def login_with_ldap(self, email_address, password):
        self.click_sign_in_button()
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.click_login_with_ldap()
        auth0.enter_ldap_email(email_address)
        auth0.enter_ldap_password(password)
        auth0.click_login_button()
        return TwoFactorAuthenticationPage(self.base_url, self.selenium)

    def login_passwordless(self, email_address):
        self.click_sign_in_button()
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.click_login_with_email()
        auth0.enter_email(email_address)
        auth0.click_send_email()
        login_link = conftest.login_link(email_address)
        self.selenium.get(login_link)
        return AuthenticationStatusPage(self.base_url, self.selenium)

    def login_with_github(self, username, password):
        self.click_sign_in_button()
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.click_login_with_github()
        auth0.enter_github_username(username)
        auth0.enter_github_password(password)
        auth0.click_github_sign_in()
        authentication_status_page = AuthenticationStatusPage(self.base_url, self.selenium)
        authentication_status_page.wait_for_logout_button()
        return authentication_status_page

    def login_with_google(self, email, password):
        self.click_sign_in_button()
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.click_login_with_google()
        auth0.enter_google_email(email)
        auth0.click_next()
        auth0.enter_google_password(password)
        auth0.click_google_sign_in()
        authentication_status_page = AuthenticationStatusPage(self.base_url, self.selenium)
        authentication_status_page.wait_for_logout_button()
        return authentication_status_page
