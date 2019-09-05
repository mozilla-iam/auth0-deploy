// Given a set of groups that a user is in (groups), and a filter upon those groups,
// return the intersection of the two
const groupIntersection = (groups, filter) => {
  const overlap = new Set();

  const filters = filter.map(i => {
    return new RegExp(i.replace(/\./g, '\.').replace(/\?/g, '.').replace(/\*/g, '.*'));
  });

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