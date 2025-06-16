document.addEventListener("DOMContentLoaded", async () => {
  const postList = document.getElementById("postList");

  try {
    const res = await fetch("/posts"); // 서버에서 게시글 목록 요청
    const posts = await res.json();

    postList.innerHTML = ""; // 기존 목록 초기화
    
    posts.reverse().forEach(post => {
      const li = document.createElement("li");
      li.className = "post-item";
      li.innerHTML = `
        <div class="post-title">
          <a href="post.html?id=${post.id}">
            [${getCategoryLabel(post.category)}] ${post.title}
          </a>
        </div>
        <div class="post-meta">
          ${post.author} • ${post.time}
        </div>
      `;
      if (post.comments){
        li.innerHTML = `
        <div class="post-title">
          <a href="post.html?id=${post.id}">
            [${getCategoryLabel(post.category)}] ${post.title}
          </a>
          <a href="" style="color:gray; font-size:medium">[${post.comments.length}]</a>
        </div>
        <div class="post-meta">
          ${post.author} • ${post.time}
        </div>
      `;
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
