const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, 'scores.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS highscores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    hits INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS for GitHub Pages fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// GET top 10 scores
app.get('/api/scores', (req, res) => {
  const scores = db.prepare('SELECT name, score, hits, created_at FROM highscores ORDER BY score DESC LIMIT 10').all();
  res.json(scores);
});

// POST new score
app.post('/api/scores', (req, res) => {
  const { name, score, hits } = req.body;
  if (!name || typeof score !== 'number' || typeof hits !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const sanitizedName = String(name).slice(0, 16).replace(/[<>]/g, '');
  db.prepare('INSERT INTO highscores (name, score, hits) VALUES (?, ?, ?)').run(sanitizedName, score, hits);
  const scores = db.prepare('SELECT name, score, hits, created_at FROM highscores ORDER BY score DESC LIMIT 10').all();
  res.json(scores);
});

app.listen(PORT, () => {
  console.log(`Big C Drone running on port ${PORT}`);
});
