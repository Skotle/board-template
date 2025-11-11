const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("profile.db");

db.serialize(() => {
  // statusMessage
  db.run(`ALTER TABLE profiles ADD COLUMN statusMessage TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("컬럼 추가 오류(statusMessage):", err.message);
    } else {
      console.log("✅ statusMessage 컬럼 준비 완료");
    }
  });

  // bio
  db.run(`ALTER TABLE profiles ADD COLUMN bio TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("컬럼 추가 오류(bio):", err.message);
    } else {
      console.log("✅ bio 컬럼 준비 완료");
    }
  });

  // profileImage
  db.run(`ALTER TABLE profiles ADD COLUMN profileImage TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("컬럼 추가 오류(profileImage):", err.message);
    } else {
      console.log("✅ profileImage 컬럼 준비 완료");
    }
  });

  // joinDate
  db.run(`ALTER TABLE profiles ADD COLUMN joinDate TEXT DEFAULT ''`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("컬럼 추가 오류(joinDate):", err.message);
    } else {
      console.log("✅ joinDate 컬럼 준비 완료");

      // 기존 레코드에 오늘 날짜 채우기
      db.run(`UPDATE profiles SET joinDate = DATE('now') WHERE joinDate = ''`, function (err) {
        if (err) console.error("기본값 업데이트 오류:", err.message);
        else console.log(`✅ ${this.changes}개의 레코드 joinDate 채움`);
        db.close();
      });
    }
  });
});
