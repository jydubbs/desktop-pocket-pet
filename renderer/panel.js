const CAT_LABEL = { study: 'Study', fitness: 'Fitness', mind: 'Mind', health: 'Health' };
// Monday-first display order; values are JS weekday numbers (0 = Sunday)
const DAYS = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const $ = (id) => document.getElementById(id);
let state = null;
let editingId = null;
let confirmingDelete = false;

function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const c of [].concat(children)) n.append(c);
  return n;
}

function daysLabel(days) {
  if (!days) return 'Every day';
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = order.filter((d) => days.includes(d));
  if (sorted.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (sorted.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}

function catVar(cat) {
  return `var(--${cat})`;
}

function renderList() {
  if (!state) return;
  const [y, m, d] = state.today.split('-').map(Number);
  $('date').textContent = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const due = state.habits.filter((h) => h.due);
  const later = state.habits.filter((h) => !h.due);
  const done = due.filter((h) => h.done).length;
  $('count').textContent = due.length ? `${done} of ${due.length}` : '';
  $('fill').style.width = due.length ? `${(done / due.length) * 100}%` : '0';

  renderStyle();
  renderGrowth(state.pet);
  renderYou();

  const dueList = $('dueList');
  dueList.replaceChildren();
  if (!due.length) {
    dueList.append(el('li', { className: 'empty', textContent: state.habits.length ? 'Nothing due today. Enjoy the rest.' : 'Add your first tiny habit below.' }));
  }
  for (const h of due) {
    const check = el('button', { className: 'check', textContent: h.done ? '✓' : '', title: h.done ? 'Mark not done' : 'Mark done' });
    check.setAttribute('aria-label', `${h.done ? 'Undo' : 'Done'}: ${h.name}`);
    check.onclick = () => window.pet.toggleHabit(h.id);
    const li = el('li', { className: h.done ? 'done' : '' }, [
      check,
      el('div', { className: 'text' }, [
        el('div', { className: 'name', textContent: h.name }),
        el('div', { className: 'meta' }, [el('span', { className: 'cat', textContent: CAT_LABEL[h.category] }), ` · ${daysLabel(h.days)}`]),
      ]),
      editButton(h),
    ]);
    li.style.setProperty('--cat', catVar(h.category));
    dueList.append(li);
  }

  $('laterWrap').style.display = later.length ? '' : 'none';
  const laterList = $('laterList');
  laterList.replaceChildren();
  for (const h of later) {
    const li = el('li', {}, [
      el('span', { className: 'dot' }),
      el('div', { className: 'text' }, [
        el('div', { className: 'name', textContent: h.name }),
        el('div', { className: 'meta' }, [el('span', { className: 'cat', textContent: CAT_LABEL[h.category] }), ` · ${daysLabel(h.days)}`]),
      ]),
      editButton(h),
    ]);
    li.style.setProperty('--cat', catVar(h.category));
    laterList.append(li);
  }
}

const MOOD_TEXT = { happy: 'happy', content: 'calm', sleepy: 'a bit sleepy', droopy: 'feeling droopy' };

// ---- pet card: collapsed by default, remembers if you opened it ----
let petOpen = false;
try { petOpen = localStorage.getItem('petOpen') === '1'; } catch { /* fine */ }
function setPetOpen(open) {
  petOpen = open;
  $('petDetails').hidden = !open;
  $('growth').classList.toggle('open', open);
  $('petToggle').setAttribute('aria-expanded', String(open));
  $('petToggle').title = open ? 'Hide pet details' : 'Show pet details';
  try { localStorage.setItem('petOpen', open ? '1' : '0'); } catch { /* fine */ }
}
$('petToggle').onclick = () => setPetOpen(!petOpen);
setPetOpen(petOpen);

let thumbKey = '';
function renderThumb(p) {
  const key = [window.PetArt.style, p.stage.id, p.mood, p.color, p.species, p.shiny, JSON.stringify(p.look || {})].join('|');
  if (key === thumbKey) return;
  thumbKey = key;
  $('petThumb').innerHTML = window.PetArt.svg(p.stage.id, p.mood, p.stage.progress, p.look || {}, p.color, p.species, p.shiny);
}

const cap = (t) => t[0].toUpperCase() + t.slice(1);

// ---- what the pet calls you ----
let editingYou = false;
function renderYou() {
  const named = Boolean(state.userName);
  const show = !named || editingYou;
  $('youCard').hidden = !show;
  $('youText').textContent = state.userName || 'not set';
  $('youCancel').hidden = !named;
  $('youCard').querySelector('.kicker').textContent = named ? 'Your name' : 'Welcome';
  $('youTitle').textContent = named ? 'What should your pet call you?' : 'Hi! What should your pet call you?';
}
function editYou() {
  editingYou = true;
  $('youName').value = state.userName || '';
  $('youError').textContent = '';
  renderYou();
  $('youName').focus();
  $('youName').select();
}
function stopEditingYou() { editingYou = false; renderYou(); }
$('youBtn').onclick = editYou;
$('youCancel').onclick = stopEditingYou;
$('youName').addEventListener('input', () => ($('youError').textContent = ''));
$('youCard').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await window.pet.setUserName($('youName').value);
  if (r.ok) { editingYou = false; renderYou(); } else $('youError').textContent = r.error;
});
window.pet.onEditUser(() => {
  if (state) editYou();
  else setTimeout(() => state && editYou(), 300);
});

// ---- art style: pixel (default) or soft ----
for (const b of document.querySelectorAll('.style-pick button')) {
  b.onclick = () => window.pet.setArtStyle(b.dataset.style);
}
function renderStyle() {
  if (state.artStyle) window.PetArt.setStyle(state.artStyle);
  for (const b of document.querySelectorAll('.style-pick button')) b.setAttribute('aria-checked', String(b.dataset.style === window.PetArt.style));
}

function renderGrowth(p) {
  if (!p) return;
  const st = p.stage;
  const egg = st.id === 'egg';
  const mystery = egg && !p.speciesChosen;
  const kind = mystery ? 'Mystery egg' : speciesName(p.species);
  $('growthLabel').textContent = `${p.shiny ? 'Shiny ' : ''}${p.name || kind}`;
  const kicker = $('petKicker');
  kicker.replaceChildren([p.preview ? 'Preview' : null, st.label, mystery ? null : kind].filter(Boolean).join(' · '));
  $('readyPill').hidden = st.id !== 'adult' || Boolean(p.shiny);
  renderThumb(p);
  $('stageText').textContent = st.label;
  $('moodText').textContent = egg ? 'Cosy' : cap(MOOD_TEXT[p.mood] || p.mood);
  $('nameText').textContent = p.name || 'not named yet';
  const nameBtn = $('nameBtn');
  nameBtn.textContent = p.name ? 'Rename' : 'Name me';
  nameBtn.classList.toggle('prompt', !p.name);
  renderSwatches(p.color);
  $('swatches').hidden = Boolean(p.shiny);
  $('shinyNote').hidden = !p.shiny;
  $('shinyBadge').hidden = !p.shiny;
  renderSpeciesRow(p);
  $('gradBtn').hidden = st.id !== 'adult';
  $('gradBtn').textContent = p.name ? `Graduate ${p.name}` : 'Hold the graduation ceremony';
  $('growthNext').textContent = st.nextAt === null
    ? `${p.xp} XP · grown up`
    : `${st.nextAt - p.xp} XP to ${st.nextLabel}`;
  $('growthFill').style.width = `${Math.round(st.progress * 100)}%`;
  renderLook(p);
}

// ---- species ----
const SPECIES_ORDER = ['blob', 'bunny', 'cat', 'frog', 'capybara', 'dragon', 'redpanda', 'quokka', 'otter', 'panda', 'raccoon',
  'ferret', 'bear', 'lamb', 'phoenix', 'pegasus'];
const SPECIES_NAME = { redpanda: 'Red panda', otter: 'Sea otter' };
const speciesName = (sp) => SPECIES_NAME[sp] || sp[0].toUpperCase() + sp.slice(1);

function renderSpeciesRow(p) {
  const egg = p.stage.id === 'egg';
  const mystery = egg && !p.speciesChosen;
  const text = $('speciesText');
  text.replaceChildren('Species: ', el('b', { textContent: mystery ? 'Mystery egg' : speciesName(p.species) }));  $('speciesBtn').textContent = mystery ? 'Choose' : 'Change';
}

function renderSpeciesGrid() {
  const p = state.pet;
  const mystery = p.stage.id === 'egg' && !p.speciesChosen;
  const grid = $('speciesGrid');
  grid.replaceChildren();
  for (const sp of SPECIES_ORDER) {
    const b = el('button', { type: 'button' });
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(!mystery && sp === p.species));
    b.innerHTML = window.PetArt.svg('adult', 'content', 0, {}, p.color, sp, p.shiny);
    b.append(el('span', { textContent: speciesName(sp) }));
    b.onclick = () => window.pet.setSpecies(sp);
    grid.append(b);
  }
}

function openSpecies() {
  renderSpeciesGrid();
  $('listView').style.display = 'none';
  $('speciesView').style.display = 'flex';
}
function closeSpecies() {
  $('speciesView').style.display = 'none';
  $('listView').style.display = 'flex';
}
$('speciesBtn').onclick = openSpecies;
$('surpriseBtn').onclick = () => window.pet.setSpecies('random');
$('speciesRandom').onclick = () => window.pet.setSpecies('random');
$('speciesClose').onclick = closeSpecies;
$('speciesDone').onclick = closeSpecies;

// ---- name + colour ----
const SWATCHES = { natural: 'conic-gradient(#e2683a, #8ccf6a, #b9814c, #2d2a33, #ffffff, #e2683a)', pink: '#e9b8dc', peach: '#fbc6a2', mint: '#ade5c7', sky: '#acd2f6', lavender: '#cbb7f3', lemon: '#f6e38c', cloud: '#e8e6f0', cocoa: '#c8956a' };

function renderSwatches(current) {
  const box = $('swatches');
  if (box.childElementCount === 0) {
    for (const [id, hex] of Object.entries(SWATCHES)) {
      const b = el('button', { type: 'button', className: 'swatch', title: id[0].toUpperCase() + id.slice(1) });
      b.style.background = hex;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', b.title);
      b.dataset.color = id;
      b.onclick = () => window.pet.recolorPet(id);
      box.append(b);
    }
  }
  for (const b of box.children) b.setAttribute('aria-checked', String(b.dataset.color === current));
}

function openNameForm() {
  $('nameForm').hidden = false;
  $('nameBtn').hidden = true;
  $('petName').value = (state && state.pet && state.pet.name) || '';
  $('petName').focus();
}
function closeNameForm() {
  $('nameForm').hidden = true;
  $('nameBtn').hidden = false;
}
$('nameBtn').onclick = openNameForm;
$('nameCancel').onclick = closeNameForm;
$('nameForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await window.pet.renamePet($('petName').value);
  if (r.ok) closeNameForm();
  else $('petName').setCustomValidity(r.error), $('petName').reportValidity();
});
$('petName').addEventListener('input', () => $('petName').setCustomValidity(''));

const LOOK_NAME = { study: 'Nerdy', fitness: 'Sporty', mind: 'Zen', health: 'Glowy' };

function renderLook(p) {
  const line = $('lookLine');
  line.replaceChildren();
  const look = p.look || {};
  if (p.stage.id === 'egg') { line.textContent = 'Looks come after hatching'; return; }
  if (!look.main) { line.textContent = 'Tick habits to get a look'; return; }
  line.append(`${LOOK_NAME[look.main]} look`);
  if (look.accent) line.append(` + ${CAT_LABEL[look.accent]} badge`);
  if (look.nextCheck) {
    const [y, m, d] = look.nextCheck.split('-').map(Number);
    const when = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
    line.title = `Look is rechecked on ${when}`;
  }
}

function editButton(h) {
  const b = el('button', { className: 'edit', textContent: 'Edit' });
  b.setAttribute('aria-label', `Edit ${h.name}`);
  b.onclick = () => openEditor(h);
  return b;
}

// ---- editor ----
function buildEditorChips() {
  const cats = $('cats');
  for (const c of state.categories) {
    const input = el('input', { type: 'radio', name: 'category', value: c, id: `cat-${c}` });
    const chip = el('label', { className: 'chip' }, [input, el('span', { textContent: CAT_LABEL[c] })]);
    chip.style.setProperty('--cat', catVar(c));
    chip.style.setProperty('--dot', 'inline-block');
    cats.append(chip);
  }
  const days = $('days');
  for (const [v, letter] of DAYS) {
    const input = el('input', { type: 'checkbox', value: String(v), id: `day-${v}` });
    const chip = el('label', { className: 'chip day', title: DAY_NAMES[v] }, [input, el('span', { textContent: letter })]);
    days.append(chip);
  }
  $('everyDay').onchange = syncDays;
}

function syncDays() {
  const every = $('everyDay').checked;
  for (const box of $('days').querySelectorAll('input')) {
    box.disabled = every;
    if (every) box.checked = true;
  }
}

function openEditor(habit) {
  editingId = habit ? habit.id : null;
  confirmingDelete = false;
  $('editTitle').textContent = habit ? 'Edit habit' : 'New habit';
  $('name').value = habit ? habit.name : '';
  const cat = habit ? habit.category : 'health';
  for (const r of document.querySelectorAll('input[name=category]')) r.checked = r.value === cat;
  $('everyDay').checked = !habit || !habit.days;
  for (const box of $('days').querySelectorAll('input')) {
    box.checked = !habit || !habit.days || habit.days.includes(Number(box.value));
  }
  syncDays();
  $('error').textContent = '';
  renderEditFooter();
  $('listView').style.display = 'none';
  $('editView').style.display = 'flex';
  $('name').focus();
}

function closeEditor() {
  editingId = null;
  $('editView').style.display = 'none';
  $('listView').style.display = 'flex';
}

function renderEditFooter() {
  const footer = $('editFooter');
  footer.replaceChildren();
  if (confirmingDelete) {
    const no = el('button', { className: 'ghost', type: 'button', textContent: 'Keep it' });
    no.onclick = () => { confirmingDelete = false; renderEditFooter(); };
    const yes = el('button', { className: 'primary', type: 'button', textContent: 'Delete habit' });
    yes.style.background = 'var(--danger)';
    yes.onclick = async () => {
      const r = await window.pet.deleteHabit(editingId);
      if (r.ok) closeEditor();
      else $('error').textContent = r.error;
    };
    footer.append(el('span', { className: 'confirm', textContent: 'Delete this habit?' }), no, yes);
    return;
  }
  if (editingId) {
    const del = el('button', { className: 'ghost danger', type: 'button', textContent: 'Delete' });
    del.onclick = () => { confirmingDelete = true; renderEditFooter(); };
    footer.append(del);
  }
  footer.append(el('button', { className: 'primary', type: 'submit', textContent: 'Save' }));
  footer.lastChild.setAttribute('form', 'form');
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = (document.querySelector('input[name=category]:checked') || {}).value;
  const days = $('everyDay').checked
    ? null
    : [...$('days').querySelectorAll('input:checked')].map((b) => Number(b.value));
  const input = { name: $('name').value, category, days };
  const r = editingId ? await window.pet.updateHabit(editingId, input) : await window.pet.addHabit(input);
  if (r.ok) closeEditor();
  else $('error').textContent = r.error;
});

$('addBtn').onclick = () => openEditor(null);
$('gardenBtn').onclick = () => window.pet.openGarden(false);
$('historyBtn').onclick = () => window.pet.openHistory();
$('gradBtn').onclick = () => window.pet.openCeremony(Boolean(state && state.pet && state.pet.preview));
$('editClose').onclick = closeEditor;
$('close').onclick = () => window.pet.closePanel();
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('nameForm').hidden) return closeNameForm();
  if (editingYou && state.userName) return stopEditingYou();
  if ($('speciesView').style.display !== 'none') return closeSpecies();
  if ($('editView').style.display !== 'none') closeEditor();
  else window.pet.closePanel();
});

window.pet.getState().then((s) => {
  state = s;
  buildEditorChips();
  renderList();
});
window.pet.onState((s) => {
  state = s;
  renderList();
  if ($('speciesView').style.display !== 'none') renderSpeciesGrid();
});
