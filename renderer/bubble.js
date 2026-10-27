const wrap = document.getElementById('wrap');

window.pet.onBubble((msg) => {
  if (msg.hide) {
    wrap.classList.remove('show');
    return;
  }
  document.getElementById('title').textContent = msg.title || '';
  document.getElementById('body').textContent = msg.body || '';
  wrap.classList.toggle('up', msg.tail === 'up');
  wrap.classList.remove('show');
  // Measure, tell the main process how tall we are, then fade in.
  // Timers, not animation frames: frames don't run while the window is hidden.
  setTimeout(() => {
    window.pet.bubbleSize(Math.ceil(wrap.getBoundingClientRect().height));
    setTimeout(() => wrap.classList.add('show'), 30);
  }, 0);
});
