var degree = 1800;
var clicks = 0;
var spinning = false;

/**
 * PRIZES — 8 ô trên bánh xe
 * type: 'coin' → cộng coins vào toadState
 *       'rare' → phần thưởng đặc biệt (xử lý riêng sau)
 * coin: số coin nhận được (chỉ với type='coin')
 * label: hiển thị trên bánh xe và popup
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

/**
 * TỶ LỆ TRÚNG (weighted random — tổng tự normalize)
 * 🪙1 x2: 30 + 25   🪙2 x2: 20 + 15   🪙3 x2: 7 + 2.5
 * ⭐: 0.1            ⭐⭐: 0.01
 */
var prizeRates = [
  { index: 0, rate: 30   },  // 🪙1
  { index: 1, rate: 25   },  // 🪙1
  { index: 2, rate: 20   },  // 🪙2
  { index: 3, rate: 15   },  // 🪙2
  { index: 4, rate: 7    },  // 🪙3
  { index: 5, rate: 2.5  },  // 🪙3
  { index: 6, rate: 0.1  },  // ⭐  siêu hiếm
  { index: 7, rate: 0.01 }   // ⭐⭐ siêu siêu hiếm
];

/** Random theo trọng số (độ hiếm) */
function getRandomPrizeIndex() {
  var totalRate = 0;
  for (var i = 0; i < prizeRates.length; i++) totalRate += prizeRates[i].rate;

  var rand = Math.random() * totalRate;
  var current = 0;

  for (var j = 0; j < prizeRates.length; j++) {
    current += prizeRates[j].rate;
    if (rand <= current) return prizeRates[j].index;
  }
  return prizeRates[0].index; // fallback
}

$(document).ready(function() {
  $('#spin').click(function() {
    if (spinning) return;

    // Kiểm tra spin từ cóc
    if (typeof toadState !== 'undefined') {
      if (toadState.pendingLevelUp) {
        showToadToast('⬆ Hãy nâng cấp cóc trước khi quay!');
        return;
      }
      if (toadState.spinReadyToClaim) {
        showToadToast('🐸 Cóc đã đẻ spin! Bấm nút "Nhận Spin" trên HUD để nhận nhé.');
        return;
      }
      if (toadState.spinsLeft <= 0) {
        var msLeft = (typeof msUntilNextSpawn === 'function') ? msUntilNextSpawn() : 0;
        var timeStr = (typeof formatMs === 'function') ? formatMs(msLeft) : '';
        var msg = msLeft > 0
          ? '⏳ Chưa có spin! Cóc hồi sau: ' + timeStr
          : '❌ Chưa có spin! Chờ cóc đẻ rồi nhận nhé.';
        showToadToast(msg);
        return;
      }
    }

    spinning = true;
    $('#popup-overlay').removeClass('show');

    //Random chọn ô theo độ hiếm (weighted random)
    var targetIndex = getRandomPrizeIndex();

    clicks++;

    // Tính góc cần quay để kim chỉ vào trung tâm ô đã chọn
    // Ô 0 (số 1) ở góc 22.5° (trung tâm ở 45°)
    // Mỗi ô cách nhau 45°
    // Kim ở vị trí 0° (12 giờ)
    var targetDegree = 45 + (targetIndex * 45); // Trung tâm của mỗi ô

    // Thêm vòng quay (5 vòng = 1800°) + điều chỉnh để dừng đúng ô
    var totalDegree = (degree * clicks) + (360 - targetDegree);

    $('#wheel .sec').each(function() {
      var t = $(this);
      var noY = 0;

      var c = 0;
      var n = 700;
      var interval = setInterval(function () {
        c++;
        if (c === n) {
          clearInterval(interval);
        }

        var aoY = t.offset().top;
        $('#txt').html(aoY);

        if(aoY < 23.89) {
          $('#spin').addClass('spin');
          setTimeout(function () {
            $("#spin").removeClass('spin');
          }, 100);
        }
      }, 10);

      $('#inner-wheel').css({'transform' : 'rotate(' + totalDegree + 'deg)'});

      noY = t.offset().top;
    });

    // Hiển thị popup kết quả sau khi quay xong
    setTimeout(function() {
      var result = prizes[targetIndex];

      // Cộng coin nếu là ô coin
      if (result.type === 'coin' && typeof toadState !== 'undefined') {
        toadState.coins += result.coin;
        saveState();
        showToadToast('+' + result.coin + ' Coin! 🪙');
        // Kiểm tra lên cấp — hiện popup nếu đủ coin
        if (typeof checkAndShowLevelUp !== 'undefined') checkAndShowLevelUp();
      }

      // Hiển thị popup
      $('#popup .result-number').html(result.label);
      $('#popup .result-icon').html(result.name);

      // Ripple waves
      var overlay = document.getElementById('popup-overlay');
      overlay.querySelectorAll('.ripple-wave').forEach(function(el){ el.remove(); });
      for (var w = 0; w < 3; w++) {
        (function(idx) {
          var ripple = document.createElement('div');
          ripple.className = 'ripple-wave';
          ripple.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;opacity:0;border:1px solid rgba(212,175,55,' + (0.35 - idx * 0.08) + ');animation:rippleExpand 2s cubic-bezier(0.2,0.8,0.4,1) ' + (idx * 0.25) + 's forwards;';
          overlay.appendChild(ripple);
        })(w);
      }

      // Trừ 1 spin và cập nhật toàn bộ UI
      if (typeof useOneSpin !== 'undefined') {
        useOneSpin();
        if (typeof _updateAllUI !== 'undefined') _updateAllUI();
        else renderSpinCounter();
      }

      $('#popup-overlay').addClass('show');
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