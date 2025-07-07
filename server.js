const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

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
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const id = uuidv4();
  const newPost = {
    id,
    author: req.body.author,
    title: req.body.title,
    content: req.body.content,
    password: req.body.password,
    category: req.body.category,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    time: new Date().toLocaleString(),
    id_check: req.body.sign,  // uid 또는 false 저장됨
  };
  posts.push(newPost);
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});

// 개별 글 가져오기
app.get('/posts/:id', (req, res) => {
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === req.params.id);
  if (post) res.json(post);
  else res.sendStatus(404);
});

// 게시물 삭제
app.post('/delete/:id', (req, res) => {
  let posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const index = posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.sendStatus(404);

  const post = posts[index];
  const { uid, password } = req.body;

  const isOwner = post.id_check && uid && post.id_check === uid;
  const isPasswordValid = post.password === password;

  if (isOwner || isPasswordValid) {
    posts.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
    res.sendStatus(200);
  } else {
    res.sendStatus(403); // 권한 없음
  }
});



// 댓글 폼 [[[중요]]]
app.post('/posts/:id/comment', (req, res) => {
  const { id } = req.params;
  const { author, content, password = "", uid = "" } = req.body;
  const time = new Date().toLocaleString('ko-KR');

  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const post = posts.find(p => p.id === id);

  if (!post) return res.status(404).send("게시글이 존재하지 않습니다.");
  if (!post.comments) post.comments = [];
  const commentIds = post.comments.map(comment => comment.id);
  const comment = {
    id: uuidv4(),
    author,
    content,
    time,
    password,
    uid,
  };

  post.comments.push(comment);

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
    signID: user.uid  // uid 반환 (고유 식별자)
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


app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
