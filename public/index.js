document.addEventListener("DOMContentLoaded", async () => {
  const postList = document.getElementById("postList");

  try {
    const res = await fetch("/posts");
    const posts = await res.json();

    postList.innerHTML = ""; // 기존 목록 초기화

    posts.reverse().forEach(post => {
      const li = document.createElement("li");
      li.className = "post-item";

      const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;

      // 댓글 수 HTML
      const commentHTML = commentCount > 0
        ? `<a href="" style="color:gray; font-size:medium">[${commentCount}]</a>`
        : `<a href="" style="color:gray; font-size:medium"></a>`;

      // 기본 innerHTML
      li.innerHTML = `
        <div class="post-title">
          <a href="post.html?id=${post.id}">
            [${getCategoryLabel(post.category)}] ${post.title}
          </a>
          ${commentHTML}
        </div>
        <div class="post-meta">
          <span class="post-author">${post.author}</span> • ${post.time}
        </div>
      `;

      // ip가 있을 경우 작성자 뒤에 추가
      if (post.ip && post.ip.trim() !== "") {
        const authorSpan = li.querySelector(".post-author");
        const ipSpan = document.createElement("span");
        ipSpan.textContent = `(${post.ip})`;
        ipSpan.style.color = "gray";
        authorSpan?.appendChild(ipSpan); // authorSpan이 null이 아닐 때만 추가
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
