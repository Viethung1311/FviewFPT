/* =============================================
   SCROLL-REVEAL.JS
   Hiện khi vào viewport, ẩn khi lướt qua
   ============================================= */

(function () {
    // Tất cả class cần observe
    const SELECTORS = '.reveal, .reveal-left, .reveal-right, .reveal-scale';

    // Theo dõi vị trí trước đó để biết hướng scroll
    let lastScrollY = window.scrollY;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const el = entry.target;
                const rect = el.getBoundingClientRect();

                if (entry.isIntersecting) {
                    // Phần tử đang trong viewport → hiện ra
                    el.classList.add('visible');
                    el.classList.remove('hidden-above');
                } else {
                    // Phần tử ra khỏi viewport
                    if (rect.top < 0) {
                        // Đã lướt qua (nằm phía trên viewport) → ẩn lên
                        el.classList.add('hidden-above');
                        el.classList.remove('visible');
                    } else {
                        // Chưa đến (nằm phía dưới viewport) → ẩn xuống
                        el.classList.remove('visible');
                        el.classList.remove('hidden-above');
                    }
                }
            });
        },
        {
            threshold: 0.12,        // Hiện khi 12% phần tử vào viewport
            rootMargin: '0px 0px -40px 0px' // Trigger trước khi chạm đáy 40px
        }
    );

    // Gắn observer vào tất cả phần tử
    function initReveal() {
        document.querySelectorAll(SELECTORS).forEach((el) => {
            observer.observe(el);
        });
    }

    // Chạy sau khi DOM load xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReveal);
    } else {
        initReveal();
    }
})();
