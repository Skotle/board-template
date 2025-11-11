const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = 80;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// 저장할 폴더 및 파일명 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'uploads');
    // 업로드 폴더 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 유니크한 파일명 생성 (예: timestamp + 원본이름)
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedAudioTypes = /webm|wav|mp3|ogg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedAudioTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 오디오 파일 형식입니다.'));
    }
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 최대 50MB로 확대 (영상용)
  fileFilter: (req, file, cb) => {
    // 허용할 이미지 + 영상 파일 확장자
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');


    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
    }
  }
});

// 라우트: 이미지 여러 개 업로드
app.post('/uploads', (req, res) => {
  upload.array('images', 10)(req, res, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '업로드된 파일이 없습니다.' });
    }
    const urls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
  });
});

app.post('/upload-audio', (req, res) => {
  audioUpload.single('audio')(req, res, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: '오디오 파일이 없습니다.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// 정적파일 서비스 설정 (express.static)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// API
app.get('/boards', (req, res) => {
  const boardId = req.query.name || req.query.id;
  const db = new sqlite3.Database('boards.db');

  if (boardId) {
    db.get(`SELECT 1 FROM boards WHERE id = ?`, [boardId], (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB 오류 발생' });
      res.json({ exists: !!row });
    });
  } else {
    db.all(`SELECT boards.id, boards.name, COUNT(posts.id) AS count
            FROM boards
            LEFT JOIN posts ON posts.board_id = boards.id
            GROUP BY boards.id`, [], (err, rows) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB 오류 발생' });

      res.json(rows.map(r => ({
        id: r.id,
        name: r.name,
        count: r.count
      })));
    });
  }
});

// 별도 존재 여부 API도 DB 기반으로
app.get('/api/checkBoardExists', (req, res) => {
  const boardId = req.query.name || req.query.id;
  if (!boardId) return res.status(400).json({ error: '게시판 id 필요' });

  const db = new sqlite3.Database('boards.db');
  db.get(`SELECT 1 FROM boards WHERE id = ?`, [boardId], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB 오류 발생' });
    res.json({ exists: !!row });
  });
});

// 메인 피드: 모든 게시판에서 특정 조건 만족하는 글 불러오기
app.get('/main/posts', (req, res) => {
  const db = new sqlite3.Database('boards.db');

  // 조건 예시: 추천 10 이상
  const condition = `p.recommend >= 1`;

  db.all(
    `SELECT p.*, b.name AS boardTitle
     FROM posts p
     JOIN boards b ON p.board_id = b.id
     WHERE ${condition}
     ORDER BY RANDOM()
     LIMIT 10`,
    (err, posts) => {
      if (err) {
        db.close();
        return res.status(500).json({ message: 'DB 오류 발생' });
      }
      if (!posts.length) {
        db.close();
        return res.json({ posts: [] });
      }

      const postIds = posts.map(p => p.id);
      const placeholders = postIds.map(() => '?').join(',');

      db.all(
        `SELECT p.id AS post_id, 
                IFNULL(COUNT(c.id),0) + IFNULL(SUM(r.reply_count),0) AS commentCount
         FROM posts p
         LEFT JOIN comments c ON p.id = c.post_id
         LEFT JOIN (
           SELECT comment_id, COUNT(*) AS reply_count
           FROM replies GROUP BY comment_id
         ) r ON c.id = r.comment_id
         WHERE p.id IN (${placeholders})
         GROUP BY p.id`,
        postIds,
        (err, counts) => {
          db.close();
          if (err) return res.status(500).json({ message: '댓글 수 조회 실패' });

          const countMap = {};
          counts.forEach(c => { countMap[c.post_id] = c.commentCount; });

          const resultPosts = posts.map(post => ({
            ...post,
            commentCount: countMap[post.id] || 0,
            images: JSON.parse(post.images || '[]'),
            recommendedIps: JSON.parse(post.recommendedIps || '[]')
          }));

          res.json({ posts: resultPosts });
        }
      );
    }
  );
});

// 게시글 목록 반환(페이지/30마다)
app.get('/board/:boardId/posts', (req, res) => {
  const { boardId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;  // ?page=1
  const limit = 30;
  const offset = (page - 1) * limit;

  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    db.get(`SELECT name FROM boards WHERE id = ?`, [boardId], (err, boardRow) => {
      if (err) return res.status(500).json({ message: 'DB 오류 발생' });
      if (!boardRow) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' });

      const boardTitle = boardRow.name;

      db.get(`SELECT COUNT(*) AS total FROM posts WHERE board_id = ?`, [boardId], (err, countRow) => {
        if (err) return res.status(500).json({ message: 'DB 오류 발생' });
        const totalPosts = countRow.total;

        db.all(
          `SELECT * FROM posts WHERE board_id = ? ORDER BY time DESC LIMIT ? OFFSET ?`,
          [boardId, limit, offset],
          (err, posts) => {
            if (err) return res.status(500).json({ message: 'DB 오류 발생' });

            if (!posts.length) return res.json({ boardTitle, totalPosts, posts: [] });

            const postIds = posts.map(p => p.id);
            const placeholders = postIds.map(() => '?').join(',');

            db.all(
              `SELECT p.id AS post_id, 
                      IFNULL(COUNT(c.id),0) + IFNULL(SUM(r.reply_count),0) AS commentCount
               FROM posts p
               LEFT JOIN comments c ON p.id = c.post_id
               LEFT JOIN (
                 SELECT comment_id, COUNT(*) AS reply_count
                 FROM replies
                 GROUP BY comment_id
               ) r ON c.id = r.comment_id
               WHERE p.id IN (${placeholders})
               GROUP BY p.id`,
              postIds,
              (err, counts) => {
                db.close();
                if (err) return res.status(500).json({ message: '댓글 수 조회 실패' });

                const countMap = {};
                counts.forEach(c => { countMap[c.post_id] = c.commentCount; });

                const resultPosts = posts.map(post => ({
                  ...post,
                  commentCount: countMap[post.id] || 0,
                  images: JSON.parse(post.images || '[]'),
                  recommendedIps: JSON.parse(post.recommendedIps || '[]')
                }));

                res.json({
                  boardTitle,
                  totalPosts,
                  currentPage: page,
                  totalPages: Math.ceil(totalPosts / limit),
                  posts: resultPosts
                });
              }
            );
          }
        );
      });
    });
  });
});
// 새 게시판 추가 API
app.post('/boards', (req, res) => {
  const { name, id } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, message: '게시판 이름을 입력하세요.' });
  }
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ success: false, message: '게시판 아이디를 입력하세요.' });
  }

  const boardName = name.trim();
  const boardId = id.trim();
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 중복 체크
    db.get(`SELECT id FROM boards WHERE id = ?`, [boardId], (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ success: false, message: 'DB 오류 발생' });
      }
      if (row) {
        db.close();
        return res.status(400).json({ success: false, message: '이미 존재하는 게시판 아이디입니다.' });
      }

      // 새 게시판 추가
      db.run(
        `INSERT INTO boards (id, name) VALUES (?, ?)`,
        [boardId, boardName],
        function (err) {
          db.close();
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'DB 삽입 오류' });
          }

          // 기본 카테고리는 API 응답에 포함
          const newBoard = {
            id: boardId,
            name: boardName,
            post_category: { "1": "일반" },
            posts: []
          };

          res.json({ success: true, board: newBoard });
        }
      );
    });
  });
});

// 특정 게시글 불러오기 + 조회수 증가
app.get('/board/:boardName/posts/:id', (req, res) => {
  const { boardName, id } = req.params;
  const db = new sqlite3.Database('boards.db');
  db.serialize(() => {
    // 1. 게시글 조회
    db.get(`SELECT * FROM posts WHERE id = ? AND board_id = ?`, [id, boardName], (err, post) => {
      if (err) {
        db.close();
        return res.status(500).json({ message: 'DB 오류 발생' });
      }
      if (!post) {
        db.close();
        return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
      }

      // 2. 조회수 증가
      const newViews = (post.views || 0) + 1;
      db.run(`UPDATE posts SET views = ? WHERE id = ?`, [newViews, id], (err) => {
        db.close();
        if (err) {
          return res.status(500).json({ message: '조회수 갱신 실패' });
        }

        // 3. 문자열로 저장된 JSON 필드 변환
        post.images = JSON.parse(post.images || '[]');
        post.recommendedIps = JSON.parse(post.recommendedIps || '[]');

        // 4. 최종 반환
        post.views = newViews;
        res.json(post);
      });
    });
  });
});

// 게시글 작성 
app.post('/board/:boardId/posts', upload.array('images'), (req, res) => {
  console.log('POST /board/:boardId/posts 호출됨');

  const { boardId } = req.params;
  const { title, content, author, password, uid, category, ipFront } = req.body;
  console.log('요청 파라미터:', req.params);
  console.log('요청 바디:', req.body);
  console.log('업로드된 파일:', req.files);

  const images = (req.files || []).map(file => `/uploads/${file.filename}`);
  const db = new sqlite3.Database('boards.db', (err) => {
    if (err) {
      console.error('DB 연결 실패:', err);
      return res.status(500).json({ message: 'DB 연결 실패' });
    }
  });

  const time = new Date().toISOString();
  console.log('현재 시간:', time);

  db.serialize(() => {
    // 게시판 존재 여부 확인
    db.get(`SELECT id FROM boards WHERE id = ?`, [boardId], (err, board) => {
      if (err) {
        console.error('게시판 조회 오류:', err);
        db.close();
        return res.status(500).json({ message: 'DB 오류 발생' });
      }
      console.log('조회된 게시판:', board);

      if (!board) {
        db.close();
        return res.status(404).json({ message: '해당 게시판이 존재하지 않습니다.' });
      }

      // 게시글 삽입 (id는 AUTOINCREMENT 컬럼이므로 넣지 않음)
      db.run(
  `INSERT INTO posts 
   (id, board_id, title, content, author, password, usid, category, time, views, recommend, images, ip)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
  [uuidv4(), boardId, title || '', content || '', author || '', password || null, uid || null, category || 'default', time, JSON.stringify(images), ipFront || null],
  function (err) {
    if (err) {
      console.error("게시글 삽입 실패:", err);
      db.close();
      return res.status(500).json({ message: '게시글 등록 실패' });
    }

    res.status(201).json({
      message: '게시글 등록 완료',
      post: {
        id: this.lastID || null,
        board_id: boardId,
        title,
        content,
        author,
        time,
        images
      }
    });
  }
);
    });
  });
});

app.delete('/board/:boardName/posts/:postId', (req, res) => {
  const { boardName, postId } = req.params;
  const { password = "", uid = "", admin = false } = req.body;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 게시글 조회
    db.get(`SELECT * FROM posts WHERE id = ? AND board_id = ?`, [postId, boardName], (err, post) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: "DB 오류 발생" });
      }
      if (!post) {
        db.close();
        return res.status(404).json({ error: "게시글이 존재하지 않습니다." });
      }

      // 삭제 권한 확인
      if (!(admin || (uid && uid === post.usid) || (!post.usid && password && password === post.password))) {
        db.close();
        return res.status(403).json({ error: "삭제 권한이 없습니다." });
      }

      // 댓글 삭제
      db.run(`DELETE FROM comments WHERE post_id = ?`, [postId], function(err) {
        if (err) {
          db.close();
          return res.status(500).json({ error: "댓글 삭제 실패" });
        }

        // 게시글 삭제
        db.run(`DELETE FROM posts WHERE id = ?`, [postId], function(err) {
          db.close();
          if (err) return res.status(500).json({ error: "게시글 삭제 실패" });
          res.json({ message: "게시글 및 댓글이 삭제되었습니다." });
        });
      });
    });
  });
});

app.post('/board/:boardName/posts/:id/comment', (req, res) => {
  const { boardName, id: postId } = req.params;
  const { author, password, content, uid, ip } = req.body;
  const db = new sqlite3.Database('boards.db');
  if (!content || content.trim() === '') {
    return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
  }

  db.serialize(() => {
    db.get(`SELECT id FROM boards WHERE id = ?`, [boardName], (err, board) => {
      if (err) return res.status(500).json({ message: 'DB 오류 발생' });
      if (!board) return res.status(404).json({ message: '게시판이 존재하지 않습니다.' });

      db.get(`SELECT id FROM posts WHERE id = ? AND board_id = ?`, [postId, boardName], (err, post) => {
        if (err) return res.status(500).json({ message: 'DB 오류 발생' });
        if (!post) return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });

        // ID를 문자열로 생성
        const commentId = String(Date.now());

        const time = new Date().toISOString();
        const commentData = {
          id: commentId,
          post_id: postId,
          author: author || '익명',
          password: password || null,
          content,
          usid: uid || null,
          ip: ip || null,
          time
        };

        db.run(
          `INSERT INTO comments (id, post_id, author, password, content, usid, ip, time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [commentData.id, commentData.post_id, commentData.author, commentData.password, commentData.content, commentData.usid, commentData.ip, commentData.time],
          function (err) {
            db.close();
            if (err) return res.status(500).json({ message: '댓글 작성 실패' });
            res.json(commentData);
          }
        );
      });
    });
  });
});

app.post('/board/:boardName/posts/:postId/comment/:commentId/reply', (req, res) => {
  const { boardName, postId, commentId } = req.params;
  const { author, content, password, uid, ip } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: '내용을 입력해주세요.' });
  }

  const isLoggedIn = uid && uid.trim() !== "";

  // 비로그인 시 필수 체크
  if (!isLoggedIn && (!author || !password || !ip)) {
    return res.status(400).json({ message: '비로그인 사용자는 작성자, 비밀번호, IP가 필요합니다.' });
  }

  const db = new sqlite3.Database('boards.db');
  const time = new Date().toISOString();
  const replyId = String(Date.now()); // 유니크한 id 생성

  db.serialize(() => {
    // 댓글 존재 여부 확인
    db.get(
      `SELECT id FROM comments WHERE id = ? AND post_id = ?`,
      [commentId, postId],
      (err, comment) => {
        if (err) {
          db.close();
          console.error("댓글 조회 오류:", err);
          return res.status(500).json({ message: '댓글 조회 실패' });
        }
        if (!comment) {
          db.close();
          return res.status(404).json({ message: '댓글이 존재하지 않습니다.' });
        }

        // 답글 삽입
        db.run(
          `INSERT INTO replies (id, comment_id, author, content, time, password, uid, ip)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            replyId,
            commentId,
            author || '익명',
            content,
            time,
            isLoggedIn ? null : password,
            isLoggedIn ? uid : null,
            isLoggedIn ? null : ip
          ],
          function(err) {
            db.close();
            if (err) {
              console.error("답글 작성 실패:", err);
              return res.status(500).json({ message: '답글 작성 실패' });
            }

            res.json({
              id: replyId,
              comment_id: commentId,
              author: author || '익명',
              content,
              time,
              uid: isLoggedIn ? uid : null,
              ip: isLoggedIn ? null : ip
            });
          }
        );
      }
    );
  });
})

// 댓글 삭제
app.delete('/board/:boardName/posts/:postId/comment/:commentId', (req, res) => {
  const { boardName, postId, commentId } = req.params;
  const { uid = "", password = "" } = req.body;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 댓글 조회
    db.get(
      `SELECT * FROM comments WHERE id = ? AND post_id = ?`,
      [commentId, postId],
      (err, comment) => {
        if (err) {
          db.close();
          return res.status(500).json({ message: "DB 오류 발생" });
        }
        if (!comment) {
          db.close();
          return res.status(404).json({ message: "댓글이 존재하지 않습니다." });
        }

        const isAuthorized = (uid && uid === comment.usid) || (!comment.usid && password === comment.password);
        if (!isAuthorized) {
          db.close();
          return res.status(403).json({ message: "삭제 권한이 없습니다." });
        }

        // 댓글 삭제
        db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function(err) {
          db.close();
          if (err) return res.status(500).json({ message: "삭제 실패" });
          res.sendStatus(200);
        });
      }
    );
  });
});

// 답글 삭제
app.delete('/board/:boardName/posts/:postId/reply/:replyId', (req, res) => {
  const { replyId } = req.params;
  const { uid = "", password = "" } = req.body;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 답글 조회
    db.get(
      `SELECT * FROM replies WHERE id = ?`,
      [replyId],
      (err, reply) => {
        if (err) {
          db.close();
          return res.status(500).json({ message: "DB 오류 발생" });
        }
        if (!reply) {
          db.close();
          return res.status(404).json({ message: "답글이 존재하지 않습니다." });
        }

        const isAuthorized = (uid && uid === reply.uid) || (!reply.uid && password === reply.password);
        if (!isAuthorized) {
          db.close();
          return res.status(403).json({ message: "삭제 권한이 없습니다." });
        }

        // 답글 삭제
        db.run(`DELETE FROM replies WHERE id = ?`, [replyId], function(err) {
          db.close();
          if (err) return res.status(500).json({ message: "삭제 실패" });
          res.sendStatus(200);
        });
      }
    );
  });
});

// 댓글 조회 (단일 게시글)
app.get('/board/:boardName/posts/:id/comments', (req, res) => {
  const { boardName, id: postId } = req.params;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 게시판 존재 여부 확인
    db.get(`SELECT id FROM boards WHERE id = ?`, [boardName], (err, board) => {
      if (err) {
        db.close();
        return res.status(500).json({ message: 'DB 오류 발생' });
      }
      if (!board) {
        db.close();
        return res.status(404).json({ message: '게시판이 존재하지 않습니다.' });
      }

      // 댓글 가져오기
      db.all(`SELECT * FROM comments WHERE post_id = ? ORDER BY time ASC`, [postId], (err, comments) => {
        if (err) {
          db.close();
          return res.status(500).json({ message: '댓글 조회 실패' });
        }

        if (!comments || comments.length === 0) {
          db.close();
          return res.json([]);
        }

        // 댓글마다 답글 가져오기
        let remaining = comments.length;
        comments.forEach(comment => {
          db.all(
            `SELECT * FROM replies WHERE comment_id = ? ORDER BY time ASC`,
            [comment.id],
            (err, replies) => {
              if (err) {
                console.error('답글 조회 실패:', err);
                comment.replies = [];
              } else {
                comment.replies = replies || [];
              }

              remaining--;
              if (remaining === 0) {
                db.close();
                res.json(comments);
              }
            }
          );
        });
      });
    });
  });
});

//추천 요청 
app.post('/board/:boardName/posts/:id/recommend', (req, res) => {
  const { boardName, id: postId } = req.params;
  const { ip } = req.body;
  const db = new sqlite3.Database('boards.db');

  if (!ip) return res.status(400).json({ error: 'IP 주소가 필요합니다.' });

  db.serialize(() => {
    db.get(`SELECT * FROM posts WHERE id = ? AND board_id = ?`, [postId, boardName], (err, post) => {
      if (err) {
        console.error(err);
        db.close();
        return res.status(500).json({ error: '게시글 조회 실패' });
      }
      if (!post) {
        db.close();
        return res.status(404).json({ error: '게시글이 없습니다.' });
      }

      // JSON 컬럼 파싱
      let recommendedIps = [];
      try {
        recommendedIps = JSON.parse(post.recommendedIps || '[]');
      } catch (e) {
        console.error('recommendedIps 파싱 실패', e);
      }

      if (recommendedIps.includes(ip)) {
        db.close();
        return res.status(400).json({ error: '이미 추천했습니다.' });
      }

      // IP 추가 및 recommend 카운트 증가
      recommendedIps.push(ip);
      const newRecommend = (post.recommend || 0) + 1;

      db.run(
        `UPDATE posts SET recommend = ?, recommendedIps = ? WHERE id = ? AND board_id = ?`,
        [newRecommend, JSON.stringify(recommendedIps), postId, boardName],
        function(err) {
          db.close();
          if (err) {
            console.error(err);
            return res.status(500).json({ error: '추천 업데이트 실패' });
          }
          res.json({ message: '추천 완료', recommend: newRecommend });
        }
      );
    });
  });
});

// 로그인 인증
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const cookieParser = require("cookie-parser");

const db = new sqlite3.Database("users.db");

app.use(express.json());
app.use(cookieParser());

// ------------------ 로그인 ------------------
app.post("/login", (req, res) => {
  const { userID, password } = req.body;

  db.get(`SELECT * FROM users WHERE userID = ?`, [userID], async (err, user) => {
    if (err) {
      console.error("DB 오류:", err);
      return res.status(500).json({ success: false, message: "서버 오류" });
    }

    if (!user) return res.status(401).json({ success: false, message: "로그인 실패" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: "로그인 실패" });

    // UUID 토큰 발급
    const accessToken = uuidv4();
    const refreshToken = uuidv4();

    db.run(
      `UPDATE users SET accessToken = ?, refreshToken = ? WHERE userID = ?`,
      [accessToken, refreshToken, userID],
      (err) => {
        if (err) {
          console.error("토큰 저장 실패:", err);
          return res.status(500).json({ success: false, message: "서버 오류" });
        }

        // 쿠키로 토큰 내려주기
        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 1000 // 1시간
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
        });

        res.json({ success: true, username: user.username, userID: user.userID });
      }
    );
  });
});

// ------------------ 로그인 상태 확인 ------------------
app.get("/api/check-login", (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(200).json({ loggedIn: false });

  db.get(`SELECT * FROM users WHERE accessToken = ?`, [token], (err, user) => {
    if (err || !user) return res.status(200).json({ loggedIn: false });

    res.json({
      loggedIn: true,
      username: user.username,
      ID: user.userID,
      authority: user.authority || {}
    });
  });
});

// ------------------ 로그아웃 ------------------
app.post("/logout", (req, res) => {
  const token = req.cookies?.accessToken;

  if (token) {
    db.run(`UPDATE users SET accessToken = NULL, refreshToken = NULL WHERE accessToken = ?`, [token], (err) => {
      if (err) console.error("DB 로그아웃 처리 오류:", err);
    });
  }

  res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax" });
  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax" });
  res.json({ message: "로그아웃 완료" });
});

// ------------------ 토큰 갱신 ------------------
app.post("/update-token", (req, res) => {
  const { userID, accessToken, refreshToken } = req.body;
  if (!userID || !accessToken || !refreshToken) {
    return res.status(400).json({ success: false, message: "필요한 정보가 부족합니다." });
  }

  db.run(
    `UPDATE users SET accessToken = ?, refreshToken = ? WHERE userID = ?`,
    [accessToken, refreshToken, userID],
    function (err) {
      if (err) {
        console.error("토큰 업데이트 실패:", err);
        return res.status(500).json({ success: false, message: "서버 오류" });
      }
      if (this.changes === 0) return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
      res.json({ success: true, message: "토큰이 업데이트되었습니다." });
    }
  );
});

app.get('/api/check-admin', (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  db.get(
    `SELECT authorityAdmin, authorityBoards FROM users WHERE accessToken = ?`,
    [token],
    (err, row) => {
      if (err) {
        console.error("DB 조회 실패:", err);
        return res.status(500).json({ message: "서버 오류" });
      }

      if (!row) {
        return res.status(401).json({ message: "사용자 없음" });
      }

      let boards = [];
      try {
        boards = JSON.parse(row.authorityBoards || '[]');
      } catch {
        boards = [];
      }

      res.json({
        authority: {
          admin: row.authorityAdmin === 1,
          boards
        }
      });
    }
  );
});

app.get("/api/user/:usid/activity", (req, res) => {
  const usid = req.params.usid;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    const result = [];

    // 1️⃣ posts
    db.all(
      `SELECT id, board_id AS parent_id, title AS content, time FROM posts WHERE usid = ?`,
      [usid],
      (err, posts) => {
        if (err) return res.status(500).json({ message: 'DB 오류' });
        posts.forEach(p => result.push({ ...p, type: 'post' }));

        // 2️⃣ comments
        db.all(
          `SELECT id, post_id AS parent_id, content, time FROM comments WHERE usid = ?`,
          [usid],
          (err, comments) => {
            if (err) return res.status(500).json({ message: 'DB 오류' });
            comments.forEach(c => result.push({ ...c, type: 'comment' }));

            // 3️⃣ replies
            db.all(
              `SELECT id, comment_id AS parent_id, content, time FROM replies WHERE uid = ?`,
              [usid],
              (err, replies) => {
                if (err) return res.status(500).json({ message: 'DB 오류' });
                replies.forEach(r => result.push({ ...r, type: 'reply' }));

                // 4️⃣ 게시판 정보 가져오기
                db.all(`SELECT id, name FROM boards`, (err, boards) => {
                  if (err) return res.status(500).json({ message: '게시판 조회 오류' });

                  // 5️⃣ profileImage 가져오기 (profiles DB)
                  const profileDB = new sqlite3.Database('profile.db');
                  profileDB.get(
                    `SELECT profileImage, profileImg FROM profiles WHERE userID = ?`,
                    [usid],
                    (err, profile) => {
                      profileDB.close();
                      if (err) return res.status(500).json({ message: '프로필 조회 오류' });

                      // 6️⃣ 시간 내림차순 정렬 후 반환
                      result.sort((a,b) => new Date(b.time) - new Date(a.time));

                      res.json({
                        activity: result,
                        boards: boards.map(b => ({ id: b.id, name: b.name })),
                        profileImage: profile ? profile.profileImage : null,
                        profileImg: profile ? profile.profileImg : null
                      });
                    }
                  );
                });
              }
            );
          }
        );
      }
    );
  });
});

app.post('/api/check-profile-edit', (req, res) => {
  const profileId = req.body.profileId;
  const token = req.cookies?.accessToken; // 쿠키에서 토큰 읽기

  if (!token || !profileId) {
    return res.status(400).json({ message: "쿠키 또는 profileId가 없습니다." });
  }

  db.get(
    `SELECT userID FROM users WHERE accessToken = ?`,
    [token],
    (err, row) => {
      if (err) {
        console.error("DB 조회 실패:", err);
        return res.status(500).json({ message: "서버 오류" });
      }

      if (!row) {
        return res.status(401).json({ message: "사용자 없음" });
      }

      // 현재 사용자 ID와 요청한 프로필 ID가 같으면 true
      const canEdit = row.userID === profileId;

      res.json({ canEdit });
    }
  );
});

const uploads = multer({ storage });

app.put('/api/profile/:userId', uploads.single('profileImage'), (req, res) => {
  const userId = req.params.userId;
  const token = req.cookies?.accessToken;
  const { statusMessage, bio } = req.body;
  const file = req.file;

  console.log(`[API] PUT /api/profile/${userId} 호출됨`);
  console.log(`[INFO] 요청 본문:`, req.body);
  console.log(`[INFO] 쿠키:`, req.cookies);
  console.log(`[INFO] 읽어온 accessToken:`, token);
  console.log(`[INFO] 업로드 파일:`, file);

  if (!token) return res.status(401).json({ message: "로그인 필요" });

  db.get(`SELECT userID, authorityAdmin FROM users WHERE accessToken = ?`, [token], (err, user) => {
    if (err || !user) return res.status(500).json({ message: "사용자 확인 실패" });
    console.log(`[SUCCESS] 사용자 확인:`, user.userID);

    let profileImgPath = null;

    // 1️⃣ 이미지 파일이 업로드된 경우만 저장 처리
    if (file) {
      const imgDir = path.join(__dirname, 'public', 'uploads');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

      const destPath = path.join(imgDir, `${userId}.png`);

      if (fs.existsSync(destPath)) fs.unlinkSync(destPath); // 기존 파일 삭제
      fs.renameSync(file.path, destPath); // 새 파일 저장

      profileImgPath = `/uploads/${userId}.png`;
    }

    // 2️⃣ 파일 업로드 여부에 따라 쿼리 분리
    if (profileImgPath) {
      profileDB.run(
        `UPDATE profiles SET statusMessage = ?, bio = ?, profileImage = ? WHERE userID = ?`,
        [statusMessage || '', bio || '', profileImgPath, userId],
        function (err) {
          if (err) {
            console.error(`[DB ERROR] 프로필 업데이트 실패:`, err);
            return res.status(500).json({ message: "업데이트 실패" });
          }
          console.log(`[SUCCESS] 프로필 수정 완료 (이미지 포함): ${userId}`);
          res.json({ message: "프로필 수정 완료", profileImage: profileImgPath });
        }
      );
    } else {
      profileDB.run(
        `UPDATE profiles SET statusMessage = ?, bio = ? WHERE userID = ?`,
        [statusMessage || '', bio || '', userId],
        function (err) {
          if (err) {
            console.error(`[DB ERROR] 프로필 업데이트 실패:`, err);
            return res.status(500).json({ message: "업데이트 실패" });
          }
          console.log(`[SUCCESS] 프로필 수정 완료 (텍스트만): ${userId}`);
          res.json({ message: "프로필 수정 완료 (텍스트만)" });
        }
      );
    }
  });
});

app.get('/api/check-duplicate', (req, res) => {
  const { field, value } = req.query;
  if (!field || !value) {
    return res.status(400).json({ message: '필드와 값을 모두 전달해야 합니다.' });
  }

  const validFields = ['userID', 'username', 'email'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ message: '유효하지 않은 필드입니다.' });
  }

  const sql = `SELECT 1 FROM users WHERE LOWER(${field}) = LOWER(?) LIMIT 1`;
  db.get(sql, [value], (err, row) => {
    if (err) {
      console.error('DB 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    res.json({ isDuplicate: !!row });
  });
});

const fetch = require('node-fetch');

app.post('/api/verify-captcha', async (req, res) => {
  const { token } = req.body; // 클라이언트가 보낸 captchaResponse

  const secretKey = '6LcQdZ4rAAAAAKZe7zbqdRANCzneIDgV9cy4Ag8i'; // 구글에서 받은 비밀키

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: 'POST' }
    );

    const data = await response.json();

    if (data.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: '캡차 인증 실패' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.delete('/board/:boardId', (req, res) => {
  const { boardId } = req.params;
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json({ message: '로그인 필요' });

  const db = new sqlite3.Database('boards.db');
  const userDb = new sqlite3.Database('users.db');

  // 관리자 권한 확인
  userDb.get(`SELECT authorityAdmin FROM users WHERE accessToken = ?`, [token], (err, user) => {
    if (err || !user) {
      userDb.close();
      return res.status(401).json({ message: '사용자 확인 실패' });
    }
    if (user.authorityAdmin !== 1) {
      userDb.close();
      return res.status(403).json({ message: '관리자 권한 필요' });
    }

    db.get(`SELECT id FROM boards WHERE id = ?`, [boardId], (err, board) => {
      if (err) return res.status(500).json({ message: 'DB 오류 발생' });
      if (!board) return res.status(404).json({ message: '삭제할 게시판이 없습니다.' });

      // 모든 사용자 권한 업데이트
      userDb.all(`SELECT userID, authorityAdmin, authorityBoards FROM users`, [], (err, users) => {
        if (err) {
          userDb.close();
          return res.status(500).json({ message: '사용자 조회 오류' });
        }

        const updateTasks = users.map(user => {
          if (user.authorityAdmin === 1) return Promise.resolve(); // admin은 그대로
          let boards = [];
          try { boards = JSON.parse(user.authorityBoards || '[]'); } catch {}
          boards = boards.filter(id => id !== boardId);

          return new Promise((resolve, reject) => {
            userDb.run(
              `UPDATE users SET authorityBoards = ? WHERE userID = ?`,
              [JSON.stringify(boards), user.userID],
              err => err ? reject(err) : resolve()
            );
          });
        });

        Promise.all(updateTasks)
          .then(() => {
            // 게시판과 게시글 삭제
            db.run(`DELETE FROM posts WHERE board_id = ?`, [boardId], err => {
              if (err) return res.status(500).json({ message: '게시글 삭제 실패' });

              db.run(`DELETE FROM boards WHERE id = ?`, [boardId], err => {
                userDb.close();
                db.close();
                if (err) return res.status(500).json({ message: '게시판 삭제 실패' });

                res.json({ message: `게시판 '${boardId}' 삭제 완료, 권한도 제거됨` });
              });
            });
          })
          .catch(err => {
            userDb.close();
            db.close();
            res.status(500).json({ message: '사용자 권한 업데이트 실패' });
          });
      });
    });
  });
});

app.delete('/board/:boardId/posts', (req, res) => {
  const { boardId } = req.params;
  const db = new sqlite3.Database('boards.db');

  db.serialize(() => {
    // 게시판 존재 여부 확인
    db.get(`SELECT id FROM boards WHERE id = ?`, [boardId], (err, board) => {
      if (err) {
        db.close();
        return res.status(500).json({ message: 'DB 오류 발생' });
      }
      if (!board) {
        db.close();
        return res.status(404).json({ message: '해당 게시판이 존재하지 않습니다.' });
      }

      // 게시판 내 모든 글 삭제
      db.run(`DELETE FROM posts WHERE board_id = ?`, [boardId], function(err) {
        db.close();
        if (err) {
          console.error("게시글 삭제 실패:", err);
          return res.status(500).json({ message: '게시글 삭제 실패' });
        }

        res.json({ message: `"${boardId}" 게시판의 모든 글이 삭제되었습니다.`, deletedCount: this.changes });
      });
    });
  });
});

const nodemailer = require('nodemailer');
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ao0rjdjur7xj@gmail.com',
    pass: 'tlan dsxl ijji uwmw' // 실제 앱 비밀번호
  },tls: {
  rejectUnauthorized: false
}
});

const verificationStore = {}; // { email: { code, expiresAt } }

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.get('/api/check-email', (req, res) => {
  const emailToCheck = req.query.email;
  if (!emailToCheck) {
    return res.status(400).json({ message: '이메일 파라미터가 필요합니다.' });
  }

  db.get(`SELECT userID FROM users WHERE email = ?`, [emailToCheck], (err, row) => {
    if (err) {
      console.error('DB 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }

    res.json({ isDuplicate: !!row });
  });
});

app.post('/send-code', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: '이메일이 필요합니다.' });
  }

  // DB에서 이메일 중복 체크
  db.get(`SELECT userID FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) {
      console.error('DB 조회 오류:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    if (row) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다. 다른 이메일을 입력하세요.' });
    }

    // 중복 아니면 인증번호 생성 및 저장
    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    verificationStore[email] = { code, expiresAt };

    const mailOptions = {
      from: 'ao0rjdjur7xj@gmail.com',
      to: email,
      subject: '[irisen25.com] 이메일 인증번호',
      html: `<p>인증번호는 <strong>${code}</strong> 입니다. 5분간 유효합니다.</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('메일 전송 오류:', error);
        return res.status(500).json({ message: '메일 전송 실패' });
      }
      res.json({ message: '인증번호가 발송되었습니다.' });
    });
  });
});

app.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  const record = verificationStore[email];

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ message: '인증번호가 만료되었습니다.' });
  }

  if (record.code !== code) {
    return res.status(400).json({ message: '인증번호가 일치하지 않습니다.' });
  }

  delete verificationStore[email]; // 한 번 사용하면 제거
  res.json({ message: '인증 성공' });
});

app.post('/add-user', async (req, res) => {
  const { userID, username, password, email } = req.body;

  if (!userID || !username || !password || !email) {
    return res.status(400).json({ message: '필수 입력값이 누락되었습니다.' });
  }

  // 중복 확인
  db.get(
    `SELECT userID FROM users WHERE userID = ? OR username = ?`,
    [userID, username],
    async (err, row) => {
      if (err) {
        console.error('DB 오류:', err);
        return res.status(500).json({ message: '서버 오류' });
      }

      if (row) {
        return res.status(400).json({ message: '중복된 userID 또는 username입니다.' });
      }

      try {
        // 비밀번호 해시화
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // DB에 저장
        db.run(
          `INSERT INTO users (userID, username, passwordHash, email, authorityAdmin, authorityBoards) VALUES (?, ?, ?, ?, ?, ?)`,
          [userID, username, passwordHash, email, 0, JSON.stringify([])],
          function (err) {
            if (err) {
              console.error('유저 추가 오류:', err);
              return res.status(500).json({ message: '유저 추가 실패' });
            }

            res.json({ success: true, message: '유저가 추가되었습니다.', userID });
          }
        );
      } catch (hashErr) {
        console.error('비밀번호 해시 오류:', hashErr);
        res.status(500).json({ message: '서버 오류' });
      }
    }
  );
});

// 게시판 이름 수정 API (DB 기반)
app.put('/board/:boardId', (req, res) => {
  const { boardId } = req.params;
  const { newBoardName } = req.body;
  const token = req.cookies?.accessToken; // 쿠키 기반 인증
  const db = new sqlite3.Database('boards.db');

  if (!newBoardName || typeof newBoardName !== 'string') {
    return res.status(400).json({ message: '새 게시판 이름을 올바르게 입력하세요.' });
  }
  if (!token) {
    return res.status(401).json({ message: '로그인 필요' });
  }

  db.serialize(() => {
    db.get(`SELECT * FROM boards WHERE id = ?`, [boardId], (err, board) => {
      if (err) return res.status(500).json({ message: 'DB 오류 발생' });
      if (!board) return res.status(404).json({ message: '기존 게시판이 없습니다.' });

      db.get(`SELECT * FROM boards WHERE name = ?`, [newBoardName], (err, conflict) => {
        if (err) return res.status(500).json({ message: 'DB 오류 발생' });
        if (conflict) return res.status(409).json({ message: '새 게시판 이름이 이미 존재합니다.' });

        const userDb = new sqlite3.Database('users.db');
        userDb.get(`SELECT * FROM users WHERE accessToken = ?`, [token], (err, user) => {
          if (err || !user) {
            userDb.close();
            return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
          }

          // 권한 갱신
          let updatedAuthority;
          try {
            updatedAuthority = JSON.parse(user.authorityBoards || '[]');
            updatedAuthority.forEach(auth => {
              if (auth.boardId === boardId) auth.boardName = newBoardName;
            });
          } catch (e) {
            updatedAuthority = [];
          }

          // 게시판 이름 DB 업데이트
          db.run(`UPDATE boards SET name = ? WHERE id = ?`, [newBoardName, boardId], function (err) {
            if (err) {
              userDb.close();
              return res.status(500).json({ message: '게시판 이름 변경 실패' });
            }

            // 사용자 권한 업데이트
            userDb.run(
              `UPDATE users SET authorityBoards = ? WHERE id = ?`,
              [JSON.stringify(updatedAuthority), user.id],
              function (err) {
                userDb.close();
                if (err) return res.status(500).json({ message: '권한 업데이트 실패' });

                res.json({
                  message: `게시판 이름이 '${boardId}'에서 '${newBoardName}'(으)로 변경되었습니다.`,
                  authority: updatedAuthority
                });
              }
            );
          });
        });
      });
    });
  });
});

app.post('/board/grant-permission', (req, res) => {
  const { userId, boardName } = req.body;
  const token = req.cookies?.accessToken;
  if (!userId || !boardName || !token) {
    return res.status(400).json({ message: '필요한 정보가 누락되었습니다.' });
  }

  const db = new sqlite3.Database('users.db');
  const boardsDb = new sqlite3.Database('boards.db');

  // 1. 관리자 권한 확인
  db.get(`SELECT authorityAdmin FROM users WHERE accessToken = ?`, [token], (err, adminUser) => {
    if (err || !adminUser) return res.status(403).json({ message: '관리자 확인 실패' });
    if (adminUser.authorityAdmin !== 1) return res.status(403).json({ message: '관리자 권한 필요' });

    // 2. 게시판 존재 여부 확인
    boardsDb.get(`SELECT id FROM boards WHERE id = ?`, [boardName], (err, board) => {
      if (err) return res.status(500).json({ message: '게시판 조회 실패' });
      if (!board) return res.status(404).json({ message: `'${boardName}' 게시판이 존재하지 않습니다.` });

      // 3. 사용자 조회
      db.get(`SELECT authorityAdmin, authorityBoards FROM users WHERE userID = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ message: '사용자 조회 실패' });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

        let boards = [];
        try { boards = JSON.parse(user.authorityBoards || '[]'); } catch { boards = []; }

        // 4. 권한 중복 방지
        if (user.authorityAdmin !== 1 && !boards.includes(boardName)) boards.push(boardName);

        // 5. DB 업데이트
        db.run(`UPDATE users SET authorityBoards = ? WHERE userID = ?`, [JSON.stringify(boards), userId], err => {
          if (err) return res.status(500).json({ message: '권한 업데이트 실패' });
          return res.json({ message: `${userId}님에게 '${boardName}' 게시판 권한이 부여되었습니다.` });
        });
      });
    });
  });
});

app.post('/board/revoke-permission', (req, res) => {
  const { userId, boardName, adminToken } = req.body;
  if (!userId || !boardName || !adminToken) {
    return res.status(400).json({ message: '필요한 정보가 누락되었습니다.' });
  }

  // 관리자 토큰으로 관리자 유저 조회
  db.get(`SELECT userID, authorityAdmin FROM users WHERE accessToken = ?`, [adminToken], (err, adminUser) => {
    if (err) {
      console.error('DB 조회 실패:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    if (!adminUser || adminUser.authorityAdmin !== 1) {
      return res.status(403).json({ message: '관리자 권한이 없습니다.' });
    }

    // 권한 회수 대상 사용자 조회
    db.get(`SELECT userID, authorityAdmin, authorityBoards FROM users WHERE userID = ?`, [userId], (err, user) => {
      if (err) {
        console.error('사용자 조회 실패:', err);
        return res.status(500).json({ message: '서버 오류' });
      }
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      if (user.authorityAdmin === 1) {
        return res.status(400).json({ message: '관리자 권한은 삭제할 수 없습니다.' });
      }

      let boards = [];
      try {
        boards = JSON.parse(user.authorityBoards || '[]');
      } catch {
        boards = [];
      }

      // boardName 권한 삭제
      boards = boards.filter(b => b !== boardName);

      // DB 업데이트
      db.run(`UPDATE users SET authorityBoards = ? WHERE userID = ?`, [JSON.stringify(boards), userId], function (err) {
        if (err) {
          console.error('권한 업데이트 실패:', err);
          return res.status(500).json({ message: '서버 오류' });
        }

        return res.json({ message: `${userId}님의 '${boardName}' 게시판 권한이 삭제되었습니다.` });
      });
    });
  });
});

app.post('/board/revoke-all-permissions', (req, res) => {
  const { userId, adminToken } = req.body;
  if (!userId || !adminToken) {
    return res.status(400).json({ message: '필요한 정보가 누락되었습니다.' });
  }

  // 관리자 토큰으로 관리자 권한 확인
  db.get(`SELECT userID, authorityAdmin FROM users WHERE accessToken = ?`, [adminToken], (err, adminUser) => {
    if (err) {
      console.error('DB 조회 실패:', err);
      return res.status(500).json({ message: '서버 오류' });
    }
    if (!adminUser || adminUser.authorityAdmin !== 1) {
      return res.status(403).json({ message: '관리자 권한이 없습니다.' });
    }

    // 권한 삭제 대상 사용자 조회
    db.get(`SELECT userID, authorityAdmin FROM users WHERE userID = ?`, [userId], (err, user) => {
      if (err) {
        console.error('사용자 조회 실패:', err);
        return res.status(500).json({ message: '서버 오류' });
      }
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      if (user.authorityAdmin === 1) {
        return res.status(400).json({ message: '관리자 권한 사용자는 권한을 삭제할 수 없습니다.' });
      }

      // 모든 게시판 권한 삭제(빈 배열 저장)
      db.run(`UPDATE users SET authorityBoards = ? WHERE userID = ?`, [JSON.stringify([]), userId], function(err) {
        if (err) {
          console.error('권한 삭제 실패:', err);
          return res.status(500).json({ message: '서버 오류' });
        }

        return res.json({ message: `${userId}님의 모든 게시판 권한이 삭제되었습니다.` });
      });
    });
  });
});

const profileDB = new sqlite3.Database("profile.db");

// 사용자 프로필 조회 API
app.get("/api/profile/:userID", (req, res) => {
  const { userID } = req.params;

  profileDB.get(
    "SELECT * FROM profiles WHERE userID = ?",
    [userID],
    (err, row) => {
      if (err) {
        console.error("프로필 조회 오류:", err);
        return res.status(500).json({ error: "DB 오류" });
      }
      if (!row) {
        return res.status(404).json({ error: "사용자 없음" });
      }

      // 불필요한 컬럼 제거하고 프로필만 내려주기
      const profileData = {
        userID: row.userID,
        username: row.username,
        profileImg: row.profileImage,
        bio: row.bio,
        statusMessage: row.statusMessage,
        joinDate: row.joinDate,
        lastLogin: row.lastLogin,
        postCount: row.postCount,
        commentCount: row.commentCount,
        likeCount: row.likeCount
        
      };

      res.json(profileData);
    }
  );
});

const http = require('http');
const https = require('https');

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const HOSTNAME = '0.0.0.0';

app.listen(PORT,HOSTNAME, () => {
  console.log(`http://localhost:${PORT} 서버 실행 중`);
 });


// const options = {
//    key: fs.readFileSync('/etc/letsencrypt/live/irisen25.com/privkey.pem'),
//    cert: fs.readFileSync('/etc/letsencrypt/live/irisen25.com/fullchain.pem'),
// };

// app.get('/', (req, res) => {
//   res.send('✅ HTTPS 서버가 정상 작동 중입니다.');
// });

// //HTTPS 서버 시작
// https.createServer(options, app).listen(HTTPS_PORT, HOSTNAME, () => {
//   console.log(`✅ HTTPS 서버 실행 중: https://irisen25.com`);
// });

// // HTTP → HTTPS 리디렉션
// http.createServer((req, res) => {
//   res.writeHead(301, {
//     Location: 'https://' + req.headers.host + req.url
//   });
//   res.end();
// }).listen(HTTP_PORT, HOSTNAME, () => {
//   console.log(`➡️  HTTP 요청을 HTTPS로 리디렉션 중: https://irisen25.com`);
// });
// db.run(`ALTER TABLE users ADD COLUMN email TEXT;`, (err) => {
//   if (err) {
//     if (err.message.includes('duplicate column name')) {
//       console.log('email 컬럼이 이미 존재합니다.');
//     } else {
//       console.error('email 컬럼 추가 실패:', err);
//     }
//   } else {
//     console.log('email 컬럼이 성공적으로 추가되었습니다.');
//   }
// });
