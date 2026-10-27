// Main process: owns the windows, the menu bar icon and the saved data.
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, globalShortcut } = require('electron');
const path = require('path');
const { Store, MAX_VISITORS, SPECIES } = require('./src/store');
const { dayKey } = require('./src/logic');
const talk = require('./src/talk');
const growth = require('./src/growth');
const looks = require('./src/looks');
const { hangout } = require('./src/hangouts');
const place = () => hangout(store.data.hangout);

app.setName('Pocket Pet');

const PET_W = 180;
const PET_H = 190;
const PANEL_W = 340;
const PANEL_H = 540;
const BUBBLE_W = 260;
const GAP = 8;
const GREETING_MS = 14000;
const NUDGE_MS = 11000;
const QUIET_AFTER_GREETING_MS = 10 * 60 * 1000; // no nudge right after a greeting

let store;
let petWin;
let panelWin;
let bubbleWin;
let tray;
let napping = false;
let bubbleTimer = null;
let bubbleHideTimer = null;
let bubbleTail = 'down';
let quietUntil = 0;
let lastDay = dayKey();
let ceremonyWin = null;
let ceremonyPreview = false;
let gardenWin = null;
let gardenSample = false;
const visitorWins = new Map(); // garden pet id -> window
const VIS_W = 140;
const VIS_H = 200; // extra room at the top for a visitor's speech bubble

const webPreferences = {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
};

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';
const APP_ICON = path.join(__dirname, 'assets', 'icon.png');

// Ordinary windows (hangout, History): Mac tucks the traffic lights into the page;
// Windows gets its normal title bar with close and minimise, and no File/Edit menu.
function normalWindow(opts) {
  const win = new BrowserWindow({ ...opts, ...(IS_MAC ? { titleBarStyle: 'hiddenInset' } : { icon: APP_ICON, autoHideMenuBar: true }) });
  if (!IS_MAC) win.removeMenu();
  return win;
}

const floating = {
  frame: false, transparent: true, resizable: false, skipTaskbar: true,
  alwaysOnTop: true, fullscreenable: false, maximizable: false, minimizable: false,
};

function pinOnTop(win) {
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

// ---------- "Try things out": preview any stage, mood or look without saving anything ----------
// Hidden from users so growing up stays a surprise. Developers can open it with `npm run try`.
const TRY_MODE = process.argv.includes('--try');

let preview = null;
const COLOR_LABELS = { natural: 'Natural', pink: 'Pink', peach: 'Peach', mint: 'Mint', sky: 'Sky', lavender: 'Lavender', lemon: 'Lemon', cloud: 'Cloud', cocoa: 'Cocoa' }; // e.g. { stage: 'teen', mood: 'sleepy', look: { main: 'mind', accent: 'study' } }

function snapshot() {
  const snap = { ...store.snapshot(), hangout: place() };
  if (!preview) return snap;
  const pet = { ...snap.pet, preview: true };
  if (preview.stage) {
    const i = growth.STAGES.findIndex((x) => x.id === preview.stage);
    const st = growth.STAGES[i];
    const next = growth.STAGES[i + 1];
    // show an egg close to hatching so the cracks are visible
    const xp = next ? st.at + Math.round((next.at - st.at) * (st.id === 'egg' ? 0.9 : 0.4)) : st.at;
    pet.stage = growth.stageFor(xp);
    pet.xp = xp;
  }
  if (preview.mood) pet.mood = preview.mood;
  if (preview.color) pet.color = preview.color;
  if (preview.species) pet.species = preview.species;
  if (typeof preview.shiny === 'boolean') pet.shiny = preview.shiny;
  pet.displayName = growth.displayName(pet.stage.id, pet.name, pet.species, pet.shiny);
  if (preview.look) pet.look = { ...pet.look, ...preview.look, nextCheck: null };
  return { ...snap, pet };
}

function setPreview(patch) {
  const prev = preview || {};
  const look = patch.look ? { ...(prev.look || store.petStatus().look || {}), ...patch.look } : prev.look;
  preview = { ...prev, ...patch, ...(look ? { look } : {}) };
  broadcast();
}

function endPreview() {
  preview = null;
  broadcast();
}

function tryMenu() {
  const p = preview || {};
  const cur = snapshot().pet;
  const radio = (label, checked, click) => ({ label, type: 'radio', checked, click });
  const LOOKS = [['study', 'Nerdy (Study)'], ['fitness', 'Sporty (Fitness)'], ['mind', 'Zen (Mind)'], ['health', 'Glowy (Health)']];
  const CATS = [['study', 'Study'], ['fitness', 'Fitness'], ['mind', 'Mind'], ['health', 'Health']];
  const anyHabit = (cat) => store.data.habits.find((h) => h.category === cat) || { name: 'a tiny habit' };
  return [
    { label: 'Previews change how your pet looks only. Nothing is saved.', enabled: false },
    { type: 'separator' },
    { label: 'Stage', submenu: growth.STAGES.map((st) => radio(st.label, cur.stage.id === st.id, () => setPreview({ stage: st.id }))) },
    { label: 'Mood', submenu: [['happy', 'Happy'], ['content', 'Calm'], ['sleepy', 'Sleepy'], ['droopy', 'Droopy']]
      .map(([id, label]) => radio(label, cur.mood === id, () => setPreview({ mood: id }))) },
    { label: 'Look', submenu: [radio('No look', !cur.look.main, () => setPreview({ look: { main: null } })),
      ...LOOKS.map(([id, label]) => radio(label, cur.look.main === id, () => setPreview({ look: { main: id } })))] },
    { label: 'Badge', submenu: [radio('No badge', !cur.look.accent, () => setPreview({ look: { accent: null } })),
      ...CATS.map(([id, label]) => radio(label, cur.look.accent === id, () => setPreview({ look: { accent: id } })))] },
    { label: 'Shiny', type: 'checkbox', checked: Boolean(cur.shiny), click: () => setPreview({ shiny: !cur.shiny }) },
    { label: 'Preview a shiny hatch', click: () => {
      setPreview({ stage: 'baby', shiny: true });
      celebrateShiny(cur.species);
    } },
    { label: 'Species', submenu: SPECIES.map((sp) => radio(growth.speciesLabel(sp)[0].toUpperCase() + growth.speciesLabel(sp).slice(1), cur.species === sp, () => setPreview({ species: sp }))) },
    { label: 'Colour', submenu: Object.keys(COLOR_LABELS).map((c) => radio(COLOR_LABELS[c], (p.color || cur.color) === c, () => setPreview({ color: c }))) },
    { type: 'separator' },
    { label: 'Feed a treat', submenu: CATS.map(([id, label]) => ({ label, click: () => petWin.webContents.send('pet:fed', { category: id }) })) },
    { label: 'Play the growing-up sparkle', click: () => {
      const st = cur.stage.id === 'egg' ? 'baby' : cur.stage.id;
      petWin.webContents.send('pet:stageup', st);
      setTimeout(() => say({ ...growth.stageUpMessage(st, store.data.pet.name, cur.species), ms: GREETING_MS }), 1200);
    } },
    { label: 'Play a look change', click: () => announceLook(cur.look.main || 'fitness') },
    { label: 'Preview the graduation ceremony', click: () => openCeremony(true) },
    { label: `Preview an example ${place().name.toLowerCase()}`, click: () => openGarden(true) },
    { label: 'Play a little wander', click: () => wander(true) },
    { label: 'Play a visitor nuzzle', enabled: visitorWins.size > 0, click: () => visitorMoment(true, 'nuzzle') },
    { label: 'Play a visitor chat', enabled: visitorWins.size > 0, click: () => visitorMoment(true, 'chat') },
    { label: 'Show a midday nudge', click: () => say({ body: talk.nudgeText('midday', [anyHabit('study'), anyHabit('health')]) }) },
    { label: 'Show an evening nudge', click: () => say({ body: talk.nudgeText('evening', [anyHabit('mind')]) }) },
    { type: 'separator' },
    { label: 'Back to my real pet', enabled: Boolean(preview), click: endPreview },
  ];
}

function broadcast() {
  if (typeof historyWin !== 'undefined' && historyWin && !historyWin.isDestroyed()) historyWin.webContents.send('history:changed');
  const snap = snapshot();
  for (const w of [petWin, panelWin]) {
    if (w && !w.isDestroyed()) w.webContents.send('state:changed', snap);
  }
}

function clampToScreen(x, y, w, h) {
  const wa = screen.getDisplayNearestPoint({ x: Math.round(x + w / 2), y: Math.round(y + h / 2) }).workArea;
  return {
    x: Math.min(Math.max(x, wa.x), wa.x + wa.width - w),
    y: Math.min(Math.max(y, wa.y), wa.y + wa.height - h),
  };
}

// ---------- windows ----------

function createPet() {
  const wa = screen.getPrimaryDisplay().workArea;
  const saved = store.data.petPosition;
  const start = saved
    ? clampToScreen(saved.x, saved.y, PET_W, PET_H)
    : { x: wa.x + wa.width - PET_W - 40, y: wa.y + wa.height - PET_H - 20 };
  petWin = new BrowserWindow({ ...floating, width: PET_W, height: PET_H, x: start.x, y: start.y, hasShadow: false, webPreferences });
  pinOnTop(petWin);
  petWin.loadFile(path.join(__dirname, 'renderer', 'pet.html'));
}

function createPanel() {
  panelWin = new BrowserWindow({ ...floating, width: PANEL_W, height: PANEL_H, show: false, hasShadow: true, webPreferences });
  pinOnTop(panelWin);
  panelWin.loadFile(path.join(__dirname, 'renderer', 'panel.html'));
}

function createBubble() {
  bubbleWin = new BrowserWindow({
    ...floating, width: BUBBLE_W, height: 120, show: false, hasShadow: false, focusable: false,
    // macOS pauses hidden windows; the bubble must keep working while hidden so it can appear.
    webPreferences: { ...webPreferences, backgroundThrottling: false },
  });
  pinOnTop(bubbleWin);
  bubbleWin.setIgnoreMouseEvents(true); // clicks pass straight through the bubble
  bubbleWin.loadFile(path.join(__dirname, 'renderer', 'bubble.html'));
}

// Put the panel beside the pet: left if there is room, otherwise right.
function placePanel() {
  const [px, py] = petWin.getPosition();
  const wa = screen.getDisplayNearestPoint({ x: px, y: py }).workArea;
  let x = px - PANEL_W - GAP;
  if (x < wa.x) x = px + PET_W + GAP;
  const pos = clampToScreen(x, py + PET_H - PANEL_H, PANEL_W, PANEL_H);
  panelWin.setPosition(Math.round(pos.x), Math.round(pos.y));
}

// First run (or the menu): open the habit list with the "What should I call you?" card.
function askName() {
  if (napping) return;
  showPanel();
  panelWin.webContents.send('user:edit');
}

function showPanel() {
  hideBubble();
  placePanel();
  panelWin.show();
  panelWin.focus();
  broadcast();
}

function togglePanel() {
  if (panelWin.isVisible()) panelWin.hide();
  else showPanel();
}

// ---------- speech bubble ----------

// Above the pet's head; below it if the pet is at the top of the screen.
function placeBubble(height) {
  const [px, py] = petWin.getPosition();
  const wa = screen.getDisplayNearestPoint({ x: px, y: py }).workArea;
  let y = py - height + 30;
  bubbleTail = 'down';
  if (y < wa.y) {
    y = py + PET_H - 10;
    bubbleTail = 'up';
  }
  const x = Math.min(Math.max(px + PET_W / 2 - BUBBLE_W / 2, wa.x), wa.x + wa.width - BUBBLE_W);
  bubbleWin.setBounds({ x: Math.round(x), y: Math.round(y), width: BUBBLE_W, height: Math.round(height) });
}

function say({ title = '', body = '', ms = NUDGE_MS }) {
  if (napping || !bubbleWin) return;
  clearTimeout(bubbleTimer);
  clearTimeout(bubbleHideTimer); // cancel a fade-out still in progress
  placeBubble(120); // decide the tail side before measuring
  bubbleWin.webContents.send('bubble:show', { title, body, tail: bubbleTail });
  bubbleTimer = setTimeout(hideBubble, ms);
}

function hideBubble() {
  clearTimeout(bubbleTimer);
  if (bubbleWin && bubbleWin.isVisible()) {
    bubbleWin.webContents.send('bubble:show', { hide: true });
    clearTimeout(bubbleHideTimer);
    bubbleHideTimer = setTimeout(() => bubbleWin.hide(), 250);
  }
  petWin.webContents.send('pet:talking', false);
}

// ---------- what the pet says ----------

function greet() {
  const line = talk.pickLine(store.data.talk.lastLine);
  store.updateTalk({ lastGreetingAt: new Date().toISOString(), lastLine: line.index });
  quietUntil = Date.now() + QUIET_AFTER_GREETING_MS;
  say({ title: talk.greetingTitle(store.data.name), body: line.text, ms: GREETING_MS });
}

function maybeGreet() {
  if (!napping && talk.shouldGreet(store.data.talk.lastGreetingAt)) greet();
}

// A new outfit: sparkle, then tell you about it.
function announceLook(main) {
  if (napping || !main) return;
  petWin.webContents.send('pet:stageup', 'look');
  setTimeout(() => say({ ...looks.LOOK_MESSAGES[main], ms: GREETING_MS }), 900);
  broadcast();
}

function checkLook() {
  const main = store.updateLook();
  if (main && store.petStatus().stage.id !== 'egg') announceLook(main);
  else if (main === null) broadcast();
}

function checkNudge(now = new Date()) {
  if (napping || panelWin.isVisible() || Date.now() < quietUntil) return;
  const slot = talk.openNudgeSlot(now, store.nudgesUsedToday(now));
  if (!slot) return;
  store.markNudge(slot, now);
  const remaining = store.snapshot(now).habits.filter((h) => h.due && !h.done);
  if (remaining.length) say({ body: talk.nudgeText(slot, remaining) });
}

// ---------- nap + menu bar ----------

function trayIcon() {
  // Mac: black-and-white template icons that follow the menu bar. Windows: a little pink blob for the taskbar.
  if (!IS_MAC) {
    const file = `${napping ? 'tray-win-sleep' : 'tray-win'}.${IS_WIN ? 'ico' : 'png'}`;
    return nativeImage.createFromPath(path.join(__dirname, 'assets', file));
  }
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', napping ? 'traySleepTemplate.png' : 'trayTemplate.png'));
  img.setTemplateImage(true);
  return img;
}

// While napping, a sleeping blob sits in the Dock: click it to wake the pet.
// (The menu bar icon does the same, but the menu bar can be hidden or full.)
// Windows has no Dock, so a sleeping blob waits on the taskbar instead: click it to wake the pet.
let napWin = null;
function showNapInTaskbar() {
  if (napWin && !napWin.isDestroyed()) return;
  napWin = new BrowserWindow({
    width: 320, height: 160, show: false, title: 'Pocket Pet is napping (click to wake)',
    icon: path.join(__dirname, 'assets', 'dock-napping.png'), backgroundColor: '#f3e6f5',
    minimizable: true, maximizable: false, resizable: false, fullscreenable: false, autoHideMenuBar: true,
  });
  napWin.removeMenu();
  napWin.loadURL('about:blank');
  napWin.minimize(); // shows it on the taskbar without opening a window
  const born = Date.now();
  const wakeUp = () => { if (napping) wake(); };
  napWin.on('restore', wakeUp);
  napWin.on('focus', () => { if (Date.now() - born > 800) wakeUp(); });
  napWin.on('show', () => { if (napWin && !napWin.isMinimized()) wakeUp(); });
  napWin.on('closed', () => { napWin = null; wakeUp(); });
}

function showNapInDock() {
  if (IS_WIN) return showNapInTaskbar();
  if (!app.dock) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'dock-napping.png'));
  app.dock.setMenu(Menu.buildFromTemplate([{ label: 'Wake up', click: wake }]));
  // Set the icon both before and after showing, so it never appears as the default Electron icon.
  app.dock.setIcon(icon);
  Promise.resolve(app.dock.show()).then(() => app.dock.setIcon(icon)).catch(() => {});
}

// Option + Command + P (Ctrl + Alt + P on Windows) toggles nap from anywhere.
const NAP_SHORTCUT = 'Alt+CommandOrControl+P';
function registerShortcut() {
  const ok = globalShortcut.register(NAP_SHORTCUT, () => (napping ? wake() : nap()));
  if (!ok) console.log(`Pocket Pet: the shortcut ${NAP_SHORTCUT} is taken by another app.`);
}

function hideFromDock() {
  if (app.dock) app.dock.hide();
  if (napWin && !napWin.isDestroyed()) { const w = napWin; napWin = null; w.destroy(); }
}

function nap() {
  napping = true;
  hideBubble();
  panelWin.hide();
  petWin.hide();
  syncVisitors();
  refreshTray();
  showNapInDock();
}

function wake() {
  if (!napping) return;
  napping = false;
  hideFromDock();
  petWin.showInactive();
  pinOnTop(petWin);
  syncVisitors();
  refreshTray();
  // Give macOS a moment to finish removing the Dock icon before the bubble appears.
  setTimeout(() => {
    if (napping) return;
    if (talk.shouldGreet(store.data.talk.lastGreetingAt)) greet();
    else say({ body: "Yawn… I'm back!", ms: 5000 });
  }, 600);
}

// ---------- graduation ceremony ----------

function openCeremony(asPreview = false) {
  ceremonyPreview = asPreview;
  if (ceremonyWin && !ceremonyWin.isDestroyed()) ceremonyWin.close();
  hideBubble();
  panelWin.hide();
  const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  ceremonyWin = new BrowserWindow({
    ...floating, width: 440, height: 620, hasShadow: true,
    x: Math.round(wa.x + (wa.width - 440) / 2), y: Math.round(wa.y + (wa.height - 620) / 2), webPreferences,
  });
  pinOnTop(ceremonyWin);
  ceremonyWin.loadFile(path.join(__dirname, 'renderer', 'ceremony.html'));
  ceremonyWin.on('closed', () => (ceremonyWin = null));
}

function ceremonyInfo() {
  const pet = snapshot().pet;
  const real = store.data.pet;
  return {
    place: place(),
    preview: ceremonyPreview,
    pet: { name: real.name, color: pet.color, shiny: Boolean(pet.shiny), look: { main: pet.look.main, accent: pet.look.accent }, species: pet.species },
    stats: store.petStats(),
  };
}


function ceremonyConfirm(name) {
  if (ceremonyPreview) return { ok: true, preview: true };
  const r = store.graduate(name);
  if (!r.ok) return r;
  endPreview();
  broadcast();
  refreshGarden();
  setTimeout(() => {
    petWin.webContents.send('pet:stageup', 'egg');
    say({ title: 'A new egg appeared!', body: `${growth.shinyName(r.value)} left it for you before moving to ${place().place}.`, ms: GREETING_MS });
  }, 1200);
  return r;
}

// ---------- the garden ----------

const SAMPLE_GARDEN = [
  { name: 'Mochi', species: 'bunny', color: 'pink', look: { main: 'study', accent: 'health' }, ticks: { study: 31, fitness: 6, mind: 8, health: 19 } },
  { name: 'Pip', species: 'dragon', color: 'sky', look: { main: 'fitness', accent: 'mind' }, ticks: { study: 4, fitness: 28, mind: 15, health: 10 } },
  { name: 'Sage', species: 'frog', color: 'mint', look: { main: 'mind', accent: 'study' }, ticks: { study: 14, fitness: 3, mind: 30, health: 9 } },
  { name: 'Sunny', species: 'capybara', color: 'lemon', look: { main: 'health', accent: 'fitness' }, ticks: { study: 5, fitness: 16, mind: 7, health: 33 } },
  { name: 'Maple', species: 'redpanda', color: 'natural', look: { main: 'study', accent: 'mind' }, ticks: { study: 26, fitness: 7, mind: 18, health: 9 } },
  { name: 'Bao', species: 'panda', color: 'natural', look: { main: 'mind', accent: 'health' }, ticks: { study: 6, fitness: 5, mind: 29, health: 21 } },
  { name: 'Kiwi', species: 'quokka', color: 'natural', look: { main: 'fitness', accent: null }, ticks: { study: 3, fitness: 34, mind: 6, health: 8 } },
  { name: 'Plum', species: 'cat', color: 'lavender', look: { main: null, accent: null }, ticks: { study: 9, fitness: 9, mind: 8, health: 9 } },
].map((g, i) => ({
  id: `sample-${i}`, species: g.species, name: g.name, color: g.color, look: g.look,
  bornDay: `2026-0${(i % 8) + 1}-03`, graduatedDay: `2026-0${(i % 8) + 1}-17`, xp: 1250,
  stats: { ticks: g.ticks, totalTicks: Object.values(g.ticks).reduce((a, b) => a + b, 0), activeDays: 13, days: 15 },
}));

function gardenInfo() {
  return gardenSample
    ? { graduates: SAMPLE_GARDEN, visitors: [], sample: true, max: MAX_VISITORS, hangout: place() }
    : { graduates: store.data.garden, visitors: store.data.visitors, sample: false, max: MAX_VISITORS, hangout: place() };
}

function openGarden(sample = false) {
  gardenSample = sample;
  if (ceremonyWin && !ceremonyWin.isDestroyed()) ceremonyWin.close();
  panelWin.hide();
  if (gardenWin && !gardenWin.isDestroyed()) {
    refreshGarden();
    gardenWin.show();
    gardenWin.focus();
    return;
  }
  gardenWin = normalWindow({
    width: 820, height: 560, minWidth: 560, minHeight: 420, title: place().name,
    backgroundColor: '#f6e6d4', show: false, webPreferences,
  });
  gardenWin.loadFile(path.join(__dirname, 'renderer', 'garden.html'));
  gardenWin.once('ready-to-show', () => gardenWin.show());
  gardenWin.on('closed', () => (gardenWin = null));
}

function refreshGarden() {
  if (gardenWin && !gardenWin.isDestroyed()) gardenWin.webContents.send('garden:changed', gardenInfo());
}

// ---------- history ----------

let historyWin = null;
function openHistory() {
  panelWin.hide();
  if (historyWin && !historyWin.isDestroyed()) {
    historyWin.webContents.send('history:changed');
    historyWin.show();
    historyWin.focus();
    return;
  }
  historyWin = normalWindow({
    width: 760, height: 580, minWidth: 520, minHeight: 440, title: 'History',
    show: false, webPreferences,
  });
  historyWin.loadFile(path.join(__dirname, 'renderer', 'history.html'));
  historyWin.once('ready-to-show', () => historyWin.show());
  historyWin.on('closed', () => (historyWin = null));
}

// ---------- visitors from the garden ----------

function syncVisitors() {
  const want = napping ? [] : store.data.visitors;
  for (const [id, w] of visitorWins) {
    if (!want.includes(id)) {
      if (!w.isDestroyed()) w.close();
      visitorWins.delete(id);
    }
  }
  for (const id of want) {
    if (visitorWins.has(id)) continue;
    const w = new BrowserWindow({ ...floating, width: VIS_W, height: VIS_H, show: false, hasShadow: false, focusable: false, webPreferences });
    pinOnTop(w);
    w.loadFile(path.join(__dirname, 'renderer', 'visitor.html'), { query: { id } });
    w.once('ready-to-show', () => w.showInactive());
    visitorWins.set(id, w);
  }
  placeVisitors();
}

// Visitors sit beside the pet: to its left when there's room, otherwise to its right.
function placeVisitors() {
  if (!petWin) return;
  const [px, py] = petWin.getPosition();
  const wa = screen.getDisplayNearestPoint({ x: px, y: py }).workArea;
  const n = visitorWins.size;
  const leftRoom = px - wa.x >= n * (VIS_W - 20);
  let i = 0;
  for (const w of visitorWins.values()) {
    const x = leftRoom ? px - (VIS_W - 24) * (i + 1) : px + PET_W - 20 + (VIS_W - 24) * i;
    const pos = clampToScreen(x, py + PET_H - VIS_H, VIS_W, VIS_H);
    if (!w.isDestroyed()) w.setPosition(Math.round(pos.x), Math.round(pos.y));
    i += 1;
  }
}

// ---------- life on the desktop: little hops, and visitors who nuzzle and chat ----------

const WANDER_RANGE = 70; // never more than this many pixels from where you put the pet
let home = null; // where you last put the pet
let acting = false;
let hovering = false;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

function petFree() {
  return !napping && !acting && !hovering && petWin && !panelWin.isVisible()
    && !(bubbleWin && bubbleWin.isVisible()) && !(ceremonyWin && !ceremonyWin.isDestroyed());
}

// Glide a window to a spot, easing in and out.
function glide(win, x, y, ms) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed()) return resolve();
    const [sx, sy] = win.getPosition();
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (win.isDestroyed()) {
        clearInterval(iv);
        return resolve();
      }
      const t = Math.min(1, (Date.now() - t0) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      win.setPosition(Math.round(sx + (x - sx) * e), Math.round(sy + (y - sy) * e));
      if (win === petWin) placeVisitors();
      if (t >= 1) {
        clearInterval(iv);
        resolve();
      }
    }, 16);
  });
}

// A few small hops left or right, staying near home.
async function wander(force = false) {
  if (!force && !petFree()) return;
  acting = true;
  const [px, py] = petWin.getPosition();
  if (!home) home = { x: px, y: py };
  const hops = 2 + Math.floor(Math.random() * 3);
  const step = 16;
  let dir = Math.random() < 0.5 ? -1 : 1;
  const after = px - home.x + dir * hops * step;
  if (Math.abs(after) > WANDER_RANGE) dir = -dir;
  for (let i = 0; i < hops; i += 1) {
    if (hovering || napping) break;
    const [cx, cy] = petWin.getPosition();
    const pos = clampToScreen(cx + dir * step, cy, PET_W, PET_H);
    petWin.webContents.send('pet:act', { type: 'hop', dir });
    for (const w of visitorWins.values()) if (!w.isDestroyed()) w.webContents.send('visitor:act', { type: 'hop', dir });
    await glide(petWin, pos.x, pos.y, 340);
    await sleepMs(90);
  }
  acting = false;
}

const VISITOR_LINES = [
  (b) => `You're growing so fast, ${b}!`,
  () => 'Did you eat all your treats today?',
  () => 'I was an egg once too, you know.',
  () => `When you're big, come visit ${place().place}!`,
  () => (store.data.name ? `${store.data.name} is doing so well!` : 'Your human is doing so well!'),
  () => 'Want to hear a secret? Tiny steps work.',
];
const BABY_REPLIES = [
  (v) => `Hehe, thanks ${v}!`,
  () => 'I want to be just like you!',
  () => 'Yum, yes!',
  () => '*happy wiggle*',
  (v) => `Can I try your drink, ${v}?`,
  () => 'Will you stay a bit longer?',
];
const pickFrom = (list) => list[Math.floor(Math.random() * list.length)];

// A visiting graduate nuzzles or chats with your pet.
async function visitorMoment(force = false, kind = null) {
  if (!force && !petFree()) return;
  const entries = [...visitorWins.entries()].filter(([, w]) => !w.isDestroyed());
  if (!entries.length) return;
  acting = true;
  const [id, vw] = pickFrom(entries);
  const g = store.data.garden.find((x) => x.id === id);
  const st = snapshot().pet;
  const babyName = st.name ? growth.shinyName(st) : 'little one';
  const [vx, vy] = vw.getPosition();
  const [px] = petWin.getPosition();
  const fromLeft = vx < px;
  const type = kind || (Math.random() < 0.5 ? 'nuzzle' : 'chat');
  if (type === 'nuzzle') {
    // shuffle over until they touch, lean in, hearts, then shuffle back
    const touch = fromLeft ? px - VIS_W + 62 : px + PET_W - 62;
    vw.webContents.send('visitor:act', { type: 'walk' });
    await glide(vw, touch, vy, 650);
    vw.webContents.send('visitor:act', { type: 'nuzzle', dir: fromLeft ? 1 : -1 });
    petWin.webContents.send('pet:act', { type: 'nuzzle', dir: fromLeft ? -1 : 1 });
    await sleepMs(2000);
    vw.webContents.send('visitor:act', { type: 'walk' });
    await glide(vw, vx, vy, 650);
  } else if (g) {
    const egg = st.stage.id === 'egg';
    vw.webContents.send('visitor:act', { type: 'say', text: egg ? '*gently pats the egg*' : pickFrom(VISITOR_LINES)(babyName) });
    await sleepMs(2600);
    acting = false; // let the pet's own bubble show
    say({ body: egg ? '*wobble wobble*' : pickFrom(BABY_REPLIES)(growth.shinyName(g)), ms: 3200 });
    acting = true;
    await sleepMs(3300);
  }
  placeVisitors();
  acting = false;
}

// Every so often: a little wander, or a moment with a visitor.
function scheduleLife() {
  setTimeout(async () => {
    try {
      if (visitorWins.size && Math.random() < 0.45) await visitorMoment();
      else await wander();
    } catch (e) {
      acting = false;
    }
    scheduleLife();
  }, 9000 + Math.random() * 14000);
}

// A shiny just hatched: golden burst, then the congratulations message.
function celebrateShiny(species = snapshot().pet.species) {
  const label = growth.speciesLabel(species).replace(/\b\w/g, (ch) => ch.toUpperCase());
  panelWin.hide();
  petWin.webContents.send('pet:stageup', 'shiny');
  setTimeout(() => say({
    title: `Congratulations! You got a Shiny ${label}!`,
    body: 'Only 1 in 4 eggs hatch shiny. It\'ll stay golden forever.',
    ms: GREETING_MS + 4000,
  }), 1400);
}

function menuTemplate() {
  return [
    napping
      ? { label: 'Wake up', accelerator: NAP_SHORTCUT, click: wake }
      : { label: 'Nap (hide pet)', accelerator: NAP_SHORTCUT, click: nap },
    { label: panelWin.isVisible() ? 'Hide habits' : 'Show habits', enabled: !napping, click: togglePanel },
    { label: 'Say hi', enabled: !napping, click: greet },
    { label: 'Change your name…', enabled: !napping, click: askName },
    ...(store.petStatus().stage.id === 'adult' ? [{ label: 'Hold the graduation ceremony…', enabled: !napping, click: () => openCeremony(false) }] : []),
    { label: 'History', click: openHistory },
    { label: 'Add starter habits', click: () => {
      const n = store.addStarterPack().value;
      broadcast();
      say({ title: n ? `Added ${n} starter ${n === 1 ? 'habit' : 'habits'}!` : 'You already have them all!',
        body: n ? 'Tiny habits for body and mind. Delete any you don\'t want.' : 'Every starter habit is already on your list.', ms: 6000 });
    } },
    { label: store.data.garden.length ? `Open ${place().place} (${store.data.garden.length})` : `Open ${place().place}`, click: () => openGarden(false) },
    ...(TRY_MODE ? [{ label: preview ? 'Try things out (previewing)' : 'Try things out', enabled: !napping, submenu: tryMenu() }] : []),
    { type: 'separator' },
    { label: 'Quit Pocket Pet', click: () => app.quit() },
  ];
}

function refreshTray() {
  if (!tray) return;
  tray.setImage(trayIcon());
  tray.setToolTip(napping ? 'Pocket Pet is napping. Click to wake it up.' : 'Pocket Pet');
}

function createTray() {
  tray = new Tray(trayIcon());
  refreshTray();
  // Napping: one click wakes it. Awake: click shows the menu.
  tray.on('click', () => (napping ? wake() : tray.popUpContextMenu(Menu.buildFromTemplate(menuTemplate()))));
  tray.on('right-click', () => tray.popUpContextMenu(Menu.buildFromTemplate(menuTemplate())));
}

// ---------- startup ----------

function setupLoginItem() {
  // Only the packaged app registers itself; `npm start` would register the bare Electron binary.
  if (app.isPackaged && !store.data.loginItemSet) {
    app.setLoginItemSettings({ openAtLogin: true });
    store.set('loginItemSet', true);
  }
}

function wireIpc() {
  ipcMain.handle('state:get', () => snapshot());
  const mutate = (fn) => (_e, ...args) => {
    const result = fn(...args);
    broadcast();
    return result;
  };
  ipcMain.handle('habit:add', mutate((h) => store.addHabit(h)));
  ipcMain.on('style:get', (e) => { e.returnValue = store ? store.data.artStyle : 'pixel'; });
  ipcMain.handle('style:set', (_e, style) => {
    const r = store.setArtStyle(style);
    if (!r.ok) return r;
    broadcast();
    // Redraw every other window in the new style (the habit list redraws itself).
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.isDestroyed() || w === panelWin || w === bubbleWin) continue;
      w.webContents.reload();
    }
    return r;
  });
  ipcMain.handle('user:rename', mutate((name) => {
    const r = store.setUserName(name);
    if (r.ok) setTimeout(() => say({ title: `Nice to meet you, ${r.value}!`, body: "I'll cheer you on every day.", ms: 5000 }), 300);
    return r;
  }));
  ipcMain.handle('pet:rename', mutate((name) => {
    const r = store.renamePet(name);
    if (r.ok && r.value) setTimeout(() => say({ title: `${r.value}! I love it.`, body: 'That name suits me perfectly.', ms: 5000 }), 300);
    return r;
  }));
  ipcMain.handle('pet:recolor', mutate((c) => store.recolorPet(c)));
  ipcMain.handle('pet:species', mutate((sp) => {
    const r = store.changeSpecies(sp);
    if (r.ok) {
      const egg = store.petStatus().stage.id === 'egg';
      petWin.webContents.send('pet:stageup', 'species');
      setTimeout(() => say(egg
        ? { title: '*the egg wiggles*', body: `A ${growth.speciesLabel(r.value)} is waiting in here now!`, ms: 4500 }
        : { title: `Ta-da! I'm a ${growth.speciesLabel(r.value)}!`, body: 'Do you like my new look?', ms: 4500 }), 900);
    }
    return r;
  }));
  ipcMain.handle('habit:update', mutate((id, h) => store.updateHabit(id, h)));
  ipcMain.handle('habit:delete', mutate((id) => store.deleteHabit(id)));
  ipcMain.handle('habit:toggle', mutate((id) => {
    const r = store.toggleHabit(id);
    if (r.ok && r.value) petWin.webContents.send('pet:fed', { category: r.category });
    if (r.ok && r.newLook && !r.stageUp) setTimeout(() => announceLook(r.newLook), 1400);
    if (r.ok && r.stageUp === 'baby' && r.shiny) {
      celebrateShiny();
    } else if (r.ok && r.stageUp) {
      petWin.webContents.send('pet:stageup', r.stageUp);
      // Let the habit list get out of the way so you can see the big moment.
      setTimeout(() => {
        panelWin.hide();
        say({ ...growth.stageUpMessage(r.stageUp, store.data.pet.name, store.data.pet.species), ms: GREETING_MS });
      }, 1200);
    }
    return r;
  }));

  let lastPokeTalk = 0;
  ipcMain.on('pet:hover', (_e, on) => {
    hovering = Boolean(on);
  });
  ipcMain.on('pet:poke', () => {
    if (Date.now() - lastPokeTalk < 4000) return; // giggles, but doesn't chatter every poke
    lastPokeTalk = Date.now();
    const stage = store.petStatus().stage.id;
    const lines = stage === 'egg'
      ? ['*wobble wobble*', '*tap tap* Is it time yet?', '*a tiny peep from inside*']
      : ['Hehe! That tickles!', 'Boop!', 'Hi hi hi!', "Again! Again!", '*happy wiggle*'];
    say({ body: lines[Math.floor(Math.random() * lines.length)], ms: 2500 });
  });

  ipcMain.on('panel:toggle', togglePanel);
  ipcMain.on('panel:close', () => panelWin.hide());

  ipcMain.on('pet:move', (_e, x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    petWin.setPosition(Math.round(x), Math.round(y));
    if (panelWin.isVisible()) placePanel();
    if (bubbleWin.isVisible()) placeBubble(bubbleWin.getBounds().height);
    placeVisitors();
  });
  ipcMain.on('pet:drop', () => {
    const [x, y] = petWin.getPosition();
    const pos = clampToScreen(x, y, PET_W, PET_H);
    petWin.setPosition(Math.round(pos.x), Math.round(pos.y));
    store.set('petPosition', pos);
    home = pos;
    if (panelWin.isVisible()) placePanel();
    if (bubbleWin.isVisible()) placeBubble(bubbleWin.getBounds().height);
    placeVisitors();
  });

  // graduation + garden
  ipcMain.on('ceremony:open', (_e, asPreview) => openCeremony(Boolean(asPreview) || Boolean(preview && preview.stage === 'adult')));
  ipcMain.handle('ceremony:info', () => ceremonyInfo());
  ipcMain.handle('ceremony:confirm', (_e, name) => ceremonyConfirm(name));
  ipcMain.on('ceremony:close', () => ceremonyWin && !ceremonyWin.isDestroyed() && ceremonyWin.close());
  ipcMain.on('garden:open', (_e, sample) => openGarden(Boolean(sample)));
  ipcMain.handle('garden:info', () => gardenInfo());
  ipcMain.handle('hangout:set', (_e, id) => {
    const r = store.setHangout(id);
    if (r.ok) {
      if (gardenWin && !gardenWin.isDestroyed()) gardenWin.setTitle(place().name);
      refreshGarden();
      broadcast();
    }
    return r;
  });
  ipcMain.on('history:open', openHistory);
  ipcMain.handle('history:info', () => store.historyInfo());
  ipcMain.handle('history:month', (_e, y, m) => (Number.isInteger(y) && Number.isInteger(m) ? store.historyMonth(y, m) : []));
  ipcMain.handle('visitor:set', (_e, id, on) => {
    const r = store.setVisitor(id, on);
    if (r.ok) {
      syncVisitors();
      refreshGarden();
      broadcast();
    }
    return r;
  });
  ipcMain.handle('visitor:info', (_e, id) => store.data.garden.find((g) => g.id === id) || null);
  ipcMain.on('visitor:hi', (_e, id) => {
    const g = store.data.garden.find((x) => x.id === id);
    if (g) say({ title: `${growth.shinyName(g)} says hi!`, body: `Popped over from ${place().place}. Hi${store.data.name ? ` ${store.data.name}` : ''}!`, ms: 4000 });
  });
  ipcMain.on('pet:menu', () => Menu.buildFromTemplate(menuTemplate()).popup({ window: petWin }));

  ipcMain.on('bubble:size', (_e, h) => {
    if (!Number.isFinite(h) || napping) return;
    placeBubble(Math.min(Math.max(h, 40), 300));
    pinOnTop(bubbleWin);
    bubbleWin.showInactive(); // never steals focus from what you're typing in
    petWin.webContents.send('pet:talking', true);
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (napping) wake();
    else showPanel();
  });

  if (IS_WIN && app.setAppUserModelId) app.setAppUserModelId('com.pocketpet.app');

  app.whenReady().then(() => {
    hideFromDock(); // a companion, not a Dock app (it only appears there while napping)
    store = new Store(path.join(app.getPath('userData'), 'data.json'));
    store.refreshToday();
    const hatchedShiny = store.rollShiny();
    wireIpc();
    createPet();
    createPanel();
    createBubble();
    createTray();
    syncVisitors();
    home = store.data.petPosition || null;
    scheduleLife();
    registerShortcut();
    setupLoginItem();

    // Say hello once everything has loaded, then see if it's time for a new look.
    bubbleWin.webContents.once('did-finish-load', () => {
      setTimeout(hatchedShiny ? () => celebrateShiny() : store.data.name ? greet : askName, 900);
      setTimeout(checkLook, GREETING_MS + 2000);
    });

    // Opening the laptop or unlocking the screen.
    powerMonitor.on('resume', () => setTimeout(maybeGreet, 1500));
    powerMonitor.on('unlock-screen', () => setTimeout(maybeGreet, 800));

    // Every minute: roll over at 4am, and check for a nudge.
    setInterval(() => {
      const k = dayKey();
      if (k !== lastDay) {
        lastDay = k;
        store.refreshToday();
        checkLook();
      }
      broadcast(); // mood can change as days pass
      checkNudge();
    }, 60 * 1000);
  });

  // Clicking the sleeping blob in the Dock.
  app.on('activate', () => {
    if (napping) wake();
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}

// Used by automated smoke tests only.
module.exports = { wander, visitorMoment, greet, nap, wake, checkNudge, isNapping: () => napping, tryMenu, menuTemplate, openCeremony, openGarden, getStore: () => store };
