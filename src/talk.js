// What the pet says and when. Pure functions, so they can be tested without Electron.
const LINES = require('./lines');

const GREET_GAP_MIN = 60; // greet again after the laptop has been away at least this long
const NUDGE_SLOTS = [
  { id: 'midday', from: 12 * 60 + 30, to: 17 * 60 }, // 12:30 to 5pm
  { id: 'evening', from: 19 * 60, to: 23 * 60 + 30 }, // 7pm to 11:30pm
];

function partOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function greetingTitle(name, date = new Date()) {
  const part = partOfDay(date);
  if (part === 'night') return name ? `Still up, ${name}?` : 'Still up?';
  const hello = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }[part];
  return name ? `${hello}, ${name}!` : `${hello}!`;
}

// Random line, never the same as last time.
function pickLine(lastIndex = -1, rand = Math.random, lines = LINES) {
  if (lines.length <= 1) return { index: 0, text: lines[0] || '' };
  let i = Math.floor(rand() * (lines.length - 1));
  if (i >= lastIndex && lastIndex >= 0) i += 1;
  return { index: i, text: lines[i] };
}

function shouldGreet(lastGreetingAt, now = new Date(), gapMin = GREET_GAP_MIN) {
  if (!lastGreetingAt) return true;
  return now.getTime() - new Date(lastGreetingAt).getTime() >= gapMin * 60 * 1000;
}

// Which nudge slot (if any) is open right now and hasn't been used today.
function openNudgeSlot(now = new Date(), usedToday = []) {
  const m = now.getHours() * 60 + now.getMinutes();
  const slot = NUDGE_SLOTS.find((s) => m >= s.from && m < s.to);
  if (!slot || usedToday.includes(slot.id)) return null;
  return slot.id;
}

function nudgeText(slotId, remaining, rand = Math.random) {
  const n = remaining.length;
  const one = remaining[Math.floor(rand() * n)];
  const things = n === 1 ? '1 tiny thing' : `${n} tiny things`;
  const options = slotId === 'midday'
    ? [
        `${things} left today. Pick the easiest one?`,
        `Halfway through the day! "${one.name}" only takes a minute.`,
        `Psst… ${things} to go. I'm hungry!`,
      ]
    : [
        `Evening check-in: ${things} left. Even one counts.`,
        `Before you wind down, how about "${one.name}"?`,
        `${things} left. A quick one before bed?`,
      ];
  return options[Math.floor(rand() * options.length)];
}

module.exports = {
  GREET_GAP_MIN, NUDGE_SLOTS, partOfDay, greetingTitle, pickLine, shouldGreet, openNudgeSlot, nudgeText,
};
