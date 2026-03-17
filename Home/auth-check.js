// Home/auth-check.js
// Gắn file này vào Home/index.html để chặn truy cập nếu chưa đăng nhập

const API_BASE = "http://localhost:3000";

window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("⚠️ Vui lòng đăng nhập để truy cập!");
    window.location.href = "../login/login.html";
    return;
  }

  // Verify token với server
  const ok = await verifyToken(token);
  if (!ok) return;

  const username = localStorage.getItem("username") || "User";
  displayUserInfo(username);
});

async function verifyToken(token) {
  try {
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!data.success) {
      localStorage.clear();
      window.location.href = "../login/login.html";
      return false;
    }

    return true;
  } catch (err) {
    console.error("Lỗi xác thực:", err);
    localStorage.clear();
    window.location.href = "../login/login.html";
    return false;
  }
}

function displayUserInfo(username) {
  const userDisplay = document.createElement("div");
  userDisplay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 12px 20px;
    border-radius: 25px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 15px;
    z-index: 1000;
  `;

  userDisplay.innerHTML = `
    <i class="fa-solid fa-user" style="color: #f37021;"></i>
    <span style="font-weight: 500; color: #333;">${username}</span>
    <button id="logoutBtn" style="
      background: #f37021;
      color: white;
      border: none;
      padding: 6px 15px;
      border-radius: 15px;
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 500;
    ">Đăng xuất</button>
  `;

  document.body.appendChild(userDisplay);

  userDisplay.querySelector("#logoutBtn").addEventListener("click", logout);
}

function logout() {
  if (confirm("Bạn có chắc muốn đăng xuất?")) {
    localStorage.clear();
    alert("✅ Đã đăng xuất thành công!");
    window.location.href = "../login/login.html";
  }
}

// Optional: verify mỗi 5 phút
setInterval(() => {
  const token = localStorage.getItem("token");
  if (token) verifyToken(token);
}, 5 * 60 * 1000);
