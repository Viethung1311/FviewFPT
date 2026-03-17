/* =============================================
   NAVBAR.JS — Scroll effect + Mobile menu
   ============================================= */

const header         = document.querySelector("header");
const menuOpenBtn    = document.getElementById("menu-open-button");
const menuCloseBtn   = document.getElementById("menu-close-button");
const navMenu        = document.querySelector(".nav-menu");

// ===== Scroll: thêm class "scrolled" khi lướt xuống =====
window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// ===== Mobile menu toggle =====
if (menuOpenBtn) {
    menuOpenBtn.addEventListener("click", () => {
        navMenu.classList.add("mobile-open");
    });
}

if (menuCloseBtn) {
    menuCloseBtn.addEventListener("click", () => {
        navMenu.classList.remove("mobile-open");
    });
}

// Đóng menu khi click vào nav link
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        navMenu.classList.remove("mobile-open");
    });
});

// Đóng menu khi click ra ngoài
document.addEventListener("click", (e) => {
    if (
        navMenu.classList.contains("mobile-open") &&
        !navMenu.contains(e.target) &&
        !menuOpenBtn.contains(e.target)
    ) {
        navMenu.classList.remove("mobile-open");
    }
});
