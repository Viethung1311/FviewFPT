/* =============================================
   APP-FPT.JS — Marquee Section
   ============================================= */

const mApps = [
    { name: "FAP",             sub: "Cổng sinh viên",   icon: "fa-id-card",          c: "blue"   },
    { name: "Microsoft Teams", sub: "Học trực tuyến",   icon: "fa-video",            c: "purple" },
    { name: "OnStudent",       sub: "Hồ sơ cá nhân",    icon: "fa-user-graduate",    c: "green"  },
    { name: "FPT Mail",        sub: "@fpt.edu.vn",      icon: "fa-envelope",         c: "orange" },
    { name: "FPT LMS",         sub: "Quản lý học tập",  icon: "fa-book-open",        c: "cyan"   },
    { name: "FPT Library",     sub: "Thư viện số",      icon: "fa-building-columns", c: "pink"   },
];

function buildMCard(a) {
    return '<div class="m-card" data-c="' + a.c + '">' +
        '<div class="m-icon mc-' + a.c + '"><i class="fa-solid ' + a.icon + '"></i></div>' +
        '<div class="m-info">' +
            '<span class="m-name">' + a.name + '</span>' +
            '<span class="m-sub">'  + a.sub  + '</span>' +
        '</div></div>';
}

function fillMRow(idA, idB, list) {
    const html = list.map(buildMCard).join('');
    document.getElementById(idA).innerHTML = html;
    document.getElementById(idB).innerHTML = html; // duplicate để loop liền mạch
}

fillMRow('mr1a', 'mr1b', mApps);
fillMRow('mr2a', 'mr2b', mApps);
fillMRow('mr3a', 'mr3b', mApps);
