const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 1. 한국어 날짜 → ISO 8601 변환 함수
function parseKoreanDate(koreanTime) {
  if (!koreanTime) return new Date().toISOString();

  // "2025. 8. 10. 오전 11:50:24"
  const match = koreanTime.match(/(\d+)\.\s*(\d+)\.\s*(\d+)\.\s*(오전|오후)\s*(\d+:\d+:\d+)/);
  if (!match) return new Date().toISOString();

  let [_, year, month, day, ampm, time] = match;
  year = parseInt(year);
  month = parseInt(month);
  day = parseInt(day);

  let [hours, minutes, seconds] = time.split(':').map(Number);
  if (ampm === '오후' && hours < 12) hours += 12;
  if (ampm === '오전' && hours === 12) hours = 0;

  const dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
  return dateObj.toISOString();
}

// 2. JSON 파일 읽기
const rawData = fs.readFileSync('posts.json', 'utf8');
const boards = JSON.parse(rawData);

// 3. SQLite DB 연결
const db = new sqlite3.Database('boards.db');

db.serialize(() => {
  // 게시판 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT
    )
  `);

  // 게시물 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      board_id TEXT,
      title TEXT,
      content TEXT,
      author TEXT,
      category TEXT,
      time TEXT,
      views INTEGER,
      recommend INTEGER,
      images TEXT,
      ip TEXT,
      password TEXT,
      usid TEXT,
      recommendedIps TEXT,
      FOREIGN KEY(board_id) REFERENCES boards(id)
    )
  `);

  // 댓글 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author TEXT,
      content TEXT,
      time TEXT,
      password TEXT,
      usid TEXT,
      ip TEXT,
      FOREIGN KEY(post_id) REFERENCES posts(id)
    )
  `);

  // 대댓글 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      comment_id TEXT,
      author TEXT,
      content TEXT,
      time TEXT,
      password TEXT,
      uid TEXT,
      ip TEXT,
      FOREIGN KEY(comment_id) REFERENCES comments(id)
    )
  `);

  // 삽입 준비
  const insertBoard = db.prepare("INSERT OR IGNORE INTO boards (id, name) VALUES (?, ?)");
  const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts
    (id, board_id, title, content, author, category, time, views, recommend, images, ip, password, usid, recommendedIps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments
    (id, post_id, author, content, time, password, usid, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertReply = db.prepare(`
    INSERT OR IGNORE INTO replies
    (id, comment_id, author, content, time, password, uid, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // JSON → DB 삽입
  boards.forEach(board => {
    insertBoard.run(board.id, board.name);

    (board.posts || []).forEach(post => {
      insertPost.run(
        post.id,
        board.id,
        post.title,
        post.content,
        post.author,
        post.category,
        parseKoreanDate(post.time),
        post.views || 0,
        post.recommend || 0,
        JSON.stringify(post.images || []),
        post.ip || '',
        post.password || '',
        post.usid || '',
        JSON.stringify(post.recommendedIps || [])
      );

      // 댓글
      (post.comments || []).forEach(comment => {
        insertComment.run(
          comment.id,
          post.id,
          comment.author,
          comment.content,
          parseKoreanDate(comment.time),
          comment.password || '',
          comment.usid || '',
          comment.ip || ''
        );

        // 대댓글
        (comment.replies || []).forEach(reply => {
          insertReply.run(
            reply.id,
            comment.id,
            reply.author,
            reply.content,
            parseKoreanDate(reply.time),
            reply.password || '',
            reply.uid || '',
            reply.ip || ''
          );
        });
      });
    });
  });

  insertBoard.finalize();
  insertPost.finalize();
  insertComment.finalize();
  insertReply.finalize();
});

db.close(() => {
  console.log("JSON 데이터가 SQLite DB로 모두 옮겨졌습니다.");
});
