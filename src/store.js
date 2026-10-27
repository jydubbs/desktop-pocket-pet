// Saves everything to one JSON file on your Mac.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dayKey, isDue, validateHabit, CATEGORIES } = require('./logic');
const growth = require('./growth');
const looks = require('./looks');
const history = require('./history');
const { HANGOUTS } = require('./hangouts');

// A starter pack for mental and physical health. Each one takes two minutes or less.
// Days: null = every day; otherwise 0 = Sunday ... 6 = Saturday.
const STARTER_HABITS = [
  { name: 'Drink a glass of water', category: 'health', days: null },
  { name: 'Get 2 minutes of daylight outside', category: 'health', days: null },
  { name: 'Phone away 30 min before bed', category: 'health', days: null },
  { name: '5 slow breaths, long exhale', category: 'mind', days: null },
  { name: 'Write down one good thing', category: 'mind', days: null },
  { name: 'Message someone you care about', category: 'mind', days: [2, 5] },
  { name: 'Move for 2 minutes', category: 'fitness', days: null },
  { name: '1-minute stretch', category: 'fitness', days: null },
  { name: 'Read one page', category: 'study', days: null },
  { name: 'Practise a new skill for 5 min', category: 'study', days: [1, 3, 5] },
];

function freshData() {
  const now = new Date().toISOString();
  return {
    version: 1,
    habits: STARTER_HABITS.map((h) => ({ id: crypto.randomUUID(), createdAt: now, ...h })),
    log: {}, // { "2026-10-26": [habitId, ...] }
    petPosition: null,
    loginItemSet: false,
    ...talkDefaults(),
    pet: newPet(new Date(), { species: pick(SPECIES) }),
    garden: [],
    visitors: [],
    hangout: 'cafe',
    artStyle: 'pixel',
  };
}

// Fields added in Slice 2. Older save files get them filled in on load.
function talkDefaults() {
  return {
    name: '', // asked for on first run
    talk: { lastGreetingAt: null, lastLine: -1, nudgeDay: null, nudgesUsed: [] },
  };
}

// Slice 3: the pet you're raising right now.
const PET_COLORS = ['natural', 'pink', 'peach', 'mint', 'sky', 'lavender', 'lemon', 'cloud', 'cocoa'];
const SPECIES = ['blob', 'bunny', 'cat', 'frog', 'capybara', 'dragon', 'redpanda', 'quokka', 'otter', 'panda', 'raccoon', 'ferret', 'bear', 'lamb', 'phoenix', 'pegasus'];
const MAX_VISITORS = 2;
const SHINY_CHANCE = 0.25; // 1 in 4 eggs hatch shiny

function newPet(now = new Date(), opts = {}) {
  return {
    species: opts.species || 'blob',
    speciesChosen: Boolean(opts.speciesChosen), // false = a surprise until it hatches
    shiny: false, // decided once, the moment it hatches
    shinyRolled: false,
    name: '',
    color: opts.color || 'natural', // each species' real-life colouring
    bornDay: dayKey(now),
    xpByDay: {},
    // XP already earned today before this egg arrived doesn't count for it
    baseline: opts.baseline || null,
    look: { main: null, accent: null, decidedDay: null },
  };
}

const pick = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

const ART_STYLES = ['pixel', 'soft'];

function upgrade(d) {
  const defaults = talkDefaults();
  if (typeof d.name !== 'string') d.name = defaults.name;
  d.talk = { ...defaults.talk, ...(d.talk || {}) };
  if (!d.pet || typeof d.pet.xpByDay !== 'object') d.pet = newPet();
  if (!d.pet.look) d.pet.look = { main: null, accent: null, decidedDay: null };
  if (typeof d.pet.name !== 'string') d.pet.name = '';
  if (!PET_COLORS.includes(d.pet.color)) d.pet.color = 'pink';
  if (!SPECIES.includes(d.pet.species)) d.pet.species = 'blob';
  if (typeof d.pet.shinyRolled !== 'boolean') {
    // Pets that hatched before shinies existed stay as they are.
    d.pet.shinyRolled = growth.stageFor(growth.totalXP(d.pet.xpByDay)).id !== 'egg';
    d.pet.shiny = false;
  }
  if (!Array.isArray(d.garden)) d.garden = [];
  if (!Array.isArray(d.visitors)) d.visitors = [];
  if (!HANGOUTS[d.hangout]) d.hangout = 'cafe';
  if (!ART_STYLES.includes(d.artStyle)) d.artStyle = 'pixel'; // pixel is the default look, for new and existing pets
  return d;
}

class Store {
  constructor(file, rand = Math.random) {
    this.file = file;
    this.rand = rand;
    this.data = this.load();
  }

  load() {
    let raw;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        const d = freshData();
        this.data = d;
        this.save();
        return d;
      }
      throw e;
    }
    try {
      const d = JSON.parse(raw);
      if (!Array.isArray(d.habits) || typeof d.log !== 'object') throw new Error('bad shape');
      return upgrade(d);
    } catch {
      // Keep the damaged file instead of losing it, then start fresh.
      fs.renameSync(this.file, this.file.replace(/\.json$/, `.damaged-${Date.now()}.json`));
      const d = freshData();
      this.data = d;
      this.save();
      return d;
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  snapshot(now = new Date()) {
    const today = dayKey(now);
    const done = new Set(this.data.log[today] || []);
    return {
      today,
      categories: CATEGORIES,
      habits: this.data.habits.map((h) => ({ ...h, due: isDue(h, now), done: done.has(h.id) })),
      pet: this.petStatus(now),
      userName: this.data.name || '',
      artStyle: this.data.artStyle,
    };
  }

  // Recalculate today's XP from what's due and ticked. Past days never change.
  refreshToday(now = new Date()) {
    const today = dayKey(now);
    const doneIds = new Set(this.data.log[today] || []);
    const due = this.data.habits.filter((h) => isDue(h, now));
    const pet = this.data.pet;
    let xp = growth.dayXP(due.filter((h) => doneIds.has(h.id)).length, due.length);
    if (pet.baseline && pet.baseline.day === today) xp = Math.max(0, xp - pet.baseline.xp);
    if ((pet.xpByDay[today] || 0) !== xp || !(today in pet.xpByDay)) {
      if (xp === 0) delete pet.xpByDay[today];
      else pet.xpByDay[today] = xp;
      this.save();
    }
  }

  petStatus(now = new Date()) {
    const pet = this.data.pet;
    const today = dayKey(now);
    const xp = growth.totalXP(pet.xpByDay);
    const todayXP = pet.xpByDay[today] || 0;
    const missed = growth.missedDays(this.data.habits, pet.xpByDay, today, pet.bornDay);
    const look = pet.look || {};
    return {
      species: pet.species, speciesChosen: Boolean(pet.speciesChosen), shiny: Boolean(pet.shiny), name: pet.name, color: pet.color, displayName: growth.displayName(growth.stageFor(xp).id, pet.name, pet.species, pet.shiny), xp, todayXP, stage: growth.stageFor(xp), mood: growth.moodFor(todayXP, missed), missed,
      look: { main: look.main, accent: look.accent, nextCheck: looks.nextRecheckKey(look) },
    };
  }

  // Every 2 days (or straight away with no look yet), pick the outfit from the last week of ticks.
  // Returns the new main look if it changed, so the pet can announce it.
  updateLook(now = new Date()) {
    const today = dayKey(now);
    const prev = this.data.pet.look || {};
    if (!looks.isRecheckDue(prev, today)) return null;
    const counts = looks.categoryCounts(this.data.log, this.data.habits, today);
    const next = looks.pickLook(counts, prev.main);
    const decidedDay = next.main ? today : null;
    if (next.main === prev.main && next.accent === prev.accent && decidedDay === prev.decidedDay) return null;
    this.data.pet.look = { ...next, decidedDay };
    this.save();
    return next.main && next.main !== prev.main ? next.main : null;
  }

  addHabit(input) {
    const v = validateHabit(input);
    if (!v.ok) return v;
    const habit = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...v.value };
    this.data.habits.push(habit);
    this.save();
    this.refreshToday();
    return { ok: true, value: habit };
  }

  updateHabit(id, input) {
    const h = this.data.habits.find((x) => x.id === id);
    if (!h) return { ok: false, error: 'That habit no longer exists.' };
    const v = validateHabit(input);
    if (!v.ok) return v;
    Object.assign(h, v.value);
    this.save();
    this.refreshToday();
    return { ok: true, value: h };
  }

  deleteHabit(id) {
    const before = this.data.habits.length;
    this.data.habits = this.data.habits.filter((x) => x.id !== id);
    if (this.data.habits.length === before) return { ok: false, error: 'That habit no longer exists.' };
    this.save(); // past ticks stay in the log so history (slice 7) is not lost
    this.refreshToday();
    return { ok: true };
  }

  toggleHabit(id, now = new Date()) {
    if (!this.data.habits.some((x) => x.id === id)) return { ok: false, error: 'That habit no longer exists.' };
    const key = dayKey(now);
    const list = new Set(this.data.log[key] || []);
    list.has(id) ? list.delete(id) : list.add(id);
    this.data.log[key] = [...list];
    this.save();
    const before = growth.stageFor(growth.totalXP(this.data.pet.xpByDay));
    this.refreshToday(now);
    const after = growth.stageFor(growth.totalXP(this.data.pet.xpByDay));
    const habit = this.data.habits.find((x) => x.id === id);
    const newLook = this.updateLook(now);
    const shiny = this.rollShiny(now);
    return {
      shiny,
      ok: true, value: list.has(id), category: habit.category,
      stageUp: after.index > before.index ? after.id : null,
      newLook: after.id === 'egg' ? null : newLook,
    };
  }

  // How every pet is drawn: chunky pixel art (default) or the soft, smooth look.
  setArtStyle(style) {
    if (!ART_STYLES.includes(style)) return { ok: false, error: 'Unknown style.' };
    this.data.artStyle = style;
    this.save();
    return { ok: true, value: style };
  }

  // What the pet calls you in greetings.
  setUserName(name) {
    const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!clean) return { ok: false, error: 'Type the name you want it to call you.' };
    if (clean.length > 24) return { ok: false, error: 'Keep it to 24 characters or fewer.' };
    this.data.name = clean;
    this.save();
    return { ok: true, value: clean };
  }

  renamePet(name) {
    const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (clean.length > 16) return { ok: false, error: 'Keep the name to 16 characters or fewer.' };
    this.data.pet.name = clean;
    this.save();
    return { ok: true, value: clean };
  }

  // The moment an egg hatches, it has a 1 in 4 chance of being shiny. Decided once, kept forever.
  // Returns true only when this call just made it shiny, so the app can celebrate.
  rollShiny(now = new Date()) {
    const pet = this.data.pet;
    if (pet.shinyRolled) return false;
    if (growth.stageFor(growth.totalXP(pet.xpByDay)).id === 'egg') return false;
    pet.shinyRolled = true;
    pet.shiny = this.rand() < SHINY_CHANCE;
    if (pet.shiny) pet.shinyDay = dayKey(now);
    this.save();
    return pet.shiny;
  }

  // Pick the species yourself, or 'random' for a surprise (always different from the current one).
  changeSpecies(species, rand = Math.random) {
    let sp = species;
    if (sp === 'random') sp = pick(SPECIES.filter((s) => s !== this.data.pet.species), rand);
    if (!SPECIES.includes(sp)) return { ok: false, error: 'Pick one of the creatures shown.' };
    this.data.pet.species = sp;
    this.data.pet.speciesChosen = true;
    this.save();
    return { ok: true, value: sp };
  }

  recolorPet(color) {
    if (this.data.pet.shiny) return { ok: false, error: 'Shiny pets are always gold.' };
    if (!PET_COLORS.includes(color)) return { ok: false, error: 'Pick one of the colours shown.' };
    this.data.pet.color = color;
    this.save();
    return { ok: true, value: color };
  }

  // What this pet was raised on: ticks per category between its birthday and today.
  petStats(now = new Date()) {
    const pet = this.data.pet;
    const today = dayKey(now);
    const catOf = new Map(this.data.habits.map((h) => [h.id, h.category]));
    const ticks = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const [day, ids] of Object.entries(this.data.log)) {
      if (day < pet.bornDay || day > today) continue;
      for (const id of ids) if (catOf.has(id)) ticks[catOf.get(id)] += 1;
    }
    const totalTicks = Object.values(ticks).reduce((a, b) => a + b, 0);
    const activeDays = Object.values(pet.xpByDay).filter((x) => x > 0).length;
    const days = looks.daysBetween(pet.bornDay, today) + 1;
    return { ticks, totalTicks, activeDays, days };
  }

  // The ceremony: freeze this adult into the garden and start a new egg.
  graduate(name, now = new Date(), rand = Math.random) {
    const status = this.petStatus(now);
    if (status.stage.id !== 'adult') return { ok: false, error: 'Only adults can graduate.' };
    const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!clean) return { ok: false, error: 'Give your pet a name before it graduates.' };
    if (clean.length > 16) return { ok: false, error: 'Keep the name to 16 characters or fewer.' };
    const pet = this.data.pet;
    const today = dayKey(now);
    const graduate = {
      id: crypto.randomUUID(),
      name: clean,
      species: pet.species,
      color: pet.color,
      shiny: Boolean(pet.shiny),
      shinyDay: pet.shinyDay || null,
      look: { main: pet.look.main, accent: pet.look.accent },
      bornDay: pet.bornDay,
      graduatedDay: today,
      xp: status.xp,
      stats: this.petStats(now),
      milestones: { ...history.milestones(pet.bornDay, pet.xpByDay), graduated: today },
    };
    this.data.garden.push(graduate);
    this.data.pet = newPet(now, {
      species: pick(SPECIES, rand),
      color: 'natural',
      baseline: { day: today, xp: pet.xpByDay[today] || 0 },
    });
    this.save();
    return { ok: true, value: graduate };
  }

  // Everything the History window shows.
  historyInfo(now = new Date()) {
    const today = dayKey(now);
    const { log, habits, pet, garden } = this.data;
    const status = this.petStatus(now);
    return {
      today,
      summary: history.summary(log, habits, today),
      streaks: habits.map((h) => ({ id: h.id, name: h.name, category: h.category, days: h.days, ...history.habitStreaks(h, log, today) })),
      current: {
        name: pet.name, species: pet.species, color: pet.color, shiny: Boolean(pet.shiny), shinyDay: pet.shinyDay || null, look: { main: pet.look.main, accent: pet.look.accent },
        stage: status.stage, displayName: status.displayName, xp: status.xp,
        milestones: history.milestones(pet.bornDay, pet.xpByDay), stats: this.petStats(now),
      },
      hangout: HANGOUTS[this.data.hangout] || HANGOUTS.cafe,
      graduates: garden.map((g) => ({ ...g, milestones: g.milestones || { laid: g.bornDay, graduated: g.graduatedDay } })),
    };
  }

  historyMonth(year, month, now = new Date()) {
    return history.monthGrid(this.data.log, this.data.habits, year, month, dayKey(now));
  }

  // Add any starter habits you don't already have (matched by name, so nothing is duplicated).
  addStarterPack() {
    const have = new Set(this.data.habits.map((h) => h.name.trim().toLowerCase()));
    const now = new Date().toISOString();
    const added = STARTER_HABITS.filter((h) => !have.has(h.name.toLowerCase()))
      .map((h) => ({ id: crypto.randomUUID(), createdAt: now, ...h, days: h.days ? [...h.days] : null }));
    if (added.length) {
      this.data.habits.push(...added);
      this.save();
      this.refreshToday();
    }
    return { ok: true, value: added.length };
  }

  setHangout(id) {
    if (!HANGOUTS[id]) return { ok: false, error: 'Pick one of the hangouts shown.' };
    this.data.hangout = id;
    this.save();
    return { ok: true, value: id };
  }

  // Up to two graduates can come out onto the desktop.
  setVisitor(id, on) {
    if (!this.data.garden.some((g) => g.id === id)) return { ok: false, error: 'That pet is not in the garden.' };
    const set = this.data.visitors.filter((v) => v !== id && this.data.garden.some((g) => g.id === v));
    if (on) {
      if (set.length >= MAX_VISITORS) return { ok: false, error: `Only ${MAX_VISITORS} pets can visit at once. Send one home first.` };
      set.push(id);
    }
    this.data.visitors = set;
    this.save();
    return { ok: true, value: set };
  }

  updateTalk(patch) {
    this.data.talk = { ...this.data.talk, ...patch };
    this.save();
  }

  nudgesUsedToday(now = new Date()) {
    const t = this.data.talk;
    return t.nudgeDay === dayKey(now) ? t.nudgesUsed : [];
  }

  markNudge(slotId, now = new Date()) {
    const used = this.nudgesUsedToday(now);
    this.updateTalk({ nudgeDay: dayKey(now), nudgesUsed: [...new Set([...used, slotId])] });
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

module.exports = { Store, STARTER_HABITS, PET_COLORS, MAX_VISITORS, SPECIES, SHINY_CHANCE };
