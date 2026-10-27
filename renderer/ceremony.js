const $ = (id) => document.getElementById(id);
const CAT = { study: 'Study', fitness: 'Fitness', mind: 'Mind', health: 'Health' };
const LOOK = { study: 'Nerdy', fitness: 'Sporty', mind: 'Zen', health: 'Glowy' };
const CAT_COLOR = { study: '#6f9fe6', fitness: '#f09a4e', mind: '#66bb8c', health: '#b88ae0' };
const SWATCH = { pink: '#e9b8dc', peach: '#fbc6a2', mint: '#ade5c7', sky: '#acd2f6', lavender: '#cbb7f3', lemon: '#f6e38c', cloud: '#e8e6f0', cocoa: '#c8956a', natural: 'conic-gradient(#e2683a, #8ccf6a, #b9814c, #2d2a33, #ffffff, #e2683a)' };
let info = null;

function chip(text, color) {
  const c = document.createElement('span');
  c.className = 'chip';
  if (color) {
    const dot = document.createElement('i');
    dot.style.background = color;
    c.append(dot);
  }
  c.append(text);
  return c;
}

function render() {
  const p = info.pet;
  $('previewTag').hidden = !info.preview;
  $('art').innerHTML = window.PetArt.svg('adult', 'happy', 0, p.look, p.color, p.species, p.shiny);
  // The study look already wears a graduation cap.
  document.querySelector('.cap').style.display = p.look.main === 'study' ? 'none' : '';
  const who = p.name ? `${p.shiny ? 'Shiny ' : ''}${p.name}` : p.shiny ? 'Your shiny pet' : 'Your pet';
  $('title').textContent = `${who} is all grown up!`;
  const s = info.stats;
  const top = Object.entries(s.ticks).sort((a, b) => b[1] - a[1])[0];
  const parts = [`${s.days} ${s.days === 1 ? 'day' : 'days'}`, `${s.totalTicks} ${s.totalTicks === 1 ? 'habit' : 'habits'} ticked`];
  if (top && top[1] > 0) parts.push(`mostly ${CAT[top[0]]}`);
  $('stats').textContent = parts.join(' · ');
  const chips = $('chips');
  chips.replaceChildren();
  chips.append(chip(`Look: ${p.look.main ? LOOK[p.look.main] : 'Classic'}`, p.look.main ? CAT_COLOR[p.look.main] : null));
  if (p.look.accent) chips.append(chip(`Badge: ${CAT[p.look.accent]}`, CAT_COLOR[p.look.accent]));
  chips.append(p.shiny
    ? chip('★ Shiny gold', '#f4c94a')
    : chip(`Colour: ${p.color[0].toUpperCase()}${p.color.slice(1)}`, SWATCH[p.color]));
  $('name').value = p.name || '';
  $('name').placeholder = 'e.g. Yumi';
  const where = (info.place && info.place.place) || 'the café';
  $('confirm').textContent = info.preview ? 'Finish preview' : `Send to ${where}`;
  $('nameLabel').firstChild.textContent = `Its name at ${where}`;
  $('openGarden').textContent = `Visit ${where}`;
  setTimeout(() => $('name').focus(), 50);
}

async function confirm() {
  const name = $('name').value.trim();
  if (!name) {
    $('error').textContent = 'Give your pet a name before it graduates.';
    $('name').focus();
    return;
  }
  const r = await window.pet.ceremonyConfirm(name);
  if (!r.ok) {
    $('error').textContent = r.error;
    return;
  }
  confetti(160);
  $('ask').hidden = true;
  $('askActions').hidden = true;
  $('done').hidden = false;
  $('doneActions').hidden = false;
  $('doneTitle').textContent = `${info.pet.shiny ? 'Shiny ' : ''}${name} moved to ${(info.place && info.place.place) || 'the café'}!`;
  $('doneNote').textContent = info.preview
    ? 'That was a preview, so nothing changed. Your real pet is still here.'
    : 'A new egg is waiting on your desktop. Keep it warm with your habits.';
  $('openGarden').focus();
}

$('confirm').onclick = confirm;
$('name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirm();
});
$('name').addEventListener('input', () => ($('error').textContent = ''));
$('notYet').onclick = () => window.pet.ceremonyClose();
$('close').onclick = () => window.pet.ceremonyClose();
$('openGarden').onclick = () => window.pet.openGarden(info.preview);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.pet.ceremonyClose();
});

// ---- confetti ----
const canvas = $('confetti');
const ctx = canvas.getContext('2d');
let bits = [];
function confetti(n) {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const colors = ['#f47aa8', '#f4c542', '#7fbcf2', '#8fd6ad', '#c9a6e8', '#f09a4e'];
  for (let i = 0; i < n; i += 1) {
    bits.push({
      x: width / 2 + (Math.random() - 0.5) * 80, y: height * 0.32,
      vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: colors[i % colors.length], life: 0,
    });
  }
  if (bits.length === n) requestAnimationFrame(tick);
}
function tick() {
  const { width, height } = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, width, height);
  bits = bits.filter((b) => b.y < height + 20 && b.life < 400);
  for (const b of bits) {
    b.vy += 0.22;
    b.vx *= 0.99;
    b.x += b.vx;
    b.y += b.vy;
    b.r += b.vr;
    b.life += 1;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.r);
    ctx.fillStyle = b.c;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
  }
  if (bits.length) requestAnimationFrame(tick);
}

window.pet.ceremonyInfo().then((d) => {
  info = d;
  render();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(() => confetti(90), 250);
});
