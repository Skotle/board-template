const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('boards.db');

db.serialize(() => {
  console.log("=== SQLite DB 내부 구조 확인 ===");

  // 모든 테이블 이름 조회
  db.all(`SELECT name, type FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) return console.error("테이블 조회 실패:", err);

    console.log("테이블 목록:");
    tables.forEach(t => console.log(`- ${t.name} (${t.type})`));

    let remaining = tables.length; // 테이블별 PRAGMA 처리 카운트

    tables.forEach(t => {
      db.all(`PRAGMA table_info(${t.name})`, (err, columns) => {
        if (err) return console.error(`컬럼 조회 실패 (${t.name}):`, err);

        console.log(`\n[${t.name}] 컬럼 정보:`);
        columns.forEach(col => {
          console.log(`- ${col.name} | type: ${col.type} | notnull: ${col.notnull} | default: ${col.dflt_value} | pk: ${col.pk}`);
        });

        remaining--;
        if (remaining === 0) {
          db.close(); // 모든 테이블 컬럼 확인 끝나면 닫기
        }
      });
    });

    if (tables.length === 0) db.close();
  });
});
