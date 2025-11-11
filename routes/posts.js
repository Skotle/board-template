const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// 게시글 목록 조회
router.get('/:boardId', (req, res) => {
  const db = new sqlite3.Database('boards.db');
  db.all('SELECT * FROM posts WHERE board_id=?', [req.params.boardId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json(rows);
  });
});

// 게시글 작성
router.post('/:boardId', (req, res) => {
  const { title, content, author } = req.body;
  const boardId = req.params.boardId;
  const db = new sqlite3.Database('boards.db');
  db.run(
    'INSERT INTO posts (board_id, title, content, author) VALUES (?, ?, ?, ?)',
    [boardId, title, content, author],
    function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'DB 오류' });
      res.json({ success: true, postId: this.lastID });
    }
  );
});

module.exports = router;
