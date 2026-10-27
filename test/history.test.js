const test = require('node:test');
const assert = require('node:assert');
const { dayStats, monthGrid, habitStreaks, summary, milestones } = require('../src/history');

const old = '2026-09-01T10:00:00';
const daily = { id: 'd', category: 'health', days: null, createdAt: old };
const mwf = { id: 'm', category: 'fitness', days: [1, 3, 5], createdAt: old }; // Mon, Wed, Fri

test('day stats count only habits due that day', () => {
  const log = { '2026-10-26': ['d', 'm'], '2026-10-27': ['d'] }; // Mon, Tue
  assert.deepStrictEqual(dayStats(log, [daily, mwf], '2026-10-26'), { key: '2026-10-26', due: 2, done: 2, ratio: 1 });
  assert.strictEqual(dayStats(log, [daily, mwf], '2026-10-27').ratio, 1); // squats not due on Tuesday
  assert.strictEqual(dayStats(log, [daily, mwf], '2026-10-28').ratio, 0);
  // a habit created later doesn't count before it existed
  const late = { id: 'l', days: null, createdAt: '2026-10-27T09:00:00' };
  assert.strictEqual(dayStats(log, [daily, late], '2026-10-26').due, 1);
});

test('month grid starts on Monday and marks the future', () => {
  const cells = monthGrid({}, [daily], 2026, 9, '2026-10-26'); // October 2026 starts on a Thursday
  assert.strictEqual(cells.slice(0, 3).every((c) => c === null), true);
  assert.strictEqual(cells[3].day, 1);
  assert.strictEqual(cells.length % 7, 0);
  assert.strictEqual(cells.find((c) => c && c.day === 26).today, true);
  assert.strictEqual(cells.find((c) => c && c.day === 27).future, true);
});

test('streaks skip unscheduled days and forgive an unticked today', () => {
  // Mon 19, Wed 21, Fri 23 done; Mon 26 is today and not yet ticked
  const log = { '2026-10-19': ['m'], '2026-10-21': ['m'], '2026-10-23': ['m'] };
  const s = habitStreaks(mwf, log, '2026-10-26');
  assert.strictEqual(s.current, 3);
  assert.strictEqual(s.best, 3);
  assert.strictEqual(s.recent.length, 14);
  assert.strictEqual(s.recent[13].state, 'today');
  assert.strictEqual(s.recent[12].state, 'off'); // Sunday
  // a missed Wednesday breaks it
  const broken = habitStreaks(mwf, { '2026-10-19': ['m'], '2026-10-23': ['m'] }, '2026-10-26');
  assert.strictEqual(broken.current, 1);
});

test('best streak remembers the longest run', () => {
  const log = {};
  for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-06', '2026-10-07']) log[d] = ['d'];
  const s = habitStreaks(daily, log, '2026-10-07');
  assert.strictEqual(s.best, 4);
  assert.strictEqual(s.current, 2);
});

test('summary counts ticks, perfect days and days in a row', () => {
  const log = { '2026-10-24': ['d'], '2026-10-25': ['d'], '2026-10-26': ['d', 'm'] };
  const s = summary(log, [daily, mwf], '2026-10-26');
  assert.strictEqual(s.totalTicks, 4);
  assert.strictEqual(s.perfectDays, 3); // squats aren't due on Sat or Sun
  assert.strictEqual(s.activeStreak, 3);
  assert.strictEqual(s.firstDay, '2026-10-24');
});

test('milestones come from cumulative XP', () => {
  const m = milestones('2026-10-01', { '2026-10-01': 60, '2026-10-02': 100, '2026-10-06': 400, '2026-10-14': 700 });
  assert.deepStrictEqual(m, { laid: '2026-10-01', hatched: '2026-10-02', teen: '2026-10-06', adult: '2026-10-14' });
});
