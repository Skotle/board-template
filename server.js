const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 80;

const upload = multer({
  dest: 'uploads/',
  limits: {
    fieldSize: 10 * 1024 * 1024, // 각 필드 최대 크기 (예: 10MB)
    fileSize: 5 * 1024 * 1024,   // 파일 하나당 최대 크기 (예: 5MB)
    files: 10,                   // 최대 파일 개수
    fields: 20                  // 최대 필드 개수
  }
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

const DATA_FILE = 'posts.json';

// 게시물 불러오기
app.get('/posts', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  res.json(posts);
});


// 게시물 작성
app.post('/posts', upload.single('image'), (req, res) => {
  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('게시글 파일 읽기 실패:', err);
    return res.status(500).send('서버 오류');
  }

  const id = uuidv4();

  // 기본 newPost 객체
  const newPost = {
    id,
    author: req.body.author,
    title: req.body.title,
    content: req.body.content,
    password: req.body.password,
    category: req.body.category,
    images: req.files && req.files.length > 0
  ? req.files.map(file => `/uploads/${file.filename}`)
  : [],
    time: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    view: 0
  };

  // sign, nosign 조건에 따른 필드 처리
  if (req.body.sign) {
    newPost.usid = req.body.sign;
  } else if (req.body.nosign) {
    newPost.ip = req.body.nosign;
    // usid는 아예 넣지 않음
  }

  posts.push(newPost);

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  } catch (err) {
    console.error('게시글 파일 저장 실패:', err);
    return res.status(500).send('서버 오류');
  }

  res.status(201).json({ id });
});



//이미지 처리
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const uploadMulti = multer({ storage }).array('images', 10);  // 최대 10개

app.post('/upload-images', uploadMulti, (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: '파일 없음' });
  }

  const urls = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ urls });
});



// 개별 글 가져오기
app.get('/posts/:id', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const postIndex = posts.findIndex(p => p.id === req.params.id);

  if (postIndex === -1) {
    return res.sendStatus(404);
  }

  // 조회수 초기화 및 증가
  if (!posts[postIndex].views) {
    posts[postIndex].views = 0;
  }
  posts[postIndex].views += 1;

  // 파일에 수정된 게시물 저장
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));

  res.json(posts[postIndex]);
});


// 게시물 삭제
app.delete('/posts/:id', (req, res) => {
  const { id } = req.params;
  const { uid, password } = req.body;

  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('파일 읽기 실패:', err);
    return res.status(500).send('서버 에러');
  }

  const index = posts.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).send('게시글을 찾을 수 없습니다.');
  }

  const post = posts[index];

  // 로그인한 유저가 본인의 글을 삭제하는 경우
  if (post.usid && uid && post.usid === uid) {
    posts.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
    return res.sendStatus(200);
  }

  // 비로그인 글 또는 다른 유저의 글일 경우 비밀번호 확인
  if (!post.usid && password && post.password === password) {
    posts.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
    return res.sendStatus(200);
  }

  // 권한 없음
  return res.status(403).send('삭제 권한이 없습니다.');
});





// 댓글 폼 [[[중요]]]
app.post('/posts/:id/comment', (req, res) => {
  const { id } = req.params;
  const { author, content, password = "", uid = "", ip: ipFromClient } = req.body;
  const time = new Date().toLocaleString('ko-KR');

  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === id);

  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");
  if (!post.comments) post.comments = [];

  // 기본 댓글 객체
  const comment = {
    id: uuidv4(),
    author,
    content,
    time,
    password,
    uid
  };

  // ip 값이 존재하고 공백이 아니면 포함
  if (ipFromClient && ipFromClient.trim() !== '') {
    comment.ip = ipFromClient.trim();
  }

  post.comments.push(comment);

  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});

//답글 작성
app.post('/posts/:postId/comment/:commentId/reply', (req, res) => {
  const { postId, commentId } = req.params;
  const { author = "", content, password = "", uid = "", ip: ipFromClient = "" } = req.body;
  const time = new Date().toLocaleString('ko-KR');
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");

  if (!post.comments) post.comments = [];

  const parentComment = post.comments.find(c => c.id === commentId);
  if (!parentComment) return res.status(404).send("부모 댓글이 존재하지 않습니다.");

  if (!parentComment.replies) parentComment.replies = [];

  // 로그인 여부 확인
  const isLoggedIn = uid && uid !== "";

  // 비로그인일 때 필수 입력값 검사
  if (!isLoggedIn && (!author || !password || !ipFromClient)) {
    return res.status(400).send("작성자, 비밀번호, IP가 필요합니다.");
  }

  const reply = {
    id: uuidv4(),
    author,  // 클라이언트가 보내는 실제 사용자명
    content,
    time,
    password: isLoggedIn ? "" : password,
    uid: isLoggedIn ? uid : "",
  };


  if (!isLoggedIn) {
    reply.ip = ipFromClient;
  }

  parentComment.replies.push(reply);

  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});

//답글 삭제
app.delete('/posts/:postId/reply/:replyId', (req, res) => {
  const { postId, replyId } = req.params;
  const { uid = "", password = "" } = req.body;
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");

  if (!post.comments) return res.status(404).send("댓글이 존재하지 않습니다.");

  // 답글을 포함하는 댓글과 답글 인덱스 찾기
  let parentComment = null;
  let replyIndex = -1;

  for (const comment of post.comments) {
    if (!comment.replies) continue;
    replyIndex = comment.replies.findIndex(r => r.id === replyId);
    if (replyIndex !== -1) {
      parentComment = comment;
      break;
    }
  }

  if (!parentComment || replyIndex === -1) {
    return res.status(404).send("답글이 존재하지 않습니다.");
  }

  const reply = parentComment.replies[replyIndex];
  // uid가 있고, uid가 답글의 uid와 같으면 비밀번호 없이 삭제 허용
  if (uid && uid === reply.uid) {
    // 권한 확인 통과 → 삭제
    parentComment.replies.splice(replyIndex, 1);
  } else {
    // uid가 다르거나 없으면 비밀번호 검증 필요
    if (!password) {
      return res.status(400).send("비밀번호가 필요합니다.");
    }
    if (password !== reply.password) {
      return res.status(403).send("비밀번호가 틀립니다.");
    }
    // 비밀번호가 맞으면 삭제
    parentComment.replies.splice(replyIndex, 1);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});





// 댓글 조회(단일형)
app.get('/posts/:id/comments', (req, res) => {
  const { id } = req.params;
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === id);

  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");

  res.json(post.comments || []);

});




//댓글 삭제 처리
app.post('/posts/:postId/comment/:commentId/delete', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const { postId, commentId } = req.params;
  const { uid, password } = req.body;

  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).send("게시글을 찾을 수 없습니다.");

  const commentIndex = post.comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) return res.status(404).send("댓글을 찾을 수 없습니다.");

  const comment = post.comments[commentIndex];
  const isOwner = comment.uid && uid && comment.uid === uid;
  const isPasswordValid = comment.password && comment.password === password;

  if (isOwner || isPasswordValid) {
    post.comments.splice(commentIndex, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
    res.sendStatus(200);
  } else {
    res.status(403).send("권한이 없습니다.");
  }
});


app.delete('/posts/:postId/comment/:commentId', (req, res) => {
  const { postId, commentId } = req.params;
  const { uid, password = "" } = req.body;

  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");

  const commentIndex = post.comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).send("댓글이 존재하지 않습니다.");
  }

  const comment = post.comments[commentIndex];

  // ✅ 삭제 조건: (회원이면 uid가 일치) || (비회원이면 비밀번호가 일치)
  const isAuthorized = (uid && uid === comment.uid) || (!comment.uid && password === comment.password);

  if (!isAuthorized) {
    return res.status(403).send("삭제 권한이 없습니다.");
  }

  post.comments.splice(commentIndex, 1); // 댓글 삭제
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});







// 로그인 처리
app.post('/login', (req, res) => {
  const { userID, password } = req.body;
  const users = JSON.parse(fs.readFileSync('user-info.json', 'utf-8'));
  const user = users.find(u => u.userID === userID);

  if (!user) {
    return res.status(401).json({ message: '존재하지 않는 아이디입니다.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
  }

  const accessToken = uuidv4();
  const refreshToken = uuidv4();

  res.json({
    accessToken,
    refreshToken,
    username: user.username,
    signID: user.userID  // uid 반환 (고유 식별자)
  });
});

const filePath = path.join(__dirname, 'user-info.json');

app.use(express.json());
app.use(express.static('public')); // 클라이언트 파일 위치

app.get('/users', (req, res) => {
  const data = fs.readFileSync(filePath, 'utf8');
  res.json(JSON.parse(data));
});

app.post('/add-user', (req, res) => {
  const { userID, username, password, email } = req.body;

  let users = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const isDuplicate = users.some(u => u.userID === userID || u.username === username);
  if (isDuplicate) {
    return res.status(400).json({ message: '중복된 userID 또는 username입니다.' });
  }

  const newUser = { userID, username, password };
  users.push(newUser);

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  res.json({ message: '사용자가 추가되었습니다.', user: newUser });
});

const hostname = '0.0.0.0';

app.listen(PORT, hostname,() => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});