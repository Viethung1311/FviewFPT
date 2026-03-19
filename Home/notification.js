(function () {
  const btn      = document.getElementById('notif-bell-btn');
  const panel    = document.getElementById('notif-panel');
  const badge    = document.getElementById('notif-badge');
  const clearBtn = document.getElementById('notif-clear-btn');
  const list     = document.getElementById('notif-list');
  const empty    = document.getElementById('notif-empty');
  let unread     = 3;

  function updateBadge() {
    badge.textContent = unread;
    unread <= 0 ? badge.classList.add('hidden') : badge.classList.remove('hidden');
  }

  function markRead() {
    document.querySelectorAll('.notif-item.notif-unread').forEach(el => el.classList.remove('notif-unread'));
    unread = 0;
    updateBadge();
  }

  function checkEmpty() {
    if (list.querySelectorAll('.notif-item').length === 0) {
      list.style.display = 'none';
      empty.style.display = 'flex';
    }
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) setTimeout(markRead, 400);
  });

  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  // Click vào item chỉ đánh dấu đã đọc, không xóa
  list.addEventListener('click', function(e) {
    const item = e.target.closest('.notif-item');
    if (!item) return;
    if (item.classList.contains('notif-unread')) {
      item.classList.remove('notif-unread');
      if (unread > 0) {
        unread--;
        updateBadge();
      }
    }
  });

  clearBtn.addEventListener('click', function() {
    const items = list.querySelectorAll('.notif-item');
    let delay = 0;
    items.forEach(function(item) {
      setTimeout(function() {
        item.classList.add('removing');
        item.addEventListener('animationend', function() {
          item.remove();
          checkEmpty();
        }, { once: true });
      }, delay);
      delay += 60;
    });
    unread = 0;
    updateBadge();
  });
})();