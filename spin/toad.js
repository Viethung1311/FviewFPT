/**
 * TOAD PET SYSTEM — toad.js
 * ─────────────────────────────────────────
 * Cấp 1: cần 5 coin lên cấp,  1 spin / 3h
 * Cấp 2: cần 10 coin,         2 spin / 2.5h
 * Cấp 3: cần 15 coin,         3 spin / 2h
 * Cấp 4: cần 20 coin,         4 spin / 1.5h
 * Cấp 5: MAX,                 5 spin / 1h
 *
 * Luật spin:
 *  - Hết cooldown → hiện nút "Nhận Spin" trên HUD
 *  - Người dùng bấm nhận → cộng spin, cooldown chạy lại
 *  - 00:00 mỗi ngày → reset spin còn lại về 0
 *
 * Luật coin:
 *  - Coin nhận từ quay vòng quay (🪙1, 🪙2, 🪙3 tùy ô)
 */

// ─── CONFIG ───────────────────────────────────────────────────────
var TOAD_LEVELS = [
  null,
  { level:1, coinsToNext:5,    spins:1, cooldownMs:3.0 * 3600000 },
  { level:2, coinsToNext:10,   spins:2, cooldownMs:2.5 * 3600000 },
  { level:3, coinsToNext:18,   spins:3, cooldownMs:2.0 * 3600000 },
  { level:4, coinsToNext:28,   spins:4, cooldownMs:1.5 * 3600000 },
  { level:5, coinsToNext:40,   spins:5, cooldownMs:1.2 * 3600000 },
  { level:6, coinsToNext:60,   spins:6, cooldownMs:0.9 * 3600000 },
  { level:7, coinsToNext:null, spins:7, cooldownMs:0.6 * 3600000 }
];
var STORAGE_KEY = 'toadPetState';

// ─── STATE ────────────────────────────────────────────────────────
var toadState = {
  level:             1,
  coins:             0,
  spinsLeft:         0,
  spinReadyToClaim:  false,   // true = hết cooldown, chờ người dùng nhấn nhận
  lastSpawnTime:     null,    // timestamp lần cóc bắt đầu cooldown gần nhất
  lastClaimTime:     null,    // timestamp lần cuối nhấn nhận spin
  lastResetDate:     null,    // 'YYYY-MM-DD' ngày đã reset spin 00:00
  pendingLevelUp:    false    // true = đủ coin, chờ người dùng xác nhận nâng cấp
};

// ─── PERSISTENCE ──────────────────────────────────────────────────
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toadState)); } catch(e) {}
}
function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      // Merge để đảm bảo các field mới luôn tồn tại
      toadState = Object.assign({}, toadState, parsed);
    }
  } catch(e) {}
}

// ─── HELPERS ──────────────────────────────────────────────────────
function getLevelCfg(lvl) {
  return TOAD_LEVELS[Math.min(Math.max(lvl, 1), 7)];
}

/** ms còn lại cho đến khi sinh spin tiếp */
function msUntilNextSpawn() {
  if (toadState.spinReadyToClaim) return 0;  // đã sẵn sàng
  if (!toadState.lastSpawnTime)   return 0;  // chưa từng chạy cooldown
  var cfg = getLevelCfg(toadState.level);
  return Math.max(0, cfg.cooldownMs - (Date.now() - toadState.lastSpawnTime));
}

function formatMs(ms) {
  if (ms <= 0) return '00:00:00';
  var s   = Math.floor(ms / 1000);
  var h   = Math.floor(s / 3600);
  var m   = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  return pad2(h) + ':' + pad2(m) + ':' + pad2(sec);
}
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ─── CORE ACTIONS ─────────────────────────────────────────────────

/**
 * Kiểm tra xem cooldown đã hết chưa.
 * Nếu hết → đặt spinReadyToClaim = true (KHÔNG tự cộng spin).
 * Trả về true nếu vừa chuyển sang ready.
 */
function trySpawnSpins() {
  if (toadState.spinReadyToClaim) return false; // đã ready rồi
  if (msUntilNextSpawn() > 0)     return false; // chưa hết cooldown
  // Lần đầu hoặc hết cooldown → đánh dấu sẵn sàng
  toadState.spinReadyToClaim = true;
  saveState();
  return true;
}

/**
 * Người dùng bấm nhận spin.
 * Cộng thêm spin (không override), tắt ready, bắt đầu cooldown mới.
 */
function claimSpins() {
  if (!toadState.spinReadyToClaim) return false;
  var cfg = getLevelCfg(toadState.level);
  toadState.spinsLeft        += cfg.spins;  // FIX: cộng thêm, không override
  toadState.spinReadyToClaim = false;
  toadState.lastSpawnTime    = Date.now();
  toadState.lastClaimTime    = Date.now();
  saveState();
  return true;
}

/** Reset spin về 0 lúc 00:00 mỗi ngày. */
function checkDailySpinReset() {
  var today = todayStr();
  if (toadState.lastResetDate !== today) {
    toadState.spinsLeft     = 0;
    toadState.lastResetDate = today;
    // Không reset spinReadyToClaim — nếu cóc đang sẵn sàng thì vẫn giữ
    saveState();
  }
  // FIX: Re-validate pendingLevelUp — nếu không đủ coin thì bỏ cờ để spin không bị khóa oan
  if (toadState.pendingLevelUp && toadState.level < 5) {
    var cfg = getLevelCfg(toadState.level);
    if (toadState.coins < cfg.coinsToNext) {
      toadState.pendingLevelUp = false;
      saveState();
    }
  }
}

/** Tiêu 1 spin khi quay. */
function useOneSpin() {
  if (toadState.spinsLeft <= 0) return false;
  toadState.spinsLeft--;
  saveState();
  return true;
}

/**
 * Kiểm tra xem có đủ coin để lên cấp không.
 * Nếu đủ → đặt pendingLevelUp = true, KHÔNG tự lên cấp.
 * Người dùng phải xác nhận qua popup.
 * FIX: Nếu không đủ coin nhưng đang pending → reset pending (tránh spin bị khóa oan)
 */
function checkLevelUp() {
  if (toadState.level >= 7) {
    toadState.pendingLevelUp = false;
    return false;
  }
  var cfg = getLevelCfg(toadState.level);
  if (toadState.coins >= cfg.coinsToNext) {
    if (toadState.pendingLevelUp) return false; // đã đang chờ rồi
    toadState.pendingLevelUp = true;
    saveState();
    return true; // báo cho caller biết để show popup
  } else {
    // FIX: Nếu coin bị giảm xuống dưới ngưỡng (ví dụ admin reset) → bỏ pending
    if (toadState.pendingLevelUp) {
      toadState.pendingLevelUp = false;
      saveState();
    }
    return false;
  }
}

/** Thực sự lên cấp — chỉ gọi khi người dùng xác nhận. */
function doLevelUp() {
  if (!toadState.pendingLevelUp) return false;
  if (toadState.level >= 7) return false;
  var cfg = getLevelCfg(toadState.level);
  toadState.coins         -= cfg.coinsToNext;
  toadState.level++;
  toadState.pendingLevelUp   = false;
  // FIX: Bắt đầu cooldown mới thay vì set sẵn sàng ngay (tránh double-claim)
  // Tặng ngay 1 lần spin khi lên cấp để thưởng người dùng
  var newCfg = getLevelCfg(toadState.level);
  toadState.spinsLeft        += newCfg.spins;
  toadState.lastSpawnTime    = Date.now();
  toadState.spinReadyToClaim = false;
  saveState();
  return true;
}

// ─── SVG CÓC ──────────────────────────────────────────────────────
function getToadSVG(lvl) {
  lvl = Math.min(Math.max(lvl, 1), 7);
  var colors  = ['#5a9e3a', '#3aae6e', '#2090c0', '#a040d0', '#e8a000', '#cc2222', '#FFD700'];
  var darkens = ['#1a4010', '#0a5030', '#004060', '#500080', '#804000', '#660000', '#b8860b'];
  var c = colors[lvl - 1], d = darkens[lvl - 1];
  var crown = lvl >= 7
    ? '<polygon points="32,8 36,16 40,10 44,16 48,8 48,18 32,18" fill="#FFD700" stroke="#c8960c" stroke-width="1"/>'
    : '';
  var stars = '';
  for (var s = 0; s < lvl; s++)
    stars += '<text x="' + (18 + s * 10) + '" y="76" font-size="8" fill="#FFD700" text-anchor="middle">★</text>';

  var baseSVG =
    '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    crown +
    '<ellipse cx="40" cy="50" rx="24" ry="18" fill="' + c + '"/>' +
    '<ellipse cx="40" cy="32" rx="20" ry="16" fill="' + c + '"/>' +
    '<ellipse cx="30" cy="24" rx="7"  ry="8"  fill="' + d + '" opacity="0.3"/>' +
    '<ellipse cx="50" cy="24" rx="7"  ry="8"  fill="' + d + '" opacity="0.3"/>' +
    '<ellipse cx="30" cy="24" rx="5"  ry="6"  fill="#fff"/>' +
    '<ellipse cx="50" cy="24" rx="5"  ry="6"  fill="#fff"/>' +
    '<circle cx="30" cy="24" r="3" fill="#222"/>' +
    '<circle cx="50" cy="24" r="3" fill="#222"/>' +
    '<circle cx="31" cy="23" r="1" fill="#fff"/>' +
    '<circle cx="51" cy="23" r="1" fill="#fff"/>' +
    '<path d="M33 36 Q40 42 47 36" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="60" rx="8" ry="5" fill="' + c + '" transform="rotate(-20 20 60)"/>' +
    '<ellipse cx="60" cy="60" rx="8" ry="5" fill="' + c + '" transform="rotate(20 60 60)"/>' +
    '<ellipse cx="40" cy="52" rx="14" ry="10" fill="' + c + '" opacity="0.5"/>' +
    (lvl >= 3
      ? '<circle cx="34" cy="46" r="3" fill="' + d + '" opacity="0.4"/>' +
        '<circle cx="46" cy="50" r="2.5" fill="' + d + '" opacity="0.4"/>'
      : '') +
    stars +
    '</svg>';

  // Cấp 1-5: trả về SVG thuần
  if (lvl < 6) return baseSVG;

  // Cấp 6 & 7: bọc trong wrapper có hiệu ứng A+B+D
  var isLv7    = lvl === 7;
  var ringCol  = isLv7 ? 'rgba(255,215,0,.8)'   : 'rgba(255,80,0,.7)';
  var glowCol  = isLv7 ? 'rgba(255,215,0,.5)'   : 'rgba(255,80,0,.4)';
  var runeCol  = isLv7 ? '#ffd700'               : '#ff6a00';
  var runeGlow = isLv7 ? 'rgba(255,215,0,.9)'   : 'rgba(255,80,0,.85)';
  var radBg    = isLv7 ? 'rgba(255,200,0,.18)'  : 'rgba(255,60,0,.15)';
  var cls      = isLv7 ? 'toad-fx toad-fx-7'    : 'toad-fx toad-fx-6';

  // Orb sparks: 3 for lv6, 4 for lv7 — inline SVG overlay
  var orbs = '';
  var orbCount = isLv7 ? 4 : 3;
  var orbColors6 = ['#ff6a00','#ff4400','#ffaa00'];
  var orbColors7 = ['#FFD700','#fff4a0','#FFD700','#ffe080'];
  var orbR       = isLv7 ? 3 : 2.5;
  for (var o = 0; o < orbCount; o++) {
    var oColor = isLv7 ? orbColors7[o] : orbColors6[o];
    var oDur   = isLv7 ? (2 + o * 0.15) + 's' : (3 + o * 0.2) + 's';
    var oDel   = '-' + (o / orbCount * (isLv7 ? 2 : 3)).toFixed(2) + 's';
    orbs +=
      '<svg class="toad-orb-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
        '<g style="transform-origin:32px 32px;animation:toadOrb ' + oDur + ' linear ' + oDel + ' infinite">' +
          '<circle cx="40" cy="5" r="' + orbR + '" fill="' + oColor + '" opacity=".92"/>' +
        '</g>' +
      '</svg>';
  }

  return '<div class="' + cls + '" style="' +
      '--ring-col:' + ringCol + ';' +
      '--glow-col:' + glowCol + ';' +
      '--rune-col:' + runeCol + ';' +
      '--rune-glow:' + runeGlow + ';' +
      '--rad-bg:' + radBg + ';' +
    '">' +
    '<div class="toad-rad-bg"></div>' +
    '<span class="toad-rune">✦</span>' +
    '<div class="toad-ring"></div>' +
    '<div class="toad-svg-wrap">' + baseSVG + '</div>' +
    orbs +
  '</div>';
}

// ─── HUD (GÓC TRÊN PHẢI) ──────────────────────────────────────────
var _hudTimerInterval = null;

function renderHUD() {
  var el = document.getElementById('resource-hud');
  if (!el) return;

  var spins  = toadState.spinsLeft;
  var coins  = toadState.coins;
  var ready  = toadState.spinReadyToClaim;
  var msLeft = msUntilNextSpawn();
  var cfg    = getLevelCfg(toadState.level);

  // ── Chip 1: Số spin hiện có (luôn hiển thị) ─────────────────────
  var spinCountChip =
    '<div class="hud-chip">' +
      '<div class="hud-icon spin-icon">🎰</div>' +
      '<div class="hud-text-wrap">' +
        '<span class="hud-val spin-val' + (spins === 0 ? ' empty' : '') + '">' + spins + '</span>' +
        '<span class="hud-label spin-label">SPIN</span>' +
      '</div>' +
    '</div>';

  // ── Chip 2: Cooldown / Nút nhận (2 trạng thái) ──────────────────
  var cooldownChip = '';
  if (ready) {
    // Sẵn sàng → nút nhận nhấp nháy
    cooldownChip =
      '<div class="hud-chip hud-chip-ready">' +
        '<button class="hud-claim-btn" onclick="hudClaimSpins()">' +
          '<span class="hud-claim-icon">🐸</span>' +
          '<span class="hud-claim-text">Nhận ' + cfg.spins + ' Spin!</span>' +
        '</button>' +
      '</div>';
  } else {
    // Đang đếm ngược
    cooldownChip =
      '<div class="hud-chip hud-chip-timer">' +
        '<div class="hud-icon timer-icon">⏳</div>' +
        '<div class="hud-text-wrap">' +
          '<span class="hud-val timer-val" id="hud-spin-timer">' + formatMs(msLeft) + '</span>' +
          '<span class="hud-label timer-label">HỒI SPIN</span>' +
        '</div>' +
      '</div>';
  }

  el.innerHTML =
    spinCountChip +
    cooldownChip +
    // Chip coin
    '<div class="hud-chip">' +
      '<div class="hud-icon coin-icon">🪙</div>' +
      '<div class="hud-text-wrap">' +
        '<span class="hud-val coin-val">' + coins + '</span>' +
        '<span class="hud-label coin-label">COIN</span>' +
      '</div>' +
    '</div>' +
    // Nút info
    '<button id="hud-info-btn" aria-label="Thông tin" onclick="openInfoPopup()">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="8" cy="8" r="7" stroke="rgba(212,175,55,0.7)" stroke-width="1.2"/>' +
        '<rect x="7.2" y="6.8" width="1.6" height="5.2" rx="0.8" fill="#F5D060"/>' +
        '<circle cx="8" cy="4.6" r="1" fill="#F5D060"/>' +
      '</svg>' +
    '</button>';

  // Tick timer — chỉ update text đếm ngược, không re-render toàn bộ HUD
  if (_hudTimerInterval) clearInterval(_hudTimerInterval);
  // Chỉ cần timer nếu đang cooldown (không ready, không có spin sẵn)
  if (!ready) {
    _hudTimerInterval = setInterval(function() {
      checkDailySpinReset();
      // Hết cooldown → dừng timer TRƯỚC, rồi render lại toàn bộ
      if (trySpawnSpins() || toadState.spinReadyToClaim) {
        clearInterval(_hudTimerInterval);
        _hudTimerInterval = null;
        _updateAllUI();
        return;
      }
      // Chỉ cập nhật text đồng hồ, không render lại HUD
      var timerEl = document.getElementById('hud-spin-timer');
      if (timerEl) timerEl.textContent = formatMs(msUntilNextSpawn());
    }, 1000);
  }
}

/** Bấm nhận spin từ HUD */
function hudClaimSpins() {
  if (!claimSpins()) return;
  var cfg = getLevelCfg(toadState.level);
  showToadToast('🎰 Nhận ' + cfg.spins + ' spin thành công!');
  _updateAllUI();
}

/** Cập nhật toàn bộ UI sau khi state thay đổi (không gây vòng lặp) */
function _updateAllUI() {
  // 0. Cập nhật icon nút cóc ngoài
  updateToggleBtnIcon();
  // 1. Badge nút cóc + enable/disable spin button
  var el = document.getElementById('spin-counter');
  if (el) {
    var s = toadState.spinsLeft, ready = toadState.spinReadyToClaim;
    el.textContent = ready ? '!' : s;
    el.className = 'spin-count ' + (s > 0 ? 'has-spin' : (ready ? 'ready-spin' : 'no-spin'));
  }
  var spinBtn = document.getElementById('spin');
  if (spinBtn) {
    if (toadState.pendingLevelUp) {
      spinBtn.classList.add('spin-disabled');
      spinBtn.classList.add('spin-levellock');
    } else if (toadState.spinsLeft <= 0) {
      spinBtn.classList.add('spin-disabled');
      spinBtn.classList.remove('spin-levellock');
    } else {
      spinBtn.classList.remove('spin-disabled');
      spinBtn.classList.remove('spin-levellock');
    }
  }
  // 2. HUD
  renderHUD();
  // 3. Panel nếu đang mở
  var panel = document.getElementById('toad-panel');
  if (panel && panel.classList.contains('open')) renderToad();
}

// ─── CẬP NHẬT ICON NÚT CÓC NGOÀI ─────────────────────────────────
function updateToggleBtnIcon() {
  var wrap = document.getElementById('toad-btn-wrap');
  var svgEl = document.getElementById('toad-btn-svg');
  if (!wrap || !svgEl) return;

  var lvl = toadState.level;
  var colors  = ['#5a9e3a','#3aae6e','#2090c0','#a040d0','#e8a000','#cc2222','#FFD700'];
  var darkens = ['#1a4010','#0a5030','#004060','#500080','#804000','#660000','#b8860b'];
  var c = colors[lvl - 1], d = darkens[lvl - 1];

  // Update SVG colors
  var crown = lvl >= 7
    ? '<polygon points="10,2 12.5,7 15,3.5 17.5,7 20,2 20,7 10,7" fill="#FFD700" stroke="#c8960c" stroke-width="0.5"/>'
    : '';
  var spots = lvl >= 3
    ? '<circle cx="17" cy="23" r="1.5" fill="' + d + '" opacity="0.45"/><circle cx="23" cy="25" r="1.2" fill="' + d + '" opacity="0.45"/>'
    : '';
  svgEl.innerHTML =
    crown +
    '<ellipse cx="20" cy="24" rx="13" ry="9" fill="' + c + '"/>' +
    '<ellipse cx="20" cy="15" rx="11" ry="9" fill="' + c + '"/>' +
    '<ellipse cx="13" cy="9" rx="4" ry="4.5" fill="' + d + '" opacity="0.4"/>' +
    '<ellipse cx="27" cy="9" rx="4" ry="4.5" fill="' + d + '" opacity="0.4"/>' +
    '<ellipse cx="13" cy="9" rx="3" ry="3.5" fill="#fff"/>' +
    '<ellipse cx="27" cy="9" rx="3" ry="3.5" fill="#fff"/>' +
    '<circle cx="13" cy="9" r="2" fill="#222"/>' +
    '<circle cx="27" cy="9" r="2" fill="#222"/>' +
    '<circle cx="13.7" cy="8.3" r="0.7" fill="#fff"/>' +
    '<circle cx="27.7" cy="8.3" r="0.7" fill="#fff"/>' +
    '<path d="M15 19 Q20 23 25 19" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="20" cy="30" r="4" fill="#FFD700" stroke="#c8960c" stroke-width="0.8"/>' +
    '<text x="20" y="33" font-size="5" fill="#8b5e0a" text-anchor="middle" font-weight="bold">$</text>' +
    spots;

  // Set wrapper data-level for CSS targeting
  wrap.setAttribute('data-level', lvl);

  // Effects only for lv6/7
  var orbsEl = document.getElementById('tbw-orbs');
  if (lvl < 6) {
    if (orbsEl) orbsEl.innerHTML = '';
    return;
  }

  var isLv7     = lvl === 7;
  var ringCol   = isLv7 ? 'rgba(255,215,0,.85)'  : 'rgba(255,80,0,.75)';
  var glowCol   = isLv7 ? 'rgba(255,215,0,.5)'   : 'rgba(255,80,0,.4)';
  var runeCol   = isLv7 ? '#ffd700'               : '#ff6a00';
  var runeGlow  = isLv7 ? 'rgba(255,215,0,.9)'   : 'rgba(255,80,0,.85)';
  var radBg     = isLv7 ? 'rgba(255,200,0,.2)'   : 'rgba(255,60,0,.17)';

  // Set CSS variables on wrapper
  wrap.style.setProperty('--ring-col',  ringCol);
  wrap.style.setProperty('--glow-col',  glowCol);
  wrap.style.setProperty('--rune-col',  runeCol);
  wrap.style.setProperty('--rune-glow', runeGlow);
  wrap.style.setProperty('--rad-bg',    radBg);

  // Rebuild orbs
  if (orbsEl) {
    var orbCount   = isLv7 ? 4 : 3;
    var orbColors6 = ['#ff6a00','#ff4400','#ffaa00'];
    var orbColors7 = ['#FFD700','#fff4a0','#FFD700','#ffe080'];
    var html = '';
    for (var o = 0; o < orbCount; o++) {
      var oColor = isLv7 ? orbColors7[o] : orbColors6[o];
      var oDur   = (isLv7 ? 1.8 : 2.5) + o * (isLv7 ? 0.12 : 0.18);
      var oDel   = -(o / orbCount * (isLv7 ? 1.8 : 2.5));
      html +=
        '<svg class="tbw-orb" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
          '<g style="transform-origin:32px 32px;animation:toadOrb ' + oDur.toFixed(2) + 's linear ' + oDel.toFixed(2) + 's infinite">' +
            '<circle cx="32" cy="3" r="3" fill="' + oColor + '" opacity=".92"/>' +
          '</g>' +
        '</svg>';
    }
    orbsEl.innerHTML = html;
  }
}


// ─── BADGE SỐ SPIN (nút cóc góc dưới phải) ───────────────────────
function renderSpinCounter() {
  // Cập nhật badge trên nút cóc
  var el = document.getElementById('spin-counter');
  if (el) {
    var s     = toadState.spinsLeft;
    var ready = toadState.spinReadyToClaim;
    el.textContent = ready ? '!' : s;
    el.className = 'spin-count ' + (s > 0 ? 'has-spin' : (ready ? 'ready-spin' : 'no-spin'));
  }
  // Enable/disable nút SPIN chính trên vòng quay
  var spinBtn = document.getElementById('spin');
  if (spinBtn) {
    if (toadState.pendingLevelUp) {
      spinBtn.classList.add('spin-disabled');
      spinBtn.classList.add('spin-levellock');
    } else if (toadState.spinsLeft <= 0) {
      spinBtn.classList.add('spin-disabled');
      spinBtn.classList.remove('spin-levellock');
    } else {
      spinBtn.classList.remove('spin-disabled');
      spinBtn.classList.remove('spin-levellock');
    }
  }
  // KHÔNG gọi renderHUD() ở đây để tránh vòng lặp vô hạn
  // HUD tự cập nhật qua _hudTimerInterval
}

// ─── TOAD PANEL (bấm nút cóc) ─────────────────────────────────────
var _panelTimerInterval = null;

function renderToad() {
  var panel = document.getElementById('toad-panel');
  if (!panel) return;

  var cfg    = getLevelCfg(toadState.level);
  var lvl    = toadState.level;
  var coins  = toadState.coins;
  var spins  = toadState.spinsLeft;
  var ready  = toadState.spinReadyToClaim;
  var msLeft = msUntilNextSpawn();
  var maxLvl = lvl >= 7;
  var needed = cfg.coinsToNext || '—';
  var pct    = maxLvl ? 100 : Math.min(100, Math.round(coins / cfg.coinsToNext * 100));
  var cdHours = cfg.cooldownMs / 3600000;

  panel.innerHTML =
    '<div class="toad-card">' +
      // Header
      '<div class="toad-header">' +
        '<div class="toad-avatar" id="toad-avatar">' + getToadSVG(lvl) + '</div>' +
        '<div class="toad-info">' +
          '<div class="toad-name">Cóc Vàng <span class="toad-level-badge">Cấp ' + lvl + '</span></div>' +
          '<div class="toad-subtitle">' + (maxLvl ? 'Cấp tối đa ✦' : 'Cần ' + needed + ' coin để lên cấp') + '</div>' +
        '</div>' +
      '</div>' +
      // Coin
      '<div class="toad-section">' +
        '<div class="toad-row">' +
          '<span class="toad-label">🪙 Golden Coin</span>' +
          '<span class="toad-value">' + coins + (maxLvl ? '' : ' / ' + needed) + '</span>' +
        '</div>' +
        '<div class="toad-bar-wrap"><div class="toad-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      // Spin
      '<div class="toad-section">' +
        '<div class="toad-row">' +
          '<span class="toad-label">🎰 Spin còn lại</span>' +
          '<span class="toad-value toad-spins ' + (spins > 0 ? 'has-spin' : '') + '">' + spins + '</span>' +
        '</div>' +
        '<div class="toad-row">' +
          '<span class="toad-label">⏳ ' + (ready ? 'Trạng thái' : 'Hồi tiếp theo') + '</span>' +
          '<span class="toad-value" id="toad-timer">' + (ready ? '✅ Sẵn sàng nhận!' : (spins > 0 ? '—' : formatMs(msLeft))) + '</span>' +
        '</div>' +
        '<div class="toad-spawn-info">Cóc đẻ <strong>' + cfg.spins + ' spin</strong> mỗi <strong>' + cdHours + 'h</strong></div>' +
      '</div>' +
      // Buttons
      '<div class="toad-actions">' +
        (!maxLvl
          ? '<button class="toad-btn level-btn" id="toad-levelup-btn" ' + (coins >= cfg.coinsToNext ? '' : 'disabled') + '>' +
              '⬆ Lên Cấp (' + needed + ' coin)' +
            '</button>'
          : '') +
      '</div>' +
      // Level dots
      '<div class="toad-levels">' + renderLevelDots(lvl) + '</div>' +
    '</div>';

  // Sự kiện lên cấp — mở popup xác nhận
  var lvlBtn = document.getElementById('toad-levelup-btn');
  if (lvlBtn) lvlBtn.onclick = function() {
    showLevelUpPopup();
  };

  // Timer panel
  if (_panelTimerInterval) clearInterval(_panelTimerInterval);
  _panelTimerInterval = setInterval(function() {
    var becameReady = trySpawnSpins();
    if (becameReady || toadState.spinReadyToClaim) {
      renderToad(); renderSpinCounter(); return;
    }
    var t = document.getElementById('toad-timer');
    if (t && toadState.spinsLeft <= 0 && !toadState.spinReadyToClaim)
      t.textContent = formatMs(msUntilNextSpawn());
  }, 1000);
}

function renderLevelDots(current) {
  var html = '<div class="level-dots">';
  for (var i = 1; i <= 7; i++) {
    var cls = i < current ? 'dot done' : (i === current ? 'dot active' : 'dot');
    html += '<div class="' + cls + '">' + ['①','②','③','④','⑤','⑥','⑦'][i-1] + '</div>';
    if (i < 7) html += '<div class="dot-line ' + (i < current ? 'done' : '') + '"></div>';
  }
  return html + '</div>';
}

// ─── TOGGLE PANEL ─────────────────────────────────────────────────
function toggleToadPanel() {
  var panel = document.getElementById('toad-panel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    if (_panelTimerInterval) { clearInterval(_panelTimerInterval); _panelTimerInterval = null; }
  } else {
    renderToad();
    panel.classList.add('open');
  }
}

// ─── INFO POPUP ───────────────────────────────────────────────────
function openInfoPopup() {
  var overlay = document.getElementById('info-overlay');
  if (!overlay) return;
  renderInfoPopup();
  overlay.classList.add('show');
}

function closeInfoPopup() {
  var overlay = document.getElementById('info-overlay');
  if (overlay) overlay.classList.remove('show');
}

function renderInfoPopup() {
  var box = document.getElementById('info-popup');
  if (!box) return;

  var lvl   = toadState.level;
  var coins = toadState.coins;
  var spins = toadState.spinsLeft;
  var dotColors = ['#5a9e3a','#3aae6e','#2090c0','#a040d0','#e8a000','#cc2222','#FFD700'];

  var tableRows = '';
  for (var i = 1; i <= 7; i++) {
    var c      = TOAD_LEVELS[i];
    var isDone = i < lvl;
    var isCur  = i === lvl;
    var rowCls = isDone ? 'done-row' : (isCur ? 'current-row' : '');
    var coinReq = c.coinsToNext ? c.coinsToNext + ' coin' : '✦ Tối đa';
    var cdH    = c.cooldownMs / 3600000;
    var cdStr  = cdH === Math.floor(cdH) ? cdH + ' giờ' : cdH + ' giờ';
    tableRows +=
      '<tr class="' + rowCls + '">' +
        '<td><span class="level-badge-sm">' +
          '<span class="level-dot-sm" style="background:' + dotColors[i-1] + '"></span>' +
          'Cấp ' + i + (isCur ? ' <span style="font-size:9px;opacity:0.5">(bạn)</span>' : '') +
        '</span></td>' +
        '<td>' + coinReq + '</td>' +
        '<td>' + c.spins + ' spin</td>' +
        '<td>' + cdStr + '</td>' +
        '<td style="color:' + (isDone ? '#6FE87A' : (isCur ? '#F5D060' : 'rgba(245,230,180,0.2)')) + '">' +
          (isDone ? '✓' : (isCur ? '▶' : '')) +
        '</td>' +
      '</tr>';
  }

  var toadSmall = getToadSVG(lvl).replace('width="64" height="64"', 'width="32" height="32"');

  box.innerHTML =
    '<button id="info-close" onclick="closeInfoPopup()">✕</button>' +

    '<div class="info-header">' +
      '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="32" height="32">' + toadSmall + '</svg>' +
      '<div>' +
        '<div class="info-title">Cóc Vàng — Hướng Dẫn</div>' +
        '<div class="info-subtitle">Nuôi cóc · Lên cấp · Nhận spin</div>' +
      '</div>' +
    '</div>' +

    '<div class="info-status-strip">' +
      '<div class="status-tile"><div class="status-tile-val">' + lvl + '</div><div class="status-tile-lbl">Cấp</div></div>' +
      '<div class="status-tile"><div class="status-tile-val" style="color:#F5D060">' + coins + '</div><div class="status-tile-lbl">Coin</div></div>' +
      '<div class="status-tile"><div class="status-tile-val" style="color:' + (spins > 0 ? '#6FE87A' : '#e07070') + '">' + spins + '</div><div class="status-tile-lbl">Spin</div></div>' +
    '</div>' +

    '<div class="info-section-title">Bảng cấp độ</div>' +
    '<table class="level-table">' +
      '<thead><tr>' +
        '<th>Cấp</th><th>Coin cần</th><th>Spin/lần</th><th>Hồi spin</th><th></th>' +
      '</tr></thead>' +
      '<tbody>' + tableRows + '</tbody>' +
    '</table>' +

    '<div class="info-divider"></div>' +

    '<div class="info-section-title">Luật chơi</div>' +
    '<ul class="info-rule-list">' +
      '<li><span class="rule-icon">🐸</span><span>' +
        'Sau mỗi <strong style="color:#F5D060">thời gian hồi</strong>, nút <strong style="color:#6FE87A">Nhận Spin</strong> sẽ xuất hiện trên góc trên phải. ' +
        'Bạn cần chủ động bấm để nhận. Spin chỉ được cộng sau khi bạn bấm nhận.' +
      '</span></li>' +
      '<li><span class="rule-icon">🎰</span><span>' +
        'Spin <strong style="color:#F5D060">không tích lũy qua ngày</strong>. Mỗi ngày lúc 00:00, spin còn lại sẽ bị xóa. ' +
        'Hãy dùng hết spin trong ngày!' +
      '</span></li>' +
      '<li><span class="rule-icon">🪙</span><span>' +
        'Coin chỉ đến từ <strong style="color:#F5D060">quay vòng quay</strong>. ' +
        '6 ô vàng trên bánh xe mang về 🪙1, 🪙2 hoặc 🪙3 coin mỗi lần quay.' +
      '</span></li>' +
      '<li><span class="rule-icon">⬆</span><span>' +
        'Tích đủ coin rồi bấm <strong style="color:#F5D060">Lên Cấp</strong> trong panel cóc. ' +
        'Cóc cấp cao hơn đẻ nhiều spin hơn và thời gian hồi ngắn hơn.' +
      '</span></li>' +
      '<li><span class="rule-icon">⭐</span><span>' +
        'Bánh xe có <strong style="color:#F5D060">2 ô siêu hiếm</strong> với tỷ lệ cực thấp. ' +
        'Chúc may mắn!' +
      '</span></li>' +
    '</ul>';

  document.getElementById('info-overlay').onclick = function(e) {
    if (e.target.id === 'info-overlay') closeInfoPopup();
  };
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToadToast(msg) {
  var t = document.getElementById('toad-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ─── INIT ─────────────────────────────────────────────────────────
function initToad() {
  loadState();
  checkDailySpinReset();   // reset spin nếu qua ngày mới

  // --- FIX: Nếu lần đầu vào (chưa có lastSpawnTime) hoặc cooldown đã hết
  //     → coi như sẵn sàng nhận spin ngay, KHÔNG cần bấm claim lần đầu
  if (!toadState.lastSpawnTime && !toadState.spinReadyToClaim && toadState.spinsLeft <= 0) {
    // Lần đầu tiên ever → tự cấp spin luôn thay vì bắt chờ
    var _initCfg = getLevelCfg(toadState.level);
    toadState.spinsLeft       = _initCfg.spins;
    toadState.lastSpawnTime   = Date.now();
    toadState.lastClaimTime   = Date.now();
    toadState.spinReadyToClaim = false;
    saveState();
  } else {
    trySpawnSpins();  // đánh dấu sẵn sàng nếu cooldown đã hết
  }

  // Cập nhật toàn bộ UI (đảm bảo spin button đúng trạng thái ngay từ đầu)
  updateToggleBtnIcon();
  _updateAllUI();

  // Nếu đang chờ nâng cấp từ session trước → show popup sau 500ms
  if (toadState.pendingLevelUp && toadState.level < 7) {
    setTimeout(function(){ showLevelUpPopup(); }, 500);
  }

  var btn = document.getElementById('toad-toggle-btn');
  if (btn) btn.onclick = toggleToadPanel;

  // Đóng panel khi click ra ngoài
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('toad-panel');
    var toggleBtn = document.getElementById('toad-toggle-btn');
    if (!panel || !toggleBtn) return;
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
}

// DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToad);
} else {
  initToad();
}


// ─── POPUP NÂNG CẤP ────────────────────────────────────────────────

/** Hiện popup nâng cấp toàn màn hình */
function showLevelUpPopup() {
  var overlay = document.getElementById('levelup-overlay');
  if (!overlay) { buildLevelUpDOM(); overlay = document.getElementById('levelup-overlay'); }
  renderLevelUpPopup();
  overlay.classList.add('show');
  // Khóa spin ngay
  var spinBtn = document.getElementById('spin');
  if (spinBtn) spinBtn.classList.add('spin-disabled');
}

function closeLevelUpPopup(forceClose) {
  // Người dùng đóng mà không nâng cấp → spin vẫn bị khóa
  var overlay = document.getElementById('levelup-overlay');
  if (overlay) overlay.classList.remove('show');
  if (!forceClose) {
    // Chỉ đóng overlay, pendingLevelUp vẫn true → spin vẫn locked
    showToadToast('⚠ Vòng quay bị khóa! Hãy nâng cấp cóc để tiếp tục.');
  }
  _updateAllUI();
}

function doLevelUpAndClose() {
  if (!doLevelUp()) return;
  var newLvl = toadState.level;
  // Đóng popup
  var overlay = document.getElementById('levelup-overlay');
  if (overlay) overlay.classList.remove('show');
  // Hiệu ứng & thông báo
  showToadToast('🎉 Cóc lên Cấp ' + newLvl + '! Vòng quay đã mở khóa!');
  _updateAllUI();
  // Animate avatar trong panel nếu đang mở
  var av = document.getElementById('toad-avatar');
  if (av) { av.classList.add('level-up-anim'); setTimeout(function(){ av.classList.remove('level-up-anim'); }, 800); }
}

function buildLevelUpDOM() {
  var overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.innerHTML = '<div id="levelup-popup"></div>';
  document.body.appendChild(overlay);
}

function renderLevelUpPopup() {
  var box = document.getElementById('levelup-popup');
  if (!box) return;
  var lvl     = toadState.level;
  var nextLvl = lvl + 1;
  var cfg     = getLevelCfg(lvl);
  var nextCfg = getLevelCfg(nextLvl);
  var dotColors = ['#5a9e3a','#3aae6e','#2090c0','#a040d0','#e8a000','#cc2222','#FFD700'];

  box.innerHTML =
    // Particles (CSS-only)
    '<div class="lup-particles">' +
      [1,2,3,4,5,6,7,8].map(function(i){
        return '<div class="lup-particle p' + i + '"></div>';
      }).join('') +
    '</div>' +

    // Icon cóc hiện tại → mũi tên → cóc mới
    '<div class="lup-toad-row">' +
      '<div class="lup-toad-wrap lup-from">' +
        getToadSVG(lvl) +
        '<div class="lup-toad-lbl" style="color:' + dotColors[lvl-1] + '">Cấp ' + lvl + '</div>' +
      '</div>' +
      '<div class="lup-arrow">→</div>' +
      '<div class="lup-toad-wrap lup-to">' +
        getToadSVG(nextLvl) +
        '<div class="lup-toad-lbl" style="color:' + dotColors[nextLvl-1] + '">Cấp ' + nextLvl + '</div>' +
      '</div>' +
    '</div>' +

    // Title
    '<div class="lup-title">Cóc sẵn sàng tiến hóa!</div>' +
    '<div class="lup-subtitle">Nâng cấp ngay để mở khóa vòng quay</div>' +

    // Stat comparison
    '<div class="lup-stats">' +
      '<div class="lup-stat">' +
        '<div class="lup-stat-lbl">Spin mỗi lần</div>' +
        '<div class="lup-stat-vals">' +
          '<span class="lup-old">' + cfg.spins + '</span>' +
          '<span class="lup-arr">→</span>' +
          '<span class="lup-new">' + nextCfg.spins + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="lup-stat">' +
        '<div class="lup-stat-lbl">Thời gian hồi</div>' +
        '<div class="lup-stat-vals">' +
          '<span class="lup-old">' + (cfg.cooldownMs/3600000) + 'h</span>' +
          '<span class="lup-arr">→</span>' +
          '<span class="lup-new">' + (nextCfg.cooldownMs/3600000) + 'h</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Buttons
    '<div class="lup-actions">' +
      '<button class="lup-btn-upgrade" onclick="doLevelUpAndClose()">' +
        '⬆ Nâng Cấp Cấp ' + nextLvl +
      '</button>' +
      '<button class="lup-btn-skip" onclick="closeLevelUpPopup(false)">' +
        'Để sau (vòng quay sẽ bị khóa)' +
      '</button>' +
    '</div>';
}

/** Gọi sau khi cộng coin — kiểm tra và show popup nếu đủ */
function checkAndShowLevelUp() {
  if (checkLevelUp()) {
    // Delay nhỏ để popup coin hiện trước
    setTimeout(function(){ showLevelUpPopup(); }, 1200);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN PANEL  —  Bảo mật 2 lớp
//  Lớp 1: URL phải có ?dev=TOKEN
//  Lớp 2: Nhập mật khẩu (lưu dạng SHA-256, không lộ plaintext)
// ═══════════════════════════════════════════════════════════════════
(function() {
  var _DEV_TOKEN  = '1d7dc070aa795a62a2ee4f283fcd6b74';
  var _PW_HASH    = 'dea8c2e7b4083333aa0a6feeecfde945abcbe5ea4db3b5e0e1619fe68931a1ef';
  var _SESS_KEY   = 'adm_ok';

  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
      .then(function(h) {
        return Array.from(new Uint8Array(h))
          .map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      });
  }

  function hasToken() {
    try { return new URLSearchParams(window.location.search).get('dev') === _DEV_TOKEN; }
    catch(e) { return false; }
  }

  function tryOpen() {
    if (!hasToken()) return;
    if (sessionStorage.getItem(_SESS_KEY) === '1') { openAdminPanel(); return; }
    var pw = prompt('🔐 Admin Password:');
    if (!pw) return;
    sha256(pw.trim()).then(function(h) {
      if (h === _PW_HASH) { sessionStorage.setItem(_SESS_KEY, '1'); openAdminPanel(); }
      else alert('❌ Sai mật khẩu.');
    });
  }

  var _seq = '';
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    _seq = (_seq + e.key.toLowerCase()).slice(-4);
    if (_seq === 'open') { _seq = ''; tryOpen(); }
  });

  function openAdminPanel() {
    var el = document.getElementById('admin-overlay');
    if (!el) { buildAdminDOM(); el = document.getElementById('admin-overlay'); }
    refreshAdminUI();
    el.classList.add('show');
  }

  function buildAdminDOM() {
    var overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.innerHTML = '<div id="admin-panel"></div>';
    overlay.onclick = function(e) { if (e.target.id === 'admin-overlay') overlay.classList.remove('show'); };
    document.body.appendChild(overlay);
  }

  function refreshAdminUI() {
    var box = document.getElementById('admin-panel');
    if (!box) return;
    var s      = toadState;
    var cfg    = getLevelCfg(s.level);
    var msLeft = msUntilNextSpawn();

    box.innerHTML =
      '<div class="adm-header">' +
        '<div class="adm-title">🛠 Admin Panel</div>' +
        '<div class="adm-secret">[ admin ]</div>' +
        '<button class="adm-close" onclick="document.getElementById(\'admin-overlay\').classList.remove(\'show\')">✕</button>' +
      '</div>' +

      '<div class="adm-status">' +
        '<div class="adm-stat"><span class="adm-stat-val" id="adm-lvl">'   + s.level     + '</span><span class="adm-stat-lbl">Cấp</span></div>' +
        '<div class="adm-stat"><span class="adm-stat-val adm-gold" id="adm-coin">'  + s.coins     + '</span><span class="adm-stat-lbl">Coin</span></div>' +
        '<div class="adm-stat"><span class="adm-stat-val adm-green" id="adm-spin">' + s.spinsLeft + '</span><span class="adm-stat-lbl">Spin</span></div>' +
        '<div class="adm-stat"><span class="adm-stat-val adm-dim" id="adm-timer">'  + (s.spinReadyToClaim ? 'SẴN SÀNG' : formatMs(msLeft)) + '</span><span class="adm-stat-lbl">Hồi spin</span></div>' +
        '<div class="adm-stat"><span class="adm-stat-val adm-pink" id="adm-pity">'  + (function(){ try{ return localStorage.getItem("spin_pity")||0; }catch(e){return 0;} })() + '</span><span class="adm-stat-lbl">Pity</span></div>' +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">🎰 Spin</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-green-btn" onclick="adminAddSpins(1)">+1</button>' +
        '<button class="adm-btn adm-green-btn" onclick="adminAddSpins(5)">+5</button>' +
        '<button class="adm-btn adm-green-btn" onclick="adminAddSpins(10)">+10</button>' +
        '<button class="adm-btn adm-red-btn"   onclick="adminSetSpins(0)">Xóa spin</button>' +
      '</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-dim-btn" onclick="adminResetCooldown()">⚡ Hiện nút nhận spin ngay</button>' +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">⭐ Pity</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-pink-btn" onclick="adminAddPity(10)">+10</button>' +
        '<button class="adm-btn adm-pink-btn" onclick="adminAddPity(25)">+25</button>' +
        '<button class="adm-btn adm-pink-btn" onclick="adminAddPity(50)">+50</button>' +
        '<button class="adm-btn adm-pink-btn" onclick="adminSetPity(99)">→ 99 (kích hoạt)</button>' +
        '<button class="adm-btn adm-red-btn"  onclick="adminSetPity(0)">Reset</button>' +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">🧪 Test kết quả</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-jp-btn" onclick="adminForceResult(6)">Force ⭐ Siêu Hiếm</button>' +
        '<button class="adm-btn adm-jp-btn" onclick="adminForceResult(7)">Force ⭐⭐ Jackpot</button>' +
        (function(){ try{ var f=localStorage.getItem("spin_force_result"); return f!==null ? '<span class="adm-force-badge">⏳ Đang chờ: index '+f+'</span>' : ''; }catch(e){return '';} })() +
      '</div>' +
      '<div class="adm-note">Kết quả được ép đúng 1 lần spin tiếp theo, sau đó tự xóa.</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">🪙 Coin</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-gold-btn" onclick="adminAddCoins(1)">+1</button>' +
        '<button class="adm-btn adm-gold-btn" onclick="adminAddCoins(5)">+5</button>' +
        '<button class="adm-btn adm-gold-btn" onclick="adminAddCoins(10)">+10</button>' +
        '<button class="adm-btn adm-gold-btn" onclick="adminAddCoins(50)">+50</button>' +
        '<button class="adm-btn adm-red-btn"  onclick="adminSetCoins(0)">Xóa</button>' +
      '</div>' +
      '<div class="adm-row">' +
        '<input id="adm-coin-input" type="number" class="adm-input" placeholder="Nhập số coin..." min="0"/>' +
        '<button class="adm-btn adm-gold-btn" onclick="adminSetCoinFromInput()">Đặt</button>' +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">⬆ Cấp độ</div>' +
      '<div class="adm-row">' +
        [1,2,3,4,5,6,7].map(function(l) {
          return '<button class="adm-btn ' + (s.level === l ? 'adm-active-btn' : 'adm-dim-btn') + '" onclick="adminSetLevel(' + l + ')">Cấp ' + l + '</button>';
        }).join('') +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title adm-danger-title">⚠ Nguy hiểm</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-dim-btn" onclick="adminSimulateReset()">🔄 Giả lập reset 00:00</button>' +
        '<button class="adm-btn adm-red-btn" onclick="adminResetAll()">🗑 Xóa toàn bộ</button>' +
      '</div>' +

      '<div class="adm-divider"></div>' +
      '<div class="adm-section-title">📅 Daily Check-In</div>' +
      '<div class="adm-row">' +
        '<button class="adm-btn adm-dim-btn" onclick="adminSimulateDaily()">🗓 Mở lại daily ngay</button>' +
        '<button class="adm-btn adm-red-btn" onclick="adminResetDaily()">🗑 Reset daily streak</button>' +
      '</div>' +
      '<div class="adm-note" id="adm-daily-info">' +
        (function(){
          try {
            var raw = localStorage.getItem('dailyCheckIn');
            if (!raw) return 'Chưa có dữ liệu daily';
            var d = JSON.parse(raw);
            var streak = d.streak || 0;
            var msLeft = d.lastClaimTs ? Math.max(0, 24*3600000 - (Date.now() - d.lastClaimTs)) : 0;
            var hh = Math.floor(msLeft/3600000), mm = Math.floor((msLeft%3600000)/60000);
            return 'Streak: ' + streak + '/7 | ' + (msLeft > 0 ? 'Mở sau ' + hh + 'h' + mm + 'm' : 'SẴN SÀNG');
          } catch(e) { return ''; }
        })() +
      '</div>';
  }

  // ── Admin actions ────────────────────────────────────────────────
  window.adminAddSpins = function(n) {
    toadState.spinsLeft = Math.max(0, toadState.spinsLeft + n);
    saveState(); _updateAllUI(); refreshAdminUI();
  };
  window.adminSetSpins = function(n) {
    toadState.spinsLeft = n;
    saveState(); _updateAllUI(); refreshAdminUI();
  };
  window.adminResetCooldown = function() {
    toadState.lastSpawnTime    = null;
    toadState.spinReadyToClaim = true;
    saveState(); _updateAllUI(); refreshAdminUI();
    showToadToast('⚡ Nút nhận spin đã xuất hiện!');
  };
  window.adminAddCoins = function(n) {
    toadState.coins += n;
    saveState(); _updateAllUI(); refreshAdminUI();
  };
  window.adminSetCoins = function(n) {
    toadState.coins = n;
    saveState(); _updateAllUI(); refreshAdminUI();
  };
  window.adminSetCoinFromInput = function() {
    var v = parseInt(document.getElementById('adm-coin-input').value);
    if (!isNaN(v) && v >= 0) { toadState.coins = v; saveState(); _updateAllUI(); refreshAdminUI(); }
  };
  window.adminSetLevel = function(lvl) {
    toadState.level            = lvl;
    toadState.coins            = 0;
    toadState.pendingLevelUp   = false;
    toadState.lastSpawnTime    = null;
    toadState.spinReadyToClaim = true;
    saveState(); _updateAllUI(); refreshAdminUI();
  };
  window.adminForceResult = function(prizeIndex) {
    try { localStorage.setItem('spin_force_result', String(prizeIndex)); } catch(e) {}
    // Đảm bảo có đủ spin để test
    if (toadState.spinsLeft <= 0) {
      toadState.spinsLeft = 1;
      saveState();
    }
    _updateAllUI();
    refreshAdminUI();
    showToadToast('🧪 Spin tiếp theo sẽ ra index ' + prizeIndex + '!');
  };

  window.adminAddPity = function(n) {
    var cur = 0; try { cur = parseInt(localStorage.getItem('spin_pity') || '0'); } catch(e) {}
    var next = Math.min(cur + n, 100);
    try { localStorage.setItem('spin_pity', next); } catch(e) {}
    if (typeof updatePityUI === 'function') updatePityUI();
    refreshAdminUI();
    showToadToast('Pity: ' + next + '/100');
  };
  window.adminSetPity = function(n) {
    try { localStorage.setItem('spin_pity', n); } catch(e) {}
    if (typeof updatePityUI === 'function') updatePityUI();
    refreshAdminUI();
    showToadToast('Pity đặt thành ' + n + '/100');
  };
  window.adminSimulateReset = function() {
    toadState.lastResetDate    = null;
    toadState.spinsLeft        = 0;
    toadState.spinReadyToClaim = true;
    saveState(); _updateAllUI(); refreshAdminUI();
    showToadToast('🔄 Đã giả lập reset 00:00');
  };
  window.adminResetAll = function() {
    if (!confirm('Xóa toàn bộ dữ liệu cóc?')) return;
    toadState = {
      level:1, coins:0, spinsLeft:0, spinReadyToClaim:true, pendingLevelUp:false,
      lastSpawnTime:null, lastClaimTime:null, lastResetDate:null
    };
    saveState(); _updateAllUI(); refreshAdminUI();
  };

  // ── Admin Daily actions ───────────────────────────────────────────
  window.adminSimulateDaily = function() {
    try {
      var raw = localStorage.getItem('dailyCheckIn');
      var d = raw ? JSON.parse(raw) : {};
      // Đặt lastClaimTs về 25h trước để daily mở ngay
      d.lastClaimTs = Date.now() - 25 * 3600000;
      localStorage.setItem('dailyCheckIn', JSON.stringify(d));
      if (typeof dailyState !== 'undefined') {
        dailyState.lastClaimTs = d.lastClaimTs;
      }
      if (typeof updateDailyChipUI === 'function') updateDailyChipUI();
      refreshAdminUI();
      showToadToast('📅 Daily đã mở lại!');
    } catch(e) {}
  };
  window.adminResetDaily = function() {
    if (!confirm('Reset toàn bộ daily streak?')) return;
    try {
      localStorage.removeItem('dailyCheckIn');
      if (typeof dailyState !== 'undefined') {
        dailyState.streak = 0;
        dailyState.lastClaimTs = null;
        dailyState.lastClaimDate = null;
      }
      if (typeof updateDailyChipUI === 'function') updateDailyChipUI();
      refreshAdminUI();
      showToadToast('🗑 Daily streak đã reset!');
    } catch(e) {}
  };

  // Live update timer trong admin
  setInterval(function() {
    var t  = document.getElementById('adm-timer');
    var sp = document.getElementById('adm-spin');
    var co = document.getElementById('adm-coin');
    var pt = document.getElementById('adm-pity');
    if (t)  t.textContent  = toadState.spinReadyToClaim ? 'SẴN SÀNG' : formatMs(msUntilNextSpawn());
    if (sp) sp.textContent = toadState.spinsLeft;
    if (co) co.textContent = toadState.coins;
    if (pt) { try { pt.textContent = localStorage.getItem('spin_pity') || 0; } catch(e) {} }
    // refresh force badge if present
    var fb = document.querySelector('.adm-force-badge');
    if (fb) { try { var f=localStorage.getItem('spin_force_result'); fb.textContent = f!==null ? '⏳ Đang chờ: index '+f : ''; } catch(e){} }
  }, 1000);
})();
