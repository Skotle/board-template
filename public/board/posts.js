// posts.js
export const allPosts = [];
let categoryMap = {};

export function setCategoryMap(map) {
  categoryMap = map || {};
}


// 게시글 렌더링 (페이징 포함)
export function renderPosts(posts, isAdmin, boardName, container, page = 1, limit = 30) {
  container.innerHTML = '';

  if (!Array.isArray(posts) || posts.length === 0) {
    container.innerHTML = '<li>작성된 글이 없습니다.</li>';
    return;
  }

  if (limit > 30) limit = 30;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // 최신글 먼저
  const pagedPosts = posts.slice().slice(startIndex, endIndex);

  pagedPosts.forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-item';
    li.style.position = 'relative';

    const a = document.createElement('a');
    a.href = `/post.html?board=${encodeURIComponent(boardName)}&id=${encodeURIComponent(post.id)}`;

    // 카테고리 표시
    const catKey = post.category || '1';
    let catName = '일반';
    if (categoryMap) {
      const foundKey = Object.keys(categoryMap).find(k => k == catKey);
      if (foundKey) catName = categoryMap[foundKey];
    }
    const categorySpan = document.createElement('span');
    categorySpan.textContent = `[${catName}] `;
    categorySpan.style.fontWeight = 'bold';
    categorySpan.style.color = '#555';
    a.appendChild(categorySpan);

    // 이미지 아이콘 표시
    if (post.content && post.content.includes('<img src=')) {
      const imageIcon = document.createElement('img');
      imageIcon.src = 'img/imagein.png';
      imageIcon.style.height = '16px';
      a.appendChild(imageIcon);
    }

    // 제목
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = ' ' + (post.title || '(제목 없음)');
    a.appendChild(titleSpan);

    // 댓글 수
    // 댓글 수 1 이상일 때만 표시
    if (post.commentCount > 0) {
      const commentSpan = document.createElement('span');
      commentSpan.className = 'comment-count';
      commentSpan.textContent = ` [${post.commentCount}]`; // 제목 뒤에 붙음
      a.appendChild(commentSpan);
  }

    li.appendChild(a);

    // 작성자 및 메타 정보
    const meta = document.createElement('div');
    const authorSpan = document.createElement('span');
    authorSpan.textContent = post.author || '익명';

    // 기존 loginIcon 생성 부분
    if (post.usid) {
      const loginIcon = document.createElement('img');
      loginIcon.src = '/img/login-user.png';
      loginIcon.alt = '로그인 사용자';
      loginIcon.style.width = '14px';
      loginIcon.style.height = '14px';
      loginIcon.style.marginLeft = '4px';
      loginIcon.style.verticalAlign = 'middle';

      // 클릭 시 해당 작성자 프로필로 이동
      loginIcon.style.cursor = 'pointer';
      loginIcon.title = '프로필 보기';
      loginIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // 글 클릭 이벤트와 겹치지 않도록
        window.location.href = `/profile.html?id=${encodeURIComponent(post.usid)}`;
      });

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
    let displayTime = new Date(post.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    extraInfo.textContent = `• ${displayTime} • 조회수 ${post.views || 0} • 추천 ${post.recommend || 0}`;
    meta.appendChild(extraInfo);
    li.appendChild(document.createElement('br'));
    li.appendChild(meta);

    // 관리자 삭제 버튼
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
          const isAdminFlag = window.isAdminFlag || false;

          const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(post.id)}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uid, admin: isAdminFlag })
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

    container.appendChild(li);
  });
}

// 카테고리 필터링 후 렌더링
export function filterPostsByCategory(category, posts, isAdmin, boardName, container, page = 1, limit = 30) {
  const filtered = category === 'all' ? posts : posts.filter(post => (post.category || '1') == category);
  renderPosts(filtered, isAdmin, boardName, container, page, limit);
}
