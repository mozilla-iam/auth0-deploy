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

const handler = (_ = null, user, context) => {
  return {
    context,
    user,
  }
};

module.exports = {
  load: (filename, silent = true) => {
    const ruleFile = path.join(__dirname, '../../rules', `${filename}`);

    // remove all comments from the code
    let functionText = strip(fs.readFileSync(ruleFile, 'utf8')).trim();

    // remove all console statements from the code, hopefully this is right
    if (silent) {
      functionText = functionText.replace(/console\.\w*\((.|\n)+?(?=\);)\);/g, '');
    }

    // strip the function call on the top
    functionText = functionText.replace(/function\s+\(.*\)/, '');


    // shim auth0 globals into each rule, and set each function to be the global export
    const ruleText = `
      module.exports = (user, context, configuration, global, auth0) => {
        const callback = ${handler.toString()};

        ${silent ? '' : consoleMock}

        ${functionText};
      }`;

    const ruleModule = requireFromString(ruleText, filename);

    return ruleModule;
  }
};
