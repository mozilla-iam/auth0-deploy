# modules
These are not technically modules, since there doesn't seem to be any obvious way to support
importing your own modules inside auth0.

What this folder actually contains are single-use functions and their tests, which are then copied
into auth0 rules above.

# Testing
```bash
$ npm install

> fsevents@1.2.9 install /Users/april/Source/auth0-deploy/rules/modules/node_modules/fsevents
> node install

node-pre-gyp WARN Using request for node-pre-gyp https download
added 530 packages from 365 contributors and audited 876742 packages in 10.582s
found 0 vulnerabilities

$ npm test

> auth0-deploy-modules@1.0.0 test /Users/april/Source/auth0-deploy/rules/modules
> jest

 PASS  ./group-intersection.test.js
  ✓ filter without any matches (3ms)
  ✓ filter without wildcard characters (1ms)
  ✓ filter with single question mark group (6ms)
  ✓ filter with single asterisk (1ms)
  ✓ filter with multiple asterisks
  ✓ filter with asterisk and question mark (1ms)
  ✓ filter with multiple groups with asterisk and wildcards
  ✓ filter with only asterisk

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        1.186s
Ran all test suites.
```

# Creating tests
This code uses the [Jest](https://jestjs.io/) testing framework. See their [Getting Started](https://jestjs.io/docs/en/getting-started) page for details on how to write your own tests.