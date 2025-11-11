// userActivity.js
export async function loadUserActivity(userId) {
  try {
    const res = await fetch(`/api/user/${userId}/activity`, { credentials: "include" });
    if (!res.ok) return { activity: [], boards: [] };
    return await res.json(); // { activity: [...], boards: [...] }
  } catch (err) {
    console.error("활동 내역 로드 오류:", err);
    return { activity: [], boards: [] };
  }
}

export function renderActivity(activity, boards) {
  const container = document.getElementById("activityList");
  container.innerHTML = "";

  if (!activity || activity.length === 0) {
    container.textContent = "작성한 게시물이 없습니다.";
    return;
  }

  // 게시판 ID → 이름 매핑
  const boardMap = {};
  boards.forEach(b => boardMap[b.id] = b.name);

  // 글과 댓글 분리
  const posts = activity.filter(a => a.type === "post");
  const comments = activity.filter(a => a.type === "comment");

  // 글 렌더링
  if (posts.length > 0) {
    const h3 = document.createElement("h3");
    h3.textContent = "📄 게시글";
    container.appendChild(h3);

    posts.forEach(item => {
      const div = document.createElement("div");
      div.className = "activity-item post";
      const boardName = boardMap[item.parent_id] || item.parent_id;
      div.innerHTML = `<span class="activity-board">[${boardName}]</span>
                       <span class="activity-content">${item.content}</span>
                       <span class="activity-time">${item.time}</span>`;
      container.appendChild(div);
    });
  }

  // 댓글 렌더링
  if (comments.length > 0) {
    const h3 = document.createElement("h3");
    h3.textContent = "💬 댓글";
    container.appendChild(h3);

    comments.forEach(item => {
      const div = document.createElement("div");
      div.className = "activity-item comment";
      const boardName = boardMap[item.parent_id] || item.parent_id;
      div.innerHTML = `<span class="activity-board">[${boardName}]</span>
                       <span class="activity-content">${item.content}</span>
                       <span class="activity-time">${item.time}</span>`;
      container.appendChild(div);
    });
  }
}
