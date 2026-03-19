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

$(document).ready(function() {
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

    // Chọn kết quả (pity check bên trong)
    var targetIndex = getRandomPrizeIndex();
    var wasPityTrigger = _isPityTrigger; // lưu lại vì _isPityTrigger có thể bị ghi đè

    clicks++;
    var targetDegree = 45 + (targetIndex * 45);
    var totalDegree  = (degree * clicks) + (360 - targetDegree);

    $('#wheel .sec').each(function() {
      var t = $(this);
      var c = 0, n = 700;
      var interval = setInterval(function() {
        c++;
        if (c === n) clearInterval(interval);
        var aoY = t.offset().top;
        $('#txt').html(aoY);
        if (aoY < 23.89) {
          $('#spin').addClass('spin');
          setTimeout(function() { $('#spin').removeClass('spin'); }, 100);
        }
      }, 10);
      $('#inner-wheel').css({ transform: 'rotate(' + totalDegree + 'deg)' });
    });

    setTimeout(function() {
      var result = prizes[targetIndex];

      // Cập nhật pity counter NGAY sau khi biết kết quả
      updatePityAfterSpin(targetIndex);

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

      // Lưu vào lịch sử
      if (typeof window.addSpinHistory === 'function') {
        window.addSpinHistory(result, wasPityTrigger);
      }

      // Nếu là pity trigger → show popup đặc biệt, không show popup thường
      if (wasPityTrigger) {
        if (typeof showPityPopup === 'function') {
          showPityPopup(result);
        } else {
          // Fallback nếu popup chưa load
          showNormalResultPopup(result);
        }
      } else if (result.type === 'rare') {
        // Rare result trúng tự nhiên → cũng dùng popup có màu đẹp
        if (typeof showPityPopup === 'function') {
          showPityPopup(result);
        } else {
          showNormalResultPopup(result);
        }
      } else {
        showNormalResultPopup(result);
      }

      spinning = false;
    }, 6000);
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
