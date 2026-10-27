const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store, STARTER_HABITS } = require('../src/store');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pet-')), 'data.json');

test('first run seeds starter habits and writes the file', () => {
  const f = tmpFile();
  const s = new Store(f);
  assert.strictEqual(s.data.habits.length, STARTER_HABITS.length);
  assert.ok(fs.existsSync(f));
});

test('add, edit, toggle, delete survive a reload', () => {
  const f = tmpFile();
  const s = new Store(f);
  const add = s.addHabit({ name: 'Stretch', category: 'fitness', days: null });
  assert.ok(add.ok);
  const id = add.value.id;
  assert.ok(s.updateHabit(id, { name: 'Stretch 2 min', category: 'fitness', days: [1] }).ok);
  const mon = new Date(2026, 9, 26, 9);
  assert.strictEqual(s.toggleHabit(id, mon).value, true);

  const again = new Store(f);
  const snap = again.snapshot(mon).habits.find((h) => h.id === id);
  assert.strictEqual(snap.name, 'Stretch 2 min');
  assert.strictEqual(snap.done, true);
  assert.strictEqual(snap.due, true);
  // next day (after 4am) starts fresh
  assert.strictEqual(again.snapshot(new Date(2026, 9, 27, 5)).habits.find((h) => h.id === id).done, false);

  assert.strictEqual(again.toggleHabit(id, mon).value, false);
  assert.ok(again.deleteHabit(id).ok);
  assert.strictEqual(new Store(f).data.habits.some((h) => h.id === id), false);
});

test('a damaged file is kept aside and the app starts fresh', () => {
  const f = tmpFile();
  fs.writeFileSync(f, '{not json');
  const s = new Store(f);
  assert.strictEqual(s.data.habits.length, STARTER_HABITS.length);
  assert.ok(fs.readdirSync(path.dirname(f)).some((n) => n.includes('damaged')));
});

test('older save files gain Slice 2 fields', () => {
  const f = tmpFile();
  fs.writeFileSync(f, JSON.stringify({ version: 1, habits: [], log: {}, petPosition: null }));
  const s = new Store(f);
  assert.strictEqual(s.data.name, '');
  assert.strictEqual(s.data.talk.lastLine, -1);
});

test('nudge slots are remembered per habit day', () => {
  const s = new Store(tmpFile());
  const noon = new Date(2026, 9, 26, 13);
  s.markNudge('midday', noon);
  assert.deepStrictEqual(new Store(s.file).nudgesUsedToday(noon), ['midday']);
  assert.deepStrictEqual(s.nudgesUsedToday(new Date(2026, 9, 27, 13)), []);
});

test('ticking feeds XP and can hatch the egg', () => {
  const s = new Store(tmpFile());
  const mon = new Date(2026, 9, 26, 10);
  s.data.pet.bornDay = '2026-10-26';
  const due = s.snapshot(mon).habits.filter((h) => h.due);
  assert.ok(due.length >= 3);
  let last;
  for (const h of due) last = s.toggleHabit(h.id, mon);
  assert.strictEqual(s.petStatus(mon).xp, 100);
  assert.strictEqual(last.stageUp, 'baby');
  assert.strictEqual(s.petStatus(mon).mood, 'happy');
  // untick one: back under the threshold, today's XP drops
  s.toggleHabit(due[0].id, mon);
  assert.strictEqual(s.petStatus(mon).xp, Math.round((80 * (due.length - 1)) / due.length));
  assert.strictEqual(s.petStatus(mon).stage.id, 'egg');
});

test('older save files get a fresh egg', () => {
  const f = tmpFile();
  fs.writeFileSync(f, JSON.stringify({ version: 1, habits: [], log: {}, petPosition: null, name: 'Sam' }));
  const s = new Store(f);
  assert.strictEqual(s.data.pet.species, 'blob');
  assert.strictEqual(s.petStatus().stage.id, 'egg');
});

test('first ticks give a look; it then waits 2 days to change', () => {
  const s = new Store(tmpFile());
  const byCat = Object.fromEntries(s.data.habits.map((h) => [h.category, h.id]));
  const mon = new Date(2026, 9, 26, 10);
  const r = s.toggleHabit(byCat.study, mon);
  assert.strictEqual(s.data.pet.look.main, 'study');
  assert.strictEqual(r.newLook, null); // still an egg, nothing to announce
  // Tuesday: lots of fitness, but the look holds until Wednesday
  const tue = new Date(2026, 9, 27, 10);
  s.data.log['2026-10-27'] = [byCat.fitness];
  s.data.log['2026-10-25'] = [byCat.fitness];
  assert.strictEqual(s.updateLook(tue), null);
  assert.strictEqual(s.data.pet.look.main, 'study');
  const wed = new Date(2026, 9, 28, 10);
  assert.strictEqual(s.updateLook(wed), 'fitness');
  assert.deepStrictEqual([s.data.pet.look.main, s.data.pet.look.accent], ['fitness', 'study']);
  assert.strictEqual(s.petStatus(wed).look.nextCheck, '2026-10-30');
});

test('naming and colouring the pet', () => {
  const s = new Store(tmpFile());
  assert.strictEqual(s.renamePet('  Yumi  ').value, 'Yumi');
  assert.strictEqual(s.renamePet('A very long pet name indeed').ok, false);
  assert.strictEqual(s.recolorPet('mint').ok, true);
  assert.strictEqual(s.recolorPet('plaid').ok, false);
  const again = new Store(s.file);
  assert.strictEqual(again.data.pet.name, 'Yumi');
  assert.strictEqual(again.data.pet.color, 'mint');
  assert.strictEqual(again.petStatus().displayName, "Yumi's egg");
});

test('graduation freezes the adult and starts a fresh egg', () => {
  const s = new Store(tmpFile());
  const now = new Date(2026, 10, 9, 20);
  const water = s.data.habits.find((h) => h.category === 'health').id;
  s.data.pet = { ...s.data.pet, bornDay: '2026-10-26', name: 'Yumi', color: 'mint',
    xpByDay: { '2026-10-27': 600, '2026-11-08': 600 }, look: { main: 'fitness', accent: 'study', decidedDay: '2026-11-08' } };
  s.data.log = { '2026-10-27': [water], '2026-11-08': [water], '2026-10-01': [water] };
  s.toggleHabit(water, now); // today counts toward the adult, not the next egg
  assert.strictEqual(s.graduate('', now).ok, false);
  const r = s.graduate(' Yumi ', now, () => 0);
  assert.ok(r.ok);
  const g = r.value;
  assert.deepStrictEqual([g.name, g.color, g.look.main, g.look.accent], ['Yumi', 'mint', 'fitness', 'study']);
  assert.strictEqual(g.stats.ticks.health, 3); // the October 1st tick was before it was born
  assert.strictEqual(g.graduatedDay, '2026-11-09');
  // new egg: different colour, no name, no XP even though today was already ticked
  assert.notStrictEqual(s.data.pet.color, 'mint');
  assert.strictEqual(s.data.pet.name, '');
  s.refreshToday(now);
  assert.strictEqual(s.petStatus(now).xp, 0);
  assert.strictEqual(s.petStatus(now).stage.id, 'egg');
  // frozen: renaming or recolouring the new pet doesn't touch the graduate
  s.recolorPet('lemon');
  assert.strictEqual(new Store(s.file).data.garden[0].color, 'mint');
  assert.strictEqual(s.graduate('Again', now).ok, false); // an egg can't graduate
});

test('at most two visitors at a time', () => {
  const s = new Store(tmpFile());
  s.data.garden = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
  assert.ok(s.setVisitor('a', true).ok);
  assert.ok(s.setVisitor('b', true).ok);
  assert.strictEqual(s.setVisitor('c', true).ok, false);
  assert.deepStrictEqual(s.setVisitor('a', false).value, ['b']);
  assert.ok(s.setVisitor('c', true).ok);
  assert.strictEqual(s.setVisitor('zzz', true).ok, false);
});

test('new eggs hatch a random species, and unknown species fall back to blob', () => {
  const { SPECIES } = require('../src/store');
  const seen = new Set();
  for (let i = 0; i < 40; i += 1) seen.add(new Store(tmpFile()).data.pet.species);
  assert.ok(seen.size >= 3, `only saw ${[...seen]}`);
  for (const sp of seen) assert.ok(SPECIES.includes(sp));
  const f = tmpFile();
  fs.writeFileSync(f, JSON.stringify({ version: 1, habits: [], log: {}, pet: { species: 'unicorn', xpByDay: {} } }));
  assert.strictEqual(new Store(f).data.pet.species, 'blob');
});

test('the starter pack covers every category and only adds what is missing', () => {
  const s = new Store(tmpFile());
  const cats = new Set(s.data.habits.map((h) => h.category));
  assert.deepStrictEqual([...cats].sort(), ['fitness', 'health', 'mind', 'study']);
  for (const h of s.data.habits) assert.ok(h.name.length <= 60);
  assert.strictEqual(s.addStarterPack().value, 0); // already has them all
  const water = s.data.habits.find((h) => h.name === 'Drink a glass of water');
  s.deleteHabit(water.id);
  s.data.habits.find((h) => h.name === 'Read one page').name = 'read one PAGE'; // different case still counts as the same habit
  assert.strictEqual(s.addStarterPack().value, 1);
  assert.strictEqual(s.data.habits.filter((h) => /water/.test(h.name)).length, 1);
});

test('the hangout choice is saved and checked', () => {
  const s = new Store(tmpFile());
  assert.strictEqual(s.data.hangout, 'cafe');
  assert.ok(s.setHangout('space').ok);
  assert.strictEqual(s.setHangout('moon base').ok, false);
  assert.strictEqual(new Store(s.file).data.hangout, 'space');
});

test('choosing a species, or a random different one', () => {
  const s = new Store(tmpFile());
  assert.strictEqual(s.data.pet.speciesChosen, false); // a surprise by default
  assert.ok(s.changeSpecies('otter').ok);
  assert.strictEqual(s.petStatus().species, 'otter');
  assert.strictEqual(s.petStatus().speciesChosen, true);
  assert.strictEqual(s.changeSpecies('unicorn').ok, false);
  for (let i = 0; i < 20; i += 1) {
    const before = s.data.pet.species;
    assert.notStrictEqual(s.changeSpecies('random').value, before);
  }
  assert.strictEqual(new Store(s.file).data.pet.speciesChosen, true);
});

test('eggs roll for shiny once, when they hatch', () => {
  const lucky = new Store(tmpFile(), () => 0.1); // under 1 in 4
  const mon = new Date(2026, 9, 26, 10);
  lucky.data.pet.bornDay = '2026-10-26';
  assert.strictEqual(lucky.rollShiny(mon), false); // still an egg: no roll yet
  let hatch;
  for (const h of lucky.snapshot(mon).habits.filter((x) => x.due)) hatch = lucky.toggleHabit(h.id, mon);
  assert.strictEqual(hatch.stageUp, 'baby');
  assert.strictEqual(hatch.shiny, true);
  assert.strictEqual(lucky.petStatus(mon).displayName, 'Baby Shiny blob'.replace('blob', require('../src/growth').speciesLabel(lucky.data.pet.species)));
  assert.strictEqual(lucky.rollShiny(mon), false); // never rolls twice
  assert.strictEqual(lucky.recolorPet('pink').ok, false); // shinies stay gold
  lucky.renamePet('Maple');
  assert.strictEqual(lucky.petStatus(mon).displayName, 'Baby Shiny Maple');

  const plain = new Store(tmpFile(), () => 0.9);
  plain.data.pet.bornDay = '2026-10-26';
  for (const h of plain.snapshot(mon).habits.filter((x) => x.due)) plain.toggleHabit(h.id, mon);
  assert.strictEqual(plain.data.pet.shiny, false);
  assert.strictEqual(plain.data.pet.shinyRolled, true);
});

test('pets hatched before shinies existed are left as they are', () => {
  const f = tmpFile();
  fs.writeFileSync(f, JSON.stringify({ version: 1, habits: [], log: {}, pet: { species: 'cat', xpByDay: { '2026-10-01': 300 } } }));
  const s = new Store(f, () => 0);
  assert.strictEqual(s.rollShiny(), false);
  assert.strictEqual(s.data.pet.shiny, false);
});

test('shiny carries into the hangout at graduation', () => {
  const s = new Store(tmpFile());
  s.data.pet = { ...s.data.pet, name: 'Maple', shiny: true, shinyRolled: true, xpByDay: { '2026-10-20': 1300 } };
  const g = s.graduate('Maple', new Date(2026, 9, 26, 12)).value;
  assert.strictEqual(g.shiny, true);
  assert.strictEqual(require('../src/growth').shinyName(g), 'Shiny Maple');
  assert.strictEqual(s.data.pet.shiny, false); // the new egg starts un-rolled
  assert.strictEqual(s.data.pet.shinyRolled, false);
});

test('the user can set the name the pet calls them', () => {
  const s = new Store(tmpFile());
  assert.strictEqual(s.snapshot().userName, '');
  assert.strictEqual(s.setUserName('   ').ok, false);
  assert.strictEqual(s.setUserName('x'.repeat(25)).ok, false);
  assert.deepStrictEqual(s.setUserName('  Sam   Lee '), { ok: true, value: 'Sam Lee' });
  assert.strictEqual(new Store(s.file).snapshot().userName, 'Sam Lee');
});

test('pets are drawn in pixel style by default, and the style can be switched', () => {
  const s = new Store(tmpFile());
  assert.strictEqual(s.snapshot().artStyle, 'pixel');
  assert.strictEqual(s.setArtStyle('watercolour').ok, false);
  assert.strictEqual(s.setArtStyle('soft').ok, true);
  assert.strictEqual(new Store(s.file).data.artStyle, 'soft');
});

test('older save files switch to the pixel style', () => {
  const f = tmpFile();
  const s = new Store(f);
  delete s.data.artStyle;
  s.save();
  assert.strictEqual(new Store(f).data.artStyle, 'pixel');
});
