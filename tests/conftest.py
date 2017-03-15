import pytest
import pyotp
import restmail


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


@pytest.fixture
def passwordless_user(stored_users):
    return stored_users['passwordless']


@pytest.fixture
def login_link(username):
    mail = restmail.get_mail(username)
    mail_content = mail[0]['text'].replace('\n', ' ').replace('amp;', '').split(" ")
    for link in mail_content:
        if link.startswith("https"):
            return link
