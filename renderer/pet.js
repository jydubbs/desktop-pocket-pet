const petEl = document.getElementById('pet');
const art = document.getElementById('art');
const badge = document.getElementById('badge');
const nameplate = document.getElementById('nameplate');

let me = { stage: { id: 'egg', progress: 0 }, mood: 'content' }; // this pet's growth and mood
let face = null; // a short-lived expression on top of the mood
let faceTimer = null;
let drawnKey = '';

// ---------- drawing ----------

function draw() {
  const shown = face || me.mood;
  const look = me.look || {};
  const key = `${me.stage.id}|${shown}|${me.stage.id === 'egg' ? Math.floor(me.stage.progress * 20) : ''}|${look.main}|${look.accent}|${me.color}|${me.species}|${me.shiny}`;
  nameplate.textContent = me.displayName || '';
  if (key !== drawnKey) {
    art.innerHTML = window.PetArt.svg(me.stage.id, shown, me.stage.progress, look, me.color, me.species, me.shiny);
    drawnKey = key;
  }
  petEl.className = petEl.className
    .split(' ').filter((c) => c && !c.startsWith('mood-') && !c.startsWith('face-')).join(' ');
  petEl.classList.add(`mood-${face ? 'none' : me.mood}`);
  if (face) petEl.classList.add(`face-${face}`);
}

function express(f, ms) {
  clearTimeout(faceTimer);
  face = f;
  draw();
  faceTimer = setTimeout(() => {
    face = null;
    draw();
  }, ms);
}

function flash(cls, ms) {
  petEl.classList.remove(cls);
  void petEl.offsetWidth; // restart the animation
  petEl.classList.add(cls);
  setTimeout(() => petEl.classList.remove(cls), ms);
}

function hearts(n = 1, from = { x: 90, y: 70 }) {
  for (let i = 0; i < n; i += 1) {
    setTimeout(() => {
      const h = document.createElement('div');
      h.className = 'heart';
      h.style.left = `${from.x + (Math.random() * 40 - 20)}px`;
      h.style.top = `${from.y}px`;
      h.style.setProperty('--dx', `${Math.random() * 20 - 10}px`);
      h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="#f47aa8"/></svg>';
      petEl.append(h);
      setTimeout(() => h.remove(), 1500);
    }, i * 180);
  }
}

function sparkles(n = 12) {
  for (let i = 0; i < n; i += 1) {
    const s = document.createElement('div');
    s.className = me.shiny ? 'spark gold' : 'spark';
    const a = (i / n) * Math.PI * 2;
    s.style.left = '90px';
    s.style.top = '100px';
    s.style.setProperty('--dx', `${Math.cos(a) * 70}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * 60}px`);
    petEl.append(s);
    setTimeout(() => s.remove(), 1100);
  }
}

// ---------- state from the app ----------

function onState(state) {
  me = state.pet;
  const due = state.habits.filter((h) => h.due);
  const left = due.filter((h) => !h.done).length;
  badge.classList.toggle('alldone', due.length > 0 && left === 0);
  badge.classList.toggle('preview', Boolean(me.preview));
  if (me.preview) badge.textContent = 'Preview';
  else if (due.length === 0) badge.textContent = '';
  else if (left === 0) badge.textContent = 'All done ♥';
  else badge.textContent = `${left} to go`;
  draw();
}

window.pet.getState().then(onState);
window.pet.onState(onState);
window.pet.onTalking((on) => petEl.classList.toggle('talking', on));

// Each tick drops a treat that matches the habit's category.
window.pet.onFed(({ category }) => {
  const mouth = window.PetArt.mouthPoint(me.stage.id, me.species);
  const t = document.createElement('div');
  t.className = 'treat';
  t.style.left = `${mouth.x}px`;
  t.style.top = `${mouth.y}px`;
  t.innerHTML = window.PetArt.treat(category);
  petEl.append(t);
  setTimeout(() => t.remove(), 750);
  setTimeout(() => {
    if (me.stage.id === 'egg') {
      flash('poked', 900); // the egg wiggles happily instead of eating
      hearts(1, { x: 90, y: 60 });
    } else {
      express('eat', 1100);
      setTimeout(() => hearts(1, { x: 90, y: mouth.y - 50 }), 600);
    }
  }, 560);
});

window.pet.onStageUp((kind) => {
  flash('evolving', 1400);
  setTimeout(() => sparkles(14), 500);
  if (kind === 'shiny') {
    // golden rays spinning out from behind the pet, then extra sparkles
    const rays = document.createElement('div');
    rays.className = 'rays';
    for (let i = 0; i < 12; i += 1) {
      const r = document.createElement('i');
      r.style.transform = `rotate(${i * 30}deg)`;
      rays.append(r);
    }
    petEl.prepend(rays);
    setTimeout(() => sparkles(18), 900);
    setTimeout(() => sparkles(18), 1500);
    setTimeout(() => rays.remove(), 2600);
  }
});

// ---------- click, double-click (poke), drag ----------

let press = null;
let pendingClick = null;

function poke() {
  if (me.stage.id === 'egg') flash('poked', 900);
  else express('giggle', 900);
  hearts(1);
  window.pet.poke();
}

petEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  press = { offX: e.clientX, offY: e.clientY, sx: e.screenX, sy: e.screenY, dragging: false };
  petEl.setPointerCapture(e.pointerId);
});
petEl.addEventListener('pointermove', (e) => {
  if (!press) {
    stroke(e);
    return;
  }
  if (!press.dragging && Math.hypot(e.screenX - press.sx, e.screenY - press.sy) > 4) {
    press.dragging = true;
    petEl.classList.add('dragging');
    if (me.stage.id !== 'egg') {
      clearTimeout(faceTimer);
      face = 'surprised';
      draw();
    }
  }
  if (press.dragging) window.pet.movePet(e.screenX - press.offX, e.screenY - press.offY);
});

function endDrag() {
  petEl.classList.remove('dragging');
  window.pet.dropPet();
  face = null;
  draw();
  flash('landed', 500);
}

petEl.addEventListener('pointerup', () => {
  if (!press) return;
  const wasDrag = press.dragging;
  press = null;
  if (wasDrag) return endDrag();
  // Wait a moment to tell a single click (habits) from a double click (poke).
  if (pendingClick) {
    clearTimeout(pendingClick);
    pendingClick = null;
    poke();
  } else {
    pendingClick = setTimeout(() => {
      pendingClick = null;
      window.pet.togglePanel();
    }, 230);
  }
});
petEl.addEventListener('pointercancel', () => {
  if (press && press.dragging) endDrag();
  press = null;
});
petEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.pet.petMenu();
});

// ---------- stroking: move the mouse back and forth over the pet ----------

let lastX = null;
let lastDir = 0;
let turns = [];
let purrUntil = 0;

function stroke(e) {
  if (lastX !== null) {
    const dx = e.clientX - lastX;
    if (Math.abs(dx) >= 3) {
      const dir = Math.sign(dx);
      if (lastDir && dir !== lastDir) turns.push(Date.now());
      lastDir = dir;
    }
  }
  lastX = e.clientX;
  const now = Date.now();
  turns = turns.filter((t) => now - t < 1400);
  if (turns.length >= 3 && now > purrUntil) {
    purrUntil = now + 1800;
    turns = [];
    if (me.stage.id === 'egg') flash('poked', 900);
    else express('happy', 1600);
    hearts(3);
  }
}
petEl.addEventListener('pointerleave', () => {
  lastX = null;
  lastDir = 0;
  turns = [];
});

// ---------- life on the desktop ----------
// Tell the app when the mouse is over the pet, so it never hops away from under you.
petEl.addEventListener('pointerenter', () => window.pet.hover(true));
petEl.addEventListener('pointerleave', () => window.pet.hover(false));

window.pet.onAct((a) => {
  art.style.setProperty('--dir', String(a.dir || 1));
  if (a.type === 'hop') flash('hopping', 340);
  if (a.type === 'nuzzle') {
    flash('nuzzling', 1900);
    if (me.stage.id !== 'egg') express('happy', 1900);
    hearts(3, { x: a.dir < 0 ? 50 : 130, y: 70 });
  }
});
