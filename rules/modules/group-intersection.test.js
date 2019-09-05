const groupIntersection = require('./group-intersection');

let filter;
const userGroup = [
  'normal_user_group_1',
  'qa_team_3_member_2',
  'secret_admin_group_2',
];

/* don't get testy with me */
test('filter without any matches', () => {
  filter = ['nonexistent_group_6', 'does_not_exist_8', 'aGkgZ2VuZSwga2FuZw'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([]);
});

test('filter without wildcard characters', () => {
  filter = ['nonexistent_group_6', 'normal_user_group_1', 'secret_admin_group_2'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
    'secret_admin_group_2',
  ]);
});

test('filter with single question mark group', () => {
  filter = ['normal_user_group_?'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
  ]);
});

test('filter with single asterisk', () => {
  filter = ['normal_*_group_1'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
  ]);
});

test('filter with multiple asterisks', () => {
  filter = ['normal_*_group*'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
  ]);
});

test('filter with asterisk and question mark', () => {
  filter = ['normal_*_group_?'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
  ]);
});

test('filter with multiple groups with asterisk and wildcards', () => {
  filter = ['normal_*_group_?', '??_team*'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
    'qa_team_3_member_2',
  ]);
});

test('filter with only asterisk', () => {
  filter = ['*'];
  expect(groupIntersection(userGroup, filter).sort()).toEqual([
    'normal_user_group_1',
    'qa_team_3_member_2',
    'secret_admin_group_2',
  ]);
});
