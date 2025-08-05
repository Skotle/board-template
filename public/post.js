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

// URL에서 게시글 ID 추출 (전역으로 한 번만)
const id = new URLSearchParams(location.search).get('id');
if (!id) {
  alert("게시글 ID가 URL에 없습니다.");
  // 필요시 리다이렉트 등 처리
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

(async function handlePostPage() {
  const postId = id;
  const titleEl = document.getElementById('postTitle');
  const authorEl = document.getElementById('postAuthor');
  const timeEl = document.getElementById('postTime');
  const contentEl = document.getElementById('postContent');
  const imageEl = document.getElementById('postImage');
  const deleteForm = document.getElementById('deleteForm');

  let post = null;

  try {
    const res = await fetch(`/posts/${postId}`);
    if (!res.ok) throw new Error('게시글을 불러오지 못했습니다.');
    post = await res.json();

    titleEl.textContent = post.title;
    authorEl.textContent = post.author + (post.ip ? ` (${post.ip})` : '');
    timeEl.textContent = post.time;
    contentEl.innerHTML = post.content.replace(/\n/g, '<br>');

    if (post.image) {
      imageEl.src = post.image;
      imageEl.style.display = 'block';
    }

    // 여기서 페이지 <title>을 글 제목으로 설정
    document.title = post.title;

    const currentUid = localStorage.getItem('ID');

    if (post.usid) {
      if (post.usid === currentUid) {
        deleteForm.style.display = "inline-block";
      } else {
        deleteForm.style.display = "none";
      }
    } else {
      deleteForm.style.display = "inline-block";
    }
  } catch (err) {
    alert(err.message);
    return;
  }

  deleteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!confirm('정말 삭제하시겠습니까?')) return;

    const currentUid = localStorage.getItem('ID');
    let body = {};

    if (post.usid) {
      if (post.usid === currentUid) {
        body = { uid: currentUid };
      } else {
        alert('삭제 권한이 없습니다.');
        return;
      }
    } else {
      if (post.usid) {
        alert('로그인이 필요한 글입니다. 삭제할 수 없습니다.');
        return;
      }

      const password = prompt('비밀번호를 입력하세요');
      if (!password) {
        alert('비밀번호를 입력해야 삭제할 수 있습니다.');
        return;
      }
      body = { password };
    }

    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert('삭제되었습니다.');
        location.href = 'index.html';
      } else {
        const msg = await res.text();
        alert(`삭제 실패: ${msg}`);
      }
    } catch (err) {
      alert('삭제 중 오류 발생');
    }
  });
})();


// 댓글 및 답글 렌더링 함수
function renderComments(comments) {
  const commentList = document.getElementById("commentList");
  commentList.innerHTML = "";

  const token = localStorage.getItem("accessToken");
  const currentUsername = localStorage.getItem("username");

  comments.forEach(c => {
    const li = document.createElement("li");
    li.classList.add("comment-card");
    li.id = `comment-${c.id}`;
    li.dataset.uid = c.uid || "";  // 댓글 uid를 data-uid에 추가

    const showDelete = (token && c.uid === currentUsername) || !c.uid;

    let actionsHTML = "";
    if (showDelete) {
      actionsHTML += `<button class="delete-comment-btn" data-comment-id="${c.id}">삭제</button>`;
    }
    actionsHTML += `<button class="reply-btn" data-comment-id="${c.id}">답글</button>`;

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

    if (c.replies && c.replies.length > 0) {
      const replyList = li.querySelector(".reply-list");
      c.replies.forEach(reply => {
        const replyLi = document.createElement("li");
        replyLi.classList.add("reply-card");
        replyLi.id = `comment-${reply.id}`;
        replyLi.dataset.uid = reply.uid || "";  // 답글 uid를 data-uid에 추가

        const currentUid = localStorage.getItem("ID") || "";
        let showDelete = false;
        if (reply.ip) {
          showDelete = true;
        } else if (reply.uid === currentUid) {
          showDelete = true;
        }
        replyLi.innerHTML = `
          <div class="comment-header">
            <div class="comment-author">
              ${escapeHtml(reply.author)}
              ${reply.ip ? `<span class="comment-ip"> (${escapeHtml(reply.ip)})</span>` : ''}
            </div>
            <div class="comment-time">${escapeHtml(reply.time)}</div>
          </div>
          <div class="comment-body">${escapeHtml(reply.content)}</div>
          ${showDelete ? `<button class="delete-reply-btn" data-reply-id="${reply.id}">삭제</button>` : ''}
        `;

        replyList.appendChild(replyLi);
      });
    }
  });
}


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

// 댓글 작성 처리 - 새로고침 막음
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
    uid = localStorage.getItem("ID");
  } else {
    const authorInputValue = document.getElementById("commentAuthor").value.trim();
    if (!authorInputValue) {
      alert("작성자를 입력해주세요.");
      return;
    }
    if (!password) {
      alert("비밀번호를 입력하세요");
      return;
    }
    author = authorInputValue;
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

// 댓글 및 답글 삭제 / 답글쓰기 이벤트
document.getElementById("commentList").addEventListener("click", (e) => {
  // 댓글 삭제  
  if (e.target.classList.contains("delete-comment-btn")) {
    const commentId = e.target.dataset.commentId;
    const postId = id;
    const card = e.target.closest(".comment-card");
    const firstAuthor = card.querySelector(".comment-header .comment-author")?.textContent.trim();
    const storedUid = localStorage.getItem("username") || "";
    let password = "";

    if (!storedUid || firstAuthor !== storedUid) {
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

  // 답글 삭제
  if (e.target.classList.contains("delete-reply-btn")) {
    const replyId = e.target.dataset.replyId;
    const postId = id;
    const card = e.target.closest(".reply-card");
    const replyAuthor = card.dataset.uid || "";
    const storedUid = localStorage.getItem("ID") || "";
    let password = "";

    if (!storedUid || replyAuthor !== storedUid) {
      password = prompt("비밀번호를 입력하세요.");
      if (!password) return alert("비밀번호를 입력해야 삭제할 수 있습니다.");
    }
    if (!confirm("정말로 답글을 삭제하시겠습니까?")) return;

    fetch(`/posts/${postId}/reply/${replyId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: storedUid, password })
    }).then(async res => {
      if (res.ok) {
        alert("답글이 삭제되었습니다.");
        document.getElementById(`comment-${replyId}`)?.remove();
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

    const token = localStorage.getItem("accessToken");

    if (token) {
      form.innerHTML = `
        <textarea name="replyContent" rows="3" placeholder="답글을 입력하세요" required></textarea><br/>
        <button type="submit">답글 등록</button>
      `;
    } else {
      form.innerHTML = `
        <textarea name="replyContent" rows="3" placeholder="답글을 입력하세요" required></textarea><br/>
        <input type="text" id="replyAuthor" placeholder="작성자" required />
        <input type="password" name="replyPassword" placeholder="비밀번호" required />
        <button type="submit">답글 등록</button>
      `;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = form.replyContent.value.trim();
      const token = localStorage.getItem("accessToken");
      let bodyData = { content };

      if (!content) {
        alert("답글 내용을 입력해주세요.");
        return;
      }

      if (token) {
        bodyData.author = localStorage.getItem("username") || "";
        bodyData.uid = localStorage.getItem("ID") || "";
      } else {
        const author = form.replyAuthor.value.trim();
        const password = form.replyPassword.value.trim();

        if (!author || !password) {
          alert("작성자와 비밀번호를 입력해주세요.");
          return;
        }

        const ip  = ipFront;
        bodyData = {
          ...bodyData,
          author,
          password,
          ip
        };
      }

      try {
        const res = await fetch(`/posts/${id}/comment/${commentId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
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