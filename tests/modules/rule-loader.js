// auth0 rules rely on a configuration object, which is a set of secrets stored inside auth0, so we need to
// hoist them. Mozilla-IAM also uses a "global" object that is normally at the top of the rules list, and is
// contained inside global.js, which is a pruned down copy of Global-Function-Declarations.js
const fs = require('fs');
const path = require('path');
const requireFromString = require('require-from-string');
const strip = require('strip-comments');

const consoleMock = `
  context._log = {
    error: [],
    log: [],
    warn: [],
  };

  const console = {
    error: (msg) => { context._log.error.push(msg) },
    log: (msg) => { context._log.log.push(msg) },
    warn: (msg) => { context._log.warn.push(msg) },
  };
`

const handler = (_, user, context) => {
  return {
    _,
    context,
    user,
    global,
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
    functionText = functionText.replace(/function\s+[a-zA-Z0-9-_]*\(.*\)/, '');

    // auth0 supports require with module versions, e.g. require('aws-sdk@2.5.3'), and so
    // we have to shim those to trim off the version number
    functionText = functionText.replace(/require\('(.*)@.*'\);/, "require('$1');")

    // shim auth0 globals into each rule, and set each function to be the global export
    const ruleText = `
      module.exports = (user, context, configuration, global, auth0) => {
        const callback = ${handler.toString()};

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

    const ruleModule = requireFromString(ruleText, filename);

    return ruleModule;
  }
};
