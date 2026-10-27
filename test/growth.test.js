const test = require('node:test');
const assert = require('node:assert');
const { dayXP, totalXP, stageFor, missedDays, moodFor } = require('../src/growth');

test('a full day is worth 100 XP whatever the list size', () => {
  assert.strictEqual(dayXP(3, 3), 100);
  assert.strictEqual(dayXP(10, 10), 100);
  assert.strictEqual(dayXP(0, 4), 0);
  assert.strictEqual(dayXP(2, 4), 40);
  assert.strictEqual(dayXP(5, 0), 0);
  assert.strictEqual(dayXP(6, 4), 100); // never more than a full day
});

test('stages unlock at their thresholds', () => {
  assert.strictEqual(stageFor(0).id, 'egg');
  assert.strictEqual(stageFor(99).id, 'egg');
  assert.strictEqual(stageFor(100).id, 'baby');
  assert.strictEqual(stageFor(500).id, 'teen');
  assert.strictEqual(stageFor(1200).id, 'adult');
  assert.strictEqual(stageFor(5000).nextAt, null);
  assert.strictEqual(stageFor(300).progress, 0.5);
});

test('about two weeks of steady habits reaches adult', () => {
  let xp = 0;
  let days = 0;
  while (stageFor(xp).id !== 'adult') {
    // most days: finish everything; one day a week: half done
    xp += days % 7 === 6 ? dayXP(2, 4) : dayXP(4, 4);
    days += 1;
  }
  assert.ok(days >= 12 && days <= 15, `took ${days} days`);
  assert.strictEqual(totalXP({ a: 10, b: 20 }), 30);
});

test('missed days skip days with nothing due', () => {
  const daily = [{ days: null }];
  // Today is Mon 26 Oct; nothing ticked Fri-Sun, Thursday active
  assert.strictEqual(missedDays(daily, { '2026-10-22': 50 }, '2026-10-26', '2026-10-01'), 3);
  assert.strictEqual(missedDays(daily, { '2026-10-25': 50 }, '2026-10-26', '2026-10-01'), 0);
  // Only due on Mondays: the quiet weekend doesn't count
  const mondays = [{ days: [1] }];
  assert.strictEqual(missedDays(mondays, { '2026-10-19': 40 }, '2026-10-26', '2026-10-01'), 0);
  // Born today: nothing to miss yet
  assert.strictEqual(missedDays(daily, {}, '2026-10-26', '2026-10-26'), 0);
});

test('mood follows today and recent quiet days', () => {
  assert.strictEqual(moodFor(20, 5), 'happy');
  assert.strictEqual(moodFor(0, 0), 'content');
  assert.strictEqual(moodFor(0, 1), 'sleepy');
  assert.strictEqual(moodFor(0, 3), 'droopy');
});

test('display names show the stage', () => {
  const { displayName } = require('../src/growth');
  assert.strictEqual(displayName('baby', 'Yumi'), 'Baby Yumi');
  assert.strictEqual(displayName('teen', 'Yumi'), 'Teen Yumi');
  assert.strictEqual(displayName('adult', ''), 'Adult blob');
  assert.strictEqual(displayName('egg', ''), 'Egg');
});
