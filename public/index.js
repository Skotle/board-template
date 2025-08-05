document.addEventListener("DOMContentLoaded", async () => {
  const postList = document.getElementById("postList");

  try {
    const res = await fetch("/posts");
    const posts = await res.json();

    postList.innerHTML = ""; // 기존 목록 초기화

    posts.reverse().forEach(post => {
      const li = document.createElement("li");
      li.className = "post-item";

      const commentCount = Array.isArray(post.comments)
        ? post.comments.reduce((count, comment) => {
            const replyCount = Array.isArray(comment.replies) ? comment.replies.length : 0;
            return count + 1 + replyCount;
          }, 0)
        : 0;


      const commentHTML = commentCount > 0
        ? `<a href="" style="color:gray; font-size:medium">[${commentCount}]</a>`
        : `<a href="" style="color:gray; font-size:medium"></a>`;

      li.innerHTML = `
        <div class="post-title">
          <a href="post.html?id=${post.id}">
            [${getCategoryLabel(post.category)}] ${post.title}
          </a>
          ${commentHTML}
        </div>
        <div class="post-meta">
          <span class="post-author">${post.author}</span> • ${post.time} • 조회수 ${post.views ?? 0}
        </div>
      `;

      const authorSpan = li.querySelector(".post-author");

      if (post.ip && post.ip.trim() !== "") {
        // IP가 있는 경우: 아이콘 없이 IP 표시
        const ipSpan = document.createElement("span");
        ipSpan.textContent = ` (${post.ip})`;
        ipSpan.style.color = "rgba(154, 154, 154, 1)";
        authorSpan?.appendChild(ipSpan);
      } else {
        // IP가 없으면 로그인 사용자: 아이콘 표시
        const img = document.createElement("img");
        img.src = "/img/login-user.png";
        img.style.height = "15px";
        img.style.marginRight = "4px";
        authorSpan?.parentNode?.insertBefore(img, authorSpan);
      }

      postList.appendChild(li);
    });
  } catch (err) {
    console.error("게시글 불러오기 실패:", err);
  }
});

function getCategoryLabel(code) {
  switch (code) {
    case "default": return "일반";
    case "quest": return "질문";
    case "info": return "정보";
    case "notice": return "공지";
    default: return "기타";
  }
}
