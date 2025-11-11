const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  const secretKey = 'YOUR_RECAPTCHA_SECRET';

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: 'POST' }
    );
    const data = await response.json();
    res.json({ success: data.success });
  } catch (err) {
    res.status(500).json({ error: '캡차 검증 실패' });
  }
});

module.exports = router;
