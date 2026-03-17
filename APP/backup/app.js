let APPS = [];

async function loadApps() {
  const res = await fetch('data/apps.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' when loading data/apps.json');
  APPS = await res.json();
}

function showLoadError(err) {
  console.error(err);
  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed',
    'left:16px',
    'right:16px',
    'bottom:16px',
    'max-width:980px',
    'margin:0 auto',
    'background:#111827',
    'color:#fff',
    'padding:12px 14px',
    'border-radius:14px',
    'z-index:9999',
    'font-family:system-ui,Segoe UI,Roboto,Arial',
    'font-size:14px',
    'line-height:1.35',
    'box-shadow:0 12px 36px rgba(0,0,0,.35)'
  ].join(';');
  box.innerHTML =
    '<b>Không tải được dữ liệu apps.json</b><br>' +
    'Bạn đang mở file trực tiếp (file://) nên trình duyệt có thể chặn fetch().<br>' +
    'Hãy chạy một web server trong thư mục dự án, ví dụ:<br>' +
    '<code style="display:block;margin-top:6px;background:rgba(255,255,255,.08);padding:6px 8px;border-radius:10px">python -m http.server 8000</code>' +
    'Sau đó mở: <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:8px">http://localhost:8000</code>';
  document.body.appendChild(box);
}

async function init() {
  try {
    await loadApps();
    renderSidebar();
    renderGrid();
  } catch (e) {
    showLoadError(e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

var curApp = null, curView = 'home';

/* ── NAV ── */
function goTo(view) {
  var ord = { home: 0, sections: 1, detail: 2 };
  var vm = { home: 'v-home', sections: 'v-sections', detail: 'v-detail' };
  var fwd = ord[view] > ord[curView];
  Object.keys(vm).forEach(function (v) {
    var el = document.getElementById(vm[v]);
    el.classList.add('hidden');
    el.classList.remove('sl', 'sr');
  });
  var t = document.getElementById(vm[view]);
  t.classList.add(fwd ? 'sr' : 'sl');
  t.classList.remove('hidden');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { t.classList.remove('sl', 'sr'); });
  });
  curView = view;
  document.querySelectorAll('.sb-btn').forEach(function (b) { b.classList.remove('active'); });
  if (curApp) { var sb = document.getElementById('sb-' + curApp); if (sb) sb.classList.add('active'); }
}

/* ── ICON HTML ── */
function icoHtml(app, size) {
  if (app.icon_img) {
    return '<img src="' + app.icon_img + '" style="width:' + (size * 0.75) + 'px;height:' + (size * 0.75) + 'px;object-fit:contain">';
  }
  return '<span style="font-size:' + (size * 0.5) + 'px">' + (app.emoji || '📱') + '</span>';
}

/* ── SIDEBAR ── */
function renderSidebar() {
  var el = document.getElementById('sbList');
  el.innerHTML = '';
  APPS.forEach(function (a) {
    var btn = document.createElement('button');
    btn.className = 'sb-btn';
    btn.id = 'sb-' + a.id;
    btn.innerHTML = '<div class="sb-iw">' + icoHtml(a, 42) + '</div>'
      + '<span class="sb-lb">' + a.name + '</span>';
    btn.addEventListener('click', function () { openApp(a.id); });
    el.appendChild(btn);
  });
}

/* ── GRID ── */
function renderGrid(filter) {
  filter = filter || '';
  var list = APPS.filter(function (a) {
    return a.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0
      || (a.sub && a.sub.toLowerCase().indexOf(filter.toLowerCase()) >= 0);
  });
  var grid = document.getElementById('appGrid');
  grid.innerHTML = '';
  list.forEach(function (a, i) {
    var btn = document.createElement('button');
    btn.className = 'g-item';
    btn.style.animationDelay = (i * 0.055) + 's';
    btn.innerHTML =
      '<div class="g-ico" style="background:' + a.bg + '">' + icoHtml(a, 68) + '</div>'
      + '<div class="g-info">'
      + '<div class="g-name">' + a.name + '</div>'
      + '<div class="g-sub">' + (a.sub || '') + '</div>'
      + '<span class="g-tag">' + a.sections.length + ' mục</span>'
      + '</div>'
      + '<span class="g-arr">›</span>';
    btn.addEventListener('click', function () { openApp(a.id); });
    grid.appendChild(btn);
  });
}

/* ── OPEN APP ── */
function openApp(id) {
  curApp = id;
  var app = APPS.find(function (a) { return a.id === id; });
  if (!app) return;
  document.getElementById('vs-ico').innerHTML =
    '<div style="width:40px;height:40px;border-radius:10px;background:' + app.bg + ';display:flex;align-items:center;justify-content:center;overflow:hidden">'
    + icoHtml(app, 40) + '</div>';
  document.getElementById('vs-name').textContent = app.name;
  document.getElementById('vs-sub').textContent = app.sub || '';
  var sb = document.getElementById('secBody');
  sb.innerHTML = '';
  app.sections.forEach(function (sec, i) {
    var row = document.createElement('div');
    row.className = 'sec-row';
    row.style.animationDelay = (i * 0.05) + 's';
    row.innerHTML = '<span class="sr-ico">' + sec.icon + '</span>'
      + '<div style="flex:1;min-width:0">'
      + '<div class="sr-title">' + sec.title + '</div>'
      + '<div class="sr-prev">' + sec.preview + '</div>'
      + '</div><span class="sr-arr">›</span>';
    row.addEventListener('click', (function (idx) { return function () { openSection(idx); }; })(i));
    sb.appendChild(row);
  });
  goTo('sections');
}

/* ── OPEN SECTION ── */
function openSection(idx) {
  var app = APPS.find(function (a) { return a.id === curApp; });
  var sec = app.sections[idx];
  document.getElementById('vd-ico').textContent = sec.icon;
  document.getElementById('vd-name').textContent = sec.title;
  document.getElementById('vd-chip').textContent = app.name;
  var db = document.getElementById('detBody');
  db.innerHTML = sec.blocks.map(function (b, i) { return renderBlock(b, i); }).join('');
  if (sec.autoOpen) {
    db.querySelectorAll('.cblock').forEach(function (el) {
      el.classList.add('open');
      var body = el.querySelector('.cbbody');
      body.style.padding = '15px 17px';
      body.style.maxHeight = 'none';
    });
  }
  goTo('detail');
}

/* ── TOGGLE BLOCK ── */
document.addEventListener('click', function (e) {
  var head = e.target.closest('.cbhead');
  if (!head) return;
  var block = head.closest('.cblock');
  if (!block) return;
  var body = block.querySelector('.cbbody');
  if (block.classList.contains('open')) {
    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.padding = '15px 17px';
    requestAnimationFrame(function () {
      body.style.transition = 'max-height .32s ease,padding .28s ease';
      body.style.maxHeight = '0';
      body.style.padding = '0 17px';
    });
    block.classList.remove('open');
  } else {
    body.style.transition = 'max-height .38s ease,padding .28s ease';
    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.padding = '15px 17px';
    block.classList.add('open');
    setTimeout(function () { if (block.classList.contains('open')) body.style.maxHeight = 'none'; }, 400);
  }
});

/* ── RENDER BLOCK ── */
function renderBlock(b, i) {
  var delay = 'animation-delay:' + (i * 0.065) + 's';
  if (!b.label) {
    if (b.type === 'warn') return '<div class="wbox" style="' + delay + '"><span>⚠️</span><span>' + b.content + '</span></div>';
    if (b.type === 'info') return '<div class="ibox" style="' + delay + '"><span>ℹ️</span><span>' + b.content + '</span></div>';
    return '';
  }
  var inner = '';
  switch (b.type) {
    case 'text':
      inner = '<div class="tbox">' + b.content.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>') + '</div>';
      break;
    case 'bullets':
      inner = '<ul class="blist">' + b.content.map(function (x) {
        return '<li><span class="bull">›</span><span>' + x + '</span></li>';
      }).join('') + '</ul>';
      break;
    case 'steps':
      inner = '<ol class="nlist">' + b.content.map(function (x) {
        return '<li><span>' + x + '</span></li>';
      }).join('') + '</ol>';
      break;
    case 'badges':
      inner = '<div class="brow">' + b.content.map(function (x) {
        return '<span class="badge">' + x + '</span>';
      }).join('') + '</div>';
      break;
    case 'links':
      inner = '<div class="lrow">' + b.content.map(function (l) {
        return '<a class="lchip" href="' + l + '" target="_blank">🔗 ' + l.replace(/^https?:\/\//, '') + '</a>';
      }).join('') + '</div>';
      break;
    case 'html':
      inner = b.content;
      break;
    default:
      inner = '<div class="tbox">' + b.content + '</div>';
  }
  return '<div class="cblock" style="' + delay + '">'
    + '<div class="cbhead"><div class="cbdot"></div>'
    + '<div class="cblabel">' + b.label + '</div>'
    + '<span class="cbarr">›</span></div>'
    + '<div class="cbbody">' + inner + '</div></div>';
}

/* ── BACK BUTTONS ── */
document.getElementById('btn-back-sec').addEventListener('click', function () { goTo('home'); });
document.getElementById('btn-back-det').addEventListener('click', function () { goTo('sections'); });

/* ── SEARCH ── */
document.getElementById('searchInput').addEventListener('input', function () { renderGrid(this.value); });