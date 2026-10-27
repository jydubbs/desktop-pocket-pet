// Pure habit logic. No Electron here, so it can be unit tested with plain Node.

const RESET_HOUR = 4; // a new habit day starts at 4am
const CATEGORIES = ['study', 'fitness', 'mind', 'health'];

const pad = (n) => String(n).padStart(2, '0');

// The calendar date your "habit day" belongs to. Before 4am counts as yesterday.
function habitDate(date = new Date(), resetHour = RESET_HOUR) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (date.getHours() < resetHour) d.setDate(d.getDate() - 1);
  return d;
}

function dayKey(date = new Date(), resetHour = RESET_HOUR) {
  const d = habitDate(date, resetHour);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 0 = Sunday ... 6 = Saturday
function weekday(date = new Date(), resetHour = RESET_HOUR) {
  return habitDate(date, resetHour).getDay();
}

// days === null means every day; otherwise an array of weekday numbers.
function isDue(habit, date = new Date(), resetHour = RESET_HOUR) {
  if (!Array.isArray(habit.days)) return true;
  return habit.days.includes(weekday(date, resetHour));
}

function validateHabit(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Missing habit details.' };
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) return { ok: false, error: 'Give the habit a name.' };
  if (name.length > 60) return { ok: false, error: 'Keep the name under 60 characters.' };
  if (!CATEGORIES.includes(input.category)) return { ok: false, error: 'Pick a category.' };
  let days = null;
  if (input.days !== null && input.days !== undefined) {
    if (!Array.isArray(input.days)) return { ok: false, error: 'Days must be a list.' };
    days = [...new Set(input.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (days.length === 0) return { ok: false, error: 'Pick at least one day.' };
    if (days.length === 7) days = null; // all seven days is just "every day"
  }
  return { ok: true, value: { name, category: input.category, days } };
}

module.exports = { RESET_HOUR, CATEGORIES, habitDate, dayKey, weekday, isDue, validateHabit };
