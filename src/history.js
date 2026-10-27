// History: per-day completion, streaks and pet milestones. Pure functions, testable without Electron.
const { isDue } = require('./logic');
const growth = require('./growth');

const keyToDate = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // noon, so the 4am boundary never matters
};
const dateToKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const addDays = (k, n) => {
  const d = keyToDate(k);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
};
// The habit day a habit was created on (habits don't count as "due" before they existed).
const createdKey = (h) => (h.createdAt ? dateToKey(new Date(h.createdAt)) : '0000-00-00');

// How much of one day's list was done.
function dayStats(log, habits, key) {
  const date = keyToDate(key);
  const dueHabits = habits.filter((h) => createdKey(h) <= key && isDue(h, date));
  const ticked = new Set(log[key] || []);
  const done = dueHabits.filter((h) => ticked.has(h.id)).length;
  // Ticks on habits that were later deleted still count as activity.
  const extra = [...ticked].filter((id) => !habits.some((h) => h.id === id)).length;
  const due = dueHabits.length;
  const ratio = due ? Math.min(1, (done + extra) / due) : (ticked.size ? 1 : 0);
  return { key, due, done: done + extra, ratio };
}

// A month grid: weeks starting on Monday. Days outside the month are null; future days are marked.
function monthGrid(log, habits, year, month, todayKey) {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) {
    const key = dateToKey(new Date(year, month, d, 12));
    if (key > todayKey) cells.push({ key, day: d, future: true });
    else cells.push({ ...dayStats(log, habits, key), day: d, today: key === todayKey });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

// Streaks for one habit. Days it isn't scheduled are skipped, not broken.
// Today only counts once ticked, so an unticked morning doesn't look like a broken streak.
function habitStreaks(habit, log, todayKey) {
  const start = createdKey(habit);
  const doneOn = (k) => (log[k] || []).includes(habit.id);
  let current = 0;
  let k = todayKey;
  if (!doneOn(k)) k = addDays(k, -1);
  for (let guard = 0; guard < 3660 && k >= start; guard += 1, k = addDays(k, -1)) {
    if (!isDue(habit, keyToDate(k))) continue;
    if (doneOn(k)) current += 1;
    else break;
  }
  let best = 0;
  let run = 0;
  for (let d = start, guard = 0; d <= todayKey && guard < 3660; d = addDays(d, 1), guard += 1) {
    if (!isDue(habit, keyToDate(d))) continue;
    if (doneOn(d)) {
      run += 1;
      best = Math.max(best, run);
    } else if (d !== todayKey) {
      run = 0;
    }
  }
  // The last 14 days, oldest first: 'done', 'missed', 'off' (not scheduled) or 'today'.
  const recent = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = addDays(todayKey, -i);
    let state;
    if (d < start) state = 'none';
    else if (!isDue(habit, keyToDate(d))) state = 'off';
    else if (doneOn(d)) state = 'done';
    else state = d === todayKey ? 'today' : 'missed';
    recent.push({ key: d, state });
  }
  return { current, best: Math.max(best, current), recent };
}

// Overall totals: ticks, perfect days, and days in a row with at least one tick.
function summary(log, habits, todayKey) {
  const keys = Object.keys(log).filter((k) => k <= todayKey && (log[k] || []).length);
  const totalTicks = keys.reduce((n, k) => n + log[k].length, 0);
  const perfectDays = keys.filter((k) => {
    const s = dayStats(log, habits, k);
    return s.due > 0 && s.ratio >= 1;
  }).length;
  let activeStreak = 0;
  let k = (log[todayKey] || []).length ? todayKey : addDays(todayKey, -1);
  while ((log[k] || []).length && activeStreak < 3660) {
    activeStreak += 1;
    k = addDays(k, -1);
  }
  const first = keys.sort()[0] || null;
  return { totalTicks, perfectDays, activeStreak, firstDay: first };
}

// When a pet reached each stage, from its daily XP.
function milestones(bornDay, xpByDay) {
  const out = { hatched: null, teen: null, adult: null };
  let xp = 0;
  for (const k of Object.keys(xpByDay).sort()) {
    xp += xpByDay[k] || 0;
    const st = growth.stageFor(xp).id;
    if (!out.hatched && st !== 'egg') out.hatched = k;
    if (!out.teen && (st === 'teen' || st === 'adult')) out.teen = k;
    if (!out.adult && st === 'adult') out.adult = k;
  }
  return { laid: bornDay, ...out };
}

module.exports = { dayStats, monthGrid, habitStreaks, summary, milestones, addDays };
