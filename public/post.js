let ipFront = null;

// IP 앞자리 추출
async function getIpFrontPart() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.ip.split('.').slice(0, 2).join('.');
  } catch (error) {
    console.error('IP를 가져오는 데 실패했습니다:', error);
    return null;
  }
}

const id = new URLSearchParams(location.search).get('id');

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("accessToken");
  const username = localStorage.getItem("username");

  // IP 앞자리 설정
  ipFront = await getIpFrontPart();

  // 게시글 불러오기
  try {
    const res = await fetch(`/posts/${id}`);
    const post = await res.json();

    // 게시글 렌더링
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postAuthor').textContent = post.author;
    document.getElementById('postTime').textContent = post.time;
    document.getElementById('postContent').textContent = post.content;

    if (post.image) {
      document.getElementById('postImage').src = post.image;
    }

    // 삭제 권한 처리
    const deleteForm = document.getElementById("deleteForm");
    deleteForm.style.display = "none";
    const loggedInUser = username;

    if (post.id_check === loggedInUser) {
      deleteForm.dataset.authDelete = "true";  // 로그인 유저 글
      deleteForm.style.display = "inline-block";
    } else if (post.id_check === "false") {
      deleteForm.dataset.authDelete = "false"; // 비로그인 유저 글
      deleteForm.style.display = "inline-block";
    }

    loadComments(); // 댓글 로드
  } catch (err) {
    console.error("게시글 로딩 실패:", err);
    alert("게시글을 불러오는 데 실패했습니다.");
  }

  // 로그인 시 댓글 작성 폼 제어
  const authorInput = document.getElementById("commentAuthor");
  const passwordInput = document.getElementById("commentPassword");
  if (token) {
    authorInput.style.display = "none";
    authorInput.disabled = true;
    authorInput.removeAttribute("required");

    passwordInput.style.display = "none";
    passwordInput.disabled = true;
    passwordInput.removeAttribute("required");
  }
});


//댓글 로드
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadComments() {
  const token = localStorage.getItem("accessToken");
  const currentUsername = localStorage.getItem("username");

  fetch(`/posts/${id}/comments`)
    .then(res => res.json())
    .then(comments => {
      const commentList = document.getElementById("commentList");
      commentList.innerHTML = "";

      comments.forEach(c => {
        const li = document.createElement("li");
        li.classList.add("comment-card");

        // 조건: 토큰 존재 && 댓글 uid와 현재 유저명이 일치
        const showDelete = token && c.uid === currentUsername;

        let actionsHTML = "";
        if (showDelete) {
          actionsHTML = `<button class="delete-comment-btn" data-comment-id="${c._id}">삭제</button>`;
        }

        li.innerHTML = `
          <div class="comment-header">
            <div class="comment-author">
              ${escapeHtml(c.author)}
              ${token && !c.author.includes("(") ? '<span class="badge">회원</span>' : ''}
            </div>
            <div class="comment-time">${escapeHtml(c.time)}</div>
          </div>
          <div class="comment-body">
            ${escapeHtml(c.content)}
          </div>
          ${actionsHTML}
        `;

        commentList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("댓글 불러오기 실패:", err);
    });
}




// 게시글 삭제 처리
document.getElementById('deleteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const isAuthDelete = e.target.dataset.authDelete === "true";
  const bodyData = {};

  if (!isAuthDelete) {
    const password = prompt("비밀번호 입력:");
    if (!password || password.trim() === "") {
      alert("비밀번호를 입력해야 삭제할 수 있습니다.");
      return;
    }
    bodyData.password = password.trim();
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


//댓글 삭제
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-comment-btn")) {
    const commentId = e.target.dataset.commentId;
    if (!confirm("정말로 댓글을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/comments/${commentId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      });

      if (res.ok) {
        alert("댓글이 삭제되었습니다.");
        loadComments();
      } else {
        const msg = await res.text();
        alert("삭제 실패: " + msg);
      }
    } catch (err) {
      console.error("삭제 요청 실패:", err);
      alert("오류가 발생했습니다.");
    }
  }
});





// 댓글 작성 처리
document.getElementById("commentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = document.getElementById("commentContent").value.trim();
  const password = document.getElementById("commentPassword").value.trim();
  let uid = "";
  const token = localStorage.getItem("accessToken");

  let author  = "";

  if (token) {
    author = localStorage.getItem("username") || "익명";
    uid = author;
  } else {
    const authorInput = document.getElementById("commentAuthor").value.trim();
    if (!authorInput) {
      alert("작성자를 입력해주세요.");
      return;
    }

    if (!password) {
      alert("비밀번호를 입력하세요");
      return;
    }

    author = `${authorInput}(${ipFront || "??"})`;
  }

  if (!content) {
    alert("댓글 내용을 입력해주세요.");
    return;
  }

  try {
    await fetch(`/posts/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, password, uid })
    });

    // 입력창 초기화
    if (!token) {
      document.getElementById("commentAuthor").value = "";
      document.getElementById("commentPassword").value = "";
    }
    document.getElementById("commentContent").value = "";

    loadComments(); // 댓글 다시 불러오기
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    alert("댓글 작성 중 오류가 발생했습니다.");
  }
});
