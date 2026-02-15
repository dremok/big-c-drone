const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'scores.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();
  try {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } catch {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS highscores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    hits INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/api/scores', (req, res) => {
  const rows = db.exec('SELECT name, score, hits, created_at FROM highscores ORDER BY score DESC LIMIT 10');
  const scores = rows.length ? rows[0].values.map(r => ({ name: r[0], score: r[1], hits: r[2], created_at: r[3] })) : [];
  res.json(scores);
});

app.post('/api/scores', (req, res) => {
  const { name, score, hits } = req.body;
  if (!name || typeof score !== 'number' || typeof hits !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const sanitizedName = String(name).slice(0, 16).replace(/[<>]/g, '');
  db.run('INSERT INTO highscores (name, score, hits) VALUES (?, ?, ?)', [sanitizedName, score, hits]);
  saveDB();
  const rows = db.exec('SELECT name, score, hits, created_at FROM highscores ORDER BY score DESC LIMIT 10');
  const scores = rows.length ? rows[0].values.map(r => ({ name: r[0], score: r[1], hits: r[2], created_at: r[3] })) : [];
  res.json(scores);
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Big C Drone running on port ${PORT}`);
  });
});
