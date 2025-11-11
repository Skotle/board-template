// server.js
const express = require("express");
const app = express();
const port = 3000;

// API 경로에서 HTML 전송
app.get("/page", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>API에서 HTML 전송 예시</title>
      <style>
        body { font-family: sans-serif; background: #f9f9f9; padding: 20px; }
        h1 { color: #333; }
        .box { padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}
      </style>
    </head>
    <body>
      <h1>서버 API에서 직접 전송된 HTML</h1>
      <div class="box">
        <p>이 페이지는 <code>/page</code> API에서 직접 내려왔습니다.</p>
        <p>날짜: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
