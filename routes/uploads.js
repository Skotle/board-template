const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerConfig');

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

module.exports = router;
