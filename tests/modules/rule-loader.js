// auth0 rules rely on a configuration object, which is a set of secrets stored inside auth0, so we need to
// hoist them. Mozilla-IAM also uses a "global" object that is normally at the top of the rules list, and is
// contained inside global.js, which is a pruned down copy of Global-Function-Declarations.js
const fs = require('fs');
const path = require('path');
const requireFromString = require('require-from-string');
const strip = require('strip-comments');
const prettier = require('prettier');

const consoleMock = `
  _log = {
    error: [],
    log: [],
    warn: [],
  };

  const console = {
    error: (msg) => { _log.error.push(msg) },
    log: (msg) => { _log.log.push(msg) },
    warn: (msg) => { _log.warn.push(msg) },
  };
`

const handler = (_, user, context) => {
  return {
    _,
    context,
    user,
    global,
    _log,
  }
};

module.exports = {
  load: (filename, silent = true) => {
    const ruleFile = path.join(__dirname, '../../rules', `${filename}`);

    let functionText = strip(fs.readFileSync(ruleFile, 'utf8')).trim();

    // by default, we remove all comments from the code, as this helps
    // reduce console spam while running tests. however, some tests probe console
    // output, and so we have a shim above (to capture the log inside context), and
    // we don't remove all the console logging statements from the code
    if (silent) {
      functionText = functionText.replace(/console\.\w*\((.|\n)+?(?=\);)\);/g, '');
    }

    // strip the function call on the top, usually function(user, context, callback)
    // we do this because we call the function with considerably more arguments
    functionText = functionText.replace(/^async\s+function\s+[a-zA-Z0-9-_]*\(.*\)/, '');

    // auth0 supports require with module versions, e.g. require('aws-sdk@2.5.3'), and so
    // we have to shim those to trim off the version number
    functionText = functionText.replace(/require\('(.*)@.*'\);/, "require('$1');")

    // We explicitly strip any requires of fetch in the function since it will either
    // be passed as a mocked function or imported down below.
    const toRemove = /require\([\"\']node-fetch[\"\']\)/;
    const splitFuncText = functionText.split('\n').filter(line => !toRemove.test(line));
    functionText = splitFuncText.join('\n');

    // shim auth0 globals into each rule, and set each function to be the global export
    const ruleText = `
      module.exports = async (user, context, configuration, global, auth0, fetch) => {
        let _log = undefined;
        const callback = ${handler.toString()};

        // If fetch is not passed, make sure it is required here
        if (!fetch ){
          fetch = require("node-fetch");
        }

        // This mocks the UnauthorizedError class by simply extending the Error object class
        class UnauthorizedError extends Error {
          constructor(message) {
            super(message); // Call the super class constructor and pass in the message
            this.name = this.constructor.name; // Set the error name to the name of the custom error class
            Error.captureStackTrace(this, this.constructor); // Captures the stack trace (optional, improves debugging)
          }
        }

        ${silent ? '' : consoleMock}

        ${functionText};
      }`;

    // Calling prettier just cleans up and lints the function.  This makes it easier to read
    // if we print the rule out for debugging after it has been mocked and shimmed
    // eg. console.log(rule.toString());
    const ruleFormattedText = prettier.format(ruleText, { semi: true, parser: "babel" })
    const ruleModule = requireFromString(ruleFormattedText, filename);

    return ruleModule;
  }
};
