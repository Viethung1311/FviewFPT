// ===== UI toggle (giữ logic bạn có, nhưng viết chắc hơn) =====
const container = document.querySelector(".container");
const signup = document.querySelector(".signup");
const signin = document.querySelector(".signin");

const loginLink = document.querySelector(".login");
const createLink = document.querySelector(".create");

// Mặc định hiển thị Sign Up
signup.style.display = "flex";
signin.style.display = "none";
container.classList.remove("active");

loginLink.addEventListener("click", (e) => {
  e.preventDefault();
  signup.style.display = "none";
  signin.style.display = "flex";
  container.classList.add("active");
});

createLink.addEventListener("click", (e) => {
  e.preventDefault();
  signin.style.display = "none";
  signup.style.display = "flex";
  container.classList.remove("active");
});

// ===== API config =====
// Nếu bạn bị lỗi localhost, đổi thành: http://127.0.0.1:3000/api
const API = "http://localhost:3000/api";

function setMsg(el, text, type) {
  el.style.display = "block";
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
  el.textContent = text;
}

function clearMsg(el) {
  el.style.display = "none";
  el.classList.remove("ok", "err");
  el.textContent = "";
}

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function getToken() {
  return localStorage.getItem("token");
}

// ===== Elements =====
const signupForm = document.getElementById("signupForm");
const signinForm = document.getElementById("signinForm");

const signupMsg = document.getElementById("signupMsg");
const signinMsg = document.getElementById("signinMsg");

const su_username = document.getElementById("su_username");
const su_email = document.getElementById("su_email");
const su_password = document.getElementById("su_password");
const su_confirm = document.getElementById("su_confirm");

const si_user = document.getElementById("si_user");
const si_pass = document.getElementById("si_pass");

const btnMe = document.getElementById("btnMe");
const btnLogout = document.getElementById("btnLogout");

// ===== Register =====
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(signupMsg);

  const username = su_username.value.trim();
  const email = su_email.value.trim();
  const password = su_password.value;
  const confirm = su_confirm.value;

  if (password !== confirm) {
    return setMsg(signupMsg, "Confirm password không khớp.", "err");
  }

  const res = await fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    return setMsg(signupMsg, `(${res.status}) ${data.message || "Register failed"}`, "err");
  }

  setMsg(signupMsg, "Đăng ký thành công! Chuyển sang Login...", "ok");

  // auto chuyển sang sign in
  setTimeout(() => {
    signup.style.display = "none";
    signin.style.display = "flex";
    container.classList.add("active");

    // điền sẵn user/email cho tiện login
    si_user.value = username || email;
    si_pass.value = "";
    clearMsg(signinMsg);
  }, 500);

  // reset form
  su_password.value = "";
  su_confirm.value = "";
});

// ===== Login =====
// ===== Login =====
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg(signinMsg);

  const usernameOrEmail = si_user.value.trim();
  const password = si_pass.value;

  const res = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password }),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    return setMsg(signinMsg, `(${res.status}) ${data.message || "Login failed"}`, "err");
  }

  // Lưu token
  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  // Lưu thông tin user
  if (data.user) {
    // Bạn có thể đổi sang sessionStorage nếu muốn
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  setMsg(signinMsg, `Đăng nhập thành công! Xin chào ${data.user?.username || ""}`, "ok");

  // Chờ 600ms cho user thấy message rồi chuyển trang
  setTimeout(() => {
    window.location.href = "../Home/index.html";
  }, 600);
});


// ===== Me (test token) =====
btnMe.addEventListener("click", async () => {
  clearMsg(signinMsg);

  const token = getToken();
  if (!token) return setMsg(signinMsg, "Chưa có token. Hãy login trước.", "err");

  const res = await fetch(API + "/me", {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await safeJson(res);
  if (!res.ok) {
    return setMsg(signinMsg, `(${res.status}) ${data.message || "Token invalid"}`, "err");
  }

  setMsg(signinMsg, `Token OK. User: ${data.user.username} (${data.user.email})`, "ok");
});

// ===== Logout =====
btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  setMsg(signinMsg, "Đã logout (đã xoá token).", "ok");
});

// ===== Auto state (nếu đã có token) =====
(async function autoCheck() {
  const token = getToken();
  if (!token) return;

  // auto chuyển sang Sign In để user thấy trạng thái
  signup.style.display = "none";
  signin.style.display = "flex";
  container.classList.add("active");

  const res = await fetch(API + "/me", {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await safeJson(res);
  if (res.ok && data.user) {
    setMsg(signinMsg, `Đang đăng nhập: ${data.user.username}`, "ok");
  } else {
    localStorage.removeItem("token");
  }
})();
