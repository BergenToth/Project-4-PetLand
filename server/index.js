/**
 * Beginner Express + MySQL API.
 * Uses cookie sessions (simpler than JWT).
 */

import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10
});

app.use(express.json());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
      // secure: true  // enable if using HTTPS in production
    }
  })
);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

app.get("/api/health", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  res.json({ user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post("/api/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  const confirmPassword = req.body.confirmPassword || "";
  const acceptedTerms = !!req.body.acceptedTerms;

  if (!username) return res.status(400).json({ error: "Username required" });
  if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username can use letters/numbers/_" });

  if (!password) return res.status(400).json({ error: "Password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 chars" });
  if (!/[0-9]/.test(password)) return res.status(400).json({ error: "Password must contain a number" });

  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
  if (!acceptedTerms) return res.status(400).json({ error: "You must accept the terms" });

  try {
    const [existing] = await pool.execute("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (existing.length > 0) return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, passwordHash]
    );

    const user = { id: Number(result.insertId), username };
    req.session.user = user;

    res.status(201).json({ user });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";

  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  try {
    const [rows] = await pool.execute(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (rows.length === 0) return res.status(401).json({ error: "Invalid username or password" });

    const userRow = rows[0];
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    const user = { id: Number(userRow.id), username: userRow.username };
    req.session.user = user;

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id, name FROM categories ORDER BY sort_order ASC, name ASC");
    res.json({
      categories: rows.map((r) => ({ id: Number(r.id), name: r.name }))
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/questions", async (req, res) => {
  const categoryId = Number(req.query.categoryId);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return res.status(400).json({ error: "categoryId is required" });
  }

  try {
    const [rows] = await pool.execute(
      `
      SELECT q.id, q.title, q.body, q.created_at, u.username
      FROM questions q
      JOIN users u ON u.id = q.user_id
      WHERE q.category_id = ?
      ORDER BY q.created_at DESC
      `,
      [categoryId]
    );

    res.json({
      questions: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        username: r.username
      }))
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/questions", requireLogin, async (req, res) => {
  const categoryId = Number(req.body.categoryId);
  const title = (req.body.title || "").trim();
  const body = (req.body.body || "").trim();

  if (!Number.isFinite(categoryId) || categoryId <= 0) return res.status(400).json({ error: "categoryId is required" });
  if (title.length < 3) return res.status(400).json({ error: "Title must be at least 3 chars" });
  if (body.length < 3) return res.status(400).json({ error: "Body must be at least 3 chars" });

  try {
    const [result] = await pool.execute(
      "INSERT INTO questions (category_id, user_id, title, body) VALUES (?, ?, ?, ?)",
      [categoryId, req.session.user.id, title, body]
    );

    res.status(201).json({ id: Number(result.insertId) });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/questions/:id", async (req, res) => {
  const questionId = Number(req.params.id);
  if (!Number.isFinite(questionId) || questionId <= 0) return res.status(400).json({ error: "Invalid id" });

  try {
    const [qRows] = await pool.execute(
      `
      SELECT q.id, q.title, q.body, q.created_at, q.category_id, u.username
      FROM questions q
      JOIN users u ON u.id = q.user_id
      WHERE q.id = ?
      LIMIT 1
      `,
      [questionId]
    );

    if (qRows.length === 0) return res.status(404).json({ error: "Not found" });

    const q = qRows[0];

    const [aRows] = await pool.execute(
      `
      SELECT a.id, a.body, a.created_at, u.username
      FROM answers a
      JOIN users u ON u.id = a.user_id
      WHERE a.question_id = ?
      ORDER BY a.created_at ASC
      `,
      [questionId]
    );

    res.json({
      question: {
        id: Number(q.id),
        categoryId: Number(q.category_id),
        title: q.title,
        body: q.body,
        createdAt: q.created_at,
        username: q.username,
        answers: aRows.map((r) => ({
          id: Number(r.id),
          body: r.body,
          createdAt: r.created_at,
          username: r.username
        }))
      }
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/questions/:id/answers", requireLogin, async (req, res) => {
  const questionId = Number(req.params.id);
  const body = (req.body.body || "").trim();

  if (!Number.isFinite(questionId) || questionId <= 0) return res.status(400).json({ error: "Invalid id" });
  if (!body) return res.status(400).json({ error: "Answer body required" });

  try {
    const [result] = await pool.execute(
      "INSERT INTO answers (question_id, user_id, body) VALUES (?, ?, ?)",
      [questionId, req.session.user.id, body]
    );

    res.status(201).json({ id: Number(result.insertId) });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
