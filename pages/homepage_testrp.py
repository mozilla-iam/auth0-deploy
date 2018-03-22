from selenium.webdriver.common.by import By

from pages.auth0 import Auth0
from pages.base import Base
from pages.two_factor_authentication_page import TwoFactorAuthenticationPage
from tests import conftest


class HomepageTestRp(Base):
    _sign_in_button = (By.CSS_SELECTOR, 'a[href="https://prod.testrp.security.allizom.org"]')
    _logout_button_locator = (By.CSS_SELECTOR, '#main-content a[href="/logout"]')

    def __init__(self, base_url, selenium, open_url=True):
        Base.__init__(self, base_url, selenium)
        if open_url:
            self.selenium.get(self.base_url)

    @property
    def is_logout_button_displayed(self):
        return self.is_element_visible(*self._logout_button_locator)

    @property
    def is_sign_in_button_displayed(self):
        return self.is_element_visible(*self._sign_in_button)

    def click_sign_in_button(self):
        self.selenium.find_element(*self._sign_in_button).click()
        return Auth0(self.base_url, self.selenium)

    def wait_for_logout_button(self):
        self.wait_for_element_visible(*self._logout_button_locator)

    def click_logout(self):
        self.wait_for_page_loaded()
        self.selenium.find_element(*self._logout_button_locator).click()

    def login_with_ldap(self, email_address, password):
        auth0 = self.click_sign_in_button()
        auth0.enter_email(email_address)
        auth0.click_email_enter()
        auth0.enter_ldap_password(password)
        auth0.click_enter_button()
        return TwoFactorAuthenticationPage(self.base_url, self.selenium)

    def login_passwordless(self, email_address):
        auth0 = self.click_sign_in_button()
        auth0.enter_email(email_address)
        auth0.click_email_enter()
        auth0.click_send_email()
        login_link = conftest.login_link(email_address)
        self.selenium.get(login_link)

    def login_with_github(self, username, password, secret):
        auth0 = self.click_sign_in_button()
        auth0.click_login_with_github()
        auth0.enter_github_username(username)
        auth0.enter_github_password(password)
        auth0.click_github_sign_in()
        auth0.enter_passcode(secret)

    def login_with_google(self, email, password):
        auth0 = self.click_sign_in_button()
        auth0.click_login_with_google()
        auth0.enter_google_email(email)
        auth0.click_email_next()
        auth0.enter_google_password(password)
        auth0.click_password_next()
