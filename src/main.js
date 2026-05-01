// Wagon Wheel — top-down prize wheel (premium edition)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2 + 16;       // a touch lower to leave room for the title
const OUTER_R = 318;
const RIM_R   = 296;
const SLICE_R = 282;
const INNER_R = 96;          // gold ring around the hub
const HUB_R   = 70;

// 12 prize slices in 4 alternating colors + 1 emerald jackpot
const PALETTE = [
  { color: '#e63946', text: '#fff'    },  // red
  { color: '#ffd23d', text: '#3a2a00' },  // gold
  { color: '#7c3aed', text: '#fff'    },  // purple
  { color: '#06b6d4', text: '#062f3a' },  // teal
];
const SLICES = [
  { label: '10K',  paletteIdx: 0, value: 10_000 },
  { label: '50K',  paletteIdx: 1, value: 50_000 },
  { label: '5K',   paletteIdx: 2, value: 5_000 },
  { label: '100K', paletteIdx: 3, value: 100_000 },
  { label: '20K',  paletteIdx: 0, value: 20_000 },
  { label: '500K', paletteIdx: 1, value: 500_000 },
  { label: '15K',  paletteIdx: 2, value: 15_000 },
  { label: '250K', paletteIdx: 3, value: 250_000 },
  { label: '8K',   paletteIdx: 0, value: 8_000 },
  { label: '75K',  paletteIdx: 1, value: 75_000 },
  { label: '30K',  paletteIdx: 2, value: 30_000 },
  { label: 'JACKPOT', paletteIdx: -1, value: 1_000_000 }, // emerald
].map(s => ({
  ...s,
  color: s.paletteIdx === -1 ? '#22c55e' : PALETTE[s.paletteIdx].color,
  textColor: s.paletteIdx === -1 ? '#fff' : PALETTE[s.paletteIdx].text,
}));
const N = SLICES.length;
const SLICE_ANGLE = (Math.PI * 2) / N;

// State
const state = {
  rotation: 0,
  velocity: 0,
  spinning: false,
  resultIndex: null,
  resultPopAge: 0,
  spinsLeft: 5,
  totalWon: 0,
  lastTime: performance.now(),
  pulse: 0,
  particles: [],
  hover: false,
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
  state.velocity = 16 + Math.random() * 6;
}

function spawnConfetti(n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 280;
    const isStar = Math.random() < 0.4;
    state.particles.push({
      x: CX, y: CY - 280,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      age: 0,
      lifetime: 1.6 + Math.random() * 1.2,
      size: isStar ? 7 + Math.random() * 5 : 4 + Math.random() * 5,
      hue: Math.floor(Math.random() * 360),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 9,
      kind: isStar ? 'star' : 'rect',
    });
  }
}

function update(dt) {
  state.pulse = (Math.sin(performance.now() * 0.004) + 1) / 2;

  if (state.spinning) {
    state.rotation += state.velocity * dt;
    state.velocity *= Math.pow(0.5, dt * 0.55);
    if (Math.abs(state.velocity) < 0.04) {
      state.velocity = 0;
      state.spinning = false;
      const pointerAngle = -Math.PI / 2;
      let local = (pointerAngle - state.rotation) % (Math.PI * 2);
      while (local < 0) local += Math.PI * 2;
      const idx = Math.floor(local / SLICE_ANGLE) % N;
      state.resultIndex = idx;
      state.resultPopAge = 0;
      const slice = SLICES[idx];
      state.totalWon += slice.value;
      const burst = slice.value >= 500_000 ? 110 : slice.value >= 100_000 ? 55 : 18;
      spawnConfetti(burst);
    }
  }

  if (state.resultIndex !== null) state.resultPopAge += dt;
  for (const p of state.particles) {
    p.age += dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += 380 * dt;
    p.rot += p.vrot * dt;
  }
  state.particles = state.particles.filter(p => p.age < p.lifetime);
}

// === Drawing ===

function drawBackgroundGlow() {
  // Vignette
  const g = ctx.createRadialGradient(CX, CY, 60, CX, CY, OUTER_R + 220);
  g.addColorStop(0, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.5, 'rgba(160,180,255,0.04)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Slow rotating rays
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(performance.now() * 0.00012);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * 420, Math.sin(a) * 420);
    grad.addColorStop(0, 'rgba(255,210,140,0.06)');
    grad.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.03) * 420, Math.sin(a - 0.03) * 420);
    ctx.lineTo(Math.cos(a + 0.03) * 420, Math.sin(a + 0.03) * 420);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTitle() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Banner ribbon behind the title
  const bannerY = 50;
  const bannerW = 360, bannerH = 56;
  const bg = ctx.createLinearGradient(0, bannerY - bannerH / 2, 0, bannerY + bannerH / 2);
  bg.addColorStop(0, '#7c3aed');
  bg.addColorStop(1, '#3a0a73');
  ctx.fillStyle = bg;
  roundRect(CX - bannerW / 2, bannerY - bannerH / 2, bannerW, bannerH, 14);
  ctx.fill();
  // Notched ribbon ends
  ctx.beginPath();
  ctx.moveTo(CX - bannerW / 2 - 22, bannerY);
  ctx.lineTo(CX - bannerW / 2,        bannerY - bannerH / 2);
  ctx.lineTo(CX - bannerW / 2,        bannerY + bannerH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(CX + bannerW / 2 + 22, bannerY);
  ctx.lineTo(CX + bannerW / 2,        bannerY - bannerH / 2);
  ctx.lineTo(CX + bannerW / 2,        bannerY + bannerH / 2);
  ctx.closePath();
  ctx.fill();

  // Inner gold border
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  roundRect(CX - bannerW / 2 + 6, bannerY - bannerH / 2 + 6, bannerW - 12, bannerH - 12, 10);
  ctx.stroke();

  // Title text with gold shine
  ctx.font = 'bold 32px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('★ LUCKY SPIN ★', CX, bannerY + 2);
  const grad = ctx.createLinearGradient(0, bannerY - 16, 0, bannerY + 16);
  grad.addColorStop(0, '#fff5b8');
  grad.addColorStop(0.5, '#ffd23d');
  grad.addColorStop(1, '#a87410');
  ctx.fillStyle = grad;
  ctx.fillText('★ LUCKY SPIN ★', CX, bannerY);
  ctx.restore();
}

function drawWheelShadow() {
  // Soft drop shadow under the wheel for depth
  ctx.save();
  const g = ctx.createRadialGradient(CX, CY + OUTER_R + 16, 30, CX, CY + OUTER_R + 16, OUTER_R + 90);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(CX, CY + OUTER_R + 18, OUTER_R + 60, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWheel() {
  ctx.save();
  ctx.translate(CX, CY);

  // Outer dark bezel
  ctx.fillStyle = '#0a0814';
  ctx.beginPath(); ctx.arc(0, 0, OUTER_R + 6, 0, Math.PI * 2); ctx.fill();

  // Polished gold rim
  const rim = ctx.createRadialGradient(0, -OUTER_R / 2, OUTER_R - 30, 0, 0, OUTER_R + 4);
  rim.addColorStop(0, '#fff5b8');
  rim.addColorStop(0.4, '#ffd23d');
  rim.addColorStop(0.7, '#a87410');
  rim.addColorStop(1, '#3e2706');
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.arc(0, 0, OUTER_R, 0, Math.PI * 2); ctx.fill();

  // Inner dark recess (where the slices sit)
  ctx.fillStyle = '#0a0a16';
  ctx.beginPath(); ctx.arc(0, 0, RIM_R, 0, Math.PI * 2); ctx.fill();

  // Animated gleam sweeping around the rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, OUTER_R, 0, Math.PI * 2, false);
  ctx.arc(0, 0, RIM_R, 0, Math.PI * 2, true);
  ctx.clip();
  const gleamA = performance.now() * 0.0008;
  const gx = Math.cos(gleamA) * (OUTER_R - 10);
  const gy = Math.sin(gleamA) * (OUTER_R - 10);
  const gleam = ctx.createRadialGradient(gx, gy, 4, gx, gy, 80);
  gleam.addColorStop(0, 'rgba(255,255,255,0.6)');
  gleam.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gleam;
  ctx.fillRect(-OUTER_R, -OUTER_R, OUTER_R * 2, OUTER_R * 2);
  ctx.restore();

  // Flashing bulbs on the rim
  const t = performance.now() * 0.005;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const bx = Math.cos(a) * (RIM_R + 11);
    const by = Math.sin(a) * (RIM_R + 11);
    const on = ((i % 2) === Math.floor(t) % 2);
    ctx.fillStyle = on ? '#fff5b8' : '#5a4012';
    ctx.shadowColor = on ? 'rgba(255,235,150,0.9)' : 'transparent';
    ctx.shadowBlur  = on ? 14 : 0;
    ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ----- Rotating part: slices, gems, labels -----
  ctx.save();
  ctx.rotate(state.rotation);

  // Slices
  for (let i = 0; i < N; i++) {
    const a0 = i * SLICE_ANGLE;
    const a1 = (i + 1) * SLICE_ANGLE;
    const slice = SLICES[i];

    const sg = ctx.createRadialGradient(0, 0, 60, 0, 0, SLICE_R);
    sg.addColorStop(0, lighten(slice.color, 0.22));
    sg.addColorStop(0.7, slice.color);
    sg.addColorStop(1, darken(slice.color, 0.22));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, SLICE_R, a0, a1);
    ctx.closePath();
    ctx.fill();

    // Light streak through each slice (radial highlight)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, SLICE_R, a0, a1);
    ctx.closePath();
    ctx.clip();
    const ag = (a0 + a1) / 2;
    const lg = ctx.createLinearGradient(
      Math.cos(ag) * 60,  Math.sin(ag) * 60,
      Math.cos(ag) * SLICE_R, Math.sin(ag) * SLICE_R
    );
    lg.addColorStop(0, 'rgba(255,255,255,0.18)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-SLICE_R, -SLICE_R, SLICE_R * 2, SLICE_R * 2);
    ctx.restore();
  }

  // Gold dividers between slices
  for (let i = 0; i < N; i++) {
    const a = i * SLICE_ANGLE;
    const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * SLICE_R, Math.sin(a) * SLICE_R);
    grad.addColorStop(0, '#fff5b8');
    grad.addColorStop(0.6, '#ffd23d');
    grad.addColorStop(1, '#a87410');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * SLICE_R, Math.sin(a) * SLICE_R);
    ctx.stroke();
  }

  // Gems on the inner edge of the rim, between slices
  for (let i = 0; i < N; i++) {
    const a = i * SLICE_ANGLE;
    const gx = Math.cos(a) * (SLICE_R - 16);
    const gy = Math.sin(a) * (SLICE_R - 16);
    const gemGrad = ctx.createRadialGradient(gx - 2, gy - 2, 0, gx, gy, 8);
    gemGrad.addColorStop(0, '#fff');
    gemGrad.addColorStop(0.5, '#ff8fbf');
    gemGrad.addColorStop(1, '#80003a');
    ctx.fillStyle = gemGrad;
    ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(gx - 1.6, gy - 1.6, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // Outer subtle highlight ring on top of slices
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, SLICE_R - 4, 0, Math.PI * 2); ctx.stroke();

  // Labels (with star prefix on jackpot)
  for (let i = 0; i < N; i++) {
    const a = i * SLICE_ANGLE + SLICE_ANGLE / 2;
    const slice = SLICES[i];
    ctx.save();
    ctx.rotate(a);
    ctx.translate(SLICE_R * 0.62, 0);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isJackpot = slice.label === 'JACKPOT';
    const fontSize = isJackpot ? 22 : 32;
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(slice.label, 2, 3);

    // main fill (gradient on text)
    const tg = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
    if (isJackpot) {
      tg.addColorStop(0, '#fff5b8');
      tg.addColorStop(1, '#ffd23d');
    } else {
      tg.addColorStop(0, slice.textColor);
      tg.addColorStop(1, slice.textColor);
    }
    ctx.fillStyle = tg;
    ctx.fillText(slice.label, 0, 0);
    ctx.restore();
  }

  ctx.restore(); // end rotating part

  // Inner gold ring around hub
  const innerRing = ctx.createRadialGradient(0, -INNER_R / 2, INNER_R - 20, 0, 0, INNER_R);
  innerRing.addColorStop(0, '#fff5b8');
  innerRing.addColorStop(0.5, '#ffd23d');
  innerRing.addColorStop(1, '#a87410');
  ctx.fillStyle = innerRing;
  ctx.beginPath(); ctx.arc(0, 0, INNER_R, 0, Math.PI * 2); ctx.fill();

  // small studs on the inner ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const sx = Math.cos(a) * (INNER_R - 7);
    const sy = Math.sin(a) * (INNER_R - 7);
    ctx.fillStyle = '#7a4f0a';
    ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8c4';
    ctx.beginPath(); ctx.arc(sx - 0.7, sy - 0.7, 1, 0, Math.PI * 2); ctx.fill();
  }

  // Hub well (dark recess)
  ctx.fillStyle = '#0a0814';
  ctx.beginPath(); ctx.arc(0, 0, HUB_R + 10, 0, Math.PI * 2); ctx.fill();

  drawSpinButton();

  ctx.restore();
}

function drawSpinButton() {
  const pulse = state.hover ? 1 : 0.6 + state.pulse * 0.4;
  const radius = HUB_R * (state.hover ? 1.06 : 1);
  const ready = !state.spinning && state.spinsLeft > 0;

  // Outer glow when ready
  if (ready) {
    const glow = ctx.createRadialGradient(0, 0, HUB_R * 0.6, 0, 0, HUB_R * 1.9);
    glow.addColorStop(0, `rgba(140,255,180,${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(140,255,180,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, HUB_R * 1.9, 0, Math.PI * 2); ctx.fill();
  }

  const top = ready ? '#a8ffc4' : '#7a8088';
  const mid = ready ? '#22b755' : '#3e444c';
  const bot = ready ? '#0e6628' : '#1c2026';

  const bg = ctx.createRadialGradient(0, -radius / 2, 4, 0, 0, radius);
  bg.addColorStop(0, top);
  bg.addColorStop(0.5, mid);
  bg.addColorStop(1, bot);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

  // Gold ring
  ctx.lineWidth = 5;
  const ring = ctx.createLinearGradient(0, -radius, 0, radius);
  ring.addColorStop(0, '#fff5b8');
  ring.addColorStop(0.5, '#ffd23d');
  ring.addColorStop(1, '#7a4f0a');
  ctx.strokeStyle = ring;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();

  // Inner ring
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(0, 0, radius - 7, 0, Math.PI * 2); ctx.stroke();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.45, radius * 0.55, radius * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // SPIN text
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', 1, -3);
  ctx.fillStyle = '#fff';
  ctx.fillText('SPIN', 0, -4);

  // Spins-left chip
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillText(`${state.spinsLeft} LEFT`, 0, 18);
}

function drawCrown(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Crown base
  const cg = ctx.createLinearGradient(0, -10, 0, 18);
  cg.addColorStop(0, '#fff5b8');
  cg.addColorStop(0.5, '#ffd23d');
  cg.addColorStop(1, '#7a4f0a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.lineTo(-20, -4);
  ctx.lineTo(-12, 4);
  ctx.lineTo(-6, -12);
  ctx.lineTo(0, 2);
  ctx.lineTo(6, -12);
  ctx.lineTo(12, 4);
  ctx.lineTo(20, -4);
  ctx.lineTo(22, 12);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#5a3500';
  ctx.stroke();
  // Gems on the points
  const points = [[-20, -4], [-6, -12], [6, -12], [20, -4]];
  for (const [px, py] of points) {
    const gemGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 4);
    gemGrad.addColorStop(0, '#fff');
    gemGrad.addColorStop(0.6, '#e63946');
    gemGrad.addColorStop(1, '#5a0010');
    ctx.fillStyle = gemGrad;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPointer() {
  const baseY = CY - OUTER_R - 6;
  // Crown above
  drawCrown(CX, baseY - 36, 1.4);

  ctx.save();
  ctx.translate(CX, baseY);
  ctx.shadowColor = 'rgba(255,210,140,0.7)';
  ctx.shadowBlur = 16;
  // Triangle body
  const grad = ctx.createLinearGradient(0, -28, 0, 30);
  grad.addColorStop(0, '#fff5b8');
  grad.addColorStop(0.5, '#ffd23d');
  grad.addColorStop(1, '#5a3500');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(-26, -22);
  ctx.lineTo(26, -22);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#5a3500';
  ctx.stroke();
  // Inner notch
  ctx.fillStyle = '#fff8d8';
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(-14, -16);
  ctx.lineTo(14, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawResultBanner() {
  if (state.resultIndex === null) return;
  const slice = SLICES[state.resultIndex];

  const t = state.resultPopAge;
  const popIn = Math.min(1, t / 0.3);
  const ease = 1 - Math.pow(1 - popIn, 4);
  const overshoot = ease * 1.08 - (ease - 1) * 0.08; // tiny bounce
  const scale = 0.5 + 0.55 * overshoot;
  const alpha = t < 4 ? 1 : Math.max(0, 1 - (t - 4) / 0.7);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(CX, H - 90);
  ctx.scale(scale, scale);

  const W2 = 380, H2 = 96;

  // Glow
  ctx.shadowColor = slice.color;
  ctx.shadowBlur = 30;
  const bg = ctx.createLinearGradient(0, -H2 / 2, 0, H2 / 2);
  bg.addColorStop(0, lighten(slice.color, 0.2));
  bg.addColorStop(1, darken(slice.color, 0.25));
  ctx.fillStyle = bg;
  roundRect(-W2 / 2, -H2 / 2, W2, H2, 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Gold border
  ctx.lineWidth = 4;
  const border = ctx.createLinearGradient(0, -H2 / 2, 0, H2 / 2);
  border.addColorStop(0, '#fff5b8');
  border.addColorStop(1, '#7a4f0a');
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.fillText('★ YOU WON ★', 0, -22);

  const big = slice.label === 'JACKPOT' ? slice.label : slice.label;
  ctx.font = 'bold 40px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(big, 1, 18);
  const tg = ctx.createLinearGradient(0, -16, 0, 32);
  tg.addColorStop(0, '#fff5b8');
  tg.addColorStop(0.5, '#ffd23d');
  tg.addColorStop(1, '#a87410');
  ctx.fillStyle = tg;
  ctx.fillText(big, 0, 17);

  ctx.restore();
}

function drawTotals() {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(W - 174, 14, 160, 56, 12);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffd23d';
  ctx.stroke();
  ctx.fillStyle = '#fff5b8';
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillText('TOTAL WON', W - 22, 22);
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(formatMoney(state.totalWon), W - 22, 40);
  ctx.restore();
}

function drawNoSpinsLeft() {
  if (state.spinsLeft > 0 || state.spinning) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Refresh page for more spins', CX, H - 18);
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
    ctx.fillStyle = `hsl(${p.hue}, 90%, 62%)`;
    if (p.kind === 'star') {
      drawStar(0, 0, p.size, p.size * 0.45, 5);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    }
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackgroundGlow();
  drawTitle();
  drawWheelShadow();
  drawWheel();
  drawPointer();
  drawResultBanner();
  drawTotals();
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

// === helpers ===

function drawStar(cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function formatMoney(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(v % 1_000 ? 1 : 0) + 'K';
  return String(v);
}

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
