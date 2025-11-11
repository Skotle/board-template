const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// 댓글 목록 조회
router.get('/:postId', (req, res) => {
  const db = new sqlite3.Database('boards.db');
  db.all('SELECT * FROM comments WHERE post_id=?', [req.params.postId], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json(rows);
  });
});

// 댓글 작성
router.post('/:postId', (req, res) => {
  const { content, author } = req.body;
  const postId = req.params.postId;
  const db = new sqlite3.Database('boards.db');
  db.run(
    'INSERT INTO comments (post_id, content, author) VALUES (?, ?, ?)',
    [postId, content, author],
    function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'DB 오류' });
      res.json({ success: true, commentId: this.lastID });
    }
  );
});

module.exports = router;
