import time

from selenium.common.exceptions import NoSuchElementException, ElementNotVisibleException, ElementNotInteractableException
from selenium.webdriver.support.wait import WebDriverWait


class Base(object):

    def __init__(self, base_url, selenium):
        self.base_url = base_url
        self.selenium = selenium
        self.timeout = 60

    def is_element_visible(self, *locator):
        try:
            return self.selenium.find_element(*locator).is_displayed()
        except (NoSuchElementException, ElementNotVisibleException):
            return False

    def is_element_enabled(self, *locator):
        try:
            self.selenium.find_element(*locator).is_enabled()
        except (NoSuchElementException, ElementNotVisibleException, ElementNotInteractableException):
            return False

    def wait_for_element_visible(self, *locator):
        count = 0
        while not self.is_element_visible(*locator):
            time.sleep(1)
            count += 1
            if count == self.timeout:
                raise Exception(':'.join(locator) + " is not visible")

    def wait_for_element_enabled(self, *locator):
        count = 0
        while not self.is_element_enabled(*locator):
            time.sleep(1)
            count += 1
            if count == self.timeout:
                raise Exception(':'.join(locator) + " is not enabled")

    @property
    def is_page_loaded(self):
        page_state = self.selenium.execute_script('return document.readyState;')
        return page_state == 'complete'

    def wait_for_page_loaded(self):
        WebDriverWait(self.selenium, self.timeout).until(lambda s: self.is_page_loaded)
