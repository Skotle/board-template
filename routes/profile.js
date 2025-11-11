const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// 프로필 조회
router.get('/:userId', (req, res) => {
  const db = new sqlite3.Database('boards.db');
  db.get('SELECT * FROM profile WHERE user_id=?', [req.params.userId], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json(row);
  });
});

module.exports = router;
