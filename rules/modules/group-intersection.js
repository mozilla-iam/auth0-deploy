// Given a set of groups that a user is in (groups), and a filter upon those groups,
// return the intersection of the two
const groupIntersection = (groups, filter) => {
  // from lodash.escapeRegExp, except without ? and *
  const reRegExpChar = /[\\^$.+()[\]{}|]/g,
        reHasRegExpChar = RegExp(reRegExpChar.source),
        overlap = new Set();

  const escapeRegExp = (string) => {
    string = (string && reHasRegExpChar.test(string))? string.replace(reRegExpChar, '\\$&') : string;

    // in AWS, we support ? and * as wildcard characters
    return string.replace(/\?/g, '.').replace(/\*/g, '.*');
  };

  const filters = filter.map(i => new RegExp(escapeRegExp(i)));

  groups.forEach(group => {
    // This is not a foreach loop, simply because we want to break.
    // We do this to slightly reduce this looping structure from O(n * m).
    for (let filter of filters) {
      if (filter.test(group)) {
        overlap.add(group);
        break;
      }
    }
  });

  return [...overlap];
};

module.exports = groupIntersection;
