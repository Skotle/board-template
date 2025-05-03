const id = new URLSearchParams(location.search).get('id');

fetch(`/posts/${id}`)
  .then(res => res.json())
  .then(post => {
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postAuthor').textContent = post.author;
    document.getElementById('postTime').textContent = post.time;
    document.getElementById('postContent').textContent = post.content;
    if (post.image) {
      document.getElementById('postImage').src = post.image;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.delete-button').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.dataset.id;
        const password = prompt('게시글을 삭제하려면 비밀번호를 입력하세요:');
  
        if (!password) return;
  
        try {
          const res = await fetch(`/delete/${postId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
          });
  
          if (res.ok) {
            alert('삭제되었습니다.');
          } else {
            alert('비밀번호가 틀렸습니다.');
          }
        } catch (err) {
          alert('삭제 중 오류 발생');
        }
      });
    });
  });
  
