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
    image: req.file ? `/uploads/${req.file.filename}` : null,
    time: new Date().toLocaleString()
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
  const { id } = req.params;
  const { password } = req.body;

  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const index = posts.findIndex(p => p.id === id);
  console.log(req.body);
  console.log(req.params);
  if (index === -1) return res.status(404).send('게시글 없음');

  if (posts[index].password !== password) {
    return res.status(403).send('비밀번호 불일치');
  }

  posts.splice(index, 1);
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});


app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
