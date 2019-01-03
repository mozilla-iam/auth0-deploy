import pyotp
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait

from pages.base import Base


class Auth0(Base):
    # Email / LDAP locators
    _email_locator = (By.ID, 'field-email')
    _enter_email_button_locator = (By.ID, 'enter-initial')
    _send_email_locator = (By.CSS_SELECTOR, '#non-ldap button[data-handler=send-passwordless-link]')
    _password_locator = (By.ID, 'field-password')
    _enter_button_locator = (By.ID, 'authorise-ldap-credentials')
    _passcode_field_locator = (By.CSS_SELECTOR, '.passcode-label input[name="passcode"]')
    _ldap_error_message = (By.CSS_SELECTOR, '#error-password span')
    _passwordless_login_confirmation_message = (By.CSS_SELECTOR, '#error-message-passwordless span')
    _loading_spinner_locator = (By.CSS_SELECTOR, 'form[lock-state="loading"]')
    _spinner_locator = (By.CSS_SELECTOR, '.loading__spinner')
    _autologin_message_locator = (By.ID, 'loading__status')

    # Github locators
    _login_with_github_button_locator = (By.CSS_SELECTOR, 'button[data-handler="authorise-github"]')
    _github_username_field_locator = (By.ID, 'login_field')
    _github_password_field_locator = (By.ID, 'password')
    _github_sign_in_button_locator = (By.CSS_SELECTOR, '.btn.btn-primary.btn-block')
    _github_passcode_field_locator = (By.CSS_SELECTOR, 'input[id="otp"]')
    _github_enter_passcode_button_locator = (By.CSS_SELECTOR, '.btn-primary')
    _authorize_github_locator = (By.ID, 'js-oauth-authorize-btn')

    # Google locators
    _login_with_google_button_locator = (By.CSS_SELECTOR, 'button[data-handler="authorise-google"]')
    _google_email_field_locator = (By.ID, 'identifierId')
    _email_next_button_locator = (By.ID, 'identifierNext')
    _google_password_field_locator = (By.CSS_SELECTOR, '#password input')
    _password_next_button_locator = (By.ID, 'passwordNext')

    # Firefox Accounts locators
    _login_with_firefox_accounts_locator = (By.CSS_SELECTOR, 'button[data-handler="authorise-firefoxaccounts"]')
    _sign_in_link_locator = (By.CSS_SELECTOR, '.sign-in')
    _fxa_email_locator = (By.CSS_SELECTOR, '.email')
    _fxa_password_locator = (By.ID, 'password')
    _fxa_sign_in_button_locator = (By.ID, 'submit-btn')
    _fxa_passcode_field_locator = (By.CSS_SELECTOR, '.token-code-row input')
    _fxa_verify_passcode_button_locator = (By.CSS_SELECTOR, '.use-logged-in')

    # fxa staging
    _email_fxa_locator = (By.CSS_SELECTOR, 'input[type="email"]')
    _fxa_continue_button_locator = (By.ID, 'submit-btn')
    _password_fxa_locator = (By.ID, 'password')

    @property
    def is_spinner_shown(self):
        return self.is_element_visible(*self._spinner_locator)

    @property
    def autologin_message(self):
        return self.selenium.find_element(*self._autologin_message_locator).text

    @property
    def passwordless_login_confirmation_message(self):
        self.wait_for_element_visible(*self._passwordless_login_confirmation_message)
        return self.selenium.find_element(*self._passwordless_login_confirmation_message).text

    @property
    def ldap_error_message(self):
        return self.selenium.find_element(*self._ldap_error_message).text

    @property
    def is_authorize_github_button_shown(self):
        return self.is_element_enabled(*self._authorize_github_locator)

    def wait_for_spinner(self):
        WebDriverWait(self.selenium, self.timeout).until(lambda s: not self.is_spinner_shown)

    def wait_for_message(self, message):
        WebDriverWait(self.selenium, self.timeout).until(lambda s: self.autologin_message == message)

    def wait_for_error_message_shown(self):
        self.wait_for_element_visible(*self._ldap_error_message)

    def enter_email(self, ldap_email):
        self.selenium.find_element(*self._email_locator).send_keys(ldap_email)

    def click_email_enter(self):
        self.selenium.find_element(*self._enter_email_button_locator).click()

    def click_send_email(self):
        self.wait_for_element_visible(*self._send_email_locator)
        self.selenium.find_element(*self._send_email_locator).click()

    def enter_ldap_password(self, ldap_password):
        self.wait_for_element_visible(*self._password_locator)
        self.selenium.find_element(*self._password_locator).send_keys(ldap_password)

    def click_enter_button(self):
        self.selenium.find_element(*self._enter_button_locator).click()

    def click_login_with_github(self):
        self.wait_for_element_visible(*self._login_with_github_button_locator)
        self.selenium.find_element(*self._login_with_github_button_locator).click()

    def enter_github_username(self, username):
        self.selenium.find_element(*self._github_username_field_locator).send_keys(username)

    def enter_github_password(self, password):
        self.selenium.find_element(*self._github_password_field_locator).send_keys(password)

    def click_github_sign_in(self):
        self.wait_for_element_visible(*self._github_sign_in_button_locator)
        self.selenium.find_element(*self._github_sign_in_button_locator).click()

    def enter_github_passcode(self, secret):
        passcode = pyotp.TOTP(secret).now()
        self.selenium.find_element(*self._github_passcode_field_locator).send_keys(passcode)
        self.selenium.find_element(*self._github_enter_passcode_button_locator).click()
        if self.is_authorize_github_button_shown:
            self.selenium.find_element(*self._authorize_github_locator).click()

    def click_login_with_google(self):
        self.wait_for_element_visible(*self._login_with_google_button_locator)
        self.selenium.find_element(*self._login_with_google_button_locator).click()

    def enter_google_email(self, email):
        self.wait_for_element_visible(*self._google_email_field_locator)
        self.selenium.find_element(*self._google_email_field_locator).send_keys(email)

    def click_email_next(self):
        self.selenium.find_element(*self._email_next_button_locator).click()

    def enter_google_password(self, password):
        self.wait_for_element_visible(*self._google_password_field_locator)
        self.selenium.find_element(*self._google_password_field_locator).send_keys(password)

    def click_password_next(self):
        self.selenium.find_element(*self._password_next_button_locator).click()

    def click_login_with_firefox_accounts(self):
        self.wait_for_element_visible(*self._login_with_firefox_accounts_locator)
        self.selenium.find_element(*self._login_with_firefox_accounts_locator).click()
        self.selenium.find_element(*self._sign_in_link_locator).click()

    def enter_fxa_email(self, email):
        self.selenium.find_element(*self._fxa_email_locator).send_keys(email)

    def enter_fxa_password(self, password):
        self.selenium.find_element(*self._fxa_password_locator).send_keys(password)

    def click_firefox_accounts_sign_in(self):
        self.selenium.find_element(*self._fxa_sign_in_button_locator).click()

    def enter_fxa_passcode(self, secret):
        passcode = pyotp.TOTP(secret).now()
        self.selenium.find_element(*self._fxa_passcode_field_locator).send_keys(passcode)
        self.selenium.find_element(*self._fxa_verify_passcode_button_locator).click()

    def login_with_fxa_staging(self, email, password, secret):
        self.wait_for_element_visible(*self._login_with_firefox_accounts_locator)
        self.selenium.find_element(*self._login_with_firefox_accounts_locator).click()
        self.wait_for_element_visible(*self._email_fxa_locator)
        self.selenium.find_element(*self._email_fxa_locator).send_keys(email)
        self.selenium.find_element(*self._fxa_continue_button_locator).click()
        self.wait_for_element_visible(*self._password_fxa_locator)
        self.selenium.find_element(*self._password_fxa_locator).send_keys(password)
        self.selenium.find_element(*self._fxa_continue_button_locator).click()

        passcode = pyotp.TOTP(secret).now()
        self.selenium.find_element(*self._fxa_passcode_field_locator).send_keys(passcode)
        self.wait_for_element_visible(*self._fxa_passcode_field_locator)
        self.selenium.find_element(*self._fxa_verify_passcode_button_locator).click()
