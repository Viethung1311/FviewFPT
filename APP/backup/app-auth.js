/* =============================================
   APP-AUTH.JS
   Avatar đồng bộ với DB qua PUT /api/me/avatar
   ============================================= */

const APP_AUTH = (function () {

    const API     = 'http://localhost:3000/api';
    const FALLBACK = 'https://ui-avatars.com/api/?background=f37021&color=fff&bold=true&size=128';

    const AVATAR_LIST = [
        { id: 1,  src: '../images/avatars/av1.png'  },
        { id: 2,  src: '../images/avatars/av2.png'  },
        { id: 3,  src: '../images/avatars/av3.png'  },
        { id: 4,  src: '../images/avatars/av4.png'  },
        { id: 5,  src: '../images/avatars/av5.png'  },
        { id: 6,  src: '../images/avatars/av6.png'  },
        { id: 7,  src: '../images/avatars/av7.png'  },
        { id: 8,  src: '../images/avatars/av8.png'  },
        { id: 9,  src: '../images/avatars/av9.png'  },
        { id: 10, src: '../images/avatars/av10.png' },
        { id: 11, src: '../images/avatars/av11.png' },
        { id: 12, src: '../images/avatars/av12.png' },
    ];

    // ── Elements ──
    const btnLogin        = document.getElementById('btn-login');
    const userWrap        = document.getElementById('app-user-wrap');
    const avatarImg       = document.getElementById('app-avatar-img');
    const dropdown        = document.getElementById('app-user-dropdown');
    const audAvatar       = document.getElementById('aud-avatar-img');
    const audName         = document.getElementById('aud-name');
    const audEmail        = document.getElementById('aud-email');
    const audChangeAvatar = document.getElementById('aud-change-avatar');
    const audLogout       = document.getElementById('aud-logout');
    const avOverlay       = document.getElementById('av-overlay');
    const avGrid          = document.getElementById('av-grid');
    const avClose         = document.getElementById('av-close');

    // ── Helpers ──
    function getUser()  { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
    function getToken() { return localStorage.getItem('token'); }
    function fallbackSrc(name) { return FALLBACK + '&name=' + encodeURIComponent(name || 'U'); }

    // ── Set avatar lên UI ──
    function setAvatarUI(src, username) {
        const fb = fallbackSrc(username);
        avatarImg.src = audAvatar.src = src || fb;
        avatarImg.onerror = audAvatar.onerror = function () {
            this.src = fb; this.onerror = null;
        };
    }

    // ── Hiện đã login ──
    function showLoggedIn(user) {
        btnLogin.style.display  = 'none';
        userWrap.style.display  = 'flex';
        audName.textContent  = user.username || 'User';
        audEmail.textContent = user.email    || '';
        setAvatarUI(user.avatar, user.username); // avatar từ DB
    }

    // ── Hiện chưa login ──
    function showLoggedOut() {
        btnLogin.style.display = '';
        userWrap.style.display = 'none';
        dropdown.classList.remove('open');
    }

    // ── Toggle dropdown ──
    avatarImg.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function () { dropdown.classList.remove('open'); });
    dropdown.addEventListener('click', function (e) { e.stopPropagation(); });

    // ── Đăng nhập ──
    btnLogin.addEventListener('click', function () {
        window.location.href = '../login/login.html';
    });

    // ── Logout ──
    audLogout.addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showLoggedOut();
    });

    // ── Mở popup chọn avatar ──
    audChangeAvatar.addEventListener('click', function (e) {
        e.preventDefault();
        dropdown.classList.remove('open');
        openAvatarPopup();
    });

    // ── Render avatar grid ──
    function openAvatarPopup() {
        const user = getUser();
        const current = user?.avatar || null;

        avGrid.innerHTML = '';
        AVATAR_LIST.forEach(function (av) {
            const item = document.createElement('div');
            item.className = 'av-item' + (current === av.src ? ' selected' : '');
            const img = document.createElement('img');
            img.src = av.src;
            img.alt = 'Avatar ' + av.id;
            img.onerror = function () {
                this.src = FALLBACK + '&name=Av' + av.id; this.onerror = null;
            };
            item.appendChild(img);
            item.addEventListener('click', function () { pickAvatar(av.src, item); });
            avGrid.appendChild(item);
        });

        avOverlay.classList.add('open');
    }

    // ── Chọn avatar → lưu DB ──
    async function pickAvatar(src, clickedItem) {
        const user  = getUser();
        const token = getToken();
        if (!user || !token) return;

        // Cập nhật UI ngay
        setAvatarUI(src, user.username);
        document.querySelectorAll('.av-item').forEach(function (el) { el.classList.remove('selected'); });
        if (clickedItem) clickedItem.classList.add('selected');
        setTimeout(function () { avOverlay.classList.remove('open'); }, 250);

        // Gọi API lưu DB
        try {
            const res  = await fetch(API + '/me/avatar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ avatar: src }),
            });
            const data = await res.json();
            if (res.ok && data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (e) {
            console.warn('Không thể lưu avatar lên server:', e);
        }
    }

    avClose.addEventListener('click', function () { avOverlay.classList.remove('open'); });
    avOverlay.addEventListener('click', function (e) {
        if (e.target === avOverlay) avOverlay.classList.remove('open');
    });

    // ── Auto check khi load ──
    (async function checkAuth() {
        const token = getToken();
        if (!token) return showLoggedOut();

        try {
            const res  = await fetch(API + '/me', { headers: { Authorization: 'Bearer ' + token } });
            const data = await res.json();
            if (res.ok && data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                showLoggedIn(data.user);
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showLoggedOut();
            }
        } catch {
            const cached = getUser();
            if (cached) showLoggedIn(cached); else showLoggedOut();
        }
    })();

})();
