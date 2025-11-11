let ipFront = null;


// IP 앞부분 얻기 함수 (비로그인 시 사용)
async function getIpFrontPart() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const ipParts = data.ip.split('.');
    return ipParts.slice(0, 2).join('.');
  } catch (error) {
    console.error('IP를 가져오는 데 실패했습니다:', error);
    return null;
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]; // payload 부분
    const base64 = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
    const jsonPayload = decodeURIComponent(
      [...base64].map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload); // JSON 객체로 반환
  } catch (e) {
    return {};
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const boardName = params.get('board');
  const postId = params.get('id');

  if (!boardName || !postId) {
    alert('게시판 또는 게시글 정보가 없습니다.');
    location.href = 'index.html';
    return;
  }

  // DOM 요소
  const postTitle = document.getElementById('postTitle');
  const postAuthor = document.getElementById('postAuthor');
  const postTime = document.getElementById('postTime');
  const postView = document.getElementById('postView');
  const postContent = document.getElementById('postContent');
  //const postImagesDiv = document.getElementById('postImage');
  const postRecommendCount = document.getElementById('postRecommendCount');

  const backLink = document.getElementById('back');
  backLink.href = `board.html?board=${encodeURIComponent(boardName)}`;

  const deleteForm = document.getElementById('deleteForm');
  const deletePasswordInput = document.getElementById('deletePassword');
  const recommendBtn = document.getElementById('recommendBtn');

  const commentForm = document.getElementById('commentForm');
  const commentAuthorInput = document.getElementById('commentAuthor');
  const commentPasswordInput = document.getElementById('commentPassword');
  const commentContentInput = document.getElementById('commentContent');
  const commentList = document.getElementById('commentList');

  const token = localStorage.getItem("accessToken");

  // 로그인 상태에 따른 작성자/비밀번호 input 표시 및 required 조정
  if (token) {
    commentAuthorInput.style.display = 'none';
    commentAuthorInput.required = false;
    commentPasswordInput.style.display = 'none';
    commentPasswordInput.required = false;
  } else {
    commentAuthorInput.style.display = 'inline-block';
    commentAuthorInput.required = true;
    commentPasswordInput.style.display = 'inline-block';
    commentPasswordInput.required = true;
    // IP 앞부분 미리 로드
    ipFront = await getIpFrontPart();
  }

  // 게시글 로드 함수
  async function loadPost() {
  try {
    const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}`);
    if (!res.ok) throw new Error('게시글을 불러오는데 실패했습니다.');

    const post = await res.json();

    postTitle.textContent = post.title || '제목 없음';
    postAuthor.textContent = post.author || '익명';
    document.title = post.title ? `${post.title} - 게시글` : '게시글';
    // 기존에 ip-front 클래스가 있으면 삭제
    const existingIpSpan = postAuthor.querySelector('.ip-front');
    if (existingIpSpan) existingIpSpan.remove();

    // IP 표시
    if (post.ip) {
      const ipSpan = document.createElement('span');
      ipSpan.className = 'ip-front';
      ipSpan.textContent = ` (${post.ip})`;
      ipSpan.style.color = 'rgb(154,154,154)';
      postAuthor.appendChild(ipSpan);
    }

    postTime.textContent = post.time || '';
    postView.textContent = `조회수 ${post.views || 0}`;
    postContent.innerHTML = post.content || '';
    postRecommendCount.textContent = post.recommend || 0;

    if (post.usid) {
      postAuthor.setAttribute('data-uid', post.usid);
      // 로그인한 사용자와 게시글 작성자가 같으면 삭제 폼 노출
      if (post.usid === localStorage.getItem("ID")) {
        deleteForm.style.display = "inline-block";
      } else {
        deleteForm.style.display = "none";
      }
    } else {
      // usid가 없으면 삭제 폼 보여줌 (비회원 등)
      deleteForm.style.display = "inline-block";
    }

  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}


  // 댓글 목록 로드 함수
  async function loadComments() {
    try {
      const resComments = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/comments`);
      if (!resComments.ok) throw new Error('댓글을 불러오는 데 실패했습니다.');

      const comments = await resComments.json();
      commentList.innerHTML = '';

      if (comments.length === 0) {
        commentList.innerHTML = '<li>댓글이 없습니다.</li>';
      } else {
        comments.forEach(comment => {
          const li = document.createElement('li');

          // 댓글 메타 정보 (작성자, 시간)
          const metaDiv = document.createElement('div');
          metaDiv.className = 'comment-meta';

          const authorSpan = document.createElement('span');
          authorSpan.className = 'author';
          authorSpan.textContent = comment.author || '익명';

          if (comment.usid) {
            authorSpan.dataset.uid = comment.usid;
          }

          // comment.ip가 있으면 (ip) 표시
          const existingIpSpan = authorSpan.querySelector('.ip-front');
          if (existingIpSpan) existingIpSpan.remove();

          if (comment.ip) {
            const ipSpan = document.createElement('span');
            ipSpan.className = 'ip-front';
            ipSpan.textContent = ` (${comment.ip})`;
            ipSpan.style.color = 'rgb(154,154,154)';
            authorSpan.appendChild(ipSpan);
          }

          const timeSpan = document.createElement('span');
          timeSpan.className = 'time';
          timeSpan.textContent = ` | ${comment.time}`;

          metaDiv.appendChild(authorSpan);
          metaDiv.appendChild(timeSpan);

          // 댓글 내용
          const contentDiv = document.createElement('div');
          contentDiv.className = 'comment-content';
          contentDiv.textContent = comment.content;

          // 삭제 버튼
          const deleteBtn = document.createElement('button');
          if (comment.usid) {
            deleteBtn.style.display = 'none';
            if (comment.usid === localStorage.getItem('ID')) {
              deleteBtn.style.display = 'inline-block';
            }
          }
          deleteBtn.textContent = '삭제';
          deleteBtn.className = 'deleteBtn';
          deleteBtn.dataset.commentId = comment.id;
          deleteBtn.dataset.postId = postId;

          // 답글 버튼
          const replyBtn = document.createElement('button');
          replyBtn.textContent = '답글';
          replyBtn.className = 'replyBtn';
          replyBtn.dataset.commentId = comment.id;
          replyBtn.dataset.postId = postId;

          // 버튼 컨테이너
          const btnContainer = document.createElement('div');
          btnContainer.className = 'comment-buttons';
          btnContainer.appendChild(deleteBtn);
          btnContainer.appendChild(replyBtn);

          // 댓글 li에 붙이기
          li.appendChild(metaDiv);
          li.appendChild(contentDiv);
          li.appendChild(btnContainer);

          // 답글들이 있으면 ul로 묶어서 하위에 렌더링
          if (comment.replies && comment.replies.length > 0) {
            const replyUl = document.createElement('ul');
            replyUl.className = 'reply-list';
            replyUl.style.marginLeft = '20px';  // 들여쓰기

            comment.replies.forEach(reply => {
              const replyLi = document.createElement('li');

              const replyMeta = document.createElement('div');
              replyMeta.className = 'reply-meta';

              const replyAuthor = document.createElement('span');
              replyAuthor.className = 'author';
              replyAuthor.textContent = reply.author || '익명';

              if (reply.uid) {
                replyAuthor.dataset.uid = reply.uid;
              }

              // reply.ip가 있으면 (ip) 표시
              const existingReplyIpSpan = replyAuthor.querySelector('.ip-front');
              if (existingReplyIpSpan) existingReplyIpSpan.remove();

              if (reply.ip) {
                const ipSpan = document.createElement('span');
                ipSpan.className = 'ip-front';
                ipSpan.textContent = ` (${reply.ip})`;
                ipSpan.style.color = 'rgb(154,154,154)';
                replyAuthor.appendChild(ipSpan);
              }

              const replyTime = document.createElement('span');
              replyTime.className = 'time';
              replyTime.textContent = ` | ${reply.time}`;

              replyMeta.appendChild(replyAuthor);
              replyMeta.appendChild(replyTime);

              const replyContent = document.createElement('div');
              replyContent.className = 'reply-content';
              replyContent.textContent = reply.content;

              // 답글 삭제 버튼 (필요하면 추가)
              const replyDeleteBtn = document.createElement('button');
              replyDeleteBtn.textContent = '삭제';
              replyDeleteBtn.className = 'deleteReplyBtn';
              replyDeleteBtn.dataset.replyId = reply.id;
              replyDeleteBtn.dataset.postId = postId;
              replyDeleteBtn.dataset.commentId = comment.id;
              replyDeleteBtn.dataset.uid = reply.uid;

              if (reply.uid) {
                replyDeleteBtn.style.display = 'none';
                if (reply.uid === localStorage.getItem('ID')) {
                  replyDeleteBtn.style.display = 'inline-block';
                }
              }

              replyLi.appendChild(replyMeta);
              replyLi.appendChild(replyContent);
              replyLi.appendChild(replyDeleteBtn);

              replyUl.appendChild(replyLi);
            });

            li.appendChild(replyUl);
          }

          commentList.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      commentList.innerHTML = '<li>댓글을 불러오는 데 실패했습니다.</li>';
    }
  }


  // 게시글 삭제 이벤트
    deleteForm.addEventListener('submit', async e => {
  e.preventDefault();
    let ID = localStorage.getItem("ID");
    const uid = postAuthor.dataset.uid;

    let password = "";  // 비로그인 시 입력받을 비밀번호
    if (!uid) {
        ID = null;
        password = prompt('삭제 비밀번호를 입력하세요.');
        if (!password) {
        alert('삭제가 취소되었습니다.');
        return;
        }
    }

    const bodyData = ID ? { uid: ID } : { password };

    try {
        const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        });

        if (res.ok) {
        alert('게시글이 삭제되었습니다.');
        location.href = `board.html?board=${encodeURIComponent(boardName)}`;
        } else if (res.status === 403) {
        alert('비밀번호가 일치하지 않거나 삭제 권한이 없습니다.');
        } else {
        alert('게시글 삭제에 실패했습니다.');
        }
    } catch (err) {
        alert('서버 오류가 발생했습니다.');
        console.error(err);
    }
    });



  // 추천하기 버튼 이벤트
  recommendBtn.addEventListener('click', async () => {
    ipFront = await getIpFrontPart();
    try { ///board/:boardName/posts/:id/recommend
    const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip:ipFront }) // uid는 필요 시 포함
    });

    const data = await res.json(); // 항상 먼저 JSON 파싱

    if (!res.ok) {
      if (data.error === '이미 추천하셨습니다.') {
        alert('이미 추천하셨습니다.');
      } else {
        alert(`추천 실패: ${data.error || '알 수 없는 오류'}`);
      }
      return;
    }

    // 성공 시
    console.log('추천 성공', data);
    document.getElementById('postRecommendCount').textContent = data.recommend;
  } catch (err) {
    console.error('추천 요청 중 오류 발생:', err);
    alert('서버 오류가 발생했습니다.');
  }
});

  // 댓글 작성 이벤트
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let author = "";
    let password = "";
    let content = commentContentInput.value.trim();
    let uid = "";

    if (token) {
      author = localStorage.getItem("username") || "익명";
      uid = localStorage.getItem("ID") || "";
    } else {
      author = commentAuthorInput.value.trim();
      password = commentPasswordInput.value.trim();
      if (!ipFront) ipFront = await getIpFrontPart(); // 비로그인 시 IP가 없으면 재요청
    }

    if (!author) {
      alert('이름을 입력하세요.');
      return;
    }
    if (!content) {
      alert('댓글 내용을 입력하세요.');
      return;
    }
    if (!uid && (!password || !ipFront)) {
      alert('비로그인 사용자는 비밀번호와 IP가 필요합니다.');
      return;
    }

    const commentData = { author, content, uid };
    if (!uid) {
      commentData.password = password;
      commentData.ip = ipFront;
    }

    try {
      const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData),
      });

      if (!res.ok) {
        const err = await res.text();
        alert('댓글 작성 실패: ' + err);
        return;
      }

      // 입력란 초기화
      if (!uid) {
        commentAuthorInput.value = '';
        commentPasswordInput.value = '';
      }
      commentContentInput.value = '';

      // 댓글 목록 갱신
      await loadComments();

    } catch (err) {
      alert('댓글 작성 중 오류가 발생했습니다.');
      console.error(err);
    }
  });

  // 초기 데이터 로드
  await loadPost();
  await loadComments();



  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('deleteBtn')) {
      const commentId = e.target.dataset.commentId;
      const postId = e.target.dataset.postId;

      const li = e.target.closest('li');
      const authorSpan = li.querySelector('.author'); 
      const commentUid = authorSpan?.dataset.uid;
      const myUid = localStorage.getItem('ID');

      const payload = {};

      if (myUid && commentUid && myUid === commentUid) {
        payload.uid = myUid;
      } else {
        const password = prompt("댓글 삭제 비밀번호를 입력하세요:");
        if (!password) return;
        payload.password = password;
      }

      const params = new URLSearchParams(location.search);
      const boardName = params.get('board');
      if (!boardName) {
        alert('게시판 정보가 없습니다.');
        return;
      }

      const url = `/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/comment/${encodeURIComponent(commentId)}`;

      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert("댓글이 삭제되었습니다.");
          li.remove();
        } else if (res.status === 403) {
          alert("삭제 권한이 없습니다.");
        } else {
          alert("댓글 삭제 실패");
        }
      } catch (err) {
        console.error(err);
        alert("서버 오류");
      }
    }
    if (e.target.classList.contains('replyBtn')) {
      const li = e.target.closest('li');
      if (!li) return;

      let replyBox = li.querySelector('.replyBox');
      if (!replyBox) {
        const token = localStorage.getItem('accessToken');
        const isLoggedIn = !!token;

        replyBox = document.createElement('div');
        replyBox.className = 'replyBox';
        replyBox.style.marginTop = '8px';
        replyBox.style.borderLeft = '2px solid #ccc';
        replyBox.style.paddingLeft = '10px';

        replyBox.innerHTML = `
          <textarea class="replyInput" rows="3" placeholder="답글을 입력하세요" style="width: 100%;"></textarea>
          <br/>
          <input type="text" class="replyAuthor" placeholder="이름" style="margin-top: 5px; display: ${isLoggedIn ? 'none' : 'inline-block'};" />
          <input type="password" class="replyPassword" placeholder="비밀번호" style="margin-top: 5px; margin-left: 5px; display: ${isLoggedIn ? 'none' : 'inline-block'};" />
          <br/>
          <button class="submitReplyBtn" data-comment-id="${e.target.dataset.commentId}" data-post-id="${e.target.dataset.postId}" style="margin-top: 5px;">등록</button>
          <button class="cancelReplyBtn" style="margin-top: 5px; margin-left: 5px;">취소</button>
        `;

        li.appendChild(replyBox);
      }

      replyBox.style.display = (replyBox.style.display === 'block') ? 'none' : 'block';
    }
    if (e.target.classList.contains('submitReplyBtn')) {
    const replyBox = e.target.closest('.replyBox');
    if (!replyBox) return;

    const commentId = e.target.dataset.commentId;
    const postId = e.target.dataset.postId;

    const content = replyBox.querySelector('.replyInput').value.trim();

    let author = "";
    let password = replyBox.querySelector('.replyPassword')?.value.trim() || "";
    let uid = "";
    let ip = ipFront;  // 전역변수로 선언된 사용자 IP (비로그인일 때 사용)

    const token = localStorage.getItem('accessToken');
    if (token) {
      author = localStorage.getItem("username") || "";
      uid = localStorage.getItem("ID") || "";
      password = ""; // 로그인 시 비밀번호는 보내지 않음
      ip = "";       // 로그인 시 IP도 보내지 않음
    } else {
      author = replyBox.querySelector('.replyAuthor')?.value.trim() || "";
    }

    // 전송할 데이터 객체 구성
    const replyData = {
      content,
      author,
      password,
      uid,
      ip
    };

    try {
      const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/comment/${encodeURIComponent(commentId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData),
    });

      if (!res.ok) {
        const errorData = await res.json();
        alert("댓글 등록 실패: " + errorData.error);
        return;
      }

      alert("답글이 등록되었습니다.");
      window.location.reload();

    } catch (err) {
      console.error("에러 발생:", err);
      alert("서버 오류로 인해 답글을 등록할 수 없습니다.");
    }

  }

  if (e.target.classList.contains('deleteReplyBtn')) {
    const boardName = params.get('board');
    const postId = e.target.dataset.postId;
    const replyId = e.target.dataset.replyId;

    const dataUid = e.target.dataset.uid || "";  // 답글에 usid가 있으면 이 값
    const isLoggedIn = !!localStorage.getItem('ID');  // 로그인 상태 여부
    let uid = "";
    let password = "";

    if (e.target.classList.contains('deleteReplyBtn')) {
      const boardName = params.get('board');
      const postId = e.target.dataset.postId;
      const replyId = e.target.dataset.replyId;
      const dataUid = e.target.dataset.uid || "";  // 답글 작성자의 UID (없으면 비회원)
      const currentUid = localStorage.getItem('ID') || "";
      let uid = "";
      let password = "";

      if (dataUid) {
        // 로그인 유저 작성 답글
        if (currentUid === dataUid) {
          // 현재 로그인한 사람이 작성자면 바로 삭제
          uid = currentUid;
        } else {
          // 작성자가 다른 유저이거나 비로그인 상태면 비밀번호 입력
          password = prompt("비밀번호를 입력하세요");
          if (!password) return alert("비밀번호가 필요합니다.");
        }
      } else {
        // 비회원 작성 답글이면 무조건 비밀번호 필요
        password = prompt("비밀번호를 입력하세요");
        if (!password) return alert("비밀번호가 필요합니다.");
      }

      try {
        const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts/${encodeURIComponent(postId)}/reply/${encodeURIComponent(replyId)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, password })
        });

        if (res.ok) {
          alert('답글이 삭제되었습니다.');
          loadComments();
        } else {
          const errText = await res.text();
          alert(`삭제 실패: ${errText}`);
        }
      } catch (err) {
        alert('서버와 통신 중 오류가 발생했습니다.');
        console.error(err);
      }
    }


  }

  });
});

