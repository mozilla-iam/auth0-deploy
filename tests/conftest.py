import pytest
import pyotp


@pytest.fixture
def selenium(selenium):
    selenium.implicitly_wait(10)
    selenium.maximize_window()
    return selenium


@pytest.fixture
def stored_users(variables):
    return variables['users']


@pytest.fixture
def ldap_user(stored_users):
    return stored_users['ldap']


@pytest.fixture
def passcode(secret_seed):
    totp = pyotp.TOTP(secret_seed)
    return totp.now()
