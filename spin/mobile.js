/**
 * MOBILE.JS — Fix iOS/Android quirks không thể xử lý bằng CSS thuần
 * Thêm vào cuối <body>: <script src="mobile.js"></script>
 */
(function () {
  'use strict';

  /* ── 1. FIX: iOS Safari 100vh sai khi thanh địa chỉ xuất hiện/ẩn ── */
  function setRealVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--real-vh', vh + 'px');
  }
  setRealVH();
  window.addEventListener('resize', setRealVH);
  window.addEventListener('orientationchange', function () {
    setTimeout(setRealVH, 300); // delay vì orientation change cần thời gian
  });

  /* ── 2. FIX: Scroll trang bị kéo khi spin wheel (iOS momentum scroll) ── */
  var wheelEl = document.getElementById('wheel');
  if (wheelEl) {
    wheelEl.addEventListener('touchmove', function (e) {
      e.preventDefault();
    }, { passive: false });
  }
  // Cũng block scroll khi chạm vào spin button
  var spinEl = document.getElementById('spin');
  if (spinEl) {
    spinEl.addEventListener('touchmove', function (e) {
      e.preventDefault();
    }, { passive: false });
  }

  /* ── 3. FIX: Overlay scroll-through trên iOS (khi popup mở, trang phía dưới vẫn scroll) ── */
  var overlayIds = ['guide-overlay', 'history-overlay', 'daily-overlay', 'pity-overlay', 'popup-overlay'];
  overlayIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchmove', function (e) {
      // Cho phép scroll bên trong popup con, block scroll trang nền
      if (e.target === el) e.preventDefault();
    }, { passive: false });
  });

  /* ── 4. FIX: Popup scroll bên trong (iOS cần touch event để scroll) ── */
  var scrollablePopups = ['guide-popup', 'history-popup', 'daily-popup-inner'];
  scrollablePopups.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', function () {}, { passive: true });
  });

  /* ── 5. FIX: Bottom bar vị trí sai trên iPhone khi bàn phím xuất hiện ── */
  // Dùng visualViewport API (iOS 13+)
  if (window.visualViewport) {
    var bottomBar = document.getElementById('bottom-bar');
    function adjustBottomBar() {
      if (!bottomBar) return;
      var vv = window.visualViewport;
      // Khi bàn phím mở, visualViewport thu nhỏ → dịch bottom-bar lên
      var offsetFromBottom = window.innerHeight - (vv.offsetTop + vv.height);
      bottomBar.style.bottom = Math.max(
        offsetFromBottom + 8,
        8 + (parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue('--sab') || '0'))
      ) + 'px';
    }
    window.visualViewport.addEventListener('resize', adjustBottomBar);
    window.visualViewport.addEventListener('scroll', adjustBottomBar);
  }

  /* ── 6. FIX: Double-tap zoom trên iOS cho tất cả các nút ── */
  // Đã xử lý bằng CSS touch-action: manipulation, backup thêm JS
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    var DOUBLE_TAP_THRESHOLD = 300;
    var target = e.target.closest('button, a, [onclick]');
    if (!target) return;
    if (target._lastTap && (now - target._lastTap) < DOUBLE_TAP_THRESHOLD) {
      e.preventDefault(); // ngăn zoom
    }
    target._lastTap = now;
  }, { passive: false });

  /* ── 7. NOTE: Không set transform trên #inner-wheel khi load trang.
     Nếu đặt translate3d(0,0,0) ở đây, lần quay đầu tiên browser phải
     interpolate giữa translate3d → rotate — 2 hàm khác nhau, không
     animate được → wheel nhảy ngay đến vị trí, bỏ qua transition 6s.
     Lần 2 trở đi bình thường vì điểm xuất phát đã là rotate(). ── */

  /* ── 8. NOTE: Monkey-patch $.fn.css để thêm translate3d đã bị xóa.
     spinv1.js dùng .css({ transform: '...' }) — object syntax — nên
     không đi qua overridden $.fn.css(prop, val). Patch không có tác dụng
     và translate3d prefix gây bug như mô tả ở fix #7 ở trên. ── */

  /* ── 9. FIX: Prevent iOS elastic bounce gây lệch layout ── */
  document.body.addEventListener('touchmove', function (e) {
    // Chỉ block ở đúng body/html, không block scroll bên trong popup
    if (e.target === document.body || e.target === document.documentElement) {
      e.preventDefault();
    }
  }, { passive: false });

  /* ── 10. LOG: Debug safe-area-inset trên iOS (có thể bỏ khi production) ── */
  // Uncomment để debug:
  // console.log('safe-area-inset-top:', getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'));

})();
