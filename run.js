const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const boardsRoutes = require('./routes/boards');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const uploadsRoutes = require('./routes/uploads');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const captchaRoutes = require('./routes/captcha');

const app = express();
const PORT = 80;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트
app.use('/api/boards', boardsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/captcha', captchaRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
