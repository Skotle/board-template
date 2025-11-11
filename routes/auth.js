const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// 로그인
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = new sqlite3.Database('boards.db');
  db.get('SELECT * FROM users WHERE username=? AND password=?', [username, password], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    if (!row) return res.status(401).json({ error: '로그인 실패' });
    res.json({ success: true, user: row });
  });
});

// 로그아웃
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
