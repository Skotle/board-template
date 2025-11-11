const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('boards.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    return console.error('DB 연결 실패:', err);
  }
  console.log('DB 연결 성공');
});

// 테이블 목록 조회
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
  if (err) {
    console.error('테이블 조회 실패:', err);
    return db.close();
  }

  tables.forEach(table => {
    const tableName = table.name;
    console.log(`\n=== 테이블: ${tableName} ===`);

    // 각 테이블의 모든 데이터 출력
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`테이블 ${tableName} 데이터 조회 실패:`, err);
        return;
      }
      if (rows.length === 0) {
        console.log('(데이터 없음)');
      } else {
        rows.forEach(row => console.log(row));
      }
    });
  });
});

// DB 닫기
db.close((err) => {
  if (err) console.error('DB 닫기 오류:', err);
  else console.log('DB 닫기 완료');
});
