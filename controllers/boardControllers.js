const sqlite3 = require("sqlite3").verbose();

exports.getBoards = (req, res) => {
  const db = new sqlite3.Database('boards.db');
  db.all(`SELECT * FROM boards`, [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류' });
    res.json(rows);
  });
};

exports.createBoard = (req, res) => {
  const { name, id } = req.body;
  if (!name || !id) return res.status(400).json({ error: 'name/id 필요' });

  const db = new sqlite3.Database('boards.db');
  db.run(`INSERT INTO boards (id, name) VALUES (?, ?)`, [id, name], function(err){
    db.close();
    if (err) return res.status(500).json({ error: 'DB 삽입 실패' });
    res.json({ success: true, board: { id, name } });
  });
};
