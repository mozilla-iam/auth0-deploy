from selenium.webdriver.common.by import By

from pages.auth0 import Auth0
from pages.base import Base
from pages.two_factor_authentication_page import TwoFactorAuthenticationPage


class Homepage(Base):
    _sign_in_button = (By.CSS_SELECTOR, '.btn-signin.btn-signin-red')

    def __init__(self, base_url, selenium, open_url=True):
        Base.__init__(self, base_url, selenium)
        if open_url:
            self.selenium.get(self.base_url)

    def click_sign_in_button(self):
        self.selenium.find_element(*self._sign_in_button).click()

    def ldap_login(self, email_address, password):
        self.click_sign_in_button()
        auth0 = Auth0(self.base_url, self.selenium)
        auth0.login_with_ldap(email_address, password)
        return TwoFactorAuthenticationPage(self.base_url, self.selenium)
