const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// 게시판 목록 조회
router.get('/', (req, res) => {
  const db = new sqlite3.Database('boards.db');
  db.all('SELECT * FROM boards', [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json(rows);
  });
});

// 게시판 추가
router.post('/', (req, res) => {
  const { id, name } = req.body;
  const db = new sqlite3.Database('boards.db');
  db.run('INSERT INTO boards (id, name) VALUES (?, ?)', [id, name], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json({ success: true, board: { id, name } });
  });
});

module.exports = router;
