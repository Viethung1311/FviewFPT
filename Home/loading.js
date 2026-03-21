// ===== LOADING SCREEN =====
(function () {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  function hideLoader() {
    screen.classList.add('loaded');
    // Xoá khỏi DOM sau khi transition kết thúc
    screen.addEventListener('transitionend', () => screen.remove(), { once: true });
  }

  if (document.readyState === 'complete') {
    // Trang đã load xong trước khi script chạy
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
})();
