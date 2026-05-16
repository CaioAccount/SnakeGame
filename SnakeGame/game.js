const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const CELL = 20;
const COLS = W / CELL;
const ROWS = H / CELL;

/* ── State ── */
let snake, dir, nextDir, food, particles, trail;
let score, level, best, speed, loop, running, paused, frameCount;
let combo, comboTimer, lastEatTime;
let powerup, powerupTimer, doublePoints, slowActive;
let touchStartX, touchStartY;

best = parseInt(localStorage.getItem('neonSnakeBest') || '0');
document.getElementById('best').textContent = best;

/* ────────────────────────────────
   INIT
──────────────────────────────── */
function init() {
  snake      = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  trail      = [];
  dir        = { x: 1, y: 0 };
  nextDir    = { x: 1, y: 0 };
  particles  = [];
  score      = 0;
  level      = 1;
  speed      = 140;
  frameCount = 0;
  running    = true;
  paused     = false;
  combo      = 1;
  comboTimer = 0;
  lastEatTime = 0;
  powerup    = null;
  powerupTimer = 0;
  doublePoints = false;
  slowActive = false;

  hidePowerupUI();
  updateHUD();
  spawnFood();

  clearInterval(loop);
  loop = setInterval(tick, speed);
}

/* ────────────────────────────────
   FOOD / POWERUPS
──────────────────────────────── */
function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));

  food = pos;
  food.pulse = 0;

  const r = Math.random();
  if (r < 0.10)       food.type = 'bonus';    // +50
  else if (r < 0.18)  food.type = 'slow';     // slow powerup
  else if (r < 0.26)  food.type = 'double';   // double points powerup
  else                food.type = 'normal';   // +10
}

function foodColor(type) {
  if (type === 'bonus')  return '#ff00ff';
  if (type === 'slow')   return '#00aaff';
  if (type === 'double') return '#ffaa00';
  return '#00ffcc';
}

/* ────────────────────────────────
   GAME TICK
──────────────────────────────── */
function tick() {
  if (!running || paused) return;

  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall / self collision
  if (
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS ||
    snake.some(s => s.x === head.x && s.y === head.y)
  ) {
    gameOver();
    return;
  }

  // Trail: save last tail position before move
  const oldTail = { ...snake[snake.length - 1] };

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    // Eat!
    const now = Date.now();
    const timeSinceLastEat = now - lastEatTime;
    lastEatTime = now;

    // Combo: eating within 3 s increases multiplier
    if (lastEatTime > 0 && timeSinceLastEat < 3000) {
      combo = Math.min(combo + 1, 8);
    } else {
      combo = 1;
    }
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { combo = 1; updateHUD(); }, 3000);

    let pts = food.type === 'bonus' ? 50 : 10;
    if (doublePoints) pts *= 2;
    pts *= combo;
    score += pts;

    burst(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, foodColor(food.type));

    // Powerup effects
    if (food.type === 'slow') activatePowerup('slow');
    else if (food.type === 'double') activatePowerup('double');

    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) { level = newLevel; showLevelUp(); }

    speed = Math.max(60, 140 - (level - 1) * 10);
    if (slowActive) speed = Math.min(speed + 40, 200);

    clearInterval(loop);
    loop = setInterval(tick, speed);
    spawnFood();

    // Keep tail (snake grows)
    trail.push({ x: oldTail.x, y: oldTail.y, life: 1 });

    if (score > best) {
      best = score;
      localStorage.setItem('neonSnakeBest', best);
    }
    updateHUD();
  } else {
    snake.pop();
    // Ghost trail on body
    trail.push({ x: oldTail.x, y: oldTail.y, life: 0.4 });
  }

  food.pulse = (food.pulse || 0) + 0.15;
  frameCount++;
  draw();

  // Powerup countdown
  if (powerupTimer > 0) {
    powerupTimer -= speed;
    const total = powerup === 'slow' ? 5000 : 8000;
    const pct = Math.max(0, powerupTimer / total * 100);
    document.getElementById('powerup-timer-bar').style.width = pct + '%';
    if (powerupTimer <= 0) deactivatePowerup();
  }
}

/* ────────────────────────────────
   POWERUPS
──────────────────────────────── */
function activatePowerup(type) {
  deactivatePowerup();
  powerup = type;

  if (type === 'slow') {
    slowActive = true;
    powerupTimer = 5000;
    document.getElementById('powerup-label').textContent = '⏱ MODO LENTO';
    document.getElementById('powerup-label').style.color = '#00aaff';
    document.getElementById('powerup-timer-bar').style.background = '#00aaff';
  } else if (type === 'double') {
    doublePoints = true;
    powerupTimer = 8000;
    document.getElementById('powerup-label').textContent = '✕2 PONTOS DUPLOS';
    document.getElementById('powerup-label').style.color = '#ffaa00';
    document.getElementById('powerup-timer-bar').style.background = '#ffaa00';
  }

  document.getElementById('powerup-timer-wrap').style.display = 'block';
}

function deactivatePowerup() {
  slowActive = false;
  doublePoints = false;
  powerup = null;
  powerupTimer = 0;
  hidePowerupUI();
}

function hidePowerupUI() {
  document.getElementById('powerup-label').textContent = '';
  document.getElementById('powerup-timer-wrap').style.display = 'none';
}

/* ────────────────────────────────
   DRAW
──────────────────────────────── */
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawTrail();
  drawFood();
  drawSnake();
  drawParticles();
  if (paused) drawPauseOverlay();
}

function drawGrid() {
  ctx.strokeStyle = '#ffffff06';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
  }
  for (let y = 0; y < ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
  }
}

function drawTrail() {
  trail = trail.filter(t => t.life > 0);
  trail.forEach(t => {
    ctx.save();
    ctx.globalAlpha = t.life * 0.35;
    ctx.fillStyle = '#00ffcc';
    const pad = 4;
    ctx.beginPath();
    roundRect(ctx, t.x * CELL + pad, t.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 3);
    ctx.fill();
    ctx.restore();
    t.life -= 0.07;
  });
}

function drawFood() {
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const p = food.pulse;
  const col = foodColor(food.type);
  const r = 6 + Math.sin(p) * 2;

  ctx.save();
  ctx.shadowBlur = 20 + Math.sin(p) * 10;
  ctx.shadowColor = col;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Orbiting spikes for bonus / slow / double
  if (food.type !== 'normal') {
    const spikes = food.type === 'slow' ? 3 : 4;
    ctx.strokeStyle = col + '99';
    ctx.lineWidth = 1;
    for (let i = 0; i < spikes; i++) {
      const a = p + i * (Math.PI * 2 / spikes);
      const len = 12 + Math.sin(p * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8);
      ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawSnake() {
  const len = snake.length;
  snake.forEach((s, i) => {
    const t = 1 - i / len;
    const x = s.x * CELL;
    const y = s.y * CELL;
    const pad = 1;
    const hue = (frameCount * 2 + i * 8) % 360;

    ctx.save();
    if (i === 0) {
      // Head glows based on powerup
      const headCol = powerup === 'double' ? '#ffaa00' : powerup === 'slow' ? '#00aaff' : '#00ffcc';
      ctx.shadowBlur = 18;
      ctx.shadowColor = headCol;
      ctx.fillStyle = headCol;
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${hue},100%,65%,0.6)`;
      ctx.fillStyle = `hsla(${hue},100%,65%,${(0.3 + t * 0.7).toFixed(2)})`;
    }

    ctx.beginPath();
    roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, Math.min(4, CELL / 3));
    ctx.fill();

    if (i === 0) {
      const ex = dir.x, ey = dir.y;
      const e1x = x + CELL / 2 + ex * 4 + ey * 5;
      const e1y = y + CELL / 2 + ey * 4 + ex * 5;
      const e2x = x + CELL / 2 + ex * 4 - ey * 5;
      const e2y = y + CELL / 2 + ey * 4 - ex * 5;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(e1x, e1y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e2x, e2y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = '#060610bb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#00ffcc';
  ctx.font = '900 24px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#00ffcc';
  ctx.fillText('⏸ PAUSADO', W / 2, H / 2 - 10);
  ctx.font = '400 11px Orbitron, monospace';
  ctx.fillStyle = '#ffffff66';
  ctx.shadowBlur = 0;
  ctx.fillText('pressione P para continuar', W / 2, H / 2 + 18);
  ctx.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
}

/* ────────────────────────────────
   PARTICLES
──────────────────────────────── */
function burst(x, y, col) {
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1, col, r: 2 + Math.random() * 3 });
  }
}

function drawParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.col;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.045;
    p.vx *= 0.92;
    p.vy *= 0.92;
  });
}

/* ────────────────────────────────
   HUD / UI
──────────────────────────────── */
function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('best').textContent = best;

  const comboBox = document.getElementById('combo-box');
  const comboEl  = document.getElementById('combo');
  if (combo > 1) {
    comboBox.style.display = '';
    comboEl.textContent = 'x' + combo;
    // re-trigger animation
    comboEl.classList.remove('combo-val');
    void comboEl.offsetWidth;
    comboEl.classList.add('combo-val');
  } else {
    comboBox.style.display = 'none';
  }
}

function showLevelUp() {
  const el = document.getElementById('lvl-flash');
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 900);
}

/* ────────────────────────────────
   GAME OVER
──────────────────────────────── */
function gameOver() {
  running = false;
  clearInterval(loop);
  deactivatePowerup();

  // Explode every segment
  snake.forEach((s, i) => {
    setTimeout(() => {
      burst(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, '#00ffcc');
      draw();
    }, i * 25);
  });

  saveScore(score, level);

  setTimeout(() => {
    const fs = document.getElementById('final-score');
    fs.textContent = `Score: ${score}  |  Level: ${level}\nMelhor: ${best}`;
    fs.style.display = 'block';

    const ov = document.getElementById('overlay');
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-sub').textContent = '';
    document.getElementById('start-btn').textContent = '▶ JOGAR NOVAMENTE';
    ov.style.display = 'flex';
  }, snake.length * 25 + 300);
}

/* ────────────────────────────────
   HIGH SCORES
──────────────────────────────── */
function saveScore(s, l) {
  let scores = JSON.parse(localStorage.getItem('neonSnakeScores') || '[]');
  scores.push({ score: s, level: l, date: new Date().toLocaleDateString('pt-BR') });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 5);
  localStorage.setItem('neonSnakeScores', JSON.stringify(scores));
}

function showScores() {
  const scores = JSON.parse(localStorage.getItem('neonSnakeScores') || '[]');
  const list = document.getElementById('scores-list');
  list.innerHTML = '';
  if (scores.length === 0) {
    list.innerHTML = '<li style="justify-content:center;color:#ffffff44">Nenhum score ainda</li>';
  } else {
    scores.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">#${i + 1}</span><span>${s.score} pts — Lv${s.level}</span><span style="color:#ffffff44;font-size:10px">${s.date}</span>`;
      list.appendChild(li);
    });
  }
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('scores-panel').style.display = 'flex';
}

/* ────────────────────────────────
   PAUSE
──────────────────────────────── */
function togglePause() {
  if (!running) return;
  paused = !paused;
  if (!paused) draw();
}

/* ────────────────────────────────
   KEYBOARD
──────────────────────────────── */
document.addEventListener('keydown', e => {
  const k = e.key;

  // Pause
  if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); return; }

  if (!running || paused) return;

  if      ((k === 'ArrowUp'    || k === 'w' || k === 'W') && dir.y !==  1) nextDir = { x:  0, y: -1 };
  else if ((k === 'ArrowDown'  || k === 's' || k === 'S') && dir.y !== -1) nextDir = { x:  0, y:  1 };
  else if ((k === 'ArrowLeft'  || k === 'a' || k === 'A') && dir.x !==  1) nextDir = { x: -1, y:  0 };
  else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && dir.x !== -1) nextDir = { x:  1, y:  0 };

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) e.preventDefault();
});

/* ────────────────────────────────
   MOBILE BUTTONS
──────────────────────────────── */
document.getElementById('mb-up').addEventListener('click',    () => { if (running && !paused && dir.y !==  1) nextDir = { x:  0, y: -1 }; });
document.getElementById('mb-down').addEventListener('click',  () => { if (running && !paused && dir.y !== -1) nextDir = { x:  0, y:  1 }; });
document.getElementById('mb-left').addEventListener('click',  () => { if (running && !paused && dir.x !==  1) nextDir = { x: -1, y:  0 }; });
document.getElementById('mb-right').addEventListener('click', () => { if (running && !paused && dir.x !== -1) nextDir = { x:  1, y:  0 }; });

/* ────────────────────────────────
   SWIPE (touch)
──────────────────────────────── */
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
  if (!running || paused) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // tap — ignore
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
    else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
    else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
  }
}, { passive: true });

/* ────────────────────────────────
   BUTTONS
──────────────────────────────── */
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('final-score').style.display = 'none';
  document.getElementById('overlay-title').textContent = '⬡ NEON SNAKE';
  document.getElementById('overlay-sub').textContent = 'CYBERPUNK EDITION';
  document.getElementById('start-btn').textContent = '▶ START GAME';
  init();
});

document.getElementById('scores-btn').addEventListener('click', showScores);

document.getElementById('scores-close-btn').addEventListener('click', () => {
  document.getElementById('scores-panel').style.display = 'none';
  if (!running) document.getElementById('overlay').style.display = 'flex';
});

/* ── Initial render ── */
draw();
