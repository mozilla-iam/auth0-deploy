import json
import time
import requests


def get_mail(username, message_count=1, timeout=60):
    """
    Method that returns the content of the newest email for the specified restmail.net username, in json format.
    If there are more emails than one, an exception is thrown, saying how many emails are in the inbox.
    """
    username = username.partition('@restmail.net')[0]
    end_time = time.time() + timeout
    response = requests.delete(
        'https://restmail.net/mail/%s' % username)
    response.raise_for_status()
    while (True):
        response = requests.get(
            'https://restmail.net/mail/%s' % username)
        response.raise_for_status()
        restmail = json.loads(response.content)
        if len(restmail) == message_count:
            return restmail
        time.sleep(0.5)
        if (time.time() > end_time):
            break
    raise Exception('Timeout after %(TIMEOUT)s seconds getting restmail for '
                    '%(USERNAME)s. Expected %(EXPECTED_MESSAGE_COUNT)s '
                    'messages but there were %(ACTUAL_MESSAGE_COUNT)s.' % {
                        'TIMEOUT': timeout,
                        'USERNAME': username,
                        'EXPECTED_MESSAGE_COUNT': message_count,
                        'ACTUAL_MESSAGE_COUNT': len(restmail)})
