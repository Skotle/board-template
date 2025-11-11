const fs = require('fs');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

// 1. JSON 파일 읽기
const usersJson = JSON.parse(fs.readFileSync('user-info.json', 'utf-8'));

// 2. SQLite 연결
const db = new sqlite3.Database('users.db');

db.serialize(async () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userID TEXT UNIQUE,
      username TEXT,
      passwordHash TEXT,
      authorityAdmin INTEGER DEFAULT 0,
      authorityBoards TEXT DEFAULT '[]',
      refreshToken TEXT
    )
  `);

  for (const user of usersJson) {
    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(user.password, 10);

    // authority 처리
    const isAdmin = user.authority?.admin ? 1 : 0;
    const boards = JSON.stringify(user.authority?.boards || []);

    // DB 저장
    db.run(
      `INSERT OR IGNORE INTO users (userID, username, passwordHash, authorityAdmin, authorityBoards, refreshToken)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.userID, user.username, passwordHash, isAdmin, boards, user.refreshToken || null],
      (err) => {
        if (err) console.error(`❌ ${user.userID} 저장 실패:`, err);
        else console.log(`✅ ${user.userID} 저장 완료`);
      }
    );
  }
});
