/* =============================================
   LOADING.JS — Ẩn loading screen khi trang load xong
   ============================================= */

(function () {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;

    function hideLoader() {
        // Delay nhỏ để animation solar chạy ít nhất 1 vòng
        setTimeout(() => {
            screen.classList.add('hide');
            // Xoá khỏi DOM sau khi transition xong
            screen.addEventListener('transitionend', () => {
                screen.remove();
            }, { once: true });
        }, 1200);
    }

    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
    }
})();
