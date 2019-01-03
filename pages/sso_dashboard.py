from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait

from pages.auth0 import Auth0
from pages.base import Base
from pages.discourse import Discourse
from pages.two_factor_authentication_page import TwoFactorAuthenticationPage


class SsoDashboard(Base):
    _discourse_app_locator = (By.CSS_SELECTOR, '#app-grid a[data-id="Discourse"]')

    def __init__(self, base_url, selenium, open_url=True):
        Base.__init__(self, base_url, selenium)
        if open_url:
            self.selenium.get("https://sso.mozilla.com")

    def login_with_github(self, username, password, secret):
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.click_login_with_github()
        auth0.enter_github_username(username)
        auth0.enter_github_password(password)
        auth0.click_github_sign_in()
        auth0.enter_github_passcode(secret)

    def login_with_ldap(self, email_address, password):
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.enter_email(email_address)
        auth0.click_email_enter()
        auth0.enter_ldap_password(password)
        auth0.click_enter_button()
        return TwoFactorAuthenticationPage(self.base_url, self.selenium)

    def click_discourse(self, message):
        initial_windows = len(self.selenium.window_handles)
        self.selenium.find_element(*self._discourse_app_locator).click()
        WebDriverWait(self.selenium, self.timeout).until(lambda s: len(self.selenium.window_handles) == initial_windows + 1)
        self.selenium.switch_to.window(self.selenium.window_handles[1])
        auth = Auth0(self.base_url, self.selenium)
        auth.wait_for_message(message)
        return Discourse(self.base_url, self.selenium)
