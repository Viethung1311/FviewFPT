const express = require("express");
const cors    = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const JWT_SECRET = "change_me_to_a_long_random_secret";

// ====== DB ======
const db = new sqlite3.Database("./app.db");

db.serialize(() => {
  // ── Bảng users ──────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar        TEXT DEFAULT NULL,
      created_at    TEXT NOT NULL
    )
  `);
  // Migration: thêm cột avatar nếu DB cũ chưa có
  db.run(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL`, () => {});

  // ── Bảng toad_state (1 row / user) ──────────────────────────────
  //  Lưu toàn bộ toadState dưới dạng JSON blob.
  //  updated_at giúp detect xung đột offline/online.
  db.run(`
    CREATE TABLE IF NOT EXISTS toad_state (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id),
      state_json TEXT    NOT NULL DEFAULT '{}',
      updated_at TEXT    NOT NULL
    )
  `);
});

// ─── DB helpers ───────────────────────────────────────────────────
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ─── Root ─────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("OK - Server is running"));

// ====== REGISTER ======
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    if (password.length < 6)
      return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });

    const exists = await get(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (exists)
      return res.status(409).json({ message: "User hoặc email đã tồn tại" });

    const password_hash = await bcrypt.hash(password, 10);
    const created_at    = new Date().toISOString();

    const result = await run(
      "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
      [username, email, password_hash, created_at]
    );

    // Khởi tạo toad_state mặc định cho user mới
    const defaultState = {
      level: 1,
      coins: 0,
      spinsLeft: 0,
      spinReadyToClaim: true,  // Ngay khi đăng ký có thể nhận spin đầu tiên
      lastSpawnTime: null,
      lastClaimTime: null,
      lastResetDate: null,
      pendingLevelUp: false
    };
    await run(
      "INSERT INTO toad_state (user_id, state_json, updated_at) VALUES (?, ?, ?)",
      [result.lastID, JSON.stringify(defaultState), new Date().toISOString()]
    );

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

// ====== LOGIN ======
app.post("/api/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password)
      return res.status(400).json({ message: "Thiếu dữ liệu" });

    const user = await get(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [usernameOrEmail, usernameOrEmail]
    );
    if (!user)
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Đảm bảo toad_state row tồn tại (user cũ trước khi có feature này)
    const toadRow = await get("SELECT user_id FROM toad_state WHERE user_id = ?", [user.id]);
    if (!toadRow) {
      const defaultState = {
        level: 1, coins: 0, spinsLeft: 0, spinReadyToClaim: true,
        lastSpawnTime: null, lastClaimTime: null, lastResetDate: null, pendingLevelUp: false
      };
      await run(
        "INSERT INTO toad_state (user_id, state_json, updated_at) VALUES (?, ?, ?)",
        [user.id, JSON.stringify(defaultState), new Date().toISOString()]
      );
    }

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        avatar:   user.avatar || null,
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

// ====== MIDDLEWARE AUTH ======
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Thiếu token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ/đã hết hạn" });
  }
}

// ====== GET ME ======
app.get("/api/me", auth, async (req, res) => {
  const user = await get(
    "SELECT id, username, email, avatar, created_at FROM users WHERE id = ?",
    [req.user.userId]
  );
  res.json({ user });
});

// ====== UPDATE AVATAR ======
app.put("/api/me/avatar", auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar)
      return res.status(400).json({ message: "Thiếu trường avatar" });

    await run("UPDATE users SET avatar = ? WHERE id = ?", [avatar, req.user.userId]);

    const user = await get(
      "SELECT id, username, email, avatar, created_at FROM users WHERE id = ?",
      [req.user.userId]
    );
    res.json({ message: "Cập nhật avatar thành công", user });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  SPIN / TOAD STATE APIs
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/spin-state
 * Trả về toadState hiện tại của user từ DB.
 * Client gọi khi load trang hoặc sau khi đăng nhập.
 */
app.get("/api/spin-state", auth, async (req, res) => {
  try {
    const row = await get(
      "SELECT state_json, updated_at FROM toad_state WHERE user_id = ?",
      [req.user.userId]
    );
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy toad state" });
    }
    const state = JSON.parse(row.state_json);
    res.json({ state, updated_at: row.updated_at });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

/**
 * POST /api/spin-state
 * Body: { state: <toadState object> }
 * Lưu toàn bộ toadState lên DB. Client gọi sau mỗi thao tác
 * quan trọng (claim spin, use spin, level up, nhận coin).
 *
 * Chiến lược: last-write-wins với server timestamp.
 * Nếu cần chống gian lận, validate logic tại đây.
 */
app.post("/api/spin-state", auth, async (req, res) => {
  try {
    const { state } = req.body;
    if (!state || typeof state !== "object")
      return res.status(400).json({ message: "Thiếu hoặc sai định dạng state" });

    // Validate cơ bản — chống người dùng tự tăng coin bất thường
    const allowedKeys = [
      "level", "coins", "spinsLeft", "spinReadyToClaim",
      "lastSpawnTime", "lastClaimTime", "lastResetDate", "pendingLevelUp"
    ];
    const sanitized = {};
    allowedKeys.forEach(k => {
      if (k in state) sanitized[k] = state[k];
    });

    // Giới hạn giá trị hợp lý
    sanitized.level     = Math.min(Math.max(parseInt(sanitized.level) || 1, 1), 5);
    sanitized.coins     = Math.max(parseInt(sanitized.coins) || 0, 0);
    sanitized.spinsLeft = Math.max(parseInt(sanitized.spinsLeft) || 0, 0);

    const now = new Date().toISOString();
    await run(
      `INSERT INTO toad_state (user_id, state_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
      [req.user.userId, JSON.stringify(sanitized), now]
    );

    res.json({ message: "Đã lưu toad state", updated_at: now });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

/**
 * POST /api/spin/claim
 * Xử lý server-side khi người dùng bấm "Nhận Spin".
 * Kiểm tra cooldown đã hết chưa, rồi cộng spin theo level.
 * Trả về state mới.
 */
app.post("/api/spin/claim", auth, async (req, res) => {
  try {
    const row = await get(
      "SELECT state_json FROM toad_state WHERE user_id = ?",
      [req.user.userId]
    );
    if (!row) return res.status(404).json({ message: "Không tìm thấy toad state" });

    const TOAD_LEVELS = [
      null,
      { level:1, coinsToNext:5,    spins:1, cooldownMs:3.0 * 3600000 },
      { level:2, coinsToNext:10,   spins:2, cooldownMs:2.5 * 3600000 },
      { level:3, coinsToNext:15,   spins:3, cooldownMs:2.0 * 3600000 },
      { level:4, coinsToNext:20,   spins:4, cooldownMs:1.5 * 3600000 },
      { level:5, coinsToNext:null, spins:5, cooldownMs:1.0 * 3600000 }
    ];

    const state = JSON.parse(row.state_json);
    const cfg   = TOAD_LEVELS[Math.min(Math.max(state.level, 1), 5)];

    // Kiểm tra cooldown (nếu spinReadyToClaim đã true thì bỏ qua)
    if (!state.spinReadyToClaim) {
      const elapsed  = state.lastSpawnTime ? Date.now() - state.lastSpawnTime : cfg.cooldownMs;
      const remaining = cfg.cooldownMs - elapsed;
      if (remaining > 0) {
        return res.status(400).json({
          message: "Chưa hết cooldown",
          remainingMs: remaining
        });
      }
    }

    // Cộng spin
    state.spinsLeft        = cfg.spins;
    state.spinReadyToClaim = false;
    state.lastSpawnTime    = Date.now();
    state.lastClaimTime    = Date.now();

    const now = new Date().toISOString();
    await run(
      "UPDATE toad_state SET state_json = ?, updated_at = ? WHERE user_id = ?",
      [JSON.stringify(state), now, req.user.userId]
    );

    res.json({ message: "Nhận spin thành công", state, updated_at: now });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

/**
 * POST /api/spin/use
 * Trừ 1 spin + cộng coin khi quay.
 * Body: { coinReward: <số coin nhận được>, prizeIndex: <index ô trúng> }
 * Trả về state mới.
 */
app.post("/api/spin/use", auth, async (req, res) => {
  try {
    const { coinReward = 0, prizeIndex = 0 } = req.body;

    const row = await get(
      "SELECT state_json FROM toad_state WHERE user_id = ?",
      [req.user.userId]
    );
    if (!row) return res.status(404).json({ message: "Không tìm thấy toad state" });

    const state = JSON.parse(row.state_json);

    if (state.spinsLeft <= 0)
      return res.status(400).json({ message: "Không còn spin" });

    // Giới hạn coin hợp lệ (tối đa 3 coin / lần quay theo cấu hình prizes)
    const safeCoins = Math.min(Math.max(parseInt(coinReward) || 0, 0), 3);

    state.spinsLeft--;
    state.coins += safeCoins;

    // Kiểm tra level up
    const TOAD_LEVELS = [
      null,
      { coinsToNext:5  },
      { coinsToNext:10 },
      { coinsToNext:15 },
      { coinsToNext:20 },
      { coinsToNext:null }
    ];
    const cfg = TOAD_LEVELS[Math.min(Math.max(state.level, 1), 5)];
    if (state.level < 5 && cfg.coinsToNext && state.coins >= cfg.coinsToNext && !state.pendingLevelUp) {
      state.pendingLevelUp = true;
    }

    const now = new Date().toISOString();
    await run(
      "UPDATE toad_state SET state_json = ?, updated_at = ? WHERE user_id = ?",
      [JSON.stringify(state), now, req.user.userId]
    );

    res.json({
      message: "Quay thành công",
      state,
      coinAdded: safeCoins,
      prizeIndex,
      updated_at: now
    });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

/**
 * POST /api/spin/levelup
 * Xác nhận nâng cấp cóc sau khi người dùng bấm "Nâng Cấp".
 * Trừ coin, tăng level, reset cooldown.
 */
app.post("/api/spin/levelup", auth, async (req, res) => {
  try {
    const row = await get(
      "SELECT state_json FROM toad_state WHERE user_id = ?",
      [req.user.userId]
    );
    if (!row) return res.status(404).json({ message: "Không tìm thấy toad state" });

    const TOAD_LEVELS = [
      null,
      { level:1, coinsToNext:5  },
      { level:2, coinsToNext:10 },
      { level:3, coinsToNext:15 },
      { level:4, coinsToNext:20 },
      { level:5, coinsToNext:null }
    ];

    const state = JSON.parse(row.state_json);

    if (!state.pendingLevelUp)
      return res.status(400).json({ message: "Không có pending level up" });
    if (state.level >= 5)
      return res.status(400).json({ message: "Đã đạt cấp tối đa" });

    const cfg = TOAD_LEVELS[state.level];
    state.coins        -= cfg.coinsToNext;
    state.level++;
    state.pendingLevelUp   = false;
    state.lastSpawnTime    = null;
    state.spinReadyToClaim = true; // Ngay khi lên cấp có thể nhận spin mới

    const now = new Date().toISOString();
    await run(
      "UPDATE toad_state SET state_json = ?, updated_at = ? WHERE user_id = ?",
      [JSON.stringify(state), now, req.user.userId]
    );

    res.json({ message: "Nâng cấp thành công!", state, updated_at: now });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server", error: String(e) });
  }
});

// ─── Start ────────────────────────────────────────────────────────
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});