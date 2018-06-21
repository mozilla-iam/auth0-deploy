"""Takes parameter store secrets and decrypts them to JSON that can be used by test-automation."""
import boto3
import json


def get_secret(parameter_key, is_secure=True):
    client = boto3.client('ssm', region_name='us-west-2')

    response = client.get_parameter(
        Name=parameter_key,
        WithDecryption=is_secure
    )

    return response['Parameter']['Value']


def dump_secrets():
    secrets = {
        "users": {
            "ldap": {
                "email": get_secret('/iam/automated-test/ldap_email'),
                "password": get_secret('/iam/automated-test/ldap_password'),
                "secret_seed": get_secret('/iam/automated-test/ldap_secret_seed')
            },
            "passwordless": {
                "email": get_secret('/iam/automated-test/passwordless_email')
            },
            "github": {
                "username": get_secret('/iam/automated-test/github_email'),
                "password": get_secret('/iam/automated-test/github_password'),
                "secret_seed": get_secret('/iam/automated-test/github_secret_seed')
            },
            "google": {
                "email": get_secret('/iam/automated-test/google_email'),
                "password": get_secret('/iam/automated-test/google_password')
            },
            "fxa": {
                "email": get_secret('/iam/automated-test/fxa_email'),
                "password": get_secret('/iam/automated-test/fxa_password'),
                "secret_seed": get_secret('/iam/automated-test/fxa_secret_seed')
            }
        }
    }
    return secrets


if __name__ == "__main__":
    secrets = dump_secrets()
    with open('variables.json', 'w') as outfile:
        json.dump(secrets, outfile)
