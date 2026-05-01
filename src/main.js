// Wagon Wheel — top-down prize wheel
// Click SPIN, the wheel spins, decelerates, pointer at the top picks the winning slice.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2;
const OUTER_R = 320;     // outermost decorative ring
const RIM_R   = 300;     // inner edge of decorative rim (outer edge of slices)
const SLICE_R = 285;     // slice outer radius (where text sits)
const HUB_R   = 70;      // SPIN button radius

// 12 prizes alternating orange/yellow, with one rare big prize.
const SLICES = [
  { label: '10K',  color: '#ff7a1f', textColor: '#fff', value: 10_000 },
  { label: '50K',  color: '#ffc832', textColor: '#5a3500', value: 50_000 },
  { label: '5K',   color: '#ff7a1f', textColor: '#fff', value: 5_000 },
  { label: '100K', color: '#ffc832', textColor: '#5a3500', value: 100_000 },
  { label: '20K',  color: '#ff7a1f', textColor: '#fff', value: 20_000 },
  { label: '500K', color: '#ffc832', textColor: '#5a3500', value: 500_000 },
  { label: '15K',  color: '#ff7a1f', textColor: '#fff', value: 15_000 },
  { label: '250K', color: '#ffc832', textColor: '#5a3500', value: 250_000 },
  { label: '8K',   color: '#ff7a1f', textColor: '#fff', value: 8_000 },
  { label: '75K',  color: '#ffc832', textColor: '#5a3500', value: 75_000 },
  { label: '30K',  color: '#ff7a1f', textColor: '#fff', value: 30_000 },
  { label: '1M',   color: '#22e07a', textColor: '#003a18', value: 1_000_000 }, // jackpot
];
const N = SLICES.length;
const SLICE_ANGLE = (Math.PI * 2) / N;

// State
const state = {
  rotation: 0,                  // current wheel rotation (radians)
  velocity: 0,                  // angular velocity (rad/s)
  spinning: false,
  resultIndex: null,            // last winning slice index
  resultPopAge: 0,              // animation timer for the result banner
  spinsLeft: 5,
  lastTime: performance.now(),
  pulse: 0,                     // generic 0..1 pulse for SPIN button glow
  particles: [],                // celebration particles
  hover: false,                 // mouse over hub
};

// Mouse
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top)  * (H / r.height);
  const d = Math.hypot(x - CX, y - CY);
  state.hover = d <= HUB_R && !state.spinning && state.spinsLeft > 0;
  canvas.style.cursor = state.hover ? 'pointer' : 'default';
});
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top)  * (H / r.height);
  const d = Math.hypot(x - CX, y - CY);
  if (d <= HUB_R && !state.spinning && state.spinsLeft > 0) startSpin();
});

function startSpin() {
  state.spinning = true;
  state.resultIndex = null;
  state.resultPopAge = 0;
  state.spinsLeft -= 1;
  // Strong initial velocity, will decay over ~5-7 seconds
  state.velocity = 16 + Math.random() * 6; // rad/s
}

function spawnConfetti(n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 240;
    state.particles.push({
      x: CX, y: CY - 280,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      age: 0,
      lifetime: 1.6 + Math.random() * 0.8,
      size: 4 + Math.random() * 4,
      hue: Math.floor(Math.random() * 360),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 8,
    });
  }
}

function update(dt) {
  state.pulse = (Math.sin(performance.now() * 0.004) + 1) / 2;

  if (state.spinning) {
    state.rotation += state.velocity * dt;
    // Friction — quadratic feels heavier and stops on a crisp note
    state.velocity *= Math.pow(0.5, dt * 0.55);
    if (Math.abs(state.velocity) < 0.04) {
      state.velocity = 0;
      state.spinning = false;
      // Determine winner: pointer is at the TOP (12 o'clock = -PI/2 in canvas).
      // The slice currently under the pointer is at angle (-PI/2 - rotation) mod 2PI.
      const pointerAngle = -Math.PI / 2;
      let local = (pointerAngle - state.rotation) % (Math.PI * 2);
      while (local < 0) local += Math.PI * 2;
      // Slice i covers [i*SA, (i+1)*SA) when wheel rotation is 0
      const idx = Math.floor(local / SLICE_ANGLE) % N;
      state.resultIndex = idx;
      state.resultPopAge = 0;
      const slice = SLICES[idx];
      const burst = slice.value >= 500_000 ? 80 : slice.value >= 100_000 ? 40 : 12;
      spawnConfetti(burst);
    }
  }

  // Result banner timer + particles
  if (state.resultIndex !== null) state.resultPopAge += dt;
  for (const p of state.particles) {
    p.age += dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += 380 * dt;     // gravity
    p.rot += p.vrot * dt;
  }
  state.particles = state.particles.filter(p => p.age < p.lifetime);
}

function drawBackgroundGlow() {
  // Soft radiating sunburst behind the wheel
  const g = ctx.createRadialGradient(CX, CY, 100, CX, CY, OUTER_R + 120);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.55, 'rgba(180,200,255,0.04)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 12 thin rays that slowly rotate
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(performance.now() * 0.0001);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * 380, Math.sin(a) * 380);
    grad.addColorStop(0, 'rgba(255,200,120,0.05)');
    grad.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.04) * 380, Math.sin(a - 0.04) * 380);
    ctx.lineTo(Math.cos(a + 0.04) * 380, Math.sin(a + 0.04) * 380);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawWheel() {
  ctx.save();
  ctx.translate(CX, CY);

  // Outer dark wood ring (drop shadow)
  ctx.fillStyle = '#1a0c08';
  ctx.beginPath(); ctx.arc(0, 0, OUTER_R, 0, Math.PI * 2); ctx.fill();

  // Decorative gold rim (gradient)
  const rim = ctx.createRadialGradient(0, -OUTER_R / 2, OUTER_R - 30, 0, 0, OUTER_R + 4);
  rim.addColorStop(0, '#ffe48a');
  rim.addColorStop(0.4, '#d29c2d');
  rim.addColorStop(0.7, '#7a5318');
  rim.addColorStop(1, '#3a2308');
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.arc(0, 0, OUTER_R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a0a16';
  ctx.beginPath(); ctx.arc(0, 0, RIM_R, 0, Math.PI * 2); ctx.fill();

  // Bulb dots around the rim (alternating glow)
  const t = performance.now() * 0.005;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const bx = Math.cos(a) * (RIM_R + 11);
    const by = Math.sin(a) * (RIM_R + 11);
    const on = ((i % 2) === Math.floor(t) % 2);
    ctx.fillStyle = on ? '#fff5b8' : '#5a4012';
    ctx.shadowColor = on ? 'rgba(255,235,150,0.9)' : 'transparent';
    ctx.shadowBlur = on ? 14 : 0;
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ----- Rotating part: slices + labels -----
  ctx.save();
  ctx.rotate(state.rotation);

  // Slices
  for (let i = 0; i < N; i++) {
    const a0 = i * SLICE_ANGLE;
    const a1 = (i + 1) * SLICE_ANGLE;
    const slice = SLICES[i];

    // Radial gradient gives depth
    const sg = ctx.createRadialGradient(0, 0, 60, 0, 0, SLICE_R);
    sg.addColorStop(0, lighten(slice.color, 0.18));
    sg.addColorStop(0.7, slice.color);
    sg.addColorStop(1, darken(slice.color, 0.18));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, SLICE_R, a0, a1);
    ctx.closePath();
    ctx.fill();

    // Slice divider lines (gold)
    ctx.strokeStyle = 'rgba(255,220,140,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * SLICE_R, Math.sin(a0) * SLICE_R);
    ctx.stroke();
  }

  // Outer subtle highlight ring on top of slices
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, SLICE_R - 4, 0, Math.PI * 2); ctx.stroke();

  // Labels
  for (let i = 0; i < N; i++) {
    const a = i * SLICE_ANGLE + SLICE_ANGLE / 2;
    const slice = SLICES[i];
    ctx.save();
    ctx.rotate(a);
    ctx.translate(SLICE_R * 0.62, 0);
    ctx.rotate(Math.PI / 2);                  // text reads inward-out
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = 'bold 34px "Segoe UI", sans-serif';
    ctx.fillText(slice.label, 2, 3);

    ctx.fillStyle = slice.textColor;
    ctx.fillText(slice.label, 0, 0);
    ctx.restore();
  }

  ctx.restore(); // end rotating part

  // Hub well (dark recess so SPIN sits in)
  ctx.fillStyle = '#1a0c08';
  ctx.beginPath(); ctx.arc(0, 0, HUB_R + 12, 0, Math.PI * 2); ctx.fill();

  // SPIN button
  drawSpinButton();

  ctx.restore();
}

function drawSpinButton() {
  const pulse = state.hover ? 1 : 0.6 + state.pulse * 0.4;
  const radius = HUB_R * (state.hover ? 1.06 : 1);

  // Outer glow when ready
  if (!state.spinning && state.spinsLeft > 0) {
    const glow = ctx.createRadialGradient(0, 0, HUB_R * 0.6, 0, 0, HUB_R * 1.8);
    glow.addColorStop(0, `rgba(120,255,180,${0.4 * pulse})`);
    glow.addColorStop(1, 'rgba(120,255,180,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, HUB_R * 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // Button gradient (green when ready, gray when used up)
  const ready = !state.spinning && state.spinsLeft > 0;
  const top   = ready ? '#7fffa6' : '#7a8088';
  const mid   = ready ? '#22b755' : '#3e444c';
  const bot   = ready ? '#0e6628' : '#1c2026';

  const bg = ctx.createRadialGradient(0, -radius / 2, 4, 0, 0, radius);
  bg.addColorStop(0, top);
  bg.addColorStop(0.5, mid);
  bg.addColorStop(1, bot);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

  // Gold ring around the button
  ctx.lineWidth = 4;
  const ring = ctx.createLinearGradient(0, -radius, 0, radius);
  ring.addColorStop(0, '#ffe48a');
  ring.addColorStop(1, '#7a5318');
  ctx.strokeStyle = ring;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.45, radius * 0.55, radius * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // SPIN text
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', 1, -3);
  ctx.fillStyle = '#fff';
  ctx.fillText('SPIN', 0, -4);

  // Spins-left counter pill
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.fillText(`${state.spinsLeft}`, 0, 18);
}

function drawPointer() {
  // Pointer at the very top of the wheel, slightly outside the rim.
  ctx.save();
  ctx.translate(CX, CY - OUTER_R - 6);
  // Glow
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 14;
  // Triangle body (gold)
  const grad = ctx.createLinearGradient(0, -28, 0, 26);
  grad.addColorStop(0, '#ffe48a');
  grad.addColorStop(0.5, '#d29c2d');
  grad.addColorStop(1, '#5a3500');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(-22, -22);
  ctx.lineTo(22, -22);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Inner notch
  ctx.fillStyle = '#fff5b8';
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(-12, -16);
  ctx.lineTo(12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawResultBanner() {
  if (state.resultIndex === null) return;
  const slice = SLICES[state.resultIndex];

  // Pop-in animation: scale up, hold, fade
  const t = state.resultPopAge;
  const popIn = Math.min(1, t / 0.25);
  const ease = 1 - Math.pow(1 - popIn, 3);
  const scale = 0.7 + 0.3 * ease;
  const alpha = t < 3.5 ? 1 : Math.max(0, 1 - (t - 3.5) / 0.6);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(CX, 110);
  ctx.scale(scale, scale);

  const W2 = 320, H2 = 90;
  // Banner background
  const bg = ctx.createLinearGradient(0, -H2 / 2, 0, H2 / 2);
  bg.addColorStop(0, '#ffe48a');
  bg.addColorStop(1, '#d29c2d');
  ctx.fillStyle = bg;
  roundRect(-W2 / 2, -H2 / 2, W2, H2, 18);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#5a3500';
  ctx.stroke();

  // "YOU WON" line
  ctx.fillStyle = '#5a3500';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOU WON', 0, -20);

  // Prize value
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px "Segoe UI", sans-serif';
  ctx.fillText(slice.label, 1, 16);
  ctx.fillStyle = '#5a3500';
  ctx.fillText(slice.label, 0, 15);

  ctx.restore();
}

function drawNoSpinsLeft() {
  if (state.spinsLeft > 0 || state.spinning) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Refresh page for more spins', CX, H - 32);
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const lifeT = p.age / p.lifetime;
    const alpha = 1 - lifeT;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = `hsl(${p.hue}, 90%, 60%)`;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackgroundGlow();
  drawWheel();
  drawPointer();
  drawResultBanner();
  drawParticles();
  drawNoSpinsLeft();
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- helpers ---

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp(r + 255 * amt)}, ${clamp(g + 255 * amt)}, ${clamp(b + 255 * amt)})`;
}
function darken(hex, amt) { return lighten(hex, -amt); }
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
