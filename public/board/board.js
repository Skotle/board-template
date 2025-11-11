const params = new URLSearchParams(window.location.search);
const boardName = params.get('board');

const boardTitle = document.getElementById('boardTitle');
const postList = document.getElementById('postList');
const writeLink = document.getElementById('write-btn');

let allPosts = []; // 전체 게시글 저장

// 게시글 렌더링 함수 (관리자 여부 인자 추가)
function renderPosts(posts, isAdmin) {
  postList.innerHTML = '';

  if (posts.length === 0) {
    postList.innerHTML = '<li>작성된 글이 없습니다.</li>';
    return;
  }

  posts.slice().forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-item';
    li.style.position = 'relative'; // 삭제 버튼 위치 위해

    const a = document.createElement('a');
    a.href = `/post.html?board=${boardName}&id=${post.id}`;

    // 카테고리 span 제거

    if (post.content && post.content.includes('<img src=')) {
      const imageIcon = document.createElement('img');
      imageIcon.src = 'img/imagein.png';
      imageIcon.style.height = '16px';
      a.appendChild(imageIcon);
    }

    // 제목 span
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = ' ' + (post.title || '(제목 없음)');
    a.appendChild(titleSpan);

    // 댓글 수 계산 (기존 코드 유지)
    let totalComments = 0;
    if (Array.isArray(post.comments)) {
      totalComments += post.comments.length;
      post.comments.forEach(comment => {
        if (Array.isArray(comment.replies)) {
          totalComments += comment.replies.length;
        }
      });
    }

    if (totalComments > 0) {
      const commentCountSpan = document.createElement('span');
      commentCountSpan.className = 'comment-count';
      commentCountSpan.textContent = ` [${totalComments}]`;
      a.appendChild(commentCountSpan);
    }

    const meta = document.createElement('div');

    const authorSpan = document.createElement('span');
    authorSpan.textContent = post.author || '익명';

    if (post.usid) {
      const loginIcon = document.createElement('img');
      loginIcon.src = '/img/login-user.png';
      loginIcon.alt = '로그인 사용자';
      loginIcon.style.width = '14px';
      loginIcon.style.height = '14px';
      loginIcon.style.marginLeft = '4px';
      loginIcon.style.verticalAlign = 'middle';
      authorSpan.appendChild(loginIcon);
    }

    if (post.ip) {
      const ipSpan = document.createElement('span');
      ipSpan.textContent = ` (${post.ip})`;
      ipSpan.style.color = "rgb(154,154,154)";
      authorSpan.appendChild(ipSpan);
    }

    meta.appendChild(authorSpan);

    const extraInfo = document.createElement('span');
    extraInfo.textContent = ` • ${post.time} • 조회수 ${post.views || 0} • 추천 ${post.recommend || 0}`;
    meta.appendChild(extraInfo);

    li.appendChild(a);
    li.appendChild(document.createElement('br'));
    li.appendChild(meta);

    // 관리자면 삭제 버튼 생성 (기존 코드 유지)
    if (isAdmin) {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '5px';
      deleteBtn.style.right = '5px';
      deleteBtn.style.background = '#e74c3c';
      deleteBtn.style.color = '#fff';
      deleteBtn.style.border = 'none';
      deleteBtn.style.borderRadius = '3px';
      deleteBtn.style.padding = '2px 6px';
      deleteBtn.style.cursor = 'pointer';

      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`"${post.title}" 글을 삭제하시겠습니까?`)) return;

        try {
          const token = localStorage.getItem("accessToken");
          const uid = localStorage.getItem("ID");
          const isAdmin = window.isAdminFlag || false;

          const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(post.id)}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uid, admin: isAdmin })
          });

          const data = await res.json();
          if (res.ok) {
            alert(data.message || '삭제되었습니다.');
            li.remove();
          } else {
            alert(`삭제 실패: ${data.error || data.message || '알 수 없는 오류'}`);
          }
        } catch (err) {
          alert('삭제 중 오류가 발생했습니다.');
          console.error(err);
        }
      });

      li.appendChild(deleteBtn);
    }

    postList.appendChild(li);
  });
}

// 관리자 여부 체크 함수 (기존 코드 유지)
async function checkIfAdmin(boardName) {
  const token = localStorage.getItem("accessToken");
  if (!token) return false;

  try {
    const res = await fetch('/api/check-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const authority = data.authority || { admin: false, boards: [] };

    if (authority.admin === true) return true;

    if (Array.isArray(authority.boards) && boardName) {
      return authority.boards.includes(boardName);
    }

    return false;
  } catch (err) {
    console.error('관리자 확인 중 오류:', err);
    return false;
  }
}

// 게시글 불러오기 및 렌더링 함수
async function loadAndRenderPosts() {
  window.isAdminFlag = await checkIfAdmin(boardName);

  if (!boardName) {
    boardTitle.textContent = '게시판이 지정되지 않았습니다.';
    postList.innerHTML = '<li>게시판이 지정되지 않았습니다.</li>';
    return;
  }

  try {
    const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts`);
    const boardData = await res.json();

    const displayName = boardData.boardTitle;
    boardTitle.textContent = `${displayName} 게시판`;
    document.title = displayName;
    writeLink.href = `/write.html?board=${encodeURIComponent(boardName)}`;

    allPosts = boardData.posts || [];

    // 카테고리 관련 코드 제거되어 바로 전체 글 렌더링
    renderPosts(allPosts, window.isAdminFlag);
  } catch (err) {
    boardTitle.textContent = '게시판을 불러오지 못했습니다.';
    postList.innerHTML = '<li>글 목록을 불러오는 데 실패했습니다.</li>';
    console.error('Error loading posts:', err);
  }
}

// 초기화
loadAndRenderPosts();

// 로그인 상태 UI 및 로그아웃 (기존 코드 유지)
const logBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logoutBtn");
const newsignBtn = document.getElementById("newsign");
const welcome = document.getElementById("welcome");
const username = localStorage.getItem("username");
const token = localStorage.getItem("accessToken");

if (token) {
  logBtn.style.display = "none";
  logoutBtn.style.display = "inline-block";
  newsignBtn.style.display = "none";
  welcome.style.display = "inline-block";
  welcome.textContent = `환영합니다, ${username}님`;
  welcome.style.color = "white";
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("username");
  localStorage.removeItem("ID");
  alert("로그아웃 되었습니다.");
  window.location.reload();
});
