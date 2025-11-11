const fs = require('fs');

const postsPath = './posts.json';

let data = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

data.forEach(board => {
  board.posts.forEach(post => {
    post.category = "1";  // 무조건 숫자 "1"로 변경
  });
});

fs.writeFileSync(postsPath, JSON.stringify(data, null, 2), 'utf8');

console.log('모든 게시글 category를 "1"로 변경 완료');
