const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = 3000;

const POSTS_FILE = path.join(__dirname, 'posts.json');

// 파일 업로드 설정
const upload = multer({ dest: 'uploads/' });

let posts = [];
if (fs.existsSync(POSTS_FILE)) {
  posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 고유 ID 생성 함수
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 글 작성 (이미지+비밀번호 포함)
app.post('/posts', upload.single('image'), (req, res) => {
  const { content, author, password } = req.body;
  if (!content || !author || !password) return res.status(400).send("작성자, 내용, 비밀번호를 모두 입력하세요.");

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }

  const post = {
    id: generateId(),
    author,
    content,
    password, // 비밀번호 저장 (※ 실제 서비스에서는 암호화 필요)
    timestamp: new Date().toISOString(),
    imageUrl
  };

  posts.push(post);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  res.sendStatus(200);
});

// 글 목록 가져오기
app.get('/posts', (req, res) => {
  const postsWithoutPassword = posts.map(post => {
    const { password, ...rest } = post;
    return rest;
  });
  res.json(postsWithoutPassword);
});

// 글 삭제
app.delete('/posts/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const postIndex = posts.findIndex(post => post.id === id);
  if (postIndex === -1) return res.status(404).send("글을 찾을 수 없습니다.");

  if (posts[postIndex].password !== password) {
    return res.status(403).send("비밀번호가 일치하지 않습니다.");
  }

  // 이미지 삭제
  if (posts[postIndex].imageUrl) {
    const imgPath = path.join(__dirname, posts[postIndex].imageUrl);
    if (fs.existsSync(imgPath)) {
      fs.unlinkSync(imgPath);
    }
  }

  posts.splice(postIndex, 1);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
