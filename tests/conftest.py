import pytest


@pytest.fixture
def selenium(selenium):
    selenium.implicitly_wait(10)
    selenium.maximize_window()
    return selenium


# https://pypi.org/project/pytest-variables/
@pytest.fixture
def stored_users(variables):
    return variables['users']


@pytest.fixture
def ldap_user(stored_users):
    return stored_users['ldap']


@pytest.fixture
def passwordless_user(stored_users):
    return stored_users['passwordless']


@pytest.fixture
def github_user(stored_users):
    return stored_users['github']


@pytest.fixture
def google_user(stored_users):
    return stored_users['google']


@pytest.fixture
def firefox_accounts_users(stored_users):
    return stored_users['fxa']

