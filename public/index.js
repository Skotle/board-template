document.addEventListener("DOMContentLoaded", async () => {
  const boardList = document.getElementById('boardList');
  const addForm = document.getElementById("addBoardArea");
  const logBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileBtn = document.getElementById("profileBtn");
  const newsignBtn = document.getElementById("newsign");
  const welcome = document.getElementById("welcome");

  let boards = [];
  let username = "";
  let authority = null;

  // --- 로그인 상태 확인 ---
  async function checkLogin() {
    try {
      const res = await fetch("/api/check-login", { method: "GET", credentials: "include" });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.loggedIn) return false;
      username = data.username;
      ID = data.ID;
      return true;
    } catch (err) {
      console.error("로그인 상태 확인 오류:", err);
      return false;
    }
  }

  // --- 권한 확인 ---
  async function getAuthority() {
    try {
      const res = await fetch("/api/check-admin", { method: "GET", credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.authority || null;
    } catch (err) {
      console.error("권한 확인 오류:", err);
      return null;
    }
  }

  const loggedIn = await checkLogin();
  authority = loggedIn ? await getAuthority() : null;

  // --- 로그인 UI ---
  if (loggedIn) {
    logBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    newsignBtn.style.display = "none";
    welcome.style.display = "inline-block";
    welcome.textContent = `환영합니다, ${username}님`;
    profileBtn.style.display = "inline-block";
  }

  // --- 로그아웃 ---
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
      alert("로그아웃 되었습니다.");
      window.location.reload();
    } catch (err) {
      alert("로그아웃 오류");
      console.error(err);
    }
  });
  profileBtn.addEventListener("click", async () => {
    window.location.href = `/profile.html?id=${ID}`;
  });

  // --- 게시판 목록 불러오기 ---
  try {
    const res = await fetch('/boards');
    boards = await res.json();

    // 정렬 버튼
    const sortWrapper = document.createElement('div');
    sortWrapper.style.margin = '10px 0';
    const sortByNameBtn = document.createElement('button');
    sortByNameBtn.textContent = '이름순 정렬';
    sortByNameBtn.style.marginRight = '5px';
    const sortByCountBtn = document.createElement('button');
    sortByCountBtn.textContent = '게시글 순 정렬';
    sortByCountBtn.style.marginRight = '5px';
    const sortByVisitedBtn = document.createElement('button');
    sortByVisitedBtn.textContent = '최근 방문 순';
    sortWrapper.append(sortByNameBtn, sortByCountBtn, sortByVisitedBtn);
    boardList.parentNode.insertBefore(sortWrapper, boardList);

    function renderBoardList(list) {
      boardList.innerHTML = '';
      list.forEach(({ id, name, count }) => {
        const li = document.createElement('li');
        li.className = 'board-item';
        li.style.position = 'relative';
        li.setAttribute('draggable', 'true');

        const a = document.createElement('a');
        a.href = `/board.html?board=${encodeURIComponent(id)}`;
        a.textContent = `📌 ${name}`;
        a.addEventListener('click', () => addVisitedBoard(name));

        const gcount = document.createElement('span');
        gcount.textContent = `게시글 : ${count}`;
        gcount.style.marginLeft = "7%";

        li.appendChild(a);
        li.appendChild(gcount);

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'delete-container';
        btnWrapper.style.position = 'absolute';
        btnWrapper.style.top = '2px';
        btnWrapper.style.right = '2px';
        btnWrapper.style.display = 'flex';
        btnWrapper.style.gap = '6px';
        btnWrapper.style.alignItems = 'center';

        // --- 버튼 생성 ---
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '삭제';
        deleteBtn.style.cssText = 'background:#e74c3c; color:#fff; border:none; border-radius:3px; padding:2px 8px; font-size:12px; cursor:pointer;';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); e.preventDefault();
          if (!confirm(`게시판 "${name}"을(를) 정말 삭제하시겠습니까?`)) return;
          try {
            const delRes = await fetch(`/board/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: "include" });
            if (!delRes.ok) { const errData = await delRes.json(); alert(`삭제 실패: ${errData.message}`); return; }
            alert(`게시판 "${name}" 삭제 완료`); li.remove();
          } catch { alert('삭제 중 오류 발생'); }
        });

        const emptyBtn = document.createElement('button');
        emptyBtn.textContent = '비우기';
        emptyBtn.style.cssText = 'background:#f39c12; color:#fff; border:none; border-radius:3px; padding:2px 8px; font-size:12px; cursor:pointer;';
        emptyBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); e.preventDefault();
          if (!confirm(`게시판 "${name}"의 모든 글을 삭제하시겠습니까?`)) return;
          try {
            const emptyRes = await fetch(`/board/${encodeURIComponent(id)}/posts`, { method: 'DELETE', credentials: "include" });
            if (!emptyRes.ok) { const errData = await emptyRes.json(); alert(`비우기 실패: ${errData.message}`); return; }
            alert(`게시판 "${name}"의 글 모두 삭제 완료`);
          } catch { alert('비우기 중 오류 발생'); }
        });

        const renameBtn = document.createElement('button');
        renameBtn.textContent = '이름 변경';
        renameBtn.style.cssText = 'background:#3498db; color:#fff; border:none; border-radius:3px; padding:2px 8px; font-size:12px; cursor:pointer;';
        renameBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); e.preventDefault();
          const newName = prompt(`게시판 "${name}" 새 이름 입력:`, name);
          if (!newName || newName === name) return;
          try {
            const res = await fetch(`/board/${encodeURIComponent(id)}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, credentials:"include", body: JSON.stringify({ newBoardName: newName }) });
            const data = await res.json();
            if (res.ok) { alert(data.message); window.location.reload(); } else alert(`이름 변경 실패: ${data.message}`);
          } catch { alert('이름 변경 중 오류'); }
        });

        // --- 권한별 버튼 표시 ---
        const isAdmin = authority?.admin === true;
        const hasBoardPermission = Array.isArray(authority?.boards) && authority.boards.includes(id);

        if (isAdmin) btnWrapper.append(deleteBtn, emptyBtn, renameBtn);
        else if (hasBoardPermission) btnWrapper.append(emptyBtn, renameBtn);

        li.appendChild(btnWrapper);
        boardList.appendChild(li);
      });
    }

    renderBoardList(boards);

  } catch (err) { boardList.innerHTML = '<li>게시판 목록 불러오기 실패</li>'; console.error(err); }

  // --- 게시판 추가 ---
  if (authority?.admin === true) addForm.style.display = "block";
  else addForm.style.display = "none";

  document.getElementById('addBoardBtn').addEventListener('click', async () => {
    const name = document.getElementById('newBoardName').value.trim();
    const id = document.getElementById('newBoardId').value.trim();
    if (!name || !id) { alert('이름과 아이디 입력'); return; }

    try {
      const res = await fetch('/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials:"include", body: JSON.stringify({ name, id }) });
      const data = await res.json();
      if (res.ok) { alert(`게시판 "${data.board.name}" 생성 완료`); document.getElementById('newBoardName').value = ''; document.getElementById('newBoardId').value = ''; window.location.href = "/"; }
      else alert(`에러: ${data.message}`);
    } catch { alert('서버 요청 실패'); }
  });

  // --- 관리자 권한 UI ---
  if (authority?.admin === true) {
    const grantDiv = document.createElement('div');
    grantDiv.style.cssText = 'margin:10px 0; border:1px solid #ccc; padding:10px; border-radius:5px;';
    grantDiv.innerHTML = `
      <h3>사용자 게시판 권한 부여 / 삭제</h3>
      <input type="text" id="grantUserId" placeholder="사용자 ID 입력" style="margin-right:5px; margin-bottom:5px;">
      <input type="text" id="grantBoardName" placeholder="게시판 이름 입력" style="margin-right:5px; margin-bottom:5px;"><br/>
      <button id="grantPermissionBtn" style="margin-right:10px;">권한 부여</button>
      <button id="revokePermissionBtn" style="margin-right:10px;">권한 삭제</button>
      <button id="revokeAllBtn" style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">전부 삭제</button>
    `;
    addForm.parentNode.insertBefore(grantDiv, addForm.nextSibling);

    document.getElementById('grantPermissionBtn').addEventListener('click', async () => {
      const userId = document.getElementById('grantUserId').value.trim();
      const boardName = document.getElementById('grantBoardName').value.trim();
      if (!userId || !boardName) { alert('ID와 게시판 입력'); return; }
      try {
        const res = await fetch('/board/grant-permission', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:"include", body:JSON.stringify({ userId, boardName }) });
        const data = await res.json(); if (res.ok) alert(data.message); else alert(`권한 부여 실패: ${data.message}`);
      } catch { alert('권한 부여 오류'); }
    });

    document.getElementById('revokePermissionBtn').addEventListener('click', async () => {
      const userId = document.getElementById('grantUserId').value.trim();
      const boardName = document.getElementById('grantBoardName').value.trim();
      if (!userId || !boardName) { alert('ID와 게시판 입력'); return; }
      try {
        const res = await fetch('/board/revoke-permission', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:"include", body:JSON.stringify({ userId, boardName }) });
        const data = await res.json(); if (res.ok) alert(data.message); else alert(`권한 삭제 실패: ${data.message}`);
      } catch { alert('권한 삭제 오류'); }
    });

    document.getElementById('revokeAllBtn').addEventListener('click', async () => {
      const userId = document.getElementById('grantUserId').value.trim();
      if (!userId) { alert('사용자 ID 입력'); return; }
      if (!confirm(`${userId}님의 모든 게시판 권한 삭제?`)) return;
      try {
        const res = await fetch('/board/revoke-all-permissions', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:"include", body:JSON.stringify({ userId }) });
        const data = await res.json(); if (res.ok) alert(data.message); else alert(`전부 삭제 실패: ${data.message}`);
      } catch { alert('전부 삭제 오류'); }
    });
  }
});



async function loadMainPosts() {
  try {
    const res = await fetch(`/main/posts?page=1`);
    const data = await res.json();

    const list = document.getElementById("mainPostList");
    list.innerHTML = "";

    if (!data.posts || !data.posts.length) {
      list.innerHTML = "<li>조건을 만족하는 글이 없습니다.</li>";
      return;
    }

    data.posts.forEach(post => {
      const li = document.createElement("li");
      li.className = "post-item";
      let displayTime = formatPostTime(post.time);
      li.innerHTML = `
        <div class="post-box">
          <div class="post-title">
            <a href="/post.html?board=${post.board_id}&id=${post.id}">
              ${post.title}
            </a>
            <span style=color:#c96767;>[${post.commentCount}]</span>
            
          </div>
          <div class="post-board"><small>${post.boardTitle}</small> | ${displayTime}</div>
      
        </div>
      `;

      list.appendChild(li);
    });
  } catch (err) {
    console.error("메인 글 불러오기 실패:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadMainPosts);

function formatPostTime(timeString) {
  const postDate = new Date(timeString);
  const now = new Date();

  // 오늘 날짜 문자열 (YYYY-MM-DD)
  const todayStr = now.toISOString().split("T")[0];
  const postStr = postDate.toISOString().split("T")[0];

  if (todayStr === postStr) {
    // 오늘이면 시간만 표시
    return postDate.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });
  } else {
    // 오늘이 아니면 날짜+시간 표시
    return postDate.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });
  }
}
