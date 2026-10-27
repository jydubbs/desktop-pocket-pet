const $ = (id) => document.getElementById(id);
const CAT = { study: 'Study', fitness: 'Fitness', mind: 'Mind', health: 'Health' };
const LOOK = { study: 'Nerdy', fitness: 'Sporty', mind: 'Zen', health: 'Glowy' };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17l-6.1 3.3 1.4-6.7-5-4.6 6.8-.8z" fill="currentColor"/></svg>';

let info = null;
let view = null; // { y, m } month being shown

const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  Object.assign(n, props);
  for (const k of [].concat(kids)) n.append(k);
  return n;
};
const keyDate = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (k, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (k ? keyDate(k).toLocaleDateString(undefined, opts) : '—');
const daysLabel = (days) => {
  if (!days) return 'Every day';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(', ');
};

// ---------- tabs ----------
const TABS = ['calendar', 'streaks', 'pets'];
function showTab(name) {
  for (const t of TABS) {
    $(`tab-${t}`).setAttribute('aria-selected', String(t === name));
    $(t).hidden = t !== name;
  }
}
for (const t of TABS) $(`tab-${t}`).onclick = () => showTab(t);

// ---------- calendar ----------
async function renderMonth() {
  const cells = await window.pet.historyMonth(view.y, view.m);
  const grid = $('grid');
  grid.replaceChildren();
  for (const d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) grid.append(el('div', { className: 'dow', textContent: d }));
  for (const c of cells) {
    if (!c) {
      grid.append(el('div'));
      continue;
    }
    const cell = el('div', { className: 'day', textContent: String(c.day) });
    if (c.future) {
      cell.classList.add('future');
    } else {
      const level = c.ratio <= 0 ? 0 : c.ratio < 0.34 ? 1 : c.ratio < 0.67 ? 2 : c.ratio < 1 ? 3 : 4;
      if (level) cell.classList.add(`l${level}`);
      if (c.today) cell.classList.add('today');
      if (c.due > 0 && c.ratio >= 1) cell.insertAdjacentHTML('beforeend', STAR);
      cell.title = `${fmt(c.key, { weekday: 'short', day: 'numeric', month: 'short' })} · ${c.due ? `${Math.min(c.done, c.due)} of ${c.due} done` : 'nothing scheduled'}`;
    }
    grid.append(cell);
  }
  $('monthName').textContent = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = keyDate(info.today);
  $('next').disabled = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m >= today.getMonth());
  const first = info.summary.firstDay ? keyDate(info.summary.firstDay) : today;
  $('prev').disabled = view.y < first.getFullYear() || (view.y === first.getFullYear() && view.m <= first.getMonth());
}
$('prev').onclick = () => {
  view = view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 };
  renderMonth();
};
$('next').onclick = () => {
  view = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  renderMonth();
};

// ---------- streaks ----------
function renderStreaks() {
  const box = $('streaks');
  box.replaceChildren();
  if (!info.streaks.length) {
    box.append(el('div', { className: 'empty', textContent: 'Add a habit to start a streak.' }));
    return;
  }
  const sorted = [...info.streaks].sort((a, b) => b.current - a.current || b.best - a.best);
  for (const h of sorted) {
    const card = el('div', { className: 'habit' });
    card.style.setProperty('--cat', `var(--${h.category})`);
    const dot = el('i');
    dot.style.background = `var(--${h.category})`;
    card.append(
      el('div', {}, [el('div', { className: 'name' }, [dot, h.name]), el('div', { className: 'meta', textContent: `${CAT[h.category]} · ${daysLabel(h.days)}` })]),
      el('div', { className: 'nums' }, [
        el('div', {}, [el('b', { textContent: String(h.current) }), el('span', { textContent: 'current' })]),
        el('div', {}, [el('b', { textContent: String(h.best) }), el('span', { textContent: 'best' })]),
      ]),
    );
    const strip = el('div', { className: 'strip' });
    for (const d of h.recent) {
      const label = { done: 'done', missed: 'missed', off: 'not scheduled', none: 'before this habit', today: 'not done yet' }[d.state];
      strip.append(el('span', { className: d.state, title: `${fmt(d.key, { weekday: 'short', day: 'numeric', month: 'short' })} · ${label}` }));
    }
    card.append(strip, el('div', { className: 'strip-legend' }, [el('span', { textContent: '2 weeks ago' }), el('span', { textContent: 'Today' })]));
    box.append(card);
  }
}

// ---------- pets ----------
function petCard(p, current) {
  const card = el('article', { className: 'pet' });
  const portrait = el('div', { className: 'portrait' });
  portrait.innerHTML = window.PetArt.svg(current ? p.stage.id : 'adult', 'content', current ? p.stage.progress : 0, p.look, p.color, p.species, p.shiny);
  const name = current ? p.displayName : `${p.shiny ? 'Shiny ' : ''}${p.name}`;
  const where = current
    ? el('div', { className: 'where' }, [el('span', { className: 'pill', textContent: 'Growing up' }), ` ${p.xp} XP`])
    : el('div', { className: 'where', textContent: `At ${(info.hangout && info.hangout.place) || 'the café'} since ${fmt(p.graduatedDay)}` });
  const m = p.milestones || {};
  const rows = [['Egg laid', m.laid], [p.shiny ? 'Hatched shiny ★' : 'Hatched', m.hatched || p.shinyDay], ['Became a teen', m.teen], ['Became an adult', m.adult]];
  if (!current) rows.push(['Graduated', m.graduated || p.graduatedDay]);
  const timeline = el('ul', { className: 'timeline' });
  for (const [label, k] of rows) {
    timeline.append(el('li', { className: k ? '' : 'pending' }, [el('span', { textContent: label }), el('span', { textContent: k ? fmt(k) : current ? 'not yet' : '—' })]));
  }
  const look = p.look && p.look.main ? `${LOOK[p.look.main]}${p.look.accent ? ` · ${CAT[p.look.accent]} badge` : ''}` : 'No look yet';
  const ticks = (p.stats && p.stats.ticks) || {};
  const total = Object.values(ticks).reduce((a, b) => a + b, 0);
  const bar = el('div', { className: 'mini', title: Object.keys(CAT).map((c) => `${CAT[c]} ${ticks[c] || 0}`).join(' · ') });
  for (const c of Object.keys(CAT)) {
    if (!ticks[c]) continue;
    const seg = el('i');
    seg.style.width = `${(ticks[c] / total) * 100}%`;
    seg.style.background = `var(--${c})`;
    bar.append(seg);
  }
  card.append(portrait, el('h3', { textContent: name }), where, timeline,
    el('div', { className: 'where', textContent: `${look} · raised on ${total} ${total === 1 ? 'habit' : 'habits'}` }), bar);
  return card;
}

function renderPets() {
  const box = $('pets');
  box.replaceChildren();
  const grid = el('div', { className: 'pets' });
  grid.append(petCard(info.current, true));
  for (const g of [...info.graduates].reverse()) grid.append(petCard(g, false));
  box.append(grid);
  if (!info.graduates.length) box.append(el('div', { className: 'empty', textContent: 'Pets you graduate will have their journal here too.' }));
}

// ---------- load ----------
async function load() {
  info = await window.pet.historyInfo();
  if (!view) {
    const t = keyDate(info.today);
    view = { y: t.getFullYear(), m: t.getMonth() };
  }
  $('tTicks').textContent = info.summary.totalTicks;
  $('tPerfect').textContent = info.summary.perfectDays;
  $('tRow').textContent = info.summary.activeStreak;
  await renderMonth();
  renderStreaks();
  renderPets();
}
load();
window.pet.onHistory(() => load());
