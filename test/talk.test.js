const test = require('node:test');
const assert = require('node:assert');
const { greetingTitle, pickLine, shouldGreet, openNudgeSlot, nudgeText } = require('../src/talk');

const at = (h, m = 0) => new Date(2026, 9, 26, h, m);

test('greeting follows the time of day', () => {
  assert.strictEqual(greetingTitle('Sam', at(8)), 'Good morning, Sam!');
  assert.strictEqual(greetingTitle('Sam', at(13)), 'Good afternoon, Sam!');
  assert.strictEqual(greetingTitle('Sam', at(18)), 'Good evening, Sam!');
  assert.strictEqual(greetingTitle('Sam', at(1)), 'Still up, Sam?');
  assert.strictEqual(greetingTitle('', at(8)), 'Good morning!');
});

test('pickLine never repeats the previous line', () => {
  const lines = ['a', 'b', 'c'];
  for (const r of [0, 0.4, 0.99]) {
    for (const last of [0, 1, 2]) assert.notStrictEqual(pickLine(last, () => r, lines).index, last);
  }
  assert.strictEqual(pickLine(-1, () => 0, lines).text, 'a');
});

test('greets again only after an hour away', () => {
  assert.strictEqual(shouldGreet(null, at(9)), true);
  assert.strictEqual(shouldGreet(at(9).toISOString(), at(9, 30)), false);
  assert.strictEqual(shouldGreet(at(9).toISOString(), at(10, 0)), true);
});

test('nudge slots open once each', () => {
  assert.strictEqual(openNudgeSlot(at(11)), null);
  assert.strictEqual(openNudgeSlot(at(12, 30)), 'midday');
  assert.strictEqual(openNudgeSlot(at(14), ['midday']), null);
  assert.strictEqual(openNudgeSlot(at(18)), null);
  assert.strictEqual(openNudgeSlot(at(21)), 'evening');
  assert.strictEqual(openNudgeSlot(at(23, 45)), null);
});

test('nudge text mentions what is left', () => {
  const t = nudgeText('evening', [{ name: 'Read one page' }], () => 0);
  assert.match(t, /1 tiny thing left/);
  assert.match(nudgeText('midday', [{ name: 'Stretch' }, { name: 'Read' }], () => 0.5), /Stretch|Read|2 tiny things/);
});
