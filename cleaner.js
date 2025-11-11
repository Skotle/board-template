const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('boards.db');

// posts 테이블에서 id가 NULL 또는 빈 값 제거
db.run(`DELETE FROM posts WHERE id IS NULL OR id = ''`, function (err) {
  if (err) return console.error("posts 삭제 에러:", err.message);
  console.log(`posts 테이블에서 ${this.changes}개 레코드 삭제됨`);
});

// comments 테이블에서 id가 NULL 또는 빈 값 제거
db.run(`DELETE FROM comments WHERE id IS NULL OR id = ''`, function (err) {
  if (err) return console.error("comments 삭제 에러:", err.message);
  console.log(`comments 테이블에서 ${this.changes}개 레코드 삭제됨`);
});

db.close();
