"""Takes parameter store secrets and decrypts them to JSON that can be used by test-automation."""
import sys
import json
import boto3


NAMESPACE = '/iam/automated-test'
DELIMITER = '/'

def get_paginated_results(product, action, key, credentials=None, args=None):
    args = {} if args is None else args
    credentials = {} if credentials is None else credentials
    return [y for sublist in [x[key] for x in boto3.client(product, **credentials).get_paginator(action).paginate(**args)] for y in sublist]


def get_secret(parameter_key):
    client = boto3.client('ssm', region_name='us-west-2')

    is_secure = True if 'secret' in parameter_key or 'password' in parameter_key else False
    try:
        response = client.get_parameter(
            Name=parameter_key,
            WithDecryption=is_secure
        )
        result = response['Parameter']['Value']
    except Exception as e:
        print('Exception fetching {} : {}'.format(parameter_key, e))
        result = None

    return result


def put_secret(parameter_key, value):
    client = boto3.client('ssm', region_name='us-west-2')

    parameter_type = 'SecureString' if 'secret' in parameter_key or 'password' in parameter_key else 'String'
    try:
        response = client.get_parameter(
            Name=parameter_key,
            WithDecryption=(parameter_type == 'SecureString')
        )
        if response['Parameter']['Value'] == value:
            return None
    except:
        pass

    response = client.put_parameter(
        Name=parameter_key,
        Description='IAM Automated test setting used to log into SSO with an identity provider',
        Value=value,
        Type=parameter_type,
        Overwrite=True,
    )
    version = response['Version']
    print('Wrote {} : {}'.format(parameter_key, version))
    response = client.add_tags_to_resource(
        ResourceType='Parameter',
        ResourceId=parameter_key,
        Tags=[
            {
                'Key': 'Source',
                'Value': 'https://github.com/mozilla-iam/auth0-tests'
            }
        ]
    )
    return version


# TODO : convert dump_secrets to a generic method that fetches a parameter store
# namespace ("/iam/automated-test") and splits and converts it into a nested dict
def dump_secrets():
    secrets = {
        "users": {
            "ldap": {
                "email": get_secret('/iam/automated-test/ldap/email'),
                "password": get_secret('/iam/automated-test/ldap/password'),
                "secret_seed": get_secret('/iam/automated-test/ldap/secret_seed')
            },
            "passwordless": {
                "email": get_secret('/iam/automated-test/passwordless/email')
            },
            "github": {
                "username": get_secret('/iam/automated-test/github/email'),
                "password": get_secret('/iam/automated-test/github/password'),
                "secret_seed": get_secret('/iam/automated-test/github/secret_seed')
            },
            "google": {
                "email": get_secret('/iam/automated-test/google/email'),
                "password": get_secret('/iam/automated-test/google/password'),
                "secret_seed": get_secret('/iam/automated-test/google/secret_seed')
            },
            "fxa": {
                "stage": {
                    "email": get_secret('/iam/automated-test/fxa/stage/email'),
                    "password": get_secret('/iam/automated-test/fxa/stage/password'),
                    "secret_seed": get_secret('/iam/automated-test/fxa/stage/secret_seed')
                },
                "prod": {
                    "email": get_secret('/iam/automated-test/fxa/prod/email'),
                    "password": get_secret('/iam/automated-test/fxa/prod/password'),
                    "secret_seed": get_secret('/iam/automated-test/fxa/prod/secret_seed')
                }
            }
        }
    }
    return secrets


def read_secrets():
    parameters = get_paginated_results(
        'ssm',
        'get_parameters_by_path',
        'Parameters',
        args={
            'Path': NAMESPACE,
            'Recursive': True,
            'WithDecryption': True
        }
    )
    y = {x['Name'][len(NAMESPACE):]: x['Value'] for x in parameters}


def write_secrets(in_file):
    with open(in_file) as f:
        secrets = json.load(f)
    for idp in secrets['users']:
        for parameter in secrets['users'][idp]:
            name = DELIMITER.join([NAMESPACE, idp, parameter])
            if parameter in ['stage', 'prod']:
                for sub_parameter in secrets['users'][idp][parameter]:
                    name = DELIMITER.join([NAMESPACE, idp, parameter])
                    name += '/{}'.format(sub_parameter)
                    put_secret(name, secrets['users'][idp][parameter][sub_parameter])
            else:
                put_secret(name, secrets['users'][idp][parameter])


if __name__ == "__main__":
    filename = 'variables.json'
    if len(sys.argv) > 1 and sys.argv[1] == 'write':
        write_secrets(filename)
    else:
        with open(filename, 'w') as outfile:
            json.dump(dump_secrets(), outfile, indent=4)
