const test = require('node:test');
const assert = require('node:assert');
const { categoryCounts, pickLook, isRecheckDue, nextRecheckKey, daysBetween } = require('../src/looks');

const habits = [
  { id: 's', category: 'study' },
  { id: 'f', category: 'fitness' },
  { id: 'm', category: 'mind' },
  { id: 'h', category: 'health' },
];

test('counts ticks per category over the last 7 days only', () => {
  const log = {
    '2026-10-26': ['s', 'f'],
    '2026-10-22': ['s', 'gone'], // a deleted habit is ignored
    '2026-10-20': ['f'], // 7th day back, still inside
    '2026-10-19': ['f', 'f'], // 8 days back, outside
  };
  assert.deepStrictEqual(categoryCounts(log, habits, '2026-10-26'), { study: 2, fitness: 2, mind: 0, health: 0 });
});

test('top category is main, runner-up is accent', () => {
  assert.deepStrictEqual(pickLook({ study: 1, fitness: 5, mind: 3, health: 0 }), { main: 'fitness', accent: 'mind' });
  assert.deepStrictEqual(pickLook({ study: 0, fitness: 0, mind: 2, health: 0 }), { main: 'mind', accent: null });
  assert.deepStrictEqual(pickLook({ study: 0, fitness: 0, mind: 0, health: 0 }), { main: null, accent: null });
});

test('ties keep the current look so it does not flicker', () => {
  const tie = { study: 3, fitness: 3, mind: 0, health: 0 };
  assert.strictEqual(pickLook(tie).main, 'study');
  assert.strictEqual(pickLook(tie, 'fitness').main, 'fitness');
  assert.strictEqual(pickLook(tie, 'fitness').accent, 'study');
});

test('rechecks every 2 days, or immediately with no look', () => {
  assert.strictEqual(isRecheckDue(null, '2026-10-26'), true);
  assert.strictEqual(isRecheckDue({ main: null, decidedDay: '2026-10-26' }, '2026-10-26'), true);
  const look = { main: 'study', decidedDay: '2026-10-26' };
  assert.strictEqual(isRecheckDue(look, '2026-10-27'), false);
  assert.strictEqual(isRecheckDue(look, '2026-10-28'), true);
  assert.strictEqual(nextRecheckKey(look), '2026-10-28');
  assert.strictEqual(daysBetween('2026-10-31', '2026-11-02'), 2);
});
