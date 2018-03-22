from selenium.webdriver.common.by import By

from pages.base import Base


class Discourse(Base):
    _avatar_image_locator = (By.CSS_SELECTOR, '#current-user a[class="icon"]')

    @property
    def is_avatar_displayed(self):
        return self.is_element_visible(*self._avatar_image_locator)
