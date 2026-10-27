// Which outfit the pet wears, based on the habits you've done lately. Pure functions.
const { CATEGORIES } = require('./logic');

const WINDOW_DAYS = 7; // look at the last week of ticks
const RECHECK_DAYS = 2; // decide again every 2 days

const LOOK_NAMES = { study: 'Nerdy', fitness: 'Sporty', mind: 'Zen', health: 'Glowy' };
const LOOK_MESSAGES = {
  study: { title: "I'm feeling extra nerdy!", body: 'All that studying went straight to my glasses.' },
  fitness: { title: "I'm feeling sporty!", body: "Look at my headband. Let's move!" },
  mind: { title: "I'm feeling zen.", body: 'So calm. So centred. Breathe with me.' },
  health: { title: "I'm glowing!", body: 'Water, rest and care. I feel amazing.' },
};

const keyToDate = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const dateToKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

function daysBetween(fromKey, toKey) {
  return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);
}

// Ticks per category over the last `days` habit days, today included.
function categoryCounts(log, habits, todayKey, days = WINDOW_DAYS) {
  const catOf = new Map(habits.map((h) => [h.id, h.category]));
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  const d = keyToDate(todayKey);
  for (let i = 0; i < days; i += 1) {
    for (const id of log[dateToKey(d)] || []) {
      const c = catOf.get(id);
      if (c) counts[c] += 1;
    }
    d.setDate(d.getDate() - 1);
  }
  return counts;
}

// Top category is the main look, runner-up is the accent.
// Ties keep the current look if it's one of them, otherwise follow the category order.
function pickLook(counts, previousMain = null) {
  const ranked = CATEGORIES
    .filter((c) => counts[c] > 0)
    .sort((a, b) => counts[b] - counts[a]
      || (b === previousMain) - (a === previousMain)
      || CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b));
  return { main: ranked[0] || null, accent: ranked[1] || null };
}

// Recheck every 2 days, or straight away if it has no look yet.
function isRecheckDue(look, todayKey) {
  if (!look || !look.decidedDay || !look.main) return true;
  return daysBetween(look.decidedDay, todayKey) >= RECHECK_DAYS;
}

function nextRecheckKey(look) {
  if (!look || !look.decidedDay) return null;
  const d = keyToDate(look.decidedDay);
  d.setDate(d.getDate() + RECHECK_DAYS);
  return dateToKey(d);
}

module.exports = {
  WINDOW_DAYS, RECHECK_DAYS, LOOK_NAMES, LOOK_MESSAGES,
  daysBetween, categoryCounts, pickLook, isRecheckDue, nextRecheckKey,
};
