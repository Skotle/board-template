const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// users DB
const userDB = new sqlite3.Database('users.db', (err) => {
  if (err) {
    console.error('users DB 연결 실패:', err.message);
    process.exit(1);
  }
});

// profiles DB
const profileDB = new sqlite3.Database('profile.db', (err) => {
  if (err) {
    console.error('profile DB 연결 실패:', err.message);
    process.exit(1);
  }
});

rl.question('권한을 관리할 userID를 입력하세요: ', (userID) => {
  if (!userID.trim()) {
    console.error('❌ userID를 입력하지 않았습니다.');
    rl.close();
    userDB.close();
    profileDB.close();
    return;
  }

  userDB.get(`SELECT userID, authorityAdmin, authorityBoards FROM users WHERE userID = ?`, [userID], (err, row) => {
    if (err) {
      console.error('쿼리 실행 실패:', err.message);
      rl.close();
      userDB.close();
      profileDB.close();
      return;
    }
    if (!row) {
      console.log(`⚠️ '${userID}' 사용자 정보를 찾을 수 없습니다.`);
      rl.close();
      userDB.close();
      profileDB.close();
      return;
    }

    let boards;
    try {
      boards = JSON.parse(row.authorityBoards || '[]');
    } catch {
      boards = [];
    }

    console.log(`\n현재 권한 상태:
    - 관리자 권한(authorityAdmin): ${row.authorityAdmin}
    - 게시판 권한(authorityBoards): ${boards.length > 0 ? boards.join(', ') : '(없음)'}`);

    console.log("\n권한 관리 옵션:");
    console.log("1. 관리자 권한 추가");
    console.log("2. 관리자 권한 제거");
    console.log("3. 게시판 권한 추가");
    console.log("4. 게시판 권한 제거");
    console.log("5. 사용자 삭제");
    console.log("6. 취소");

    rl.question('번호를 선택하세요: ', (choice) => {
      // 관리자 권한 추가
      if (choice === '1') {
        userDB.run(`UPDATE users SET authorityAdmin = 1 WHERE userID = ?`, [userID], function (err) {
          if (err) console.error('쿼리 실행 실패:', err.message);
          else console.log(`✅ '${userID}'의 관리자 권한이 부여되었습니다.`);
          rl.close();
          userDB.close();
          profileDB.close();
        });

      // 관리자 권한 제거
      } else if (choice === '2') {
        userDB.run(`UPDATE users SET authorityAdmin = 0 WHERE userID = ?`, [userID], function (err) {
          if (err) console.error('쿼리 실행 실패:', err.message);
          else console.log(`✅ '${userID}'의 관리자 권한이 제거되었습니다.`);
          rl.close();
          userDB.close();
          profileDB.close();
        });

      // 게시판 권한 추가
      } else if (choice === '3') {
        rl.question('추가할 게시판 ID를 입력하세요: ', (boardID) => {
          if (!boardID.trim()) {
            console.error('❌ 게시판 ID를 입력하지 않았습니다.');
            rl.close();
            userDB.close();
            profileDB.close();
            return;
          }
          if (!boards.includes(boardID)) boards.push(boardID);
          userDB.run(`UPDATE users SET authorityBoards = ? WHERE userID = ?`, [JSON.stringify(boards), userID], function (err) {
            if (err) console.error('쿼리 실행 실패:', err.message);
            else console.log(`✅ '${userID}'에게 '${boardID}' 게시판 권한이 부여되었습니다.`);
            rl.close();
            userDB.close();
            profileDB.close();
          });
        });

      // 게시판 권한 제거
      } else if (choice === '4') {
        rl.question('제거할 게시판 ID를 입력하세요: ', (boardID) => {
          if (!boardID.trim()) {
            console.error('❌ 게시판 ID를 입력하지 않았습니다.');
            rl.close();
            userDB.close();
            profileDB.close();
            return;
          }
          boards = boards.filter(b => b !== boardID);
          userDB.run(`UPDATE users SET authorityBoards = ? WHERE userID = ?`, [JSON.stringify(boards), userID], function (err) {
            if (err) console.error('쿼리 실행 실패:', err.message);
            else console.log(`✅ '${userID}'의 '${boardID}' 게시판 권한이 제거되었습니다.`);
            rl.close();
            userDB.close();
            profileDB.close();
          });
        });

      // 사용자 삭제
      } else if (choice === '5') {
        rl.question(`정말 '${userID}'를 삭제하시겠습니까? (y/N): `, (confirm) => {
          if (confirm.toLowerCase() !== 'y') {
            console.log('삭제가 취소되었습니다.');
            rl.close();
            userDB.close();
            profileDB.close();
            return;
          }

          // users DB에서 삭제
          userDB.run(`DELETE FROM users WHERE userID = ?`, [userID], function (err) {
            if (err) {
              console.error('사용자 삭제 실패:', err.message);
              rl.close();
              userDB.close();
              profileDB.close();
              return;
            }

            // profile DB에서 삭제
            profileDB.run(`DELETE FROM profiles WHERE userID = ?`, [userID], function (pErr) {
              if (pErr) console.error('프로필 삭제 실패:', pErr.message);
              else console.log(`✅ '${userID}'와 프로필 정보가 모두 삭제되었습니다.`);
              rl.close();
              userDB.close();
              profileDB.close();
            });
          });
        });

      // 취소
      } else {
        console.log('작업이 취소되었습니다.');
        rl.close();
        userDB.close();
        profileDB.close();
      }
    });
  });
});

userDB.on('error', (err) => {
  console.error('DB 오류 발생:', err.message);
});
