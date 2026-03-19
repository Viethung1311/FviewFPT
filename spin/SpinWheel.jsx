import { useState, useEffect, useRef, useCallback } from "react";

/* ─── FONTS ─────────────────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Knewave&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,600;0,700;1,100;1,200;1,300;1,400;1,500&family=Exo+2:wght@400;600;700;900&display=swap";
document.head.appendChild(fontLink);

/* ─── GLOBAL STYLES ─────────────────────────────────────────────── */
const globalCSS = `
  @keyframes spinBorder { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes rainbowSpin {
    from { filter: hue-rotate(0deg) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
    to   { filter: hue-rotate(360deg) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
  }
  @keyframes overlayReveal { from{opacity:0} to{opacity:1} }
  @keyframes lightWave1 { 0%{width:0;height:0;opacity:0.9} 100%{width:180vmax;height:180vmax;opacity:0} }
  @keyframes lightWave2 { 0%{width:0;height:0;opacity:0.7} 100%{width:140vmax;height:140vmax;opacity:0} }
  @keyframes popupEntrance { 0%{opacity:0;transform:scale(0.7) translateY(30px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes numberPop {
    0%{opacity:0;transform:scale(0.5);filter:drop-shadow(0 0 30px rgba(212,175,55,0.9))}
    60%{transform:scale(1.08)}
    100%{opacity:1;transform:scale(1);filter:drop-shadow(0 2px 12px rgba(212,175,55,0.5))}
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rippleExpand { 0%{width:0;height:0;opacity:1} 100%{width:160vmax;height:160vmax;opacity:0} }
  @keyframes shimmerSweep { 0%{left:-100%;opacity:1} 100%{left:200%;opacity:1} }
  @keyframes hh { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(7deg)} }
  @keyframes toadLevelUp {
    0%{transform:scale(1);filter:brightness(1)}
    30%{transform:scale(1.3);filter:brightness(1.8)}
    60%{transform:scale(0.9);filter:brightness(1.4)}
    100%{transform:scale(1);filter:brightness(1)}
  }
  @keyframes claimPulse {
    0%,100%{box-shadow:0 4px 16px rgba(0,0,0,0.45),0 0 8px rgba(111,232,122,0.2)}
    50%{box-shadow:0 4px 20px rgba(0,0,0,0.45),0 0 20px rgba(111,232,122,0.45),0 0 0 3px rgba(111,232,122,0.15)}
  }
  @keyframes toadBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes badgePop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
  @keyframes lupSlideIn {
    from{opacity:0;transform:scale(0.75) translateY(40px)}
    to{opacity:1;transform:scale(1) translateY(0)}
  }
  @keyframes lupParticle {
    0%{opacity:0;transform:translateY(0) scale(0)}
    20%{opacity:1;transform:translateY(-8px) scale(1)}
    80%{opacity:0.6;transform:translateY(-24px) scale(0.7)}
    100%{opacity:0;transform:translateY(-40px) scale(0)}
  }
  @keyframes lupToadGlow {
    0%,100%{filter:drop-shadow(0 0 6px rgba(245,208,96,0.3));transform:scale(1)}
    50%{filter:drop-shadow(0 0 18px rgba(245,208,96,0.7));transform:scale(1.07)}
  }
  @keyframes lupArrowPulse { 0%,100%{opacity:0.5;transform:scaleX(1)} 50%{opacity:1;transform:scaleX(1.3)} }
  @keyframes lupShimmer { 0%{left:-100%} 100%{left:200%} }
  @keyframes toast-in { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes toast-out { from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(-12px)} }
`;
const styleEl = document.createElement("style");
styleEl.textContent = globalCSS;
document.head.appendChild(styleEl);

/* ─── TOAD CONFIG ───────────────────────────────────────────────── */
const TOAD_LEVELS = [
  null,
  { level: 1, coinsToNext: 5,    spins: 1, cooldownMs: 3.0 * 3600000 },
  { level: 2, coinsToNext: 10,   spins: 2, cooldownMs: 2.5 * 3600000 },
  { level: 3, coinsToNext: 15,   spins: 3, cooldownMs: 2.0 * 3600000 },
  { level: 4, coinsToNext: 20,   spins: 4, cooldownMs: 1.5 * 3600000 },
  { level: 5, coinsToNext: null, spins: 5, cooldownMs: 1.0 * 3600000 },
];
const STORAGE_KEY = "toadPetState";

const DEFAULT_STATE = {
  level: 1, coins: 0, spinsLeft: 0,
  spinReadyToClaim: true, lastSpawnTime: null,
  lastClaimTime: null, lastResetDate: null, pendingLevelUp: false,
};

function getLevelCfg(lvl) { return TOAD_LEVELS[Math.min(Math.max(lvl, 1), 5)]; }
function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function formatMs(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60), sec = s % 60;
  return pad2(h) + ":" + pad2(m) + ":" + pad2(sec);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ─── PRIZES ────────────────────────────────────────────────────── */
const PRIZES = [
  { label: "🪙1", type: "coin", coin: 1, name: "Nhận được 1 Golden Coin!" },
  { label: "🪙1", type: "coin", coin: 1, name: "Nhận được 1 Golden Coin!" },
  { label: "🪙2", type: "coin", coin: 2, name: "Nhận được 2 Golden Coin!" },
  { label: "🪙2", type: "coin", coin: 2, name: "Nhận được 2 Golden Coin!" },
  { label: "🪙3", type: "coin", coin: 3, name: "Nhận được 3 Golden Coin!" },
  { label: "🪙3", type: "coin", coin: 3, name: "Nhận được 3 Golden Coin!" },
  { label: "⭐",  type: "rare", coin: 0, name: "✨ Siêu hiếm! Phần thưởng đặc biệt!" },
  { label: "⭐⭐", type: "rare", coin: 0, name: "🌟 Siêu siêu hiếm! Jackpot!" },
];
const RATES = [30, 25, 20, 15, 7, 2.5, 0.1, 0.01];
function getRandomPrizeIndex() {
  const total = RATES.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total, cur = 0;
  for (let i = 0; i < RATES.length; i++) { cur += RATES[i]; if (rand <= cur) return i; }
  return 0;
}

/* ─── TOAD SVG ──────────────────────────────────────────────────── */
function getToadSVG(lvl) {
  const colors = ["#5a9e3a","#3aae6e","#2090c0","#a040d0","#e8a000"];
  const darks  = ["#1a4010","#0a5030","#004060","#500080","#804000"];
  const c = colors[lvl - 1], d = darks[lvl - 1];
  const crown = lvl >= 5
    ? `<polygon points="32,8 36,16 40,10 44,16 48,8 48,18 32,18" fill="#FFD700" stroke="#c8960c" stroke-width="1"/>`
    : "";
  const stars = Array.from({ length: lvl }, (_, i) =>
    `<text x="${18 + i * 10}" y="76" font-size="8" fill="#FFD700" text-anchor="middle">★</text>`
  ).join("");
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    ${crown}
    <ellipse cx="40" cy="50" rx="24" ry="18" fill="${c}"/>
    <ellipse cx="40" cy="32" rx="20" ry="16" fill="${c}"/>
    <ellipse cx="30" cy="24" rx="7" ry="8" fill="${d}" opacity="0.3"/>
    <ellipse cx="50" cy="24" rx="7" ry="8" fill="${d}" opacity="0.3"/>
    <ellipse cx="30" cy="24" rx="5" ry="6" fill="#fff"/>
    <ellipse cx="50" cy="24" rx="5" ry="6" fill="#fff"/>
    <circle cx="30" cy="24" r="3" fill="#222"/>
    <circle cx="50" cy="24" r="3" fill="#222"/>
    <circle cx="31" cy="23" r="1" fill="#fff"/>
    <circle cx="51" cy="23" r="1" fill="#fff"/>
    <path d="M33 36 Q40 42 47 36" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="20" cy="60" rx="8" ry="5" fill="${c}" transform="rotate(-20 20 60)"/>
    <ellipse cx="60" cy="60" rx="8" ry="5" fill="${c}" transform="rotate(20 60 60)"/>
    <ellipse cx="40" cy="52" rx="14" ry="10" fill="${c}" opacity="0.5"/>
    ${lvl >= 3 ? `<circle cx="34" cy="46" r="3" fill="${d}" opacity="0.4"/><circle cx="46" cy="50" r="2.5" fill="${d}" opacity="0.4"/>` : ""}
    ${stars}
    <circle cx="40" cy="62" r="6" fill="#FFD700" stroke="#c8960c" stroke-width="0.8"/>
    <text x="40" y="65" font-size="7" fill="#8b5e0a" text-anchor="middle" font-weight="bold">$</text>
  </svg>`;
}

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function SpinWheelApp() {
  /* ─ State ─ */
  const [toad, setToad] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
    } catch { return { ...DEFAULT_STATE }; }
  });
  const [spinning, setSpinning]         = useState(false);
  const [clicks, setClicks]             = useState(0);
  const [rotation, setRotation]         = useState(0);
  const [showPopup, setShowPopup]       = useState(false);
  const [popupResult, setPopupResult]   = useState(null);
  const [showToadPanel, setShowToadPanel] = useState(false);
  const [showLevelUp, setShowLevelUp]   = useState(false);
  const [showInfo, setShowInfo]         = useState(false);
  const [toast, setToast]               = useState(null);
  const [rippleKey, setRippleKey]       = useState(0);
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  const toastTimer = useRef(null);
  const innerWheelRef = useRef(null);

  /* ─ Persist ─ */
  const saveToad = useCallback((next) => {
    setToad(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  /* ─ Toast ─ */
  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /* ─ Toad helpers ─ */
  const msUntilNext = useCallback((s) => {
    if (s.spinReadyToClaim || !s.lastSpawnTime) return 0;
    const cfg = getLevelCfg(s.level);
    return Math.max(0, cfg.cooldownMs - (Date.now() - s.lastSpawnTime));
  }, []);

  const checkDailyReset = useCallback((s) => {
    const today = todayStr();
    if (s.lastResetDate !== today) {
      s = { ...s, spinsLeft: 0, lastResetDate: today };
    }
    if (s.pendingLevelUp && s.level < 5) {
      const cfg = getLevelCfg(s.level);
      if (s.coins < cfg.coinsToNext) s = { ...s, pendingLevelUp: false };
    }
    return s;
  }, []);

  /* ─ Claim spin ─ */
  const claimSpins = useCallback(() => {
    setToad((prev) => {
      if (!prev.spinReadyToClaim) return prev;
      const cfg = getLevelCfg(prev.level);
      const next = {
        ...prev,
        spinsLeft: prev.spinsLeft + cfg.spins,
        spinReadyToClaim: false,
        lastSpawnTime: Date.now(),
        lastClaimTime: Date.now(),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      showToast("🎰 Nhận " + cfg.spins + " spin thành công!");
      return next;
    });
  }, [showToast]);

  /* ─ Level up ─ */
  const doLevelUp = useCallback(() => {
    setToad((prev) => {
      if (!prev.pendingLevelUp || prev.level >= 5) return prev;
      const cfg = getLevelCfg(prev.level);
      const newLevel = prev.level + 1;
      const newCfg = getLevelCfg(newLevel);
      const next = {
        ...prev,
        coins: prev.coins - cfg.coinsToNext,
        level: newLevel,
        pendingLevelUp: false,
        spinsLeft: prev.spinsLeft + newCfg.spins,
        lastSpawnTime: Date.now(),
        spinReadyToClaim: false,
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      showToast("🎉 Lên Cấp " + newLevel + "! Nhận " + newCfg.spins + " spin!");
      return next;
    });
    setShowLevelUp(false);
  }, [showToast]);

  /* ─ Tick timer ─ */
  useEffect(() => {
    const id = setInterval(() => {
      setToad((prev) => {
        let next = checkDailyReset(prev);
        const ms = msUntilNext(next);
        if (!next.spinReadyToClaim && ms <= 0) {
          next = { ...next, spinReadyToClaim: true };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        }
        setTimerDisplay(formatMs(msUntilNext(next)));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [checkDailyReset, msUntilNext]);

  /* ─ SPIN ─ */
  const handleSpin = useCallback(() => {
    if (spinning) return;
    if (toad.spinReadyToClaim) { showToast("🐸 Nhận spin trước đã!"); return; }
    if (toad.spinsLeft <= 0)   { showToast("❌ Chưa có spin! Chờ cóc đẻ nhé."); return; }
    if (toad.pendingLevelUp)   { showToast("🔒 Nâng cấp cóc trước!"); return; }

    setSpinning(true);
    setShowPopup(false);

    const targetIndex = getRandomPrizeIndex();
    const newClicks = clicks + 1;
    setClicks(newClicks);

    const targetDeg = 45 + targetIndex * 45;
    const totalDeg = 1800 * newClicks + (360 - targetDeg);
    setRotation(totalDeg);

    setTimeout(() => {
      const result = PRIZES[targetIndex];
      setToad((prev) => {
        let next = {
          ...prev,
          spinsLeft: Math.max(0, prev.spinsLeft - 1),
        };
        if (result.type === "coin") {
          next.coins = prev.coins + result.coin;
          showToast("+" + result.coin + " Coin! 🪙");
          // Check level up
          if (next.level < 5) {
            const cfg = getLevelCfg(next.level);
            if (next.coins >= cfg.coinsToNext && !next.pendingLevelUp) {
              next.pendingLevelUp = true;
              setTimeout(() => setShowLevelUp(true), 1200);
            }
          }
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      setPopupResult(result);
      setRippleKey((k) => k + 1);
      setShowPopup(true);
      setSpinning(false);
    }, 6000);
  }, [spinning, toad, clicks, showToast]);

  /* ─── Admin Panel ─────────────────────────────────────── */
  const [showAdmin, setShowAdmin] = useState(false);
  const [tapCount, setTapCount]   = useState(0);
  const tapTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const seq = (handler._seq = ((handler._seq || "") + e.key.toLowerCase()).slice(-5));
      if (seq === "admin") setShowAdmin(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleToadBtnClick = () => {
    setTapCount((c) => {
      const next = c + 1;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (next >= 5) { setShowAdmin(true); return 0; }
      tapTimer.current = setTimeout(() => setTapCount(0), 3000);
      return next;
    });
    setShowToadPanel((v) => !v);
  };

  /* ─── Derived values ────────────────────────────────────── */
  const cfg      = getLevelCfg(toad.level);
  const maxLvl   = toad.level >= 5;
  const pct      = maxLvl ? 100 : Math.min(100, Math.round((toad.coins / (cfg.coinsToNext || 1)) * 100));
  const spinReady = toad.spinReadyToClaim;
  const hasSpin   = toad.spinsLeft > 0;
  const locked    = toad.pendingLevelUp;

  /* ─── RENDER ────────────────────────────────────────────── */
  return (
    <div style={s.root}>
      {/* BG */}
      <div style={s.bg} />

      {/* ── RESOURCE HUD ── */}
      <div style={s.hud}>
        {/* Spin count chip */}
        <div style={s.hudChip}>
          <span style={s.hudIcon}>🎰</span>
          <div style={s.hudTextWrap}>
            <span style={{ ...s.hudVal, color: hasSpin ? "#6FE87A" : "#888" }}>{toad.spinsLeft}</span>
            <span style={s.hudLabel}>SPIN</span>
          </div>
        </div>

        {/* Claim / timer chip */}
        {spinReady ? (
          <div style={{ ...s.hudChip, animation: "claimPulse 1.4s ease-in-out infinite", borderColor: "rgba(111,232,122,0.5)" }}>
            <button style={s.hudClaimBtn} onClick={claimSpins}>
              <span style={{ fontSize: 16, animation: "toadBounce 0.8s ease-in-out infinite" }}>🐸</span>
              <span style={s.hudClaimText}>Nhận {cfg.spins} Spin!</span>
            </button>
          </div>
        ) : (
          <div style={s.hudChip}>
            <span style={s.hudIcon}>⏳</span>
            <div style={s.hudTextWrap}>
              <span style={{ ...s.hudVal, fontSize: 11 }}>{timerDisplay}</span>
              <span style={s.hudLabel}>HỒI SPIN</span>
            </div>
          </div>
        )}

        {/* Coin chip */}
        <div style={s.hudChip}>
          <span style={s.hudIcon}>🪙</span>
          <div style={s.hudTextWrap}>
            <span style={{ ...s.hudVal, color: "#F5D060" }}>{toad.coins}</span>
            <span style={s.hudLabel}>COIN</span>
          </div>
        </div>

        {/* Info btn */}
        <button style={s.hudInfoBtn} onClick={() => setShowInfo(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="rgba(212,175,55,0.7)" strokeWidth="1.2"/>
            <rect x="7.2" y="6.8" width="1.6" height="5.2" rx="0.8" fill="#F5D060"/>
            <circle cx="8" cy="4.6" r="1" fill="#F5D060"/>
          </svg>
        </button>
      </div>

      {/* ── WHEEL WRAPPER ── */}
      <div id="wrapper" style={s.wrapper}>
        <div style={s.wheelBorderWrap}>
          {/* SVG ornament ring */}
          <svg width="540" height="540" viewBox="0 0 540 540"
            style={{ position: "absolute", top: 0, left: 0, zIndex: 10002, pointerEvents: "none" }}>
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#ffd700"/>
                <stop offset="25%"  stopColor="#fff8dc"/>
                <stop offset="50%"  stopColor="#c8960c"/>
                <stop offset="75%"  stopColor="#ffd700"/>
                <stop offset="100%" stopColor="#fff8dc"/>
              </linearGradient>
              <radialGradient id="gemGrad" cx="50%" cy="30%" r="50%">
                <stop offset="0%"   stopColor="#fffde0"/>
                <stop offset="60%"  stopColor="#ffd700"/>
                <stop offset="100%" stopColor="#8b5e0a"/>
              </radialGradient>
            </defs>
            <circle cx="270" cy="270" r="268" fill="none" stroke="url(#goldGrad)"
              strokeWidth="2" strokeDasharray="8 6"/>
            {/* 16 gems */}
            {Array.from({ length: 16 }, (_, i) => {
              const a = ((i * 360 / 16) - 90) * Math.PI / 180;
              const x = 270 + 268 * Math.cos(a), y = 270 + 268 * Math.sin(a), s2 = 6;
              return <polygon key={i}
                points={`${x},${y - s2} ${x + s2},${y} ${x},${y + s2} ${x - s2},${y}`}
                fill="url(#gemGrad)" stroke="#c8960c" strokeWidth="0.5"/>;
            })}
            {/* 8 petals */}
            {Array.from({ length: 8 }, (_, i) => {
              const a = ((i * 45) - 90) * Math.PI / 180;
              const x = 270 + 254 * Math.cos(a), y = 270 + 254 * Math.sin(a);
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="8" fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0.7"/>
                  <circle cx={x} cy={y} r="3" fill="#ffd700" opacity="0.9"/>
                </g>
              );
            })}
          </svg>

          {/* Animated conic border */}
          <div style={s.conicBorder} />

          {/* WHEEL */}
          <div style={s.wheel}>
            {/* Inner wheel spins */}
            <div
              ref={innerWheelRef}
              style={{
                ...s.innerWheel,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {PRIZES.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...s.sec,
                    transform: `rotate(${45 + i * 45}deg)`,
                    borderTopColor: [
                      "#16a085","#2980b9","#34495e","#f39c12",
                      "#d35400","#c0392b","#8e44ad","#27ae60"
                    ][i],
                  }}
                >
                  <span style={s.secNumber}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* SPIN button */}
            <div
              style={{
                ...s.spinBtn,
                ...(locked ? s.spinLocked : {}),
                cursor: spinning || locked || (!hasSpin && !spinReady) ? "not-allowed" : "pointer",
              }}
              onClick={handleSpin}
            >
              <div style={s.innerSpin} />
              <span style={s.spinText}>{locked ? "🔒" : "SPIN"}</span>
              {/* Rainbow arrow */}
              <div style={s.rainbowArrow} />
            </div>

            <div style={s.shine} />
          </div>
        </div>
      </div>

      {/* ── RESULT POPUP ── */}
      {showPopup && popupResult && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false); }}>
          {/* light waves */}
          <div key={`w1-${rippleKey}`} style={s.wave1} />
          <div key={`w2-${rippleKey}`} style={s.wave2} />
          {[0, 1, 2].map((w) => (
            <div key={`r${rippleKey}-${w}`} style={{
              position: "absolute", borderRadius: "50%", pointerEvents: "none",
              top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: 0, height: 0, opacity: 0,
              border: `1px solid rgba(212,175,55,${0.35 - w * 0.08})`,
              animation: `rippleExpand 2s cubic-bezier(0.2,0.8,0.4,1) ${w * 0.25}s forwards`,
            }} />
          ))}
          <div style={s.popup}>
            <span style={s.resultLabel}>Kết quả</span>
            <div style={s.resultNumber}>{popupResult.label}</div>
            <div style={s.resultIcon}>{popupResult.name}</div>
            <div style={s.divider} />
            <button style={s.closeBtn}
              onClick={() => setShowPopup(false)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(200,150,12,0.65),inset 0 1px 0 rgba(255,255,220,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = s.closeBtn.boxShadow; }}
            >Đóng</button>
          </div>
        </div>
      )}

      {/* ── TOAD TOGGLE BUTTON ── */}
      <button style={s.toadToggleBtn} onClick={handleToadBtnClick} aria-label="Cóc vàng">
        <div dangerouslySetInnerHTML={{ __html: getToadSVG(toad.level) }} />
        <span style={s.toadBtnLabel}>Cóc</span>
        <span style={{
          ...s.spinCounter,
          ...(spinReady ? s.spinCounterReady : hasSpin ? s.spinCounterHas : s.spinCounterNo),
        }}>
          {spinReady ? "!" : toad.spinsLeft}
        </span>
      </button>

      {/* ── TOAD PANEL ── */}
      {showToadPanel && (
        <div style={s.toadPanel}>
          <ToadPanel
            toad={toad} cfg={cfg} maxLvl={maxLvl} pct={pct}
            timerDisplay={timerDisplay}
            onLevelUp={() => setShowLevelUp(true)}
          />
        </div>
      )}

      {/* ── LEVEL UP POPUP ── */}
      {showLevelUp && toad.pendingLevelUp && (
        <LevelUpPopup
          toad={toad}
          onConfirm={doLevelUp}
          onSkip={() => setShowLevelUp(false)}
        />
      )}

      {/* ── INFO POPUP ── */}
      {showInfo && (
        <InfoPopup toad={toad} onClose={() => setShowInfo(false)} />
      )}

      {/* ── ADMIN PANEL ── */}
      {showAdmin && (
        <AdminPanel
          toad={toad}
          saveToad={saveToad}
          onClose={() => setShowAdmin(false)}
          showToast={showToast}
          formatMs={formatMs}
          msUntilNext={msUntilNext}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          ...s.toast,
          animation: "toast-in 0.35s ease forwards",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TOAD PANEL COMPONENT
══════════════════════════════════════════════════════ */
function ToadPanel({ toad, cfg, maxLvl, pct, timerDisplay, onLevelUp }) {
  const canLevel = !maxLvl && toad.coins >= (cfg.coinsToNext || Infinity);
  return (
    <div style={tc.card}>
      <div style={tc.header}>
        <div style={tc.avatar} dangerouslySetInnerHTML={{ __html: getToadSVG(toad.level) }} />
        <div>
          <div style={tc.name}>
            Cóc Vàng <span style={tc.badge}>Cấp {toad.level}</span>
          </div>
          <div style={tc.subtitle}>
            {maxLvl ? "Cấp tối đa ✦" : `Cần ${cfg.coinsToNext} coin để lên cấp`}
          </div>
        </div>
      </div>

      {/* Coin section */}
      <div style={tc.section}>
        <div style={tc.row}>
          <span style={tc.label}>🪙 Golden Coin</span>
          <span style={tc.value}>{toad.coins}{!maxLvl && ` / ${cfg.coinsToNext}`}</span>
        </div>
        <div style={tc.barWrap}><div style={{ ...tc.barFill, width: pct + "%" }} /></div>
      </div>

      {/* Spin section */}
      <div style={tc.section}>
        <div style={tc.row}>
          <span style={tc.label}>🎰 Spin còn lại</span>
          <span style={{ ...tc.value, color: toad.spinsLeft > 0 ? "#6FE87A" : "#F5D060" }}>{toad.spinsLeft}</span>
        </div>
        <div style={tc.row}>
          <span style={tc.label}>⏳ {toad.spinReadyToClaim ? "Trạng thái" : "Hồi tiếp theo"}</span>
          <span style={tc.value}>
            {toad.spinReadyToClaim ? "✅ Sẵn sàng nhận!" : timerDisplay}
          </span>
        </div>
        <div style={tc.spawnInfo}>
          Cóc đẻ <strong>{cfg.spins} spin</strong> mỗi <strong>{cfg.cooldownMs / 3600000}h</strong>
        </div>
      </div>

      {/* Level up button */}
      {!maxLvl && (
        <button style={{ ...tc.levelBtn, ...(canLevel ? tc.levelBtnActive : {}) }}
          disabled={!canLevel} onClick={onLevelUp}>
          ⬆ Lên Cấp ({cfg.coinsToNext} coin)
        </button>
      )}

      {/* Level dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, paddingTop: 8 }}>
        {[1,2,3,4,5].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              ...tc.dot,
              ...(i < toad.level ? tc.dotDone : i === toad.level ? tc.dotActive : {}),
            }}>
              {["①","②","③","④","⑤"][i-1]}
            </div>
            {i < 5 && <div style={{ ...tc.dotLine, ...(i < toad.level ? tc.dotLineDone : {}) }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LEVEL UP POPUP
══════════════════════════════════════════════════════ */
function LevelUpPopup({ toad, onConfirm, onSkip }) {
  const cfg = getLevelCfg(toad.level);
  const nextCfg = getLevelCfg(toad.level + 1);
  return (
    <div style={{ ...s.overlay, zIndex: 95000 }} onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}>
      <div style={s.lupPopup}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 26, pointerEvents: "none" }}>
          {[0,1,2,3,4,5,6,7].map((i) => (
            <div key={i} style={{ position:"absolute", width:6, height:6, borderRadius:"50%",
              background:["#FFD700","#FFA500","#F5D060","#FFD700","#fff8dc","#FFA500","#F5D060","#FFD700"][i],
              left: ["10%","85%","25%","70%","50%","5%","92%","45%"][i],
              top:  ["20%","15%","80%","75%","10%","55%","50%","90%"][i],
              animation: `lupParticle 2.4s ease-in-out ${[0,0.3,0.6,0.9,1.2,0.45,0.75,1.5][i]}s infinite`,
            }} />
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:20 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, opacity:0.6 }}>
            <div dangerouslySetInnerHTML={{ __html: getToadSVG(toad.level) }} />
            <span style={{ fontSize:11, fontWeight:700, fontFamily:"Poppins,sans-serif", color:"rgba(245,230,180,0.5)" }}>Cấp {toad.level}</span>
          </div>
          <span style={{ fontSize:28, color:"#F5D060", animation:"lupArrowPulse 0.8s ease-in-out infinite" }}>→</span>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, animation:"lupToadGlow 1.6s ease-in-out infinite" }}>
            <div dangerouslySetInnerHTML={{ __html: getToadSVG(toad.level + 1) }} />
            <span style={{ fontSize:11, fontWeight:700, fontFamily:"Poppins,sans-serif", color:"#F5D060" }}>Cấp {toad.level + 1}</span>
          </div>
        </div>

        <div style={s.lupTitle}>Cóc sẵn sàng tiến hóa!</div>
        <div style={s.lupSubtitle}>Nâng cấp ngay để mở khóa vòng quay</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {[
            { label:"Spin mỗi lần", from: cfg.spins, to: nextCfg.spins },
            { label:"Thời gian hồi", from: cfg.cooldownMs/3600000+"h", to: nextCfg.cooldownMs/3600000+"h" },
          ].map((st) => (
            <div key={st.label} style={s.lupStat}>
              <div style={s.lupStatLbl}>{st.label}</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"Poppins,sans-serif", fontSize:14, fontWeight:700 }}>
                <span style={{ color:"rgba(245,230,180,0.35)", textDecoration:"line-through", fontSize:13 }}>{st.from}</span>
                <span style={{ color:"rgba(245,208,96,0.5)", fontSize:12 }}>→</span>
                <span style={{ color:"#6FE87A", fontSize:16 }}>{st.to}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button style={s.lupBtnUpgrade} onClick={onConfirm}>⬆ Nâng Cấp Cấp {toad.level + 1}</button>
          <button style={s.lupBtnSkip} onClick={onSkip}>Để sau (vòng quay sẽ bị khóa)</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   INFO POPUP
══════════════════════════════════════════════════════ */
function InfoPopup({ toad, onClose }) {
  return (
    <div style={{ ...s.overlay, zIndex: 90000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.popup, maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}>
        <span style={s.resultLabel}>Thông tin hệ thống</span>
        <div style={{ fontSize: 13, color: "rgba(245,230,180,0.8)", fontFamily: "Poppins,sans-serif", marginTop: 12, textAlign: "left" }}>
          <p style={{ marginBottom: 12, color: "#F5D060", fontWeight: 700 }}>🐸 Cóc Vàng — Hệ thống Spin</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "rgba(212,175,55,0.6)" }}>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Cấp</th>
                <th style={{ padding: "4px 8px" }}>Spin/lần</th>
                <th style={{ padding: "4px 8px" }}>Cooldown</th>
                <th style={{ padding: "4px 8px" }}>Coin cần</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map((l) => {
                const c = getLevelCfg(l);
                return (
                  <tr key={l} style={{ background: l === toad.level ? "rgba(212,175,55,0.08)" : "transparent" }}>
                    <td style={{ padding: "4px 8px", color: l === toad.level ? "#F5D060" : "rgba(245,230,180,0.5)" }}>
                      {l === toad.level ? "▶ " : ""}Cấp {l}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{c.spins}</td>
                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{c.cooldownMs / 3600000}h</td>
                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{c.coinsToNext || "MAX"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ marginTop: 16, color: "rgba(245,230,180,0.45)", fontSize: 11, lineHeight: 1.6 }}>
            🪙 Coin nhận từ quay vòng quay<br/>
            🔄 Spin reset về 0 lúc 00:00 mỗi ngày<br/>
            🔒 Khi đủ coin lên cấp, vòng quay bị khóa cho đến khi xác nhận<br/>
            🛠 Admin: gõ "admin" hoặc bấm nút cóc 5 lần trong 3 giây
          </p>
        </div>
        <div style={s.divider} />
        <button style={s.closeBtn} onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════ */
function AdminPanel({ toad, saveToad, onClose, showToast, formatMs, msUntilNext }) {
  const [coinInput, setCoinInput] = useState("");

  const adminSave = (patch) => {
    const next = { ...toad, ...patch };
    saveToad(next);
  };

  return (
    <div style={{ ...s.overlay, zIndex: 110000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...s.popup, minWidth: 320, maxWidth: 380, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#F5D060", fontFamily: "Poppins,sans-serif" }}>🛠 Admin Panel</span>
          <button style={{ background: "none", border: "none", color: "rgba(245,230,180,0.5)", cursor: "pointer", fontSize: 18 }} onClick={onClose}>✕</button>
        </div>

        {/* Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Cấp", val: toad.level, color: "#F5D060" },
            { label: "Coin", val: toad.coins, color: "#F5D060" },
            { label: "Spin", val: toad.spinsLeft, color: "#6FE87A" },
            { label: "Hồi spin", val: toad.spinReadyToClaim ? "SẴN SÀNG" : formatMs(msUntilNext(toad)), color: "rgba(245,230,180,0.4)" },
          ].map((st) => (
            <div key={st.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: st.color, fontFamily: "Poppins,sans-serif" }}>{st.val}</div>
              <div style={{ fontSize: 9, color: "rgba(245,230,180,0.35)", marginTop: 2, textTransform: "uppercase" }}>{st.label}</div>
            </div>
          ))}
        </div>

        <AdmSection title="🎰 Spin">
          <div style={adm.row}>
            {[1,5,10].map((n) => <button key={n} style={adm.greenBtn} onClick={() => adminSave({ spinsLeft: toad.spinsLeft + n })}>+{n}</button>)}
            <button style={adm.redBtn} onClick={() => adminSave({ spinsLeft: 0 })}>Xóa spin</button>
          </div>
          <div style={adm.row}>
            <button style={adm.dimBtn} onClick={() => { adminSave({ lastSpawnTime: null, spinReadyToClaim: true }); showToast("⚡ Nút nhận spin đã xuất hiện!"); }}>
              ⚡ Hiện nút nhận spin ngay
            </button>
          </div>
        </AdmSection>

        <AdmSection title="🪙 Coin">
          <div style={adm.row}>
            {[1,5,10,50].map((n) => <button key={n} style={adm.goldBtn} onClick={() => adminSave({ coins: toad.coins + n })}>+{n}</button>)}
            <button style={adm.redBtn} onClick={() => adminSave({ coins: 0 })}>Xóa</button>
          </div>
          <div style={adm.row}>
            <input type="number" min="0" value={coinInput} onChange={(e) => setCoinInput(e.target.value)}
              placeholder="Nhập số coin..."
              style={adm.input} />
            <button style={adm.goldBtn} onClick={() => { const v = parseInt(coinInput); if (!isNaN(v) && v >= 0) { adminSave({ coins: v }); setCoinInput(""); } }}>Đặt</button>
          </div>
        </AdmSection>

        <AdmSection title="⬆ Cấp độ">
          <div style={adm.row}>
            {[1,2,3,4,5].map((l) => (
              <button key={l} style={l === toad.level ? adm.activeBtn : adm.dimBtn}
                onClick={() => adminSave({ level: l, coins: 0, pendingLevelUp: false, lastSpawnTime: null, spinReadyToClaim: true })}>
                Cấp {l}
              </button>
            ))}
          </div>
        </AdmSection>

        <AdmSection title="⚠ Nguy hiểm" danger>
          <div style={adm.row}>
            <button style={adm.dimBtn} onClick={() => { adminSave({ lastResetDate: null, spinsLeft: 0, spinReadyToClaim: true }); showToast("🔄 Đã giả lập reset 00:00"); }}>
              🔄 Giả lập reset 00:00
            </button>
            <button style={adm.redBtn} onClick={() => { if (!confirm("Xóa toàn bộ dữ liệu cóc?")) return; adminSave({ ...DEFAULT_STATE, spinReadyToClaim: true }); }}>
              🗑 Xóa toàn bộ
            </button>
          </div>
        </AdmSection>
      </div>
    </div>
  );
}

function AdmSection({ title, children, danger }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: danger ? "rgba(255,100,100,0.7)" : "rgba(245,230,180,0.4)", fontFamily: "Poppins,sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      {children}
      <div style={{ height: 1, background: "rgba(212,175,55,0.08)", marginTop: 10 }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STYLE OBJECTS
══════════════════════════════════════════════════════ */

const s = {
  root: {
    width: "100vw", height: "100vh", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", fontFamily: "'Exo 2', sans-serif",
  },
  bg: {
    position: "fixed", inset: 0,
    background: "#cc0000 url('bgtet.png') center/cover no-repeat",
    zIndex: -1,
  },
  hud: {
    position: "fixed", top: 12, right: 12,
    display: "flex", alignItems: "center", gap: 8,
    zIndex: 9500,
  },
  hudChip: {
    display: "flex", alignItems: "center", gap: 8,
    background: "linear-gradient(135deg, rgba(26,18,10,0.92), rgba(42,29,10,0.92))",
    border: "1px solid rgba(212,175,55,0.3)",
    borderRadius: 20, padding: "5px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,235,150,0.1)",
  },
  hudIcon: { fontSize: 16, lineHeight: 1 },
  hudTextWrap: { display: "flex", flexDirection: "column", lineHeight: 1 },
  hudVal: { fontSize: 14, fontWeight: 800, fontFamily: "'Poppins',sans-serif" },
  hudLabel: { fontSize: 8, fontWeight: 600, letterSpacing: 1.5, color: "rgba(212,175,55,0.5)", textTransform: "uppercase" },
  hudClaimBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "linear-gradient(135deg, rgba(111,232,122,0.18), rgba(80,200,100,0.12))",
    border: "1px solid rgba(111,232,122,0.4)", borderRadius: 20, padding: "6px 12px",
    cursor: "pointer", whiteSpace: "nowrap",
  },
  hudClaimText: { fontSize: 12, fontWeight: 700, color: "#6FE87A", fontFamily: "'Poppins',sans-serif", letterSpacing: 0.3 },
  hudInfoBtn: {
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(26,18,10,0.85)", border: "1px solid rgba(212,175,55,0.25)",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },
  wrapper: { position: "relative", width: 540, marginTop: 40 },
  wheelBorderWrap: {
    position: "relative", width: 540, height: 540, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
  },
  conicBorder: {
    position: "absolute", inset: 0, borderRadius: "50%",
    background: `conic-gradient(#c8960c 0deg,#ffd700 20deg,#fff8dc 40deg,#c8960c 60deg,
      #8b5e0a 80deg,#ffd700 100deg,#ffe87c 120deg,#c8960c 140deg,#ffd700 160deg,
      #fff8dc 180deg,#c8960c 200deg,#8b5e0a 220deg,#ffd700 240deg,#ffe87c 260deg,
      #c8960c 280deg,#ffd700 300deg,#fff8dc 320deg,#c8960c 340deg,#ffd700 360deg)`,
    animation: "spinBorder 4s linear infinite", zIndex: -1,
  },
  wheel: {
    width: 500, height: 500, borderRadius: "50%",
    position: "relative", overflow: "visible",
    border: "none",
    boxShadow: "0 0 0 3px #c8960c, 0 0 0 5px #ffd700, 0 0 20px rgba(200,150,12,0.6), rgba(0,0,0,0.3) 0px 8px 20px",
    flexShrink: 0,
  },
  innerWheel: {
    width: "100%", height: "100%",
    transition: "transform 6s cubic-bezier(0, .99, .44, .99)",
    position: "relative",
  },
  sec: {
    position: "absolute", width: 0, height: 0,
    borderStyle: "solid", borderWidth: "255px 108px 0",
    borderColor: "#19c transparent transparent",
    transformOrigin: "108px 254px", left: 142, top: -4,
  },
  secNumber: {
    position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)",
    fontSize: 28, fontWeight: "bold", color: "rgba(255,255,255,0.9)",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)", zIndex: 1000001, whiteSpace: "nowrap",
  },
  spinBtn: {
    width: 100, height: 100, position: "absolute",
    top: "50%", left: "50%", marginTop: -50, marginLeft: -50,
    borderRadius: "50%", zIndex: 1000, cursor: "pointer",
    userSelect: "none", overflow: "visible",
    background: "radial-gradient(ellipse at 35% 35%, #ffffff 0%, #d8dde6 40%, #b0b8c8 100%)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.15), 0 0 0 3px rgba(180,190,210,0.5)",
    border: "1.5px solid rgba(150,160,180,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  spinLocked: {
    background: "radial-gradient(ellipse at 35% 35%, #ffcc00 0%, #e8a000 60%, #c07000 100%)",
  },
  spinText: {
    position: "absolute", fontSize: 16, fontWeight: "bold", color: "#5a6070",
    textShadow: "0 1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(0,0,0,0.15)",
    letterSpacing: 2, zIndex: 100000, pointerEvents: "none",
  },
  innerSpin: {
    width: 80, height: 80, position: "absolute",
    top: "50%", left: "50%", marginTop: -40, marginLeft: -40,
    borderRadius: "50%", zIndex: 999,
    boxShadow: "rgba(255,255,255,1) 0px -2px 0px inset, rgba(255,255,255,1) 0px 2px 0px inset, rgba(0,0,0,0.4) 0px 0px 5px",
    background: "radial-gradient(ellipse at 40% 30%, #ffffff 0%, #c8cdd8 60%, #a8b0c0 100%)",
  },
  rainbowArrow: {
    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
    marginBottom: 2, width: 20, height: 20,
    background: "conic-gradient(#ff0000,#ff7700,#ffff00,#00cc00,#0099ff,#8800ff,#ff0000)",
    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    animation: "rainbowSpin 2s linear infinite", zIndex: 100002,
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  },
  shine: {
    width: 500, height: 500, position: "absolute", top: 0, left: 0, borderRadius: "50%",
    background: "radial-gradient(ellipse at center, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
    opacity: 0.1, pointerEvents: "none",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,10,5,0.82)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 100000, overflow: "hidden",
    animation: "overlayReveal 0.5s ease forwards",
  },
  wave1: {
    position: "absolute", borderRadius: "50%", pointerEvents: "none",
    top: "50%", left: "50%", transform: "translate(-50%,-50%)",
    background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)",
    animation: "lightWave1 1.6s cubic-bezier(0.2,0.8,0.4,1) 0.1s forwards",
  },
  wave2: {
    position: "absolute", borderRadius: "50%", pointerEvents: "none",
    top: "50%", left: "50%", transform: "translate(-50%,-50%)",
    background: "radial-gradient(circle, rgba(245,230,180,0.12) 0%, transparent 65%)",
    animation: "lightWave2 2s cubic-bezier(0.2,0.8,0.4,1) 0.35s forwards",
  },
  popup: {
    position: "relative",
    background: "linear-gradient(160deg, #1C1508 0%, #2A1D0A 40%, #1A120A 100%)",
    borderRadius: 24, padding: "44px 40px 36px",
    textAlign: "center", minWidth: 320, maxWidth: 400,
    border: "1px solid rgba(212,175,55,0.45)",
    boxShadow: "0 0 0 1px rgba(245,215,120,0.12), 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,235,150,0.15), inset 0 -1px 0 rgba(0,0,0,0.4)",
    animation: "popupEntrance 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
    overflow: "hidden",
  },
  resultLabel: {
    display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 3.5,
    textTransform: "uppercase", color: "rgba(212,175,55,0.6)", marginBottom: 10,
    fontFamily: "'Poppins',sans-serif",
    animation: "fadeUp 0.5s ease 0.4s both",
  },
  resultNumber: {
    fontSize: 80, fontWeight: 900, lineHeight: 1, marginBottom: 6, letterSpacing: -2,
    background: "linear-gradient(175deg, #FFF8DC 0%, #F5D060 25%, #D4A820 50%, #F5D060 75%, #FFF8DC 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    filter: "drop-shadow(0 2px 12px rgba(212,175,55,0.5))",
    animation: "numberPop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
  },
  resultIcon: {
    fontSize: 15, color: "rgba(245,230,180,0.55)", marginBottom: 28,
    fontWeight: 400, letterSpacing: 1.5, fontFamily: "'Poppins',sans-serif",
    animation: "fadeUp 0.5s ease 0.5s both",
  },
  divider: {
    width: 60, height: 1, margin: "0 auto 24px",
    background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)",
    animation: "fadeUp 0.5s ease 0.55s both",
  },
  closeBtn: {
    position: "relative",
    background: "linear-gradient(135deg, #C8960C 0%, #F5D060 40%, #D4A820 60%, #C8960C 100%)",
    color: "#1A1000", border: "none", padding: "13px 44px", borderRadius: 30,
    fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
    cursor: "pointer", overflow: "hidden",
    boxShadow: "0 4px 20px rgba(200,150,12,0.5), inset 0 1px 0 rgba(255,255,220,0.4), inset 0 -1px 0 rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    animation: "fadeUp 0.5s ease 0.65s both",
    fontFamily: "'Poppins',sans-serif",
  },
  toadToggleBtn: {
    position: "fixed", bottom: 24, right: 24,
    width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(145deg, #2A1D0A, #1C1508)",
    border: "2px solid rgba(212,175,55,0.5)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.1), inset 0 1px 0 rgba(255,235,150,0.15)",
    cursor: "pointer", zIndex: 9000,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 0,
  },
  toadBtnLabel: {
    fontSize: 9, fontWeight: 700, letterSpacing: 1,
    color: "rgba(212,175,55,0.8)", textTransform: "uppercase", marginTop: -2,
    fontFamily: "'Poppins',sans-serif",
  },
  spinCounter: {
    position: "absolute", top: -6, right: -6, minWidth: 22, height: 22,
    borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 800, border: "2px solid #1C1508", fontFamily: "'Poppins',sans-serif",
  },
  spinCounterReady: { background: "linear-gradient(135deg, #6FE87A, #3dc94a)", color: "#0a2d0e", boxShadow: "0 2px 8px rgba(111,232,122,0.6)", animation: "badgePop 0.8s ease-in-out infinite" },
  spinCounterHas:   { background: "linear-gradient(135deg, #C8960C, #F5D060)", color: "#1A1000", boxShadow: "0 2px 8px rgba(200,150,12,0.6)" },
  spinCounterNo:    { background: "#333", color: "#888" },
  toadPanel: { position: "fixed", bottom: 100, right: 16, width: 300, zIndex: 8999 },
  lupPopup: {
    position: "relative",
    background: "linear-gradient(160deg, #1C1508 0%, #2A1D0A 50%, #1A120A 100%)",
    border: "1px solid rgba(212,175,55,0.5)", borderRadius: 26,
    width: "min(460px, calc(100vw - 24px))", padding: "36px 28px 28px",
    textAlign: "center",
    boxShadow: "0 0 0 1px rgba(255,215,0,0.08), 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,235,150,0.15)",
    animation: "lupSlideIn 0.5s cubic-bezier(0.34,1.4,0.64,1) forwards", overflow: "hidden",
  },
  lupTitle: {
    fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 800,
    background: "linear-gradient(135deg, #FFF8DC, #F5D060, #D4A820)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    marginBottom: 6, letterSpacing: -0.3,
  },
  lupSubtitle: {
    fontFamily: "'Poppins',sans-serif", fontSize: 12, color: "rgba(245,230,180,0.45)", marginBottom: 20,
  },
  lupStat: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.12)",
    borderRadius: 12, padding: "10px 8px",
  },
  lupStatLbl: {
    fontSize: 9, fontFamily: "'Poppins',sans-serif", color: "rgba(245,230,180,0.35)",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 6,
  },
  lupBtnUpgrade: {
    width: "100%", padding: 14,
    background: "linear-gradient(135deg, #C8960C 0%, #F5D060 45%, #D4A820 100%)",
    color: "#1A1000", border: "none", borderRadius: 14,
    fontSize: 15, fontWeight: 800, fontFamily: "'Poppins',sans-serif", letterSpacing: 0.5,
    cursor: "pointer", boxShadow: "0 6px 24px rgba(200,150,12,0.5), inset 0 1px 0 rgba(255,255,220,0.4)",
  },
  lupBtnSkip: {
    width: "100%", padding: 10, background: "transparent", color: "rgba(245,230,180,0.3)",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
    fontSize: 11, fontFamily: "'Poppins',sans-serif", cursor: "pointer",
  },
  toast: {
    position: "fixed", bottom: 110, left: "50%", transform: "translateX(-50%)",
    background: "linear-gradient(135deg, rgba(26,18,10,0.97), rgba(42,29,10,0.97))",
    border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20,
    padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#F5E6C8",
    fontFamily: "'Poppins',sans-serif", zIndex: 99999, whiteSpace: "nowrap",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  },
};

const tc = {
  card: {
    background: "linear-gradient(160deg, #1C1508 0%, #2A1D0A 60%, #1A120A 100%)",
    border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "18px 16px 16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,235,150,0.12)",
    fontFamily: "'Poppins',sans-serif", color: "#F5E6C8",
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(212,175,55,0.15)" },
  avatar: { width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, rgba(255,235,150,0.12), rgba(0,0,0,0.4))", border: "1.5px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  name: { fontSize: 15, fontWeight: 700, color: "#F5D060", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" },
  badge: { fontSize: 10, background: "linear-gradient(135deg, #C8960C, #F5D060)", color: "#1A1000", padding: "2px 8px", borderRadius: 10, fontWeight: 700 },
  subtitle: { fontSize: 11, color: "rgba(245,230,180,0.45)", marginTop: 3, lineHeight: 1.4 },
  section: { marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(212,175,55,0.08)" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  label: { fontSize: 12, color: "rgba(245,230,180,0.5)" },
  value: { fontSize: 13, fontWeight: 600, color: "#F5D060" },
  barWrap: { height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden", marginTop: 4 },
  barFill: { height: "100%", background: "linear-gradient(90deg, #C8960C, #F5D060, #FFF8DC)", borderRadius: 3, transition: "width 0.6s cubic-bezier(0.34,1.2,0.64,1)", boxShadow: "0 0 6px rgba(245,208,96,0.5)" },
  spawnInfo: { fontSize: 10, color: "rgba(245,230,180,0.3)", textAlign: "center", marginTop: 4 },
  levelBtn: { border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: "10px 14px", fontSize: 12, fontWeight: 700, cursor: "not-allowed", width: "100%", fontFamily: "'Poppins',sans-serif", background: "rgba(255,255,255,0.06)", color: "rgba(245,230,180,0.7)", opacity: 0.38, marginBottom: 12 },
  levelBtnActive: { background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))", color: "#F5D060", borderColor: "rgba(212,175,55,0.4)", opacity: 1, cursor: "pointer" },
  dot: { width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(212,175,55,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(245,230,180,0.25)", flexShrink: 0 },
  dotDone: { background: "rgba(200,150,12,0.2)", borderColor: "rgba(212,175,55,0.5)", color: "#F5D060" },
  dotActive: { background: "linear-gradient(135deg, #C8960C, #F5D060)", borderColor: "#F5D060", color: "#1A1000", fontWeight: 800, boxShadow: "0 0 10px rgba(245,208,96,0.5)", transform: "scale(1.1)" },
  dotLine: { width: 24, height: 2, background: "rgba(212,175,55,0.12)" },
  dotLineDone: { background: "linear-gradient(90deg, rgba(200,150,12,0.5), rgba(245,208,96,0.4))" },
};

const adm = {
  row: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  btn: { border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
  greenBtn:  { border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", background: "rgba(111,232,122,0.15)", color: "#6FE87A", border: "1px solid rgba(111,232,122,0.3)" },
  goldBtn:   { border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", background: "rgba(212,175,55,0.15)", color: "#F5D060", border: "1px solid rgba(212,175,55,0.3)" },
  redBtn:    { border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", background: "rgba(231,76,60,0.15)", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" },
  dimBtn:    { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", background: "rgba(255,255,255,0.05)", color: "rgba(245,230,180,0.5)" },
  activeBtn: { border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", background: "linear-gradient(135deg, #C8960C, #F5D060)", color: "#1A1000" },
  input: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "'Poppins',sans-serif", color: "#fff", outline: "none", flex: 1, minWidth: 0 },
};
