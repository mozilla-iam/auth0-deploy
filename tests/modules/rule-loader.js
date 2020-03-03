// auth0 rules rely on a configuration object, which is a set of secrets stored inside auth0, so we need to
// hoist them. Mozilla-IAM also uses a "global" object that is normally at the top of the rules list, and is
// contained inside global.js, which is a pruned down copy of Global-Function-Declarations.js
const fs = require('fs');
const path = require('path');
const requireFromString = require('require-from-string');

module.exports = {
  // no idea from the docs what the first variable is
  callbackHandler: (_ = null, user, context) => {
    return {
      context,
      user,
    }
  },

  load: (ruleFile, preExportEval = '', silent = true) => {
    ruleFile = path.join(__dirname, '../../rules', `${ruleFile}`);

    const silence = silent ? `console.log = console.error = () => {};` : '';
    // const silence = '';

    // shim auth0 globals into each rule, and set each function to be the global export
    const ruleText = `
      const configuration = require('./modules/global/configuration.js');
      const global = require('./modules/global/global.js');

      ${silence}
      ${preExportEval}

      module.exports = ${fs.readFileSync(ruleFile, 'utf8')};
      `;

//    console.log("ruletext is", ruleText);
    const ruleModule = requireFromString(ruleText);

    return ruleModule;
  }
};