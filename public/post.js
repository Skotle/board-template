let ipFront = null;

// IP 앞자리 추출 함수
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

// HTML 이스케이프
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 댓글 및 답글 렌더링
function renderComments(comments) {
  const commentList = document.getElementById("commentList");
  commentList.innerHTML = "";

  const token = localStorage.getItem("accessToken");
  const currentUsername = localStorage.getItem("username");

  comments.forEach(c => {
    const li = document.createElement("li");
    li.classList.add("comment-card");
    li.id = `comment-${c.id}`;

    const showDelete = (token && c.uid === currentUsername) || !c.uid;

    let actionsHTML = "";
    if (showDelete) {
      actionsHTML += `<button class="delete-comment-btn" data-comment-id="${c.id}">삭제</button>`;
    }
    actionsHTML += `<button class="reply-btn" data-comment-id="${c.id}">답글쓰기</button>`;

    li.innerHTML = `
      <div class="comment-header">
        <div class="comment-author">
          ${escapeHtml(c.author)}
          ${c.ip ? `<span class="comment-ip"> (${escapeHtml(c.ip)})</span>` : ''}
        </div>
        <div class="comment-time">${escapeHtml(c.time)}</div>
      </div>
      <div class="comment-body">${escapeHtml(c.content)}</div>
      ${actionsHTML}
      <ul class="reply-list"></ul>
    `;
    commentList.appendChild(li);

    // 답글 렌더링
    if (c.replies && c.replies.length > 0) {
      const replyList = li.querySelector(".reply-list");
      c.replies.forEach(reply => {
        const replyLi = document.createElement("li");
        replyLi.classList.add("reply-card");
        replyLi.id = `comment-${reply.id}`;
        replyLi.innerHTML = `
          <div class="comment-header">
            <div class="comment-author">
              ${escapeHtml(reply.author)}
              ${reply.ip ? `<span class="comment-ip"> (${escapeHtml(reply.ip)})</span>` : ''}
            </div>
            <div class="comment-time">${escapeHtml(reply.time)}</div>
          </div>
          <div class="comment-body">${escapeHtml(reply.content)}</div>
        `;
        replyList.appendChild(replyLi);
      });
    }
  });
}

// 댓글 불러오기
function loadComments() {
  fetch(`/posts/${id}/comments`)
    .then(res => res.json())
    .then(renderComments)
    .catch(err => {
      console.error("댓글 불러오기 실패:", err);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  ipFront = await getIpFrontPart();
  loadComments();

  const token = localStorage.getItem("accessToken");
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

// 댓글 작성 처리
document.getElementById("commentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = document.getElementById("commentContent").value.trim();
  const password = document.getElementById("commentPassword").value.trim();
  let uid = "";
  const token = localStorage.getItem("accessToken");

  let author = "";
  let ip = "";
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
    author = authorInput;
    ip = ipFront;
  }

  if (!content) {
    alert("댓글 내용을 입력해주세요.");
    return;
  }

  try {
    await fetch(`/posts/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, password, uid, ip })
    });

    if (!token) {
      document.getElementById("commentAuthor").value = "";
      document.getElementById("commentPassword").value = "";
    }
    document.getElementById("commentContent").value = "";

    loadComments();
  } catch (err) {
    console.error("댓글 작성 실패:", err);
    alert("댓글 작성 중 오류가 발생했습니다.");
  }
});

// 댓글 리스트 내 이벤트 위임 - 삭제, 답글쓰기 버튼 처리
document.getElementById("commentList").addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-comment-btn")) {
    const commentId = e.target.dataset.commentId;
    const postId = id;
    const card = e.target.closest(".comment-card");
    const firstAuthor = card.querySelector(".comment-header .comment-author")?.textContent.trim();
    const storedUid = localStorage.getItem("username") || "";
    let password = "";

    if (!storedUid || firstAuthor != storedUid) {
      password = prompt("비밀번호를 입력하세요.");
      if (!password) return alert("비밀번호를 입력해야 삭제할 수 있습니다.");
    }
    if (!confirm("정말로 댓글을 삭제하시겠습니까?")) return;

    fetch(`/posts/${postId}/comment/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: storedUid, password })
    }).then(async res => {
      if (res.ok) {
        alert("댓글이 삭제되었습니다.");
        document.getElementById(`comment-${commentId}`)?.remove();
      } else {
        const msg = await res.text();
        alert("삭제 실패: " + msg);
      }
    }).catch(err => {
      console.error(err);
      alert("오류가 발생했습니다.");
    });
  }

  // 답글쓰기 버튼 클릭 시
  if (e.target.classList.contains("reply-btn")) {
    const commentId = e.target.dataset.commentId;
    const commentLi = document.getElementById(`comment-${commentId}`);

    // 기존 폼 있으면 제거 (토글)
    let existingForm = commentLi.querySelector(".reply-form");
    if (existingForm) {
      existingForm.remove();
      return;
    }

    // 답글 폼 생성
    const form = document.createElement("form");
    form.classList.add("reply-form");
    form.innerHTML = `
      <textarea name="replyContent" rows="3" placeholder="답글을 입력하세요" required></textarea><br/>
      <input type="text" id="replyAuthor" placeholder="작성자" required />
      <input type="password" name="replyPassword" placeholder="비밀번호" required />
      <button type="submit">답글 등록</button>
    `;

    const token = localStorage.getItem("accessToken");

    if (token) {
      form.innerHTML = `
        <textarea name="replyContent" rows="3" placeholder="답글을 입력하세요" required></textarea><br/>
        <button type="submit">답글 등록</button>
      `;
      const author = localStorage.getItem("username");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = form.replyContent.value.trim();
      const author = form.replyAuthor.value.trim();
      const password = form.replyPassword.value.trim();
      if (!content || !author || !password) {
        alert("모든 항목을 입력해주세요.");
        return;
      }

      try {
        const res = await fetch(`/posts/${id}/comment/${commentId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, content, password })
        });

        if (res.ok) {
          alert("답글이 등록되었습니다.");
          loadComments();
        } else {
          const msg = await res.text();
          alert("답글 등록 실패: " + msg);
        }
      } catch (err) {
        console.error(err);
        alert("답글 등록 중 오류가 발생했습니다.");
      }
    });

    commentLi.appendChild(form);
  }
});
