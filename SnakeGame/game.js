const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const CELL = 20;
const COLS = W / CELL;
const ROWS = H / CELL;

let snake, dir, nextDir, food, particles;
let score, level, best, speed, loop, running, frameCount;

best = 0;

/* ── Init ── */
function init() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  particles = [];
  score = 0;
  level = 1;
  speed = 140;
  frameCount = 0;
  running = true;
  spawnFood();
  updateHUD();
  clearInterval(loop);
  loop = setInterval(tick, speed);
}

/* ── Food ── */
function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));

  food = pos;
  food.pulse = 0;
  food.type = Math.random() < 0.15 ? 'bonus' : 'normal';
}

/* ── Game Tick ── */
function tick() {
  if (!running) return;

  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Collision: wall or self
  if (
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS ||
    snake.some(s => s.x === head.x && s.y === head.y)
  ) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    const pts = food.type === 'bonus' ? 50 : 10;
    score += pts;
    burst(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, food.type === 'bonus' ? '#ff00ff' : '#00ffcc');

    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
      level = newLevel;
      showLevelUp();
    }

    speed = Math.max(60, 140 - (level - 1) * 10);
    clearInterval(loop);
    loop = setInterval(tick, speed);

    spawnFood();
    updateHUD();
  } else {
    snake.pop();
  }

  food.pulse = (food.pulse || 0) + 0.15;
  frameCount++;
  draw();
}

/* ── Draw ── */
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawFood();
  drawSnake();
  drawParticles();
}

function drawGrid() {
  ctx.strokeStyle = '#ffffff06';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, H);
    ctx.stroke();
  }
  for (let y = 0; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(W, y * CELL);
    ctx.stroke();
  }
}

function drawFood() {
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const p = food.pulse;
  const col = food.type === 'bonus' ? '#ff00ff' : '#00ffcc';
  const r = 6 + Math.sin(p) * 2;

  ctx.save();
  ctx.shadowBlur = 20 + Math.sin(p) * 10;
  ctx.shadowColor = col;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (food.type === 'bonus') {
    ctx.strokeStyle = '#ff00ff99';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = p + i * Math.PI / 2;
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
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00ffcc';
      ctx.fillStyle = '#00ffcc';
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${hue},100%,65%,0.6)`;
      ctx.fillStyle = `hsla(${hue},100%,65%,${(0.3 + t * 0.7).toFixed(2)})`;
    }

    ctx.beginPath();
    roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, Math.min(4, CELL / 3));
    ctx.fill();

    // Eyes on head
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

/* ── Particles ── */
function burst(x, y, col) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 4;
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
    p.life -= 0.05;
    p.vx *= 0.92;
    p.vy *= 0.92;
  });
}

/* ── HUD ── */
function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  best = Math.max(score, best);
  document.getElementById('best').textContent = best;
}

function showLevelUp() {
  const el = document.getElementById('lvl-flash');
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 900);
}

/* ── Game Over ── */
function gameOver() {
  running = false;
  clearInterval(loop);

  const fs = document.getElementById('final-score');
  fs.textContent = `Score: ${score}  |  Level: ${level}`;
  fs.style.display = 'block';

  const ov = document.getElementById('overlay');
  ov.querySelector('h2').textContent = 'GAME OVER';
  ov.querySelector('.sub').textContent = '';
  document.getElementById('start-btn').textContent = '▶ PLAY AGAIN';
  ov.style.display = 'flex';
}

/* ── Controls: Keyboard ── */
document.addEventListener('keydown', e => {
  if (!running) return;
  const k = e.key;
  if ((k === 'ArrowUp'    || k === 'w' || k === 'W') && dir.y !==  1) nextDir = { x:  0, y: -1 };
  else if ((k === 'ArrowDown'  || k === 's' || k === 'S') && dir.y !== -1) nextDir = { x:  0, y:  1 };
  else if ((k === 'ArrowLeft'  || k === 'a' || k === 'A') && dir.x !==  1) nextDir = { x: -1, y:  0 };
  else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && dir.x !== -1) nextDir = { x:  1, y:  0 };
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) e.preventDefault();
});

/* ── Controls: Mobile ── */
document.getElementById('mb-up').addEventListener('click',    () => { if (running && dir.y !==  1) nextDir = { x:  0, y: -1 }; });
document.getElementById('mb-down').addEventListener('click',  () => { if (running && dir.y !== -1) nextDir = { x:  0, y:  1 }; });
document.getElementById('mb-left').addEventListener('click',  () => { if (running && dir.x !==  1) nextDir = { x: -1, y:  0 }; });
document.getElementById('mb-right').addEventListener('click', () => { if (running && dir.x !== -1) nextDir = { x:  1, y:  0 }; });

/* ── Start Button ── */
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('final-score').style.display = 'none';
  init();
});

/* ── Initial render (idle screen) ── */
draw();
