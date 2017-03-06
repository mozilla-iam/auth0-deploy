from selenium.webdriver.common.by import By

from pages.authentication_status_page import AuthenticationStatusPage
from pages.base import Base


class TwoFactorAuthenticationPage(Base):

    _enter_passcode_button = (By.CSS_SELECTOR, '.passcode-label .positive.auth-button')
    _passcode_field_locator = (By.CSS_SELECTOR, '.passcode-label input[name="passcode"]')
    _duo_iframe_locator = (By.ID, 'duo_iframe')
    _successfull_passcode_message_locator = (By.CSS_SELECTOR, '#messages-view .message-content')

    def enter_passcode(self, passcode):
        self.selenium.switch_to_frame('duo_iframe')
        self.wait_for_element_visible(*self._enter_passcode_button)
        self.selenium.find_element(*self._enter_passcode_button).click()
        self.selenium.find_element(*self._passcode_field_locator).send_keys(passcode)
        self.selenium.find_element(*self._enter_passcode_button).click()
        self.selenium.switch_to_default_content()
        authentication_status_page = AuthenticationStatusPage(self.base_url, self.selenium)
        authentication_status_page.wait_for_logout_button()
        return authentication_status_page
