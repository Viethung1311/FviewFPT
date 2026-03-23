var degree = 1800;
var clicks = 0;
var spinning = false;

/**
 * PRIZES — 8 ô trên bánh xe
 * type: 'coin' → cộng coins vào toadState
 *       'rare' → phần thưởng đặc biệt
 */
var prizes = [
  { label: '🪙1', type: 'coin', coin: 1, name: 'Nhận được 1 Golden Coin!' },
  { label: '🪙1', type: 'coin', coin: 1, name: 'Nhận được 1 Golden Coin!' },
  { label: '🪙2', type: 'coin', coin: 2, name: 'Nhận được 2 Golden Coin!' },
  { label: '🪙2', type: 'coin', coin: 2, name: 'Nhận được 2 Golden Coin!' },
  { label: '🪙3', type: 'coin', coin: 3, name: 'Nhận được 3 Golden Coin!' },
  { label: '🪙3', type: 'coin', coin: 3, name: 'Nhận được 3 Golden Coin!' },
  { label: '⭐',  type: 'rare', coin: 0, name: '✨ Siêu hiếm! Phần thưởng đặc biệt!' },
  { label: '⭐⭐', type: 'rare', coin: 0, name: '🌟 Siêu siêu hiếm! Jackpot!' }
];

var prizeRates = [
  { index: 0, rate: 29.65 },
  { index: 1, rate: 24.65 },
  { index: 2, rate: 19.65 },
  { index: 3, rate: 14.65 },
  { index: 4, rate: 6.9   },
  { index: 5, rate: 2.3   },
  { index: 6, rate: 0.5   },
  { index: 7, rate: 0.2   }
];

// ─── PITY SYSTEM ──────────────────────────────────────────────────
// Đọc từ localStorage khi load trang
function _getPity() {
  try { return Math.max(0, parseInt(localStorage.getItem('spin_pity') || '0')); }
  catch(e) { return 0; }
}
function _setPity(n) {
  try { localStorage.setItem('spin_pity', String(n)); } catch(e) {}
}

// flag: lượt quay này có phải do pity trigger không
var _isPityTrigger = false;

/**
 * Chọn ô ngẫu nhiên theo tỷ lệ.
 * Pity chỉ SET FLAG — không tự return; flow vẫn quay wheel bình thường.
 * Sau khi kết quả xác định, pity counter được cập nhật.
 */
function getRandomPrizeIndex() {
  _isPityTrigger = false;

  // ── ADMIN FORCE OVERRIDE (1 lần duy nhất, tự xóa sau khi dùng) ──
  try {
    var forced = localStorage.getItem('spin_force_result');
    if (forced !== null) {
      localStorage.removeItem('spin_force_result');
      var forcedIdx = parseInt(forced);
      if (!isNaN(forcedIdx) && forcedIdx >= 0 && forcedIdx < 8) {
        // Không đụng pity, không đặt flag — trả kết quả sạch
        return forcedIdx;
      }
    }
  } catch(e) {}

  var pity = _getPity();

  // Đủ 100 spin → force rare, đặt flag
  if (pity >= 100) {
    _isPityTrigger = true;
    return 6; // ⭐ siêu hiếm
  }

  var totalRate = 0;
  for (var i = 0; i < prizeRates.length; i++) totalRate += prizeRates[i].rate;

  var rand = Math.random() * totalRate;
  var current = 0;
  var result = prizeRates[0].index;
  for (var j = 0; j < prizeRates.length; j++) {
    current += prizeRates[j].rate;
    if (rand <= current) { result = prizeRates[j].index; break; }
  }
  return result;
}

/**
 * Gọi SAU khi biết kết quả — cập nhật pity counter đúng cách.
 * Nếu là rare (dù tự nhiên hay pity): reset về 0.
 * Nếu không: tăng thêm 1.
 */
function updatePityAfterSpin(resultIndex) {
  if (_isPityTrigger) {
    // Pity đã trigger → reset
    _setPity(0);
  } else {
    var isRare = (resultIndex === 6 || resultIndex === 7);
    if (isRare) {
      _setPity(0);
    } else {
      _setPity(_getPity() + 1);
    }
  }
  // Cập nhật UI chip
  if (typeof updatePityUI === 'function') updatePityUI();
}

/* ══════════════════════════════════════════════
   1. AUDIO ENGINE — Web Audio API, zero dependencies
   ══════════════════════════════════════════════ */
var _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/** Tạo tiếng "tick" nhẹ khi kim chạm vào ô */
function playTick(pitch) {
  try {
    var ctx = _getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch || 420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime((pitch || 420) * 0.6, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch(e) {}
}

/** Âm thanh "suspense" cuối quay — tiếng gõ chậm dần */
function playSuspenseTick(idx, total) {
  // pitch tăng dần khi gần dừng
  var pitch = 300 + (idx / total) * 400;
  playTick(pitch);
}

/** Fanfare thắng — chord đẹp */
function playWinSound(isRare) {
  try {
    var ctx = _getAudioCtx();
    var notes = isRare
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5]  // C5 E5 G5 C6 E6 — jackpot
      : [523.25, 659.25, 783.99, 1046.5];            // C5 E5 G5 C6 — coin
    notes.forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      var t    = ctx.currentTime + i * 0.11;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.6);
    });
  } catch(e) {}
}

/* ══════════════════════════════════════════════
   2. WHEEL VISUAL ENGINE — Canvas gradients + sparkles
   ══════════════════════════════════════════════ */

var SECTOR_COLORS = [
  /* Màu cực bão hòa, contrast cao, lấp lánh như game mobile */
  { inner: '#00d4ff', outer: '#006090', accent: '#aaf0ff' }, // cyan điện
  { inner: '#4488ff', outer: '#0030cc', accent: '#99bbff' }, // blue hoàng gia
  { inner: '#cc66ff', outer: '#660099', accent: '#eeb8ff' }, // tím neon
  { inner: '#ffbb00', outer: '#995500', accent: '#ffee77' }, // vàng amber
  { inner: '#ff3333', outer: '#990000', accent: '#ff9999' }, // đỏ tươi
  { inner: '#ff44aa', outer: '#aa0066', accent: '#ffaadd' }, // hồng neon
  { inner: '#22ee66', outer: '#006622', accent: '#99ffcc' }, // xanh lá tươi
  { inner: '#ff8800', outer: '#883300', accent: '#ffcc66' }, // cam hổ
];

function initWheelCanvas() {
  var wheel      = document.getElementById('wheel');
  var innerWheel = document.getElementById('inner-wheel');
  if (!wheel || !innerWheel) return;

  // Gradient canvas — trong inner-wheel → quay cùng wheel
  var gc = document.createElement('canvas');
  gc.id = 'wheel-gradient-canvas';
  gc.width = gc.height = 500;
  innerWheel.appendChild(gc);
  drawWheelGradients(gc);


  // Sparkle canvas — trong #wheel (không quay) để sparkle luôn random trên mặt
  var sc = document.createElement('canvas');
  sc.id = 'wheel-sparkle-canvas';
  sc.width = sc.height = 500;
  wheel.appendChild(sc);
  animateSparkles(sc);
}

function drawWheelGradients(canvas) {
  var ctx = canvas.getContext('2d');
  var cx = 250, cy = 250, r = 248;
  ctx.clearRect(0, 0, 500, 500);

  SECTOR_COLORS.forEach(function(col, i) {
    var startAngle = (i * 45 - 90) * Math.PI / 180;
    var endAngle   = startAngle + 45 * Math.PI / 180;
    var midAngle   = startAngle + 22.5 * Math.PI / 180;

    /* ── 1. Base fill: solid radial gradient, đậm từ sáng → tối ── */
    var grad = ctx.createRadialGradient(
      cx + Math.cos(midAngle) * r * 0.28, cy + Math.sin(midAngle) * r * 0.28, 0,
      cx, cy, r
    );
    grad.addColorStop(0,   col.accent);          /* sáng nhất ở vùng gần tâm */
    grad.addColorStop(0.5, col.inner);           /* màu chính */
    grad.addColorStop(1,   col.outer);           /* tối ở mép */

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* ── 2. Highlight streak: vệt sáng trắng chéo góc (lấp lánh) ── */
    var hMid   = startAngle + 10 * Math.PI / 180;
    var hx1    = cx + Math.cos(hMid) * r * 0.15;
    var hy1    = cy + Math.sin(hMid) * r * 0.15;
    var hx2    = cx + Math.cos(hMid) * r * 0.75;
    var hy2    = cy + Math.sin(hMid) * r * 0.75;
    var hiGrad = ctx.createLinearGradient(hx1, hy1, hx2, hy2);
    hiGrad.addColorStop(0,   'rgba(255,255,255,0)');
    hiGrad.addColorStop(0.35,'rgba(255,255,255,0.38)');
    hiGrad.addColorStop(0.55,'rgba(255,255,255,0.12)');
    hiGrad.addColorStop(1,   'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + 22 * Math.PI / 180);
    ctx.closePath();
    ctx.fillStyle = hiGrad;
    ctx.fill();

    /* ── 3. Edge sheen: vùng mép ngoài phản sáng nhẹ ── */
    var edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0)');
    edgeGrad.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = edgeGrad;
    ctx.fill();
  });

  /* ── 4. Centre vignette: tối nhẹ ở vùng tâm để SPIN nút nổi bật ── */
  var vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.35);
  vignette.addColorStop(0,   'rgba(0,0,0,0.22)');
  vignette.addColorStop(0.6, 'rgba(0,0,0,0.06)');
  vignette.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = vignette;
  ctx.fill();
}


/* Sparkle particles */
var _sparkles = [];
var _sparkleRaf = null;
function animateSparkles(canvas) {
  var ctx = canvas.getContext('2d');
  var cx = 250, cy = 250, r = 230;

  // Khởi tạo sparkles
  _sparkles = [];
  for (var i = 0; i < 55; i++) {
    _sparkles.push(makeSparkle(cx, cy, r));
  }

  function tick() {
    ctx.clearRect(0, 0, 500, 500);
    _sparkles.forEach(function(sp, idx) {
      sp.life -= sp.decay;
      if (sp.life <= 0) _sparkles[idx] = makeSparkle(cx, cy, r);
      var alpha = Math.min(sp.life, 1) * sp.maxAlpha;
      drawStar(ctx, sp.x, sp.y, sp.size, alpha, sp.color);
    });
    _sparkleRaf = requestAnimationFrame(tick);
  }
  tick();
}

function makeSparkle(cx, cy, r) {
  var angle = Math.random() * Math.PI * 2;
  var dist  = 55 + Math.random() * (r - 55);
  /* Lấy màu accent của ô tại góc đó — sparkle theo màu sector */
  var sectorIdx = Math.floor(((angle * 180 / Math.PI + 90 + 360) % 360) / 45) % 8;
  var sCol = SECTOR_COLORS[sectorIdx];
  var colors = [sCol.accent, '#ffffff', sCol.inner, '#fff8dc', '#ffffff', sCol.accent];
  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    size: 0.8 + Math.random() * 2.8,
    life: Math.random(),
    maxAlpha: 0.25 + Math.random() * 0.65,
    decay: 0.004 + Math.random() * 0.014,
    color: colors[Math.floor(Math.random() * colors.length)]
  };
}

function drawStar(ctx, x, y, r, alpha, color) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 3;
  ctx.beginPath();
  // 4-point star
  for (var i = 0; i < 4; i++) {
    var a = (i / 4) * Math.PI * 2;
    var a2 = a + Math.PI / 4;
    var outer = r, inner = r * 0.35;
    if (i === 0) ctx.moveTo(x + Math.cos(a)*outer, y + Math.sin(a)*outer);
    else ctx.lineTo(x + Math.cos(a)*outer, y + Math.sin(a)*outer);
    ctx.lineTo(x + Math.cos(a2)*inner, y + Math.sin(a2)*inner);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ══════════════════════════════════════════════
   3. SUSPENSE SPIN SYSTEM — làm người dùng hồi hộp
   ══════════════════════════════════════════════ */

/**
 * Kỹ thuật tạo cảm giác hồi hộp:
 * - Wheel quay nhanh bình thường trong 4.5s
 * - Gần cuối (5-6s) animation cubic-bezier gần dừng
 * - Trong 1s cuối: JS giả lập pointer "gõ" qua từng ô → play tick sound
 * - Pointer rung lớn hơn
 * - Khi dừng: flash sáng ô trúng + play fanfare
 */
var _tickInterval = null;
var _suspenseTimeout = null;

function startSuspensePhase(targetIndex, onDone) {
  var pointer = document.getElementById('pointer');
  if (pointer) {
    pointer.classList.remove('spinning');
    pointer.classList.add('suspense');
  }

  // Tính vị trí wheel hiện tại (rough) và simulate tick âm thanh
  // Wheel đang decelerate cuối — ta chơi 5-8 ticks cuối
  var ticks = 6 + Math.floor(Math.random() * 4); // 6-9 ticks cuối
  var delays = [];
  var totalMs = 1200; // 1.2s cuối
  for (var i = 0; i < ticks; i++) {
    // Khoảng cách tăng dần (chậm dần)
    delays.push(Math.floor(totalMs * (1 - Math.pow(1 - (i+1)/ticks, 2.2))));
  }

  delays.forEach(function(delay, i) {
    setTimeout(function() {
      playSuspenseTick(i, ticks - 1);
      // Rung pointer mạnh hơn mỗi tick
      if (pointer) {
        pointer.style.transform = 'translateX(-50%) rotate(' + (Math.random()*8-4) + 'deg)';
        setTimeout(function() {
          if (pointer) pointer.style.transform = '';
        }, 60);
      }
    }, delay);
  });

  _suspenseTimeout = setTimeout(function() {
    if (pointer) {
      pointer.classList.remove('suspense');
      pointer.classList.add('landed');
    }
    flashWinSector(targetIndex);
    onDone();
  }, totalMs + 200);
}

function flashWinSector(targetIndex) {
  // Vẽ flash vào #wheel (không xoay), tính góc thực tế trên màn hình.
  // Góc tĩnh của ô i (khi wheel chưa xoay): tâm .sec[i] = 45 + i*45 deg từ top
  // Wheel đã xoay totalDegree → góc thực = góc tĩnh - totalDegree (mod 360)
  // Để đơn giản: lấy góc mũi tên = 0° (top = -90° trong canvas rad)
  // Sau khi quay, mũi tên chỉ vào tâm ô → tâm ô thực tế luôn ở 0° (top)
  // Vẽ hình quạt cố định ở top: startAngle = -90° - 22.5°, endAngle = -90° + 22.5°
  var wheel = document.getElementById('wheel');
  if (!wheel) return;
  var flash = document.createElement('canvas');
  flash.width = flash.height = 500;
  flash.style.cssText = 'position:absolute;top:0;left:0;width:500px;height:500px;border-radius:50%;pointer-events:none;z-index:1001;';
  wheel.appendChild(flash);

  var ctx = flash.getContext('2d');
  var cx = 250, cy = 250, r = 248;
  // Mũi tên ở top (0° = -90° rad), ô trúng luôn căn giữa top sau khi dừng
  var startAngle = (-90 - 22.5) * Math.PI / 180;
  var endAngle   = (-90 + 22.5) * Math.PI / 180;
  var col = SECTOR_COLORS[targetIndex];

  var frame = 0;
  function drawFlash() {
    ctx.clearRect(0, 0, 500, 500);
    var alpha = Math.sin(frame * 0.25) * 0.55 + 0.15;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
    grad.addColorStop(0.4, col.accent + Math.round(alpha*255).toString(16).padStart(2,'0'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    frame++;
    if (frame < 28) requestAnimationFrame(drawFlash);
    else flash.remove();
  }
  drawFlash();
}

/* ══════════════════════════════════════════════
   KỲ LÂN × HỔ LỬA — SVG Border System
   Vẽ vào #border-svg đã có sẵn trong HTML
   ══════════════════════════════════════════════ */
function initKilinTigerBorder() {
  var svg = document.getElementById('border-svg');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var cx = 270, cy = 270, R = 268; // tâm và bán kính viền

  // ── Helpers ──────────────────────────────────
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function polar(angle, r) {
    var rad = (angle - 90) * Math.PI / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  }

  // ── DEFS: gradients ──────────────────────────
  var defs = el('defs', {});

  // Gradient vàng kim cho đồng tiền lân
  var coinGrad = el('radialGradient', { id: 'coinGrad', cx: '35%', cy: '30%', r: '60%' });
  coinGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#fffde0' }));
  coinGrad.appendChild(el('stop', { offset: '40%', 'stop-color': '#ffd700' }));
  coinGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#8b5e0a' }));
  defs.appendChild(coinGrad);

  // Gradient lửa hổ (amber → đỏ)
  var fireGrad = el('linearGradient', { id: 'fireGrad', x1: '0%', y1: '100%', x2: '0%', y2: '0%' });
  fireGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#cc2200' }));
  fireGrad.appendChild(el('stop', { offset: '50%', 'stop-color': '#ff6600' }));
  fireGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#ffcc00' }));
  defs.appendChild(fireGrad);

  // Gradient đá hổ nhãn (amber gem)
  var gemGrad = el('radialGradient', { id: 'tigerGemGrad', cx: '35%', cy: '30%', r: '55%' });
  gemGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#ffe8a0' }));
  gemGrad.appendChild(el('stop', { offset: '50%', 'stop-color': '#ff8800' }));
  gemGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#8b3a00' }));
  defs.appendChild(gemGrad);

  // Glow filter cho viền
  var filt = el('filter', { id: 'glowFilter', x: '-20%', y: '-20%', width: '140%', height: '140%' });
  var feGauss = el('feGaussianBlur', { 'in': 'SourceGraphic', stdDeviation: '4', result: 'blur' });
  var feMerge = el('feMerge', {});
  var feMergeNode1 = el('feMergeNode', { 'in': 'blur' });
  var feMergeNode2 = el('feMergeNode', { 'in': 'SourceGraphic' });
  feMerge.appendChild(feMergeNode1);
  feMerge.appendChild(feMergeNode2);
  filt.appendChild(feGauss);
  filt.appendChild(feMerge);
  defs.appendChild(filt);

  svg.insertBefore(defs, svg.firstChild);

  // ── Layer groups ─────────────────────────────
  var gBase   = el('g', { id: 'border-base' });
  var gClouds = el('g', { id: 'border-clouds' });
  var gStripe = el('g', { id: 'border-stripes' });
  var gGems   = el('g', { id: 'border-gems' });
  var gCoins  = el('g', { id: 'border-coins' });
  var gClaws  = el('g', { id: 'border-claws' });
  svg.appendChild(gBase);
  svg.appendChild(gClouds);
  svg.appendChild(gStripe);
  svg.appendChild(gGems);
  svg.appendChild(gCoins);
  svg.appendChild(gClaws);

  // ── 1. Vòng nền cực đậm ─────────────────────
  // Outer glow ring (rộng)
  gBase.appendChild(el('circle', { cx: cx, cy: cy, r: R + 2,
    fill: 'none', stroke: '#ff4400', 'stroke-width': '6', opacity: '0.6',
    filter: 'url(#glowFilter)' }));
  // Gold main ring
  gBase.appendChild(el('circle', { cx: cx, cy: cy, r: R,
    fill: 'none', stroke: '#ffd700', 'stroke-width': '5', opacity: '1' }));
  // Fire inner ring
  gBase.appendChild(el('circle', { cx: cx, cy: cy, r: R - 8,
    fill: 'none', stroke: '#ff6600', 'stroke-width': '3', opacity: '0.9' }));
  // Gold inner thin
  gBase.appendChild(el('circle', { cx: cx, cy: cy, r: R - 14,
    fill: 'none', stroke: '#ffd700', 'stroke-width': '2',
    'stroke-dasharray': '8 3', opacity: '0.8' }));
  // Amber innermost
  gBase.appendChild(el('circle', { cx: cx, cy: cy, r: R - 19,
    fill: 'none', stroke: '#ffaa00', 'stroke-width': '1',
    'stroke-dasharray': '4 4', opacity: '0.5' }));

  // ── 2. MÂY KỲ LÂN — 8 đám mây vàng (vị trí chẵn: 0°,45°,90°...) ──
  // Mỗi đám mây là cụm 3 hình tròn chồng nhau
  var cloudAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  cloudAngles.forEach(function(ang) {
    var p = polar(ang, R - 4);
    var rad = (ang - 90) * Math.PI / 180;
    // Hướng vector vuông góc (tangent) cho các bong mây
    var tx = -Math.sin(rad), ty = Math.cos(rad);
    // 3 circles tạo thành mây
    var sizes = [9, 7, 6];
    var offsets = [-9, 0, 8];
    sizes.forEach(function(sz, i) {
      var ox = p.x + tx * offsets[i], oy = p.y + ty * offsets[i];
      // Dịch ra ngoài 1 chút
      var nx = ox + Math.cos(rad) * 0, ny = oy + Math.sin(rad) * 0;
      gClouds.appendChild(el('circle', {
        cx: nx, cy: ny, r: sz,
        fill: 'rgba(255,215,0,0.18)',
        stroke: '#ffd700', 'stroke-width': '1.2'
      }));
    });
    // Điểm sáng nhỏ tâm mây
    gClouds.appendChild(el('circle', {
      cx: p.x, cy: p.y, r: 3,
      fill: '#ffd700', opacity: '0.9'
    }));
  });

  // ── 3. VẰN HỔ — 12 vằn cam ở vị trí lẻ ──────
  // Vằn: 2 đường cong song song, góc chéo
  var stripeAngles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  stripeAngles.forEach(function(ang) {
    var p  = polar(ang, R - 2);
    var p2 = polar(ang, R - 16);
    var rad = (ang - 90) * Math.PI / 180;
    var tx = -Math.sin(rad) * 5, ty = Math.cos(rad) * 5;
    // 3 vằn song song
    [-6, 0, 6].forEach(function(off) {
      var ox = off * (-Math.sin(rad)), oy = off * (Math.cos(rad));
      // điểm đầu & cuối vằn
      var x1 = p.x + ox + tx, y1 = p.y + oy + ty;
      var x2 = p2.x + ox - tx * 0.3, y2 = p2.y + oy - ty * 0.3;
      var stripe = el('line', {
        x1: x1, y1: y1, x2: x2, y2: y2,
        stroke: '#ff5500', 'stroke-width': (off === 0 ? '3' : '1.5'),
        'stroke-linecap': 'round',
        opacity: (off === 0 ? '0.85' : '0.5')
      });
      gStripe.appendChild(stripe);
    });
  });

  // ── 4. ĐỒNG TIỀN KỲ LÂN — 8 tiền vàng (góc chẵn) ──
  // Mỗi coin: vòng tròn vàng
  var coinAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  var coinSymbols = ['','','','','','','',''];  /* bỏ chữ Hán */
  coinAngles.forEach(function(ang, i) {
    var p = polar(ang, R - 22);
    // Outer ring
    // Outer glow
    gCoins.appendChild(el('circle', {
      cx: p.x, cy: p.y, r: 15,
      fill: 'rgba(255,215,0,0.25)', stroke: 'none'
    }));
    gCoins.appendChild(el('circle', {
      cx: p.x, cy: p.y, r: 13,
      fill: 'url(#coinGrad)',
      stroke: '#ffd700', 'stroke-width': '2'
    }));
    // Inner ring
    gCoins.appendChild(el('circle', {
      cx: p.x, cy: p.y, r: 9,
      fill: 'none',
      stroke: 'rgba(139,94,10,0.9)', 'stroke-width': '1'
    }));
    /* Không vẽ chữ Hán — chỉ giữ hình đồng tiền */
  });

  // ── 5. ĐÁ HỔ NHÃN — 8 viên gem amber hình thoi (góc lẻ) ──
  var gemAngles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  gemAngles.forEach(function(ang) {
    var p = polar(ang, R - 20);
    var rad = (ang - 90) * Math.PI / 180;
    var sz = 11;
    // Hình thoi (diamond) xoay theo góc
    var dx = Math.cos(rad) * sz, dy = Math.sin(rad) * sz;
    var tx2 = -Math.sin(rad) * sz * 0.55, ty2 = Math.cos(rad) * sz * 0.55;
    var pts = [
      (p.x + dx)   + ',' + (p.y + dy),
      (p.x + tx2)  + ',' + (p.y + ty2),
      (p.x - dx)   + ',' + (p.y - dy),
      (p.x - tx2)  + ',' + (p.y - ty2)
    ].join(' ');
    gGems.appendChild(el('polygon', {
      points: pts,
      fill: 'url(#tigerGemGrad)',
      stroke: '#ff4400', 'stroke-width': '1'
    }));
    // Điểm sáng nhỏ
    gGems.appendChild(el('circle', {
      cx: p.x + Math.cos(rad) * 2,
      cy: p.y + Math.sin(rad) * 2,
      r: 2, fill: 'rgba(255,255,200,0.7)'
    }));
  });

  // ── 6. VUỐT HỔ — 4 cụm vuốt ở NESW ───────────
  [0, 90, 180, 270].forEach(function(ang) {
    var p = polar(ang, R + 2); // ngoài viền 1 chút
    var rad = (ang - 90) * Math.PI / 180;
    var tx3 = -Math.sin(rad), ty3 = Math.cos(rad);
    // 3 vuốt song song
    [-7, 0, 7].forEach(function(off, ci) {
      var bx = p.x + tx3 * off, by = p.y + ty3 * off;
      var ex = bx - Math.cos(rad) * 20, ey = by - Math.sin(rad) * 20;
      // Slight curve: control point
      var cpx = (bx + ex) / 2 + Math.cos(rad) * (ci === 1 ? -4 : -2);
      var cpy = (by + ey) / 2 + Math.sin(rad) * (ci === 1 ? -4 : -2);
      var claw = el('path', {
        d: 'M' + bx + ' ' + by + ' Q' + cpx + ' ' + cpy + ' ' + ex + ' ' + ey,
        fill: 'none',
        stroke: (ci === 1 ? '#ff2200' : '#ff5500'),
        'stroke-width': (ci === 1 ? '4' : '2.5'),
        'stroke-linecap': 'round',
        opacity: (ci === 1 ? '0.9' : '0.6')
      });
      gClaws.appendChild(claw);
    });
  });

  // ── 7. NGỌN LỬA NHỎ — 16 flame nhỏ quanh viền ngoài ──
  for (var fi = 0; fi < 16; fi++) {
    var fang = fi * 22.5;
    var fp   = polar(fang, R + 6);
    var frad = (fang - 90) * Math.PI / 180;
    // Flame: nhọn lên, hướng ra ngoài
    var fh = 14 + (fi % 2) * 7; // xen kẽ cao thấp, lớn hơn
    var fw = 5.5;
    var fx = fp.x, fy = fp.y;
    var tip_x = fx + Math.cos(frad) * fh;
    var tip_y = fy + Math.sin(frad) * fh;
    var l_x = fx - Math.sin(frad) * fw;
    var l_y = fy + Math.cos(frad) * fw;
    var r_x = fx + Math.sin(frad) * fw;
    var r_y = fy - Math.cos(frad) * fw;
    var flame = el('path', {
      d: 'M' + l_x + ',' + l_y + ' Q' + tip_x + ',' + tip_y + ' ' + r_x + ',' + r_y + ' Z',
      fill: 'url(#fireGrad)',
      opacity: (fi % 2 === 0 ? '0.7' : '0.5')
    });
    gClaws.appendChild(flame);
  }

  // ── CSS animation: flame pulse ─────────────────
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes borderFlame {',
    '  0%,100% { opacity:0.7; }',
    '  50%     { opacity:1;   }',
    '}',
    '#border-coins { animation: borderFlame 2s ease-in-out infinite; }',
  ].join('');
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════
   BACKGROUND AUDIO SYSTEM
   - Ambient loop: nhạc casino nhẹ nhàng (Web Audio synthesized)
   - Spin: tick nhanh khi quay
   - Win: fanfare
   Tất cả Web Audio API, zero file dependency
   ══════════════════════════════════════════════ */

var _bgAudioCtx  = null;
var _bgIsPlaying = false;
var _bgNodes     = [];   // các node đang chạy để có thể dừng

function _getBgCtx() {
  if (!_bgAudioCtx) {
    _bgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_bgAudioCtx.state === 'suspended') _bgAudioCtx.resume();
  return _bgAudioCtx;
}

/**
 * Synthesize ambient casino music loop:
 * - Bass pulse 1 beat/s (60bpm)
 * - High shimmer arpeggio (C pentatonic)
 * - Soft pad chord
 */
function startBgMusic() {
  if (_bgIsPlaying) return;
  _bgIsPlaying = true;
  try {
    var ctx = _getBgCtx();
    _bgNodes = [];

    // Master gain (overall volume — khá nhẹ để không át âm game)
    var master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.5);
    master.connect(ctx.destination);
    _bgNodes.push(master);

    // ── Soft reverb convolver (impulse) ──
    var reverbLen = ctx.sampleRate * 2;
    var reverbBuf = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = reverbBuf.getChannelData(ch);
      for (var i = 0; i < reverbLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
      }
    }
    var reverb = ctx.createConvolver();
    reverb.buffer = reverbBuf;
    var reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.18;
    reverb.connect(reverbGain);
    reverbGain.connect(master);

    // ── PAD chord: F maj7 ─ sine waves, very soft ──
    var padNotes = [174.61, 220.00, 261.63, 329.63, 392.00]; // F3 A3 C4 E4 G4
    padNotes.forEach(function(freq) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(master);
      gain.connect(reverb);
      osc.start(ctx.currentTime);
      _bgNodes.push(osc);
    });

    // ── Shimmer arpeggio: C pentatonic, 8th notes @ 120bpm ──
    var arpNotes = [
      523.25, 659.25, 783.99, 1046.50, // C5 E5 G5 C6
      987.77, 783.99, 659.25, 523.25   // B5 G5 E5 C5
    ];
    var arpInterval = 60 / 120 / 2; // 8th note at 120bpm = 0.25s

    function scheduleArp(startTime, noteIdx, loopCount) {
      if (!_bgIsPlaying || loopCount > 9999) return;
      var freq   = arpNotes[noteIdx % arpNotes.length];
      var t      = startTime;
      var osc    = ctx.createOscillator();
      var gain   = ctx.createGain();
      // triangle wave — bell-like shimmer
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + arpInterval * 0.85);
      osc.connect(gain);
      gain.connect(master);
      gain.connect(reverb);
      osc.start(t);
      osc.stop(t + arpInterval);
      _bgNodes.push(osc);

      // Schedule next note
      setTimeout(function() {
        scheduleArp(ctx.currentTime, noteIdx + 1, loopCount + 1);
      }, arpInterval * 880); // 880ms look-ahead
    }
    scheduleArp(ctx.currentTime + 0.1, 0, 0);

    // ── Bass pulse: every beat (0.5s @ 120bpm) ──
    function scheduleBass(startTime, beatCount) {
      if (!_bgIsPlaying || beatCount > 9999) return;
      var t   = startTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 87.31; // F2
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.25);
      _bgNodes.push(osc);

      // Accent on beat 1 of every 4
      if (beatCount % 4 === 0) {
        var accent = ctx.createOscillator();
        var ag     = ctx.createGain();
        accent.type = 'triangle';
        accent.frequency.value = 261.63; // C4
        ag.gain.setValueAtTime(0, t);
        ag.gain.linearRampToValueAtTime(0.04, t + 0.01);
        ag.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        accent.connect(ag); ag.connect(master); ag.connect(reverb);
        accent.start(t); accent.stop(t + 0.4);
        _bgNodes.push(accent);
      }

      setTimeout(function() {
        scheduleBass(ctx.currentTime, beatCount + 1);
      }, 440); // schedule ~440ms ahead
    }
    scheduleBass(ctx.currentTime + 0.05, 0);

  } catch(e) { console.warn('BG audio error:', e); }
}

function stopBgMusic() {
  _bgIsPlaying = false;
  try {
    _bgNodes.forEach(function(n) {
      try { n.stop && n.stop(); } catch(e) {}
    });
  } catch(e) {}
  _bgNodes = [];
}

function fadeBgMusic(targetVol, durationMs) {
  // Fade master gain — find it from _bgNodes
  // Simple approach: just adjust _bgIsPlaying flag and let nodes decay naturally
  if (targetVol === 0) {
    setTimeout(stopBgMusic, durationMs);
  }
}

// ── UI Toggle button ──────────────────────────────
function _initBgMusicToggle() {
  var btn = document.createElement('button');
  btn.id = 'bg-music-btn';
  btn.innerHTML = '🔊';
  btn.title = 'Bật/Tắt nhạc nền';
  btn.style.cssText = [
    'position:fixed',
    'bottom:72px',           /* trên bottom-bar */
    'left:14px',             /* góc trái, không đè cóc/toad */
    'width:38px',
    'height:38px',
    'border-radius:50%',
    'background:rgba(0,0,0,0.55)',
    'border:1.5px solid rgba(255,215,0,0.45)',
    'color:#ffd700',
    'font-size:16px',
    'cursor:pointer',
    'z-index:90000',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'transition:all 0.2s',
    'backdrop-filter:blur(6px)',
    '-webkit-backdrop-filter:blur(6px)',
  ].join(';');

  var _on = false;
  btn.addEventListener('click', function() {
    // First click: resume AudioContext (iOS requirement)
    _on = !_on;
    if (_on) {
      startBgMusic();
      btn.innerHTML = '🔊';
      btn.style.borderColor = 'rgba(255,215,0,0.9)';
      btn.style.boxShadow = '0 0 10px rgba(255,215,0,0.4)';
    } else {
      stopBgMusic();
      btn.innerHTML = '🔇';
      btn.style.borderColor = 'rgba(255,215,0,0.3)';
      btn.style.boxShadow = 'none';
    }
  });

  document.body.appendChild(btn);
}

$(document).ready(function() {
  // Khởi tạo canvas visuals
  initWheelCanvas();
  // Khởi tạo viền Kỳ Lân × Hổ Lửa
  initKilinTigerBorder();
  // Khởi tạo nút nhạc nền
  _initBgMusicToggle();


  $('#spin').click(function() {
    if (spinning) return;

    // Kiểm tra spin từ cóc
    if (typeof toadState !== 'undefined') {
      if (toadState.spinReadyToClaim) {
        showToadToast('🐸 Nhận spin trước đã! Bấm nút Nhận Spin ở góc trên phải.');
        return;
      }
      if (toadState.spinsLeft <= 0) {
        showToadToast('❌ Chưa có spin! Chờ cóc đẻ rồi nhận nhé.');
        return;
      }
    }

    spinning = true;
    $('#popup-overlay').removeClass('show');

    // Chọn kết quả
    var targetIndex = getRandomPrizeIndex();
    var wasPityTrigger = _isPityTrigger;

    clicks++;
    // Tâm ô i: .sec[i] rotate = 45+i*45deg, mỗi ô 45°, tâm = (45+i*45) + 22.5
    // Nhưng transform-origin lệch → offset thực = 45 + i*45
    var targetDegree = 45 + (targetIndex * 45);
    var totalDegree  = (degree * clicks) + (360 - targetDegree);

    // ── Pointer vào chế độ spinning ──
    var pointer = document.getElementById('pointer');
    if (pointer) { pointer.classList.add('spinning'); pointer.classList.remove('suspense', 'landed'); }

    // Resume AudioContext nếu bị suspended (iOS)
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();

    // ── Áp transform để wheel bắt đầu quay ──
    $('#inner-wheel').css({ transform: 'rotate(' + totalDegree + 'deg)' });

    // ── Tick sounds trong 6s đầu (interval nhanh → chậm dần) ──
    var _spinTicks = 0;
    var _spinTickMs = 80; // bắt đầu nhanh
    function scheduleTick() {
      if (_spinTicks > 40 || !spinning) return;
      playTick(280 + Math.random() * 80);
      _spinTicks++;
      _spinTickMs = Math.min(_spinTickMs * 1.12, 500);
      setTimeout(scheduleTick, _spinTickMs);
    }
    setTimeout(scheduleTick, 200);

    // ── Sau 4.8s → bắt đầu suspense phase (wheel đang chậm dần) ──
    setTimeout(function() {
      var result = prizes[targetIndex];

      startSuspensePhase(targetIndex, function() {
        // ── Kết quả ──

        // Cập nhật pity
        updatePityAfterSpin(targetIndex);

        // Âm thanh kết quả
        playWinSound(result.type === 'rare');

        // Cộng coin
        if (result.type === 'coin' && typeof toadState !== 'undefined') {
          toadState.coins += result.coin;
          saveState();
          showToadToast('+' + result.coin + ' Coin! 🪙');
          if (typeof checkAndShowLevelUp !== 'undefined') checkAndShowLevelUp();
        }

        // Trừ 1 spin
        if (typeof useOneSpin !== 'undefined') {
          useOneSpin();
          if (typeof _updateAllUI !== 'undefined') _updateAllUI();
          else renderSpinCounter();
        }

        // Lịch sử
        if (typeof window.addSpinHistory === 'function') {
          window.addSpinHistory(result, wasPityTrigger);
        }

        // Hiện popup sau 400ms (cho người xem ô sáng trước)
        setTimeout(function() {
          if (wasPityTrigger || result.type === 'rare') {
            if (typeof showPityPopup === 'function') showPityPopup(result);
            else showNormalResultPopup(result);
          } else {
            showNormalResultPopup(result);
          }
          spinning = false;
        }, 400);
      });
    }, 4800);
  });

  // Đóng popup
  $('#close-popup, #popup-overlay').click(function(e) {
    if (e.target.id === 'close-popup' || e.target.id === 'popup-overlay') {
      $('#popup-overlay').removeClass('show');
    }
  });
});

/** Hiện popup kết quả thông thường */
function showNormalResultPopup(result) {
  $('#popup .result-number').html(result.label);
  $('#popup .result-icon').html(result.name);

  var overlay = document.getElementById('popup-overlay');
  overlay.querySelectorAll('.ripple-wave').forEach(function(el) { el.remove(); });
  for (var w = 0; w < 3; w++) {
    (function(idx) {
      var ripple = document.createElement('div');
      ripple.className = 'ripple-wave';
      ripple.style.cssText =
        'position:absolute;border-radius:50%;pointer-events:none;top:50%;left:50%;' +
        'transform:translate(-50%,-50%);width:0;height:0;opacity:0;' +
        'border:1px solid rgba(212,175,55,' + (0.35 - idx * 0.08) + ');' +
        'animation:rippleExpand 2s cubic-bezier(0.2,0.8,0.4,1) ' + (idx * 0.25) + 's forwards;';
      overlay.appendChild(ripple);
    })(w);
  }
  $('#popup-overlay').addClass('show');
}
