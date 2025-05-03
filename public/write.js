document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);  // 모든 name 속성 있는 필드 자동 포함

    try {
      const res = await fetch('/posts', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('게시글이 작성되었습니다.');
        window.location.href = '/';
      } else {
        alert('작성 실패');
      }
    } catch (err) {
      console.error('오류 발생:', err);
      alert('서버 오류');
    }
  });
});
