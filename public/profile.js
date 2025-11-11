// profile.js

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");
  if (!userId) return;

  // ── 1️⃣ 프로필 정보 가져오기 & 렌더링 ──
  const profile = await loadProfileData(userId);
  renderProfile(profile);

  // ── 2️⃣ 로그인 상태 확인 & 수정 버튼 ──
  const loginInfo = await checkLogin();
  renderEditButton(userId, loginInfo);

  // ── 3️⃣ 활동 내역 가져오기 & 렌더링 ──
  const { activity, boards } = await loadUserActivity(userId);
  renderActivity(activity, boards);

  // ── 4️⃣ 글/댓글 카운트 실제로 계산해서 업데이트 ──
  updateCounts(activity);
});

// ===== 프로필 관련 =====
async function loadProfileData(userId) {
  try {
    const res = await fetch(`/api/profile/${userId}`);
    if (!res.ok) throw new Error("프로필 API 호출 실패");
    return await res.json();
  } catch (err) {
    console.error("프로필 로드 오류:", err);
    return null;
  }
}

function renderProfile(profile) {
  if (!profile) return;
  document.getElementById("username").textContent = profile.username || "";
  document.getElementById("statusMessage").textContent = profile.statusMessage || "";
  document.getElementById("joinDate").textContent = profile.joinDate || "";
  document.getElementById("lastLogin").textContent = profile.lastLogin || "";
  document.getElementById("postCount").textContent = profile.postCount || 0;
  document.getElementById("commentCount").textContent = profile.commentCount || 0;
  document.getElementById("bio").textContent = profile.bio || "";

  // ── 프로필 이미지 표시 ──
  const profileImg = document.getElementById("profileImage");

  // profileImage가 undefined, null, 빈 문자열이면 기본 이미지
  const imgPath = profile.profileImage && profile.profileImage !== "/uploads/undefined"
    ? profile.profileImage
    : "/img/default_profile.png";

  profileImg.src = imgPath;

  console.log("렌더링된 프로필 이미지:", imgPath);
}


// ===== 로그인 관련 =====
async function checkLogin() {
  try {
    const res = await fetch("/api/check-login", { method: "GET", credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.loggedIn ? data : null;
  } catch (err) {
    console.error("로그인 상태 확인 오류:", err);
    return null;
  }
}

function renderEditButton(userId, loginInfo) {
  if (loginInfo && loginInfo.ID === userId) {
    const editBtn = document.getElementById("editBtn");
    if (editBtn) editBtn.style.display = "inline-block";
    editBtn.addEventListener("click", async () => {
      window.location.href = `/profile-edit.html?id=${userId}`;
  });
  }
  
}

// ===== 활동 내역 관련 =====
async function loadUserActivity(userId) {
  try {
    const res = await fetch(`/api/user/${userId}/activity`, { credentials: "include" });
    if (!res.ok) return { activity: [], boards: [] };
    return await res.json(); // { activity: [...], boards: [...] }
  } catch (err) {
    console.error("활동 내역 로드 오류:", err);
    return { activity: [], boards: [] };
  }
}

function renderActivity(activity, boards) {
  const container = document.getElementById("activityList");
  container.innerHTML = "";

  if (!activity || activity.length === 0) {
    container.textContent = "작성한 게시물이 없습니다.";
    return;
  }

  const boardMap = {};
  boards.forEach(b => boardMap[b.id] = b.name);

  const posts = activity.filter(a => a.type === "post");
  const comments = activity.filter(a => a.type === "comment");

  // ── 게시글 렌더링 ──
  if (posts.length > 0) {
    const h3 = document.createElement("h4");
    h3.textContent = "📄 게시글";
    container.appendChild(h3);

    posts.forEach(item => {
      const div = document.createElement("div");
      div.className = "activity-item post";
      const boardName = boardMap[item.parent_id] || item.parent_id;

      div.innerHTML = `
        <span class="activity-board">[${boardName}]</span>
        <span class="activity-content">${item.content}</span>
        <span class="activity-time">${new Date(item.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
      `;

      // 클릭 시 해당 게시글 페이지로 이동
      div.addEventListener("click", () => {
        window.location.href = `/post.html?board=${item.parent_id}&id=${item.id}`;
      });
      div.style.cursor = "pointer";

      container.appendChild(div);
    });
  }

  // ── 댓글 렌더링 ──
  if (comments.length > 0) {
    const h3 = document.createElement("h4");
    h3.textContent = "💬 댓글";
    container.appendChild(h3);

    comments.forEach(item => {
      const div = document.createElement("div");
      div.className = "activity-item comment";

      // 댓글의 parent_id가 post_id이므로 해당 게시글에서 board_id 가져오기
      const boardName = boardMap[item.board_id || item.parent_id] || item.parent_id;

      div.innerHTML = `
        <span class="activity-board">[${boardName}]</span>
        <span class="activity-content">${item.content}</span>
        <span class="activity-time">${new Date(item.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
      `;

      // 댓글 클릭 시 해당 게시글 페이지로 이동
      div.addEventListener("click", () => {
        // 댓글에서 board_id가 없으면 parent_id(post_id)로 이동
        const postId = item.post_id || item.parent_id;
        const boardId = item.board_id || item.parent_id;
        window.location.href = `/post.html?board=${boardId}&id=${postId}`;
      });
      div.style.cursor = "pointer";

      container.appendChild(div);
    });
  }
}

async function loadUserActivity(userId) {
  try {
    const res = await fetch(`/api/user/${userId}/activity`, { credentials: "include" });
    if (!res.ok) return { activity: [], boards: [], profileImage: null, username: "", statusMessage: "", joinDate: "", lastLogin: "", bio: "" };
    return await res.json(); // { activity, boards, profileImage, username, statusMessage, joinDate, lastLogin, bio }
  } catch (err) {
    console.error("활동 내역 로드 오류:", err);
    return { activity: [], boards: [], profileImage: null, username: "", statusMessage: "", joinDate: "", lastLogin: "", bio: "" };
  }
}

// ===== 글/댓글 카운트 실제 반영 =====
function updateCounts(activity) {
  const postCount = activity.filter(a => a.type === "post").length;
  const commentCount = activity.filter(a => a.type === "comment").length;

  document.getElementById("postCount").textContent = postCount;
  document.getElementById("commentCount").textContent = commentCount;
}


function renderProfile(profile) {
  if (!profile) return;
  document.getElementById("username").textContent = profile.username;
  document.getElementById("statusMessage").textContent = profile.statusMessage || "";
  document.getElementById("joinDate").textContent = profile.joinDate || "";
  document.getElementById("lastLogin").textContent = profile.lastLogin || "";
  document.getElementById("postCount").textContent = profile.postCount || 0;
  document.getElementById("commentCount").textContent = profile.commentCount || 0;
  document.getElementById("bio").textContent = profile.bio || "";

  // 프로필 이미지 표시
  const profileImg = document.getElementById("profileImage");
  profileImg.src = profile.profileImg ? `${profile.profileImg}` : "/img/default_profile.png";
}

