// The hangout: every graduate has its own spot (café table, picnic blanket or little planet)
// with a treat or item that matches its look. Regulars wander over to chat, then go back to their own spot.
const $ = (id) => document.getElementById(id);
const CAT = { study: 'Study', fitness: 'Fitness', mind: 'Mind', health: 'Health' };
const LOOK = { study: 'Nerdy', fitness: 'Sporty', mind: 'Zen', health: 'Glowy' };
const CAT_COLOR = { study: '#6f9fe6', fitness: '#f09a4e', mind: '#66bb8c', health: '#b88ae0' };

// ---------- things each pet has, per hangout. Drawn in a 34 x 40 box, keyed by main look (none = no look). ----------
const PROPS = {
  cafe: {
    label: 'Usual order',
    study: { name: 'Coffee', svg: `
      <path class="steam" d="M12 12c-3-3 3-5 0-9" stroke="#cbbfb5" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path class="steam two" d="M19 12c-3-3 3-5 0-9" stroke="#cbbfb5" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M5 16h22v10a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z" fill="#fff" stroke="#d7c7b8" stroke-width="1.5"/>
      <path d="M27 19h2a4 4 0 0 1 0 8h-2" stroke="#d7c7b8" stroke-width="2.5" fill="none"/>
      <ellipse cx="16" cy="17" rx="10" ry="2.5" fill="#8a5a3b"/><path d="M2 38h30" stroke="#e7d8c6" stroke-width="3" stroke-linecap="round"/>` },
    fitness: { name: 'Smoothie', svg: `
      <path d="M20 2l-4 16" stroke="#f0655a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M7 14h20l-3 24H10z" fill="#ffffff" fill-opacity=".55" stroke="#e2d3c3" stroke-width="1.5"/>
      <path d="M8.2 20h17.6L24 38H10z" fill="#f7a1b8"/><path d="M8.6 24h16.8" stroke="#ffd0dc" stroke-width="2"/><circle cx="24" cy="14" r="4" fill="#9ed36a"/>` },
    mind: { name: 'Tea', svg: `
      <path class="steam" d="M15 13c-3-3 3-5 0-9" stroke="#cbbfb5" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M4 18h24v6a10 10 0 0 1-10 10h-4A10 10 0 0 1 4 24z" fill="#fff" stroke="#d7c7b8" stroke-width="1.5"/>
      <ellipse cx="16" cy="19" rx="11" ry="2.5" fill="#b7d48a"/>
      <path d="M24 19l3 9" stroke="#b9a99a" stroke-width="1"/><rect x="25" y="27" width="5" height="6" rx="1" fill="#8fd6ad"/>
      <path d="M1 37h30" stroke="#e7d8c6" stroke-width="3" stroke-linecap="round"/>` },
    health: { name: 'Sparkling water', svg: `
      <path d="M8 6h18l-2 32H10z" fill="#d9f0ff" fill-opacity=".8" stroke="#bfdcef" stroke-width="1.5"/>
      <circle class="fizz" cx="14" cy="32" r="1.5" fill="#fff"/><circle class="fizz" cx="19" cy="30" r="1.2" fill="#fff"/><circle class="fizz" cx="16" cy="26" r="1" fill="#fff"/>
      <circle cx="23" cy="9" r="5" fill="#f6e38c" stroke="#e5c94e" stroke-width="1.2"/><path d="M23 4v10M18 9h10" stroke="#e5c94e" stroke-width=".8"/>` },
    none: { name: 'Hot chocolate', svg: `
      <path class="steam" d="M15 12c-3-3 3-5 0-9" stroke="#cbbfb5" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M6 15h20l-2 20a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#f2b8c6" stroke="#e39aab" stroke-width="1.5"/>
      <ellipse cx="16" cy="16" rx="10" ry="2.6" fill="#7a4a32"/>
      <rect x="10" y="12" width="5" height="5" rx="1.5" fill="#fff"/><rect x="16" y="13" width="5" height="5" rx="1.5" fill="#fff6f8"/>` },
  },
  picnic: {
    label: 'Picnic treat',
    study: { name: 'A good book', svg: `
      <path d="M2 30 L16 26 L32 30 L32 37 L16 33 L2 37 Z" fill="#6f9fe6" stroke="#4f7fc6" stroke-width="1.2"/>
      <path d="M3 29 L16 25 L16 32 L3 36 Z M16 25 L31 29 L31 36 L16 32 Z" fill="#fffaf0" stroke="#d8cdbb" stroke-width="1"/>
      <path d="M6 30 L13 28 M6 32 L13 30 M19 28 L27 30 M19 30 L27 32" stroke="#c9bfae" stroke-width="1"/>` },
    fitness: { name: 'Frisbee', svg: `
      <ellipse cx="17" cy="31" rx="15" ry="6" fill="#f0655a"/><ellipse cx="17" cy="29.5" rx="15" ry="5.5" fill="#ff8a7a"/>
      <ellipse cx="17" cy="29.5" rx="8" ry="2.8" fill="none" stroke="#fff" stroke-width="1.4" opacity=".8"/>` },
    mind: { name: 'Pot of tea', svg: `
      <path class="steam" d="M13 10c-3-3 3-5 0-9" stroke="#cbbfb5" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="16" cy="28" rx="11" ry="9" fill="#a8dcbf" stroke="#7dbb98" stroke-width="1.3"/>
      <path d="M27 26 q6 -2 6 -8" stroke="#7dbb98" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M5 26 q-5 0 -4 5 q1 4 5 2" stroke="#7dbb98" stroke-width="2" fill="none"/><rect x="12" y="16" width="8" height="4" rx="2" fill="#7dbb98"/>` },
    health: { name: 'Watermelon', svg: `
      <path d="M2 24 A15 15 0 0 0 32 24 Z" fill="#7cc576"/><path d="M4.5 24 A12.5 12.5 0 0 0 29.5 24 Z" fill="#fff4e6"/>
      <path d="M6.5 24 A10.5 10.5 0 0 0 27.5 24 Z" fill="#f2576a"/>
      <ellipse cx="12" cy="28" rx="1" ry="1.6" fill="#3a2a26"/><ellipse cx="17" cy="31" rx="1" ry="1.6" fill="#3a2a26"/><ellipse cx="22" cy="28" rx="1" ry="1.6" fill="#3a2a26"/>` },
    none: { name: 'Cupcake', svg: `
      <path d="M8 24 h18 l-3 13 h-12 z" fill="#f6b3cf" stroke="#e28fb2" stroke-width="1.2"/>
      <path d="M12 24 v12 M17 24 v13 M22 24 v12" stroke="#e28fb2" stroke-width="1"/>
      <path d="M6 25 C4 16 12 12 17 14 C22 12 30 16 28 25 Z" fill="#fff8f0" stroke="#efdccc" stroke-width="1.2"/>
      <circle cx="17" cy="11" r="3.5" fill="#f2576a"/>` },
  },
  space: {
    label: 'Space gear',
    study: { name: 'Telescope', svg: `
      <path d="M6 14 L26 6 L29 13 L9 21 Z" fill="#7fb2ff" stroke="#4f7fc6" stroke-width="1.2"/>
      <path d="M26 6 L30 4 L33 11 L29 13 Z" fill="#ffd27a"/><path d="M16 17 L11 38 M16 17 L21 38 M16 17 L16 38" stroke="#c9c4dc" stroke-width="1.6"/>` },
    fitness: { name: 'Little rocket', svg: `
      <path d="M17 2 C25 8 26 20 23 30 H11 C8 20 9 8 17 2 Z" fill="#f4f1fb" stroke="#c9c4dc" stroke-width="1.2"/>
      <circle cx="17" cy="15" r="4" fill="#7fb2ff" stroke="#4f7fc6" stroke-width="1"/>
      <path d="M11 24 L5 32 L11 30 Z M23 24 L29 32 L23 30 Z" fill="#f0655a"/>
      <path class="glow" d="M13 31 Q17 40 21 31 Z" fill="#ffd27a"/>` },
    mind: { name: 'Pocket star', svg: `
      <path class="glow" d="M17 6 L20.5 15 L30 15.5 L22.5 21.5 L25 31 L17 25.5 L9 31 L11.5 21.5 L4 15.5 L13.5 15 Z" fill="#ffe27a" stroke="#f4c542" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="14" cy="18" r="1.2" fill="#3a2a55"/><circle cx="20" cy="18" r="1.2" fill="#3a2a55"/><path d="M15 21 q2 1.5 4 0" stroke="#3a2a55" stroke-width="1" fill="none"/>` },
    health: { name: 'Space juice', svg: `
      <path d="M9 12 H25 V34 a4 4 0 0 1 -4 4 H13 a4 4 0 0 1 -4 -4 Z" fill="#c9a6e8" stroke="#a383cf" stroke-width="1.2"/>
      <rect x="14" y="6" width="6" height="6" rx="1" fill="#e8e6f2"/><path d="M17 6 V1" stroke="#e8e6f2" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 22 h10" stroke="#fff" stroke-width="2" opacity=".6"/><circle class="glow" cx="17" cy="29" r="3" fill="#fff" opacity=".7"/>` },
    none: { name: 'Comet', svg: `
      <path d="M4 34 Q16 26 24 14" stroke="#ffd27a" stroke-width="5" stroke-linecap="round" opacity=".5"/>
      <path d="M8 34 Q18 26 24 14" stroke="#fff3c4" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <circle class="glow" cx="25" cy="12" r="6" fill="#fff3c4" stroke="#ffd27a" stroke-width="1.5"/>` },
  },
};

// The seat each pet keeps, per hangout. Café tables stand in front of the pet; blankets and planets sit under it.
const BLANKETS = [['#f7a8b8', '#fff'], ['#8ec5f2', '#fff'], ['#f6d36b', '#fff'], ['#b9a3ec', '#fff'], ['#9fd6a8', '#fff']];
const PLANETS = [['#f5a3c7', '#f9d27a'], ['#8ec5f2', '#c9a6e8'], ['#f6d36b', '#f5a3c7'], ['#9fd6a8', '#8ec5f2'], ['#c9a6e8', '#f6d36b']];
function spotSvg(theme, i) {
  if (theme === 'picnic') {
    const [a, b] = BLANKETS[i % BLANKETS.length];
    const id = `gingham-${i}`;
    return `<svg class="spot" viewBox="0 0 136 64" aria-hidden="true">
      <defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
        <rect width="14" height="14" fill="${b}"/><rect width="7" height="14" fill="${a}" opacity=".55"/><rect width="14" height="7" fill="${a}" opacity=".55"/></pattern></defs>
      <path d="M14 30 L122 30 L134 58 L2 58 Z" fill="url(#${id})" stroke="${a}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M2 58 L134 58 L134 62 L2 62 Z" fill="${a}" opacity=".8"/></svg>`;
  }
  if (theme === 'space') {
    const [planet, ring] = PLANETS[i % PLANETS.length];
    return `<svg class="spot" viewBox="0 0 136 64" aria-hidden="true">
      <path d="M8 40 Q68 20 128 40" stroke="${ring}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
      <ellipse cx="68" cy="46" rx="44" ry="18" fill="${planet}"/><ellipse cx="54" cy="40" rx="14" ry="5" fill="#fff" opacity=".35"/>
      <circle cx="84" cy="50" r="4" fill="#000" opacity=".08"/><circle cx="50" cy="54" r="3" fill="#000" opacity=".08"/>
      <path d="M8 40 Q68 64 128 40" stroke="${ring}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
  }
  return `<svg class="spot front" viewBox="0 0 136 64" aria-hidden="true">
    <rect x="62" y="16" width="12" height="40" rx="3" fill="var(--table-leg)"/><ellipse cx="68" cy="58" rx="26" ry="5" fill="var(--table-leg)"/>
    <ellipse cx="68" cy="18" rx="62" ry="14" fill="var(--table-edge)"/><ellipse cx="68" cy="15" rx="62" ry="13" fill="var(--table)"/></svg>`;
}

let data = { graduates: [], visitors: [], sample: false, max: 2, hangout: { id: 'cafe', name: 'Café', place: 'the café' } };
let selected = null;
const theme = () => (data.hangout && data.hangout.id) || 'cafe';
const propFor = (look) => PROPS[theme()][(look && look.main) || 'none'] || PROPS[theme()].none;
const propSvg = (look, cls) => `<svg class="${cls}" viewBox="0 0 34 40" aria-hidden="true">${propFor(look).svg}</svg>`;

const fmtDay = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// One-off decorations: bunting flags for the picnic, scattered stars for space.
(function decorate() {
  const flags = $('flags');
  const colours = ['#f7a8b8', '#8ec5f2', '#f6d36b', '#b9a3ec', '#9fd6a8'];
  let f = '';
  for (let i = 0; i < 16; i += 1) {
    const x = 20 + i * 50;
    const y = 6 + Math.sin((x / 800) * Math.PI * 2) * -10 + 10;
    f += `<path d="M${x - 12} ${y} L${x + 12} ${y} L${x} ${y + 22} Z" fill="${colours[i % colours.length]}"/>`;
  }
  flags.innerHTML = f;
  const addStars = (el, n, h) => {
    for (let i = 0; i < n; i += 1) {
      const s = document.createElement('span');
      s.className = 'sstar';
      const size = 1.5 + ((i * 7) % 3);
      Object.assign(s.style, { width: `${size}px`, height: `${size}px`, left: `${(i * 37) % 100}%`, top: `${(i * 53) % h}px`, animationDelay: `${-(i % 6) * 0.5}s` });
      el.append(s);
    }
  };
  addStars($('spaceBack'), 40, 260);
  const floorStars = document.createElement('div');
  floorStars.id = 'floorStars';
  floorStars.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  addStars(floorStars, 30, 600);
  $('floor').prepend(floorStars);
})();

function render() {
  const t = theme();
  document.body.dataset.theme = t;
  $('floorStars').hidden = t !== 'space';
  for (const b of document.querySelectorAll('.themes button')) b.setAttribute('aria-pressed', String(b.dataset.theme === t));
  $('placeName').textContent = data.hangout.name;
  document.title = data.hangout.name;
  const g = data.graduates;
  $('count').textContent = g.length ? `· ${g.length} ${g.length === 1 ? 'regular' : 'regulars'}` : '';
  $('banner').hidden = !data.sample;
  $('empty').hidden = g.length > 0;
  $('emptyTitle').textContent = { cafe: 'The café is open', picnic: 'The picnic is ready', space: 'The space station is waiting' }[t];
  $('emptyText').textContent = `When your pet grows up and graduates, it gets its own spot at ${data.hangout.place}. Every pet you raise stays forever.`;
  const seats = $('seats');
  seats.replaceChildren();
  g.forEach((p, i) => {
    const away = data.visitors.includes(p.id);
    const b = document.createElement('button');
    b.className = 'seat' + (selected === p.id ? ' selected' : '');
    b.dataset.id = p.id;
    b.style.setProperty('--delay', `${-(i * 1.3) % 5}s`);
    b.setAttribute('aria-label', `${p.name}${away ? ', out visiting your desktop' : ''}`);
    const pet = away ? '' : `<div class="pet">${window.PetArt.svg('adult', 'content', 0, p.look, p.color, p.species, p.shiny)}</div>`;
    b.innerHTML = `${spotSvg(t, i)}${pet}${propSvg(p.look, 'prop')}${away ? '<span class="away">Back soon · on your desktop</span>' : ''}`;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = `${p.shiny ? '★ Shiny ' : ''}${p.name}`;
    if (p.shiny) tag.classList.add('shiny');
    b.append(tag);
    b.onclick = () => select(p.id);
    seats.append(b);
  });
  renderDetail();
}

function select(id) {
  selected = id;
  $('dHint').textContent = '';
  render();
}

function renderDetail() {
  const p = data.graduates.find((x) => x.id === selected);
  $('detail').hidden = !p;
  if (!p) return;
  $('dArt').innerHTML = window.PetArt.svg('adult', 'happy', 0, p.look, p.color, p.species, p.shiny).replace('<svg ', '<svg class="p" ') + propSvg(p.look, 'd');
  $('dName').textContent = `${p.shiny ? 'Shiny ' : ''}${p.name}`;
  const rows = [
    ['Look', p.look.main ? LOOK[p.look.main] : 'Classic'],
    ['Badge', p.look.accent ? CAT[p.look.accent] : 'None'],
    ['Colour', p.shiny ? 'Shiny gold' : p.color[0].toUpperCase() + p.color.slice(1)],
    [PROPS[theme()].label, propFor(p.look).name],
    ['Hatched', fmtDay(p.bornDay)],
    ['Graduated', fmtDay(p.graduatedDay)],
    ['Raised on', `${p.stats.totalTicks} habits over ${p.stats.days} days`],
  ];
  const dl = $('dRows');
  dl.replaceChildren();
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  const bars = $('dBars');
  bars.replaceChildren();
  const max = Math.max(1, ...Object.values(p.stats.ticks));
  for (const c of Object.keys(CAT)) {
    const row = document.createElement('div');
    const name = document.createElement('span');
    name.textContent = CAT[c];
    const track = document.createElement('span');
    track.className = 'track';
    const fill = document.createElement('i');
    fill.style.width = `${(p.stats.ticks[c] / max) * 100}%`;
    fill.style.background = CAT_COLOR[c];
    track.append(fill);
    const n = document.createElement('b');
    n.textContent = p.stats.ticks[c];
    row.append(name, track, n);
    bars.append(row);
  }
  const visiting = data.visitors.includes(p.id);
  const btn = $('dVisit');
  btn.textContent = visiting ? `Call back to ${data.hangout.place}` : 'Invite to desktop';
  btn.disabled = data.sample;
  if (data.sample) $('dHint').textContent = "Example pets can't visit your desktop.";
  else if (!visiting && data.visitors.length >= data.max) $('dHint').textContent = `${data.max} pets are already visiting. Call one back first.`;
}

$('dVisit').onclick = async () => {
  const p = data.graduates.find((x) => x.id === selected);
  if (!p) return;
  const r = await window.pet.setVisitor(p.id, !data.visitors.includes(p.id));
  if (!r.ok) $('dHint').textContent = r.error;
};
$('dClose').onclick = () => select(null);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') select(null);
});
for (const b of document.querySelectorAll('.themes button')) {
  b.onclick = () => window.pet.setHangout(b.dataset.theme);
}

// ---------- social life ----------
const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const OPENERS = {
  study: ['Read anything good lately?', 'I learned a new word today!', 'Want to study together later?'],
  fitness: ['Race you over there!', 'Did you stretch today?', 'I did ten squats on the way here!'],
  mind: ['Isn\'t it peaceful here?', 'Breathe in… and out…', 'I feel so calm today.'],
  health: ['Have you had your water today?', 'You look so well rested!', 'Cheers to feeling good!'],
  none: ['Love your outfit!', 'This is my favourite spot.', 'Fancy seeing you here!'],
};
const PLACE_LINES = {
  cafe: ['This cocoa smells amazing.', 'Same table as always?'],
  picnic: ['Pass the strawberries?', 'Look, a butterfly!', 'Perfect picnic weather!'],
  space: ['Look, a shooting star!', 'Want to float over to the moon?', 'I can see your planet from here!'],
};
const replies = (a, b) => [
  `Ha! Good one, ${a.name}.`, 'Always!', `Cheers to that, ${a.name}!`, 'Same time tomorrow?',
  'You\'re the best!', `Want some of my ${propFor(b.look).name.toLowerCase()}?`, 'Tell me everything!', 'Hehe, me too!',
];

function chat(petEl, text, ms) {
  if (!petEl || !petEl.isConnected) return sleep(ms);
  // Bubbles live on the whole room (not just the floor), so they can rise over the wall without being cut off.
  const room = $('room');
  const box = room.getBoundingClientRect();
  const r = petEl.getBoundingClientRect();
  const bubble = document.createElement('div');
  bubble.className = 'chat';
  bubble.textContent = text;
  bubble.style.left = `${r.left - box.left + r.width / 2}px`;
  bubble.style.top = `${r.top - box.top + room.scrollTop + 4}px`;
  room.append(bubble);
  requestAnimationFrame(() => bubble.classList.add('show'));
  return sleep(ms).then(() => {
    bubble.classList.remove('show');
    setTimeout(() => bubble.remove(), 300);
  });
}

// Walk through a list of [x, y] offsets from the pet's own seat, one leg at a time.
async function walk(el, points) {
  for (const [x, y] of points) {
    if (!el.isConnected) return;
    const [px, py] = (el.dataset.at || '0,0').split(',').map(Number);
    const ms = Math.max(350, Math.min(1400, Math.hypot(x - px, y - py) * 3.2));
    el.style.transition = `transform ${ms}ms ease-in-out`;
    el.style.transform = `translate(calc(-50% + ${x}px), ${y}px) scale(.94)`;
    el.dataset.at = `${x},${y}`;
    await sleep(ms);
  }
}

async function socialVisit() {
  const seats = [...document.querySelectorAll('.seat')].filter((s) => s.querySelector('.pet') && s.dataset.id !== selected);
  if (seats.length >= 2 && !document.hidden) {
    const a = pickOne(seats);
    const b = pickOne(seats.filter((s) => s !== a));
    const ga = data.graduates.find((g) => g.id === a.dataset.id);
    const gb = data.graduates.find((g) => g.id === b.dataset.id);
    const petA = a.querySelector('.pet');
    if (ga && gb && petA) {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const side = rb.left >= ra.left ? -1 : 1; // stand on the near side of the friend
      const dx = rb.left - ra.left + side * 68;
      const dy = rb.top - ra.top;
      // Route: step back behind its own spot, walk along the back of the room, then come down
      // behind the friend's table and stand at their side, a little further back than them.
      const BACK = -40;
      const STAND = -16;
      const route = [[0, BACK], [dx, dy + BACK], [dx, dy + STAND]];
      if (!STILL) {
        petA.classList.add('out', 'walking');
        await walk(petA, route);
        petA.classList.remove('walking');
      }
      const line = Math.random() < 0.35
        ? pickOne(PLACE_LINES[theme()])
        : pickOne(OPENERS[(ga.look && ga.look.main) || 'none']);
      await chat(petA, `Hi ${gb.name}! ${line}`, 2600);
      await chat(b.querySelector('.pet'), pickOne(replies(ga, gb)), 2400);
      if (!STILL && petA.isConnected) {
        petA.classList.add('walking');
        await walk(petA, [[dx, dy + BACK], [0, BACK], [0, 0]]);
        petA.style.transform = '';
        delete petA.dataset.at;
        petA.classList.remove('walking', 'out');
      }
    }
  }
  setTimeout(socialVisit, 2500 + Math.random() * 3500);
}
setTimeout(socialVisit, 2000);

window.pet.gardenInfo().then((d) => {
  data = d;
  render();
});
window.pet.onGarden((d) => {
  data = d;
  render();
});
