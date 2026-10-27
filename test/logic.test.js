const test = require('node:test');
const assert = require('node:assert');
const { dayKey, weekday, isDue, validateHabit } = require('../src/logic');

test('before 4am still counts as the previous day', () => {
  assert.strictEqual(dayKey(new Date(2026, 9, 27, 1, 30)), '2026-10-26');
  assert.strictEqual(dayKey(new Date(2026, 9, 27, 3, 59)), '2026-10-26');
  assert.strictEqual(dayKey(new Date(2026, 9, 27, 4, 0)), '2026-10-27');
});

test('reset rolls back across months', () => {
  assert.strictEqual(dayKey(new Date(2026, 10, 1, 2, 0)), '2026-10-31');
});

test('weekday follows the habit day', () => {
  // Tue 27 Oct 2026 at 2am is still Monday's habit day
  assert.strictEqual(weekday(new Date(2026, 9, 27, 2, 0)), 1);
});

test('isDue handles every day and chosen days', () => {
  const mon = new Date(2026, 9, 26, 12);
  assert.strictEqual(isDue({ days: null }, mon), true);
  assert.strictEqual(isDue({ days: [1, 3, 5] }, mon), true);
  assert.strictEqual(isDue({ days: [2] }, mon), false);
});

test('validateHabit cleans input and rejects bad input', () => {
  assert.deepStrictEqual(validateHabit({ name: '  Read  ', category: 'study', days: [3, 1, 1] }).value,
    { name: 'Read', category: 'study', days: [1, 3] });
  assert.strictEqual(validateHabit({ name: 'x', category: 'study', days: [0, 1, 2, 3, 4, 5, 6] }).value.days, null);
  assert.strictEqual(validateHabit({ name: '', category: 'study' }).ok, false);
  assert.strictEqual(validateHabit({ name: 'x', category: 'nap' }).ok, false);
  assert.strictEqual(validateHabit({ name: 'x', category: 'mind', days: [] }).ok, false);
});
