document.addEventListener("DOMContentLoaded", () => {
  const categoryContainer = document.getElementById("categoryButtons");
  const postList = document.getElementById("postList");

  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("board");

  if (!boardId) {
    console.warn("현재 게시판 ID를 찾을 수 없습니다.");
    return;
  }

  let allPosts = [];

  function renderPosts(posts) {
    postList.innerHTML = '';
    if (posts.length === 0) {
      postList.innerHTML = '<li>작성된 글이 없습니다.</li>';
      return;
    }
    posts.forEach(post => {
      const li = document.createElement("li");
      // li.innerHTML = post.title || '(제목 없음)'; // 기존 단순 제목

      li.className = "post-item";
      li.style.position = "relative";

      const a = document.createElement("a");
      a.href = `/post.html?board=${boardId}&id=${post.id}`;

      // 제목과 댓글 수가 HTML로 이미 있는 경우 post.title에 HTML 포함되어 있다고 가정
      a.innerHTML = post.title || '(제목 없음)'; 

      // 작성자, 시간, 조회수, 추천 정보 div 생성
      const meta = document.createElement("div");

      // 작성자 span
      const authorSpan = document.createElement("span");
      authorSpan.textContent = post.author || '익명';

      // 로그인 아이콘이 있다면 이미지 추가
      if (post.usid) {
        const loginIcon = document.createElement("img");
        loginIcon.src = "/img/login-user.png";
        loginIcon.alt = "로그인 사용자";
        loginIcon.style.width = "14px";
        loginIcon.style.height = "14px";
        loginIcon.style.marginLeft = "4px";
        loginIcon.style.verticalAlign = "middle";
        authorSpan.appendChild(loginIcon);
      }

      // IP 정보가 있다면 추가
      if (post.ip) {
        const ipSpan = document.createElement("span");
        ipSpan.textContent = ` (${post.ip})`;
        ipSpan.style.color = "rgb(154, 154, 154)";
        authorSpan.appendChild(ipSpan);
      }

      meta.appendChild(authorSpan);

      // 시간, 조회수, 추천 정보
      const extraInfo = document.createElement("span");
      extraInfo.textContent = ` • ${post.time} • 조회수 ${post.views || 0} • 추천 ${post.recommend || 0}`;
      meta.appendChild(extraInfo);

      li.appendChild(a);
      li.appendChild(document.createElement('br'));
      li.appendChild(meta);

      // 관리자 삭제 버튼 등은 기존 코드 유지 (필요하면 추가)

      postList.appendChild(li);
    });
  }

  function filterPostsByCategory(catId) {
    if (catId === 'all') {
      renderPosts(allPosts);
    } else {
      const filtered = allPosts.filter(post => String(post.category) === catId);
      renderPosts(filtered);
    }
  }

  fetch(`/board/${boardId}/posts`)
    .then(res => res.json())
    .then(data => {
      if (!data.post_category) {
        console.warn("카테고리 데이터가 없습니다.");
        return;
      }

      allPosts = data.posts || [];

      const categories = data.post_category;
      const allBtn = document.createElement("button");
      allBtn.textContent = "전체";
      allBtn.className = "category-btn active";
      allBtn.addEventListener("click", () => {
        setActiveButton(allBtn);
        filterPostsByCategory('all');
      });
      categoryContainer.appendChild(allBtn);

      Object.entries(categories).forEach(([id, name]) => {
        const btn = document.createElement("button");
        btn.textContent = name;
        btn.className = "category-btn";
        btn.addEventListener("click", () => {
          setActiveButton(btn);
          filterPostsByCategory(id);
        });
        categoryContainer.appendChild(btn);
      });

      renderPosts(allPosts);

      function setActiveButton(activeBtn) {
        [...categoryContainer.children].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
      }
    });
});
