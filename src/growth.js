// How the pet grows and feels. Pure functions, testable without Electron.
const { isDue } = require('./logic');

// Roughly: hatch after one good day, teen after ~5 days, adult after ~2 weeks.
const STAGES = [
  { id: 'egg', at: 0, label: 'Egg' },
  { id: 'baby', at: 100, label: 'Baby' },
  { id: 'teen', at: 500, label: 'Teen' },
  { id: 'adult', at: 1200, label: 'Adult' },
];
const DAY_BASE = 80; // shared across the habits due that day
const DAY_BONUS = 20; // for finishing everything due

// XP for one day. Same total whether you have 3 habits or 10.
function dayXP(done, due) {
  if (due <= 0) return 0;
  const d = Math.min(done, due);
  return Math.round((DAY_BASE * d) / due) + (d >= due ? DAY_BONUS : 0);
}

function totalXP(xpByDay = {}) {
  return Object.values(xpByDay).reduce((a, b) => a + (Number(b) || 0), 0);
}

function stageFor(xp) {
  let i = 0;
  while (i + 1 < STAGES.length && xp >= STAGES[i + 1].at) i += 1;
  const s = STAGES[i];
  const next = STAGES[i + 1] || null;
  return {
    id: s.id,
    label: s.label,
    index: i,
    at: s.at,
    nextAt: next ? next.at : null,
    nextLabel: next ? next.label : null,
    progress: next ? (xp - s.at) / (next.at - s.at) : 1,
  };
}

const keyToDate = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids the 4am boundary
};
const dateToKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

// Count recent days (before today) that had habits due but nothing ticked.
// Days with nothing scheduled are skipped; stops at the first active day or the pet's birthday.
function missedDays(habits, xpByDay, todayKey, bornKey, maxLook = 7) {
  let missed = 0;
  const day = keyToDate(todayKey);
  for (let i = 0; i < maxLook; i += 1) {
    day.setDate(day.getDate() - 1);
    const k = dateToKey(day);
    if (bornKey && k < bornKey) break;
    const due = habits.filter((h) => isDue(h, day)).length;
    if (due === 0) continue;
    if ((xpByDay[k] || 0) > 0) break;
    missed += 1;
  }
  return missed;
}

function moodFor(todayXP, missed) {
  if (todayXP > 0) return 'happy';
  if (missed >= 3) return 'droopy';
  if (missed >= 1) return 'sleepy';
  return 'content';
}

const SPECIES_LABEL = { redpanda: 'red panda', otter: 'sea otter' };
const speciesLabel = (sp) => SPECIES_LABEL[sp] || sp;

const SPECIES_HELLO = {
  redpanda: "I hatched! I'm a red panda!",
  quokka: "I hatched! I'm a quokka! :D",
  otter: "I hatched! I'm a sea otter!",
  panda: "I hatched! I'm a panda!",
  raccoon: "I hatched! I'm a raccoon!",
  ferret: "I hatched! I'm a ferret!",
  bear: "I hatched! I'm a bear! Rawr!",
  lamb: "I hatched! I'm a lamb! Baa!",
  phoenix: "I hatched in a burst of flame! I'm a PHOENIX!",
  pegasus: "I hatched! I'm a pegasus! Look, wings!",
  blob: 'I hatched!',
  bunny: "I hatched! I'm a bunny!",
  cat: "I hatched! I'm a kitty! Mew!",
  frog: "I hatched! I'm a frog! Ribbit!",
  capybara: "I hatched! I'm a capybara!",
  dragon: "I hatched! I'm a DRAGON!",
};

function stageUpMessage(stageId, name = '', species = 'blob') {
  return {
    baby: { title: SPECIES_HELLO[species] || SPECIES_HELLO.blob, body: name ? `Hi! Thank you for keeping me warm.` : 'Hi! Will you give me a name? Click me, then tap "Name me".' },
    teen: { title: name ? `Teen ${name}, reporting for duty!` : "I'm a teen now!", body: 'All those tiny habits are paying off.' },
    adult: { title: name ? `Adult ${name} has arrived!` : "I'm all grown up!", body: "Look what we did together. I'll graduate to the café whenever you're ready." },
  }[stageId] || null;
}

// "Baby Yumi", "Baby Shiny Yumi", or "Baby blob" before it has a name.
function displayName(stageId, name = '', species = 'blob', shiny = false) {
  const label = (STAGES.find((s) => s.id === stageId) || STAGES[0]).label;
  if (stageId === 'egg') return name ? `${name}'s egg` : 'Egg';
  return `${label} ${shiny ? 'Shiny ' : ''}${name || speciesLabel(species)}`;
}

// A graduate's name as shown everywhere: "Shiny Yumi" for shinies.
const shinyName = (pet) => `${pet && pet.shiny ? 'Shiny ' : ''}${(pet && pet.name) || ''}`;

module.exports = { STAGES, DAY_BASE, DAY_BONUS, dayXP, totalXP, stageFor, missedDays, moodFor, stageUpMessage, displayName, speciesLabel, shinyName };
