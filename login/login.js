// ===== UI toggle =====
const container = document.querySelector(".container");
const signup = document.querySelector(".signup");
const signin = document.querySelector(".signin");

const loginLink = document.querySelector(".login");
const createLink = document.querySelector(".create");

signup.style.display = "flex";
signin.style.display = "none";

loginLink.addEventListener("click", (e) => {
  e.preventDefault();
  signup.style.display = "none";
  signin.style.display = "flex";
});

createLink.addEventListener("click", (e) => {
  e.preventDefault();
  signin.style.display = "none";
  signup.style.display = "flex";
});

// ===== Helpers =====
function setMsg(el, text, type) {
  el.style.display = "block";
  el.className = "msg " + type;
  el.textContent = text;
}

function clearMsg(el) {
  el.style.display = "none";
  el.textContent = "";
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

// ===== SIGN UP =====
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearMsg(signupMsg);

  const username = su_username.value.trim();
  const email = su_email.value.trim();
  const password = su_password.value;
  const confirm = su_confirm.value;

  if (password !== confirm) {
    return setMsg(signupMsg, "Mật khẩu không khớp", "err");
  }

  // check user tồn tại chưa
  const users = JSON.parse(localStorage.getItem("users")) || [];

  const exist = users.find(
    (u) => u.username === username || u.email === email
  );

  if (exist) {
    return setMsg(signupMsg, "User đã tồn tại", "err");
  }

  // lưu user
  users.push({ username, email, password });
  localStorage.setItem("users", JSON.stringify(users));

  setMsg(signupMsg, "Đăng ký thành công!", "ok");

  // chuyển sang login
  setTimeout(() => {
    signup.style.display = "none";
    signin.style.display = "flex";
    si_user.value = username;
  }, 500);
});

// ===== LOGIN =====
signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearMsg(signinMsg);

  const usernameOrEmail = si_user.value.trim();
  const password = si_pass.value;

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const user = users.find(
    (u) =>
      (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
      u.password === password
  );

  if (!user) {
    return setMsg(signinMsg, "Sai tài khoản hoặc mật khẩu", "err");
  }

  // lưu trạng thái login
  localStorage.setItem("currentUser", JSON.stringify(user));

  setMsg(signinMsg, "Đăng nhập thành công!", "ok");

  setTimeout(() => {
    window.location.href = "../index.html";
  }, 600);
});

// ===== AUTO LOGIN =====
(function () {
  const user = localStorage.getItem("currentUser");
  if (user) {
    console.log("Đã đăng nhập:", JSON.parse(user));
  }
})();