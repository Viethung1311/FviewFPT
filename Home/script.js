// ===== MENU MOBILE =====
const menuOpenButton = document.querySelector("#menu-open-button");
const menuCloseButton = document.querySelector("#menu-close-button");

if (menuOpenButton) {
  menuOpenButton.addEventListener("click", () => {
    document.body.classList.toggle("show-mobie-menu");
  });
}

if (menuCloseButton) {
  menuCloseButton.addEventListener("click", () => {
    menuOpenButton.click();
  });
}

// ===== AUTH (LOCAL STORAGE) =====
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  // ===== CHECK LOGIN =====
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  console.log("User:", user);

  // ===== HIỂN THỊ USERNAME =====
  const nameEl = document.getElementById("nav-dropdown-name");
  if (nameEl) {
    nameEl.textContent = user.username;
  }

  // ===== HIỆN / ẨN LOGIN =====
  const loginBtn = document.getElementById("nav-login-btn");
  const avatarWrap = document.getElementById("nav-avatar-wrap");

  if (loginBtn && avatarWrap) {
    loginBtn.style.display = "none";
    avatarWrap.style.display = "block";
  }

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById("nav-logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      localStorage.removeItem("currentUser");

      window.location.href = "../login/login.html";
    });
  }
});