const menuOpenButton = document.querySelector("#menu-open-button");
const menuCloseButton = document.querySelector("#menu-close-button");

menuOpenButton.addEventListener("click", () => {
    // bật/tắt hiển thị menu trên thiết bị di động
    document.body.classList.toggle("show-mobie-menu");
});

// Đóng menu khi nhấn nút đóng
menuCloseButton.addEventListener("click", () => menuOpenButton.click());
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!token || !user) {
    // Chưa login → quay về trang login
    window.location.href = "../Login/login.html";
    return;
  }

  console.log("User đang đăng nhập:", user);

  // Ví dụ hiển thị tên người dùng trên trang Home
  const nameEl = document.getElementById("username");
  if (nameEl) {
    nameEl.textContent = user.username;
  }
});
