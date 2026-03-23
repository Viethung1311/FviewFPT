/**
 * MOBILE-MENU.JS
 * Inject hamburger button + dropdown thay thế .back và #guide-chip trên mobile.
 * Thêm vào cuối <body> TRƯỚC mobile.js:
 *   <script src="mobile-menu.js"></script>
 */
(function () {
  'use strict';

  /* Chỉ chạy trên màn ≤768px */
  if (window.innerWidth > 768) return;

  /* ── 1. Inject HTML ── */
  var menuHTML =
    /* Tap-outside overlay */
    '<div id="mob-menu-overlay"></div>' +

    /* Hamburger button */
    '<button id="mob-menu-btn" aria-label="Menu" aria-expanded="false">' +
      '<span class="mob-bar"></span>' +
      '<span class="mob-bar"></span>' +
      '<span class="mob-bar"></span>' +
    '</button>' +

    /* Dropdown */
    '<div id="mob-menu-dropdown" role="menu">' +

      /* Back / Home */
      '<a href="../index.html" class="mob-menu-item" role="menuitem">' +
        '<span class="mob-menu-item-icon">🏠</span>' +
        '<span>Trang chủ</span>' +
      '</a>' +

      '<div class="mob-menu-sep"></div>' +

      /* Hướng dẫn */
      '<button class="mob-menu-item" role="menuitem" onclick="openGuidePopup(); closeMobMenu();">' +
        '<span class="mob-menu-item-icon">📖</span>' +
        '<span>Hướng dẫn</span>' +
      '</button>' +

      /* Daily check-in */
      '<button class="mob-menu-item" role="menuitem" onclick="openDailyPopup(); closeMobMenu();">' +
        '<span class="mob-menu-item-icon">📅</span>' +
        '<span>Điểm danh hàng ngày</span>' +
      '</button>' +

      '<div class="mob-menu-sep"></div>' +

      /* Lịch sử */
      '<button class="mob-menu-item" role="menuitem" onclick="openHistoryPopup(); closeMobMenu();">' +
        '<span class="mob-menu-item-icon">🕘</span>' +
        '<span>Lịch sử quay</span>' +
      '</button>' +

    '</div>';

  var container = document.createElement('div');
  container.innerHTML = menuHTML;
  while (container.firstChild) document.body.appendChild(container.firstChild);

  /* ── 2. Logic mở/đóng ── */
  var btn      = document.getElementById('mob-menu-btn');
  var dropdown = document.getElementById('mob-menu-dropdown');
  var overlay  = document.getElementById('mob-menu-overlay');

  function openMobMenu() {
    btn.classList.add('open');
    dropdown.classList.add('open');
    overlay.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeMobMenu() {
    btn.classList.remove('open');
    dropdown.classList.remove('open');
    overlay.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  window.closeMobMenu = closeMobMenu;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (btn.classList.contains('open')) closeMobMenu();
    else openMobMenu();
  });

  overlay.addEventListener('click', closeMobMenu);

  /* Đóng menu khi bấm Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobMenu();
  });

  /* Đóng menu khi resize về desktop */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeMobMenu();
  });

})();
