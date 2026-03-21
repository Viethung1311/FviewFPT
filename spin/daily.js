/**
 * DAILY CHECK-IN SYSTEM — daily.js
 * Luật:
 *  - 7 ngày liên tiếp, check theo UTC+7
 *  - Reset 24h kể từ lúc bấm nhận
 *  - Ngày 1 → 3 spin, mỗi ngày +2 (max ngày 7 = 15 spin)
 *  - Bỏ >48h → streak reset về 1
 *  - Sau ngày 7 → vòng lại ngày 1
 */

var DAILY_KEY       = 'dailyCheckIn';
var DAILY_SPIN_TABLE = [3, 5, 7, 9, 11, 13, 15];
var MS_24H          = 24 * 3600000;
var MS_48H          = 48 * 3600000;

var dailyState = { streak: 0, lastClaimTs: null, lastClaimDate: null };

function saveDailyState() {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(dailyState)); } catch(e) {}
}
function loadDailyState() {
  try {
    var raw = localStorage.getItem(DAILY_KEY);
    if (raw) dailyState = Object.assign({}, dailyState, JSON.parse(raw));
  } catch(e) {}
}

function getDailyDateUTC7() {
  var utc7 = new Date(Date.now() + 7 * 3600000);
  return utc7.toISOString().slice(0, 10);
}

function getDailyStatus() {
  var now = Date.now();
  if (!dailyState.lastClaimTs) {
    return { canClaim: true, nextClaimMs: 0, currentStreak: 0, nextStreak: 1, spinsForNext: DAILY_SPIN_TABLE[0], streakBroken: false };
  }
  var elapsed      = now - dailyState.lastClaimTs;
  var canClaim     = elapsed >= MS_24H;
  var streakBroken = elapsed >= MS_48H;
  var nextStreak   = (streakBroken || dailyState.streak >= 7) ? 1 : dailyState.streak + 1;
  return {
    canClaim:      canClaim,
    nextClaimMs:   canClaim ? 0 : MS_24H - elapsed,
    currentStreak: dailyState.streak,
    nextStreak:    nextStreak,
    spinsForNext:  DAILY_SPIN_TABLE[nextStreak - 1],
    streakBroken:  streakBroken
  };
}

function claimDaily() {
  var status = getDailyStatus();
  if (!status.canClaim) return { ok: false, reason: 'cooldown', nextClaimMs: status.nextClaimMs };
  var newStreak = status.nextStreak;
  var spins     = DAILY_SPIN_TABLE[newStreak - 1];
  dailyState.streak        = newStreak;
  dailyState.lastClaimTs   = Date.now();
  dailyState.lastClaimDate = getDailyDateUTC7();
  saveDailyState();
  if (typeof toadState !== 'undefined') {
    toadState.spinsLeft += spins;
    if (typeof saveState === 'function') saveState();
    if (typeof _updateAllUI === 'function') _updateAllUI();
  }
  return { ok: true, spins: spins, streak: newStreak };
}

/* ── HELPERS ────────────────────────────────────────────── */
function _fmtMs(ms) {
  if (ms <= 0) return '00:00:00';
  var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  var p = function(n) { return n < 10 ? '0' + n : '' + n; };
  return p(h) + ':' + p(m) + ':' + p(sec);
}

function _dcConfetti() {
  var container = document.getElementById('dc-confetti');
  if (!container) return;
  container.innerHTML = '';
  var cols = ['#ffd700','#ff6b6b','#4ade80','#60a5fa','#f472b6','#a78bfa','#fb923c'];
  for (var i = 0; i < 36; i++) {
    var el  = document.createElement('div');
    el.className = 'dc-cfp';
    var sz  = 3 + Math.random() * 6;
    el.style.cssText = 'left:' + (5 + Math.random() * 90) + '%;top:-8px;width:' + sz + 'px;height:' + (sz * 1.8) + 'px;background:' + cols[Math.floor(Math.random() * cols.length)] + ';animation-duration:' + (1 + Math.random() * .9) + 's;animation-delay:' + (Math.random() * .35) + 's';
    container.appendChild(el);
  }
  setTimeout(function() { if (container) container.innerHTML = ''; }, 2600);
}

/* ── UI ─────────────────────────────────────────────────── */
function openDailyPopup() {
  var overlay = document.getElementById('daily-overlay');
  if (!overlay) return;
  renderDailyPopup();
  overlay.classList.add('show');
}
function closeDailyPopup() {
  var overlay = document.getElementById('daily-overlay');
  if (overlay) overlay.classList.remove('show');
}

function renderDailyPopup() {
  var status = getDailyStatus();
  var inner  = document.getElementById('daily-popup-inner');
  if (!inner) return;

  /* ── streak pill ── */
  var streakTxt, pillCls = 'dc-streak-pill';
  if (status.streakBroken && dailyState.streak > 0) {
    streakTxt = '💔 Streak bị phá';
    pillCls  += ' dc-broken';
  } else if (dailyState.streak > 0) {
    streakTxt = '🔥 ' + dailyState.streak + ' ngày liên tiếp';
  } else {
    streakTxt = '🔥 Ngày đầu tiên!';
  }

  /* ── 7 days ── */
  var daysHtml = '';
  for (var i = 1; i <= 7; i++) {
    var spins  = DAILY_SPIN_TABLE[i - 1];
    var isDone = (dailyState.lastClaimTs !== null && i <= dailyState.streak);
    var isToday = (i === status.nextStreak && status.canClaim);
    var cls    = 'dc-day' + (isDone ? ' dc-done' : isToday ? ' dc-today' : ' dc-locked');
    var numTxt = isDone ? '✓' : spins;
    var subTxt = isDone ? 'nhận rồi' : '+' + spins + ' spin';
    daysHtml +=
      '<div class="' + cls + '">' +
        '<div class="dc-day-name">N' + i + '</div>' +
        '<div class="dc-day-num">' + numTxt + '</div>' +
        '<div class="dc-day-sub">' + subTxt + '</div>' +
      '</div>';
  }

  /* ── button ── */
  var btnHtml;
  if (status.canClaim) {
    btnHtml = '<button id="dc-claim-btn" class="dc-btn" onclick="handleDailyClaim()">' +
      '🎁 Nhận <strong>+' + status.spinsForNext + ' Spin</strong> — Ngày ' + status.nextStreak +
      '</button>';
  } else {
    btnHtml = '<button class="dc-btn dc-btn-disabled" disabled>' +
      '⏳ Mở lại sau <span id="dc-countdown">' + _fmtMs(status.nextClaimMs) + '</span>' +
      '</button>';
  }

  inner.innerHTML =
    '<div id="dc-confetti"></div>' +
    '<div class="dc-top-row">' +
      '<div class="dc-title">📅 Điểm Danh</div>' +
      '<div class="' + pillCls + '">' + streakTxt + '</div>' +
    '</div>' +
    '<div class="dc-days">' + daysHtml + '</div>' +
    btnHtml;
}

function handleDailyClaim() {
  var btn = document.getElementById('dc-claim-btn');
  if (!btn) return;

  var result = claimDaily();
  if (!result.ok) {
    if (typeof showToadToast === 'function') showToadToast('⏳ Chưa đến giờ! Còn ' + _fmtMs(result.nextClaimMs));
    return;
  }

  /* Button flash → confetti → re-render */
  btn.style.transform = 'scale(1.03)';
  btn.innerHTML = '✨ Đang nhận...';
  btn.disabled  = true;

  setTimeout(function() {
    _dcConfetti();
    btn.innerHTML  = '✅ Đã nhận +' + result.spins + ' Spin — Ngày ' + result.streak + '!';
    btn.className  = 'dc-btn dc-btn-claimed';
    btn.style.transform = '';
    updateDailyChipUI();
  }, 500);

  setTimeout(function() {
    renderDailyPopup();
    updateDailyChipUI();
  }, 1200);

  if (typeof showToadToast === 'function') {
    setTimeout(function() {
      showToadToast('📅 Daily Ngày ' + result.streak + ': +' + result.spins + ' Spin! 🎰');
    }, 600);
  }
}

function updateDailyChipUI() {
  var status = getDailyStatus();
  var chip   = document.getElementById('daily-chip');
  var subEl  = document.getElementById('daily-chip-sub');
  if (!chip) return;
  if (status.canClaim) {
    chip.classList.add('dc-chip-ready');
    if (subEl) subEl.textContent = 'Nhận ngay!';
  } else {
    chip.classList.remove('dc-chip-ready');
    if (subEl) subEl.textContent = _fmtMs(status.nextClaimMs);
  }
}

/* ── INIT ───────────────────────────────────────────────── */
(function() {
  loadDailyState();
  setInterval(function() {
    updateDailyChipUI();
    var cdEl = document.getElementById('dc-countdown');
    if (cdEl) cdEl.textContent = _fmtMs(getDailyStatus().nextClaimMs);
  }, 1000);
  document.addEventListener('DOMContentLoaded', function() { updateDailyChipUI(); });
})();

window.getDailyStatus    = getDailyStatus;
window.claimDaily        = claimDaily;
window.openDailyPopup    = openDailyPopup;
window.closeDailyPopup   = closeDailyPopup;
window.updateDailyChipUI = updateDailyChipUI;
