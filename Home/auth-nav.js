// ===== AUTH-NAV.JS =====
// Dùng chung cho index.html và app.html
// Đọc/ghi user từ localStorage — không cần server

const AVATAR_LIST = [
  { id: 1,  src: "../images/avatars/av1.png"  },
  { id: 2,  src: "../images/avatars/av2.png"  },
  { id: 3,  src: "../images/avatars/av3.png"  },
  { id: 4,  src: "../images/avatars/av4.png"  },
  { id: 5,  src: "../images/avatars/av5.png"  },
  { id: 6,  src: "../images/avatars/av6.png"  },
  { id: 7,  src: "../images/avatars/av7.png"  },
  { id: 8,  src: "../images/avatars/av8.png"  },
  { id: 9,  src: "../images/avatars/av9.png"  },
  { id: 10, src: "../images/avatars/av10.png" },
  { id: 11, src: "../images/avatars/av11.png" },
  { id: 12, src: "../images/avatars/av12.png" },
];

const FALLBACK = "https://ui-avatars.com/api/?background=f37021&color=fff&bold=true&size=128";

// ── Elements — ID giống nhau ở cả index lẫn app ──
const navLoginBtn        = document.getElementById("nav-login-btn");
const navAvatarWrap      = document.getElementById("nav-avatar-wrap");
const navAvatarImg       = document.getElementById("nav-avatar-img");
const navDropdown        = document.getElementById("nav-dropdown");
const navDropName        = document.getElementById("nav-dropdown-name");
const navLogoutBtn       = document.getElementById("nav-logout-btn");
const navChangeAvatarBtn = document.getElementById("nav-change-avatar-btn");
const avatarPopupOverlay = document.getElementById("avatar-popup-overlay");
const avatarPopupClose   = document.getElementById("avatar-popup-close");
const avatarGrid         = document.getElementById("avatar-grid");

// ── Helpers ──
function getCurrentUser() {
  try {
    // Ưu tiên 'currentUser' (do login.js lưu), fallback sang 'user'
    return JSON.parse(localStorage.getItem("currentUser"))
        || JSON.parse(localStorage.getItem("user"))
        || null;
  } catch { return null; }
}

function saveCurrentUser(userObj) {
  const key = localStorage.getItem("currentUser") ? "currentUser" : "user";
  localStorage.setItem(key, JSON.stringify(userObj));
}

function fallbackSrc(name) {
  return FALLBACK + "&name=" + encodeURIComponent(name || "U");
}

function setAvatarUI(src, username) {
  const f = fallbackSrc(username);
  navAvatarImg.src = src || f;
  navAvatarImg.onerror = function () { this.src = f; this.onerror = null; };
}

// ── Hiện UI đã đăng nhập ──
function showAvatar(user) {
  const username = user.username || user.email || "User";
  navLoginBtn.style.display   = "none";
  navAvatarWrap.style.display = "flex";
  navDropName.textContent     = username;
  setAvatarUI(user.avatar, username);
}

// ── Hiện UI chưa đăng nhập ──
function showLogin() {
  navLoginBtn.style.display   = "";
  navAvatarWrap.style.display = "none";
  navDropdown.classList.remove("open");
}

// ── Toggle dropdown ──
navAvatarImg.addEventListener("click", (e) => {
  e.stopPropagation();
  navDropdown.classList.toggle("open");
});
document.addEventListener("click", () => navDropdown.classList.remove("open"));
navDropdown.addEventListener("click", (e) => e.stopPropagation());

// ── Nút đăng nhập — tự tính path dựa theo độ sâu thư mục ──
navLoginBtn.addEventListener("click", () => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  // Nếu file nằm trong thư mục con (App/, spin/...) thì cần ../
  const prefix = segments.length > 1 ? "../" : "";
  window.location.href = prefix + "login/login.html";
});

// ── Đăng xuất ──
navLogoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("currentUser");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("toadPetState");
  showLogin();
});

// ── Đổi avatar ──
navChangeAvatarBtn.addEventListener("click", (e) => {
  e.preventDefault();
  navDropdown.classList.remove("open");
  openAvatarPopup();
});

function renderAvatarGrid(currentSrc) {
  avatarGrid.innerHTML = "";
  AVATAR_LIST.forEach(av => {
    const item = document.createElement("div");
    item.className = "avatar-grid-item" + (currentSrc === av.src ? " selected" : "");
    const img = document.createElement("img");
    img.src = av.src;
    img.alt = "Avatar " + av.id;
    img.onerror = function () {
      this.src = FALLBACK + "&name=Av" + av.id;
      this.onerror = null;
    };
    item.appendChild(img);
    item.addEventListener("click", () => selectAvatar(av.src, item));
    avatarGrid.appendChild(item);
  });
}

function openAvatarPopup() {
  const user = getCurrentUser();
  renderAvatarGrid(user?.avatar || null);
  avatarPopupOverlay.classList.add("open");
}

function closeAvatarPopup() {
  avatarPopupOverlay.classList.remove("open");
}

function selectAvatar(src, clickedItem) {
  const user = getCurrentUser();
  if (!user) return;
  user.avatar = src;
  saveCurrentUser(user);
  setAvatarUI(src, user.username);
  document.querySelectorAll(".avatar-grid-item").forEach(el => el.classList.remove("selected"));
  if (clickedItem) clickedItem.classList.add("selected");
  setTimeout(closeAvatarPopup, 280);
}

avatarPopupClose.addEventListener("click", closeAvatarPopup);
avatarPopupOverlay.addEventListener("click", (e) => {
  if (e.target === avatarPopupOverlay) closeAvatarPopup();
});

// ── Kiểm tra đăng nhập khi load trang ──
(function checkAuth() {
  const user = getCurrentUser();
  if (user) showAvatar(user);
  else showLogin();
})();