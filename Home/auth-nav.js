// ===== AUTH NAV =====
// Avatar đồng bộ với DB qua PUT /api/me/avatar
// ToadState đồng bộ với DB qua /api/spin-state

const API = "http://localhost:3000/api";

const AVATAR_LIST = [
  { id: 1,  src: "../images/avatars/av1.png",  label: "Avatar 1"  },
  { id: 2,  src: "../images/avatars/av2.png",  label: "Avatar 2"  },
  { id: 3,  src: "../images/avatars/av3.png",  label: "Avatar 3"  },
  { id: 4,  src: "../images/avatars/av4.png",  label: "Avatar 4"  },
  { id: 5,  src: "../images/avatars/av5.png",  label: "Avatar 5"  },
  { id: 6,  src: "../images/avatars/av6.png",  label: "Avatar 6"  },
  { id: 7,  src: "../images/avatars/av7.png",  label: "Avatar 7"  },
  { id: 8,  src: "../images/avatars/av8.png",  label: "Avatar 8"  },
  { id: 9,  src: "../images/avatars/av9.png",  label: "Avatar 9"  },
  { id: 10, src: "../images/avatars/av10.png", label: "Avatar 10" },
  { id: 11, src: "../images/avatars/av11.png", label: "Avatar 11" },
  { id: 12, src: "../images/avatars/av12.png", label: "Avatar 12" },
];

const FALLBACK = "https://ui-avatars.com/api/?background=f37021&color=fff&bold=true&size=128";

// ===== Elements =====
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

// ===== Helpers =====
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}
function getToken() { return localStorage.getItem("token"); }
function fallbackSrc(name) { return FALLBACK + "&name=" + encodeURIComponent(name || "U"); }

// ===== Set avatar lên UI =====
function setAvatarUI(src, username) {
  navAvatarImg.src = src || fallbackSrc(username);
  navAvatarImg.onerror = function () {
    this.src = fallbackSrc(username);
    this.onerror = null;
  };
}

// ===== Render lưới avatar =====
function renderAvatarGrid(currentSrc) {
  avatarGrid.innerHTML = "";
  AVATAR_LIST.forEach(av => {
    const item = document.createElement("div");
    item.className = "avatar-grid-item" + (currentSrc === av.src ? " selected" : "");
    const img = document.createElement("img");
    img.src = av.src;
    img.alt = av.label;
    img.onerror = function () {
      this.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(av.label)
               + "&background=f37021&color=fff&bold=true&size=128&rounded=true";
      this.onerror = null;
    };
    item.appendChild(img);
    item.addEventListener("click", () => selectAvatar(av.src, item));
    avatarGrid.appendChild(item);
  });
}

// ===== Chọn avatar → gọi API lưu DB =====
async function selectAvatar(src, clickedItem) {
  const user  = getCurrentUser();
  const token = getToken();
  if (!user || !token) return;

  setAvatarUI(src, user.username);
  document.querySelectorAll(".avatar-grid-item").forEach(el => el.classList.remove("selected"));
  if (clickedItem) clickedItem.classList.add("selected");
  setTimeout(() => closeAvatarPopup(), 280);

  try {
    const res  = await fetch(API + "/me/avatar", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ avatar: src }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
  } catch (e) {
    console.warn("Không thể lưu avatar lên server:", e);
  }
}

// ===== Popup =====
function openAvatarPopup() {
  const user = getCurrentUser();
  renderAvatarGrid(user?.avatar || null);
  avatarPopupOverlay.classList.add("open");
}
function closeAvatarPopup() {
  avatarPopupOverlay.classList.remove("open");
}

// ===== Events =====
navAvatarImg.addEventListener("click", (e) => {
  e.stopPropagation();
  navDropdown.classList.toggle("open");
});
document.addEventListener("click", () => navDropdown.classList.remove("open"));

navChangeAvatarBtn.addEventListener("click", (e) => {
  e.preventDefault();
  navDropdown.classList.remove("open");
  openAvatarPopup();
});

avatarPopupClose.addEventListener("click", closeAvatarPopup);
avatarPopupOverlay.addEventListener("click", (e) => {
  if (e.target === avatarPopupOverlay) closeAvatarPopup();
});

navLogoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Không xóa toadState khỏi localStorage vì đã có server backup.
  // Tuy nhiên clear để tránh dùng state của user cũ
  localStorage.removeItem("toadPetState");
  showLogin();
});

// ===== Hiện / ẩn =====
function showLogin() {
  navLoginBtn.style.display   = "";
  navAvatarWrap.style.display = "none";
}
function showAvatar(user) {
  const username = user.username || user.email || "User";
  navLoginBtn.style.display   = "none";
  navAvatarWrap.style.display = "flex";
  navDropName.textContent = username;
  setAvatarUI(user.avatar, username);
}

// ═══════════════════════════════════════════════════════════════════
//  TOAD STATE SYNC
//  Đồng bộ toadState 2 chiều giữa localStorage ↔ server DB
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch toadState từ server và merge vào toadState local.
 * Ưu tiên server (source of truth).
 * Gọi sau khi đăng nhập hoặc khi load trang khi đã đăng nhập.
 */
async function syncToadStateFromServer() {
  const token = getToken();
  if (!token) return;

  try {
    const res  = await fetch(API + "/spin-state", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (!res.ok) {
      console.warn("Không thể tải toad state từ server, dùng local.");
      return;
    }

    const data = await res.json();
    if (data.state && typeof toadState !== "undefined") {
      // Merge server state vào toadState của toad.js
      Object.assign(toadState, data.state);
      // Lưu lại vào localStorage để offline fallback
      if (typeof saveState === "function") saveState();
      // Cập nhật toàn bộ UI
      if (typeof _updateAllUI === "function") _updateAllUI();
    }
  } catch (e) {
    console.warn("Lỗi sync toad state:", e);
  }
}

/**
 * Đẩy toadState hiện tại lên server.
 * Gọi sau mỗi thao tác thay đổi state quan trọng.
 */
async function pushToadStateToServer() {
  const token = getToken();
  if (!token || typeof toadState === "undefined") return;

  try {
    await fetch(API + "/spin-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ state: toadState })
    });
  } catch (e) {
    console.warn("Không thể đẩy toad state lên server:", e);
  }
}

/**
 * Gọi API claim spin từ server (thay vì chỉ local).
 * Override hudClaimSpins trong toad.js để sync server.
 * Đặt sau khi toad.js đã load.
 */
function setupServerSpinSync() {
  // Chờ toad.js load xong
  if (typeof hudClaimSpins === "undefined") {
    setTimeout(setupServerSpinSync, 100);
    return;
  }

  // Override: Nhận spin — gọi server trước, rồi update local
  window._originalHudClaimSpins = window.hudClaimSpins;
  window.hudClaimSpins = async function () {
    const token = getToken();
    if (!token) {
      // Fallback offline
      window._originalHudClaimSpins();
      return;
    }
    try {
      const res  = await fetch(API + "/spin/claim", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await res.json();
      if (res.ok && data.state) {
        Object.assign(toadState, data.state);
        if (typeof saveState === "function") saveState();
        var cfg = getLevelCfg(toadState.level);
        if (typeof showToadToast === "function")
          showToadToast("🎰 Nhận " + cfg.spins + " spin thành công!");
        if (typeof _updateAllUI === "function") _updateAllUI();
      } else {
        if (typeof showToadToast === "function")
          showToadToast("❌ " + (data.message || "Lỗi nhận spin"));
      }
    } catch (e) {
      console.warn("Lỗi claim spin từ server, fallback local:", e);
      window._originalHudClaimSpins();
    }
  };

  // Override: Hook vào useOneSpin để auto-push state sau mỗi lần quay
  window._originalUseOneSpin = window.useOneSpin;
  window.useOneSpin = function () {
    const result = window._originalUseOneSpin();
    // Push async, không block UI
    pushToadStateToServer();
    return result;
  };

  // Override: Hook vào saveState để auto-push sau mỗi thay đổi quan trọng
  // (doLevelUp, claimSpins, v.v. đều gọi saveState)
  window._originalSaveState = window.saveState;
  window.saveState = function () {
    window._originalSaveState();
    // Debounce 800ms để tránh spam request khi nhiều thao tác liên tiếp
    clearTimeout(window._pushStateTimer);
    window._pushStateTimer = setTimeout(pushToadStateToServer, 800);
  };
}

// ===== Auto check khi load =====
(async function checkAuth() {
  const token = getToken();
  if (!token) return showLogin();

  try {
    const res  = await fetch(API + "/me", { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    if (res.ok && data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      showAvatar(data.user);

      // ── Đồng bộ toadState từ server sau khi xác thực thành công ──
      await syncToadStateFromServer();

      // ── Cài hook sync spin sau khi toad.js đã load ──
      setupServerSpinSync();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      showLogin();
    }
  } catch {
    // Offline → dùng cache
    const cached = getCurrentUser();
    if (cached) showAvatar(cached); else showLogin();
    // Vẫn setup hook để sync khi có mạng trở lại
    setupServerSpinSync();
  }
})();