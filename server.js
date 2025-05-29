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

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
