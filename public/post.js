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

    const deleteForm = document.getElementById("deleteForm");
    deleteForm.style.display = "none"; // 기본 숨김
    const loggedInUser = localStorage.getItem("username");

    if (post.id_check === loggedInUser) {
      // 본인이 작성한 로그인 글 → 비밀번호 없이 삭제 가능
      deleteForm.dataset.authDelete = "true"; // 플래그 저장
      deleteForm.style.display = "inline-block";
    } else if (post.id_check === "false") {
      // 비로그인 글 → 비밀번호 필요
      deleteForm.dataset.authDelete = "false";
      deleteForm.style.display = "inline-block";
    }
  })
  .catch(err => {
    console.error("게시글 로딩 실패:", err);
    alert("게시글을 불러오는 데 실패했습니다.");
  });

document.getElementById('deleteForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const isAuthDelete = e.target.dataset.authDelete === "true";

  let bodyData = {};
  if (!isAuthDelete) {
    const password = prompt("비밀번호 입력:");
    if (password === null || password.trim() === "") {
      alert("비밀번호를 입력해야 삭제할 수 있습니다.");
      return;
    }
    bodyData.password = password;
  }

  try {
    const res = await fetch(`/delete/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    if (res.ok) {
      alert('삭제 완료');
      window.location.href = 'index.html';
    } else {
      const errorMsg = await res.text();
      alert('삭제 실패: ' + errorMsg);
    }
  } catch (err) {
    console.error("삭제 요청 실패:", err);
    alert("삭제 요청 중 오류가 발생했습니다.");
  }
});
