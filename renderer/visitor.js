// A graduate visiting from the café. It just hangs out; click it to say hi.
const id = new URLSearchParams(location.search).get('id');
const v = document.getElementById('v');
document.documentElement.style.setProperty('--delay', `${-Math.random() * 2}s`);

window.pet.visitorInfo(id).then((g) => {
  if (!g) return;
  document.getElementById('art').innerHTML = window.PetArt.svg('adult', 'content', 0, g.look, g.color, g.species, g.shiny);
  document.getElementById('tag').textContent = `${g.shiny ? 'Shiny ' : ''}${g.name} · visiting`;
});
v.addEventListener('click', () => window.pet.visitorHi(id));
v.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.pet.petMenu();
});

// ---------- hopping along, nuzzling and chatting with your pet ----------
const artEl = document.getElementById('art');
const bubble = document.getElementById('bubble');
let bubbleTimer = null;
function flash(cls, ms) {
  v.classList.remove(cls);
  void v.offsetWidth;
  v.classList.add(cls);
  setTimeout(() => v.classList.remove(cls), ms);
}
window.pet.onVisitorAct((a) => {
  artEl.style.setProperty('--dir', String(a.dir || 1));
  if (a.type === 'hop') setTimeout(() => flash('hopping', 340), 60 + Math.random() * 120);
  if (a.type === 'walk') flash('walking', 650);
  if (a.type === 'nuzzle') {
    flash('nuzzling', 2000);
    const h = document.createElement('div');
    h.className = 'heart';
    h.style.left = a.dir > 0 ? '96px' : '30px';
    h.style.top = '70px';
    h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="#f47aa8"/></svg>';
    v.append(h);
    setTimeout(() => h.remove(), 1500);
  }
  if (a.type === 'say') {
    clearTimeout(bubbleTimer);
    bubble.textContent = a.text;
    bubble.classList.add('show');
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 3200);
  }
});
