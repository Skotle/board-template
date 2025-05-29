document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("accessToken");
  const authOnlyElements = document.querySelectorAll(".auth-only");
  const passwordInput = document.getElementById("password");

  if (token) {
    // 로그인 상태: 비밀번호 입력창 숨김 + required 제거 + disabled 처리
    if (passwordInput) {
      passwordInput.style.display = "none";
      passwordInput.disabled = true;
      passwordInput.removeAttribute("required");
    }
    authOnlyElements.forEach(el => el.style.display = "none");
  } else {
    // 비로그인 상태: 비밀번호 입력창 보임 + required 설정
    if (passwordInput) {
      passwordInput.style.display = "inline-block";
      passwordInput.disabled = false;
      passwordInput.setAttribute("required", "true");
    }
    authOnlyElements.forEach(el => el.style.display = "inline-block");
  }
});


document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  const token = localStorage.getItem("accessToken");

  if (token) {
    const username = localStorage.getItem("username") || "익명";
    formData.append('author', username);
    formData.append('sign', username);
  } else {
    formData.append('sign', false);
    const authorInput = document.getElementById("author");
    const passwordInput = document.getElementById("password");

    if (!authorInput) {
      alert("닉네임 입력 필드가 없습니다.");
      return;
    }

    const nickname = authorInput.value.trim();
    if (!nickname) {
      alert("닉네임을 입력해주세요.");
      authorInput.focus();
      return;
    }

    if (!passwordInput || !passwordInput.value.trim()) {
      alert("비밀번호를 입력해주세요.");
      passwordInput.focus();
      return;
    }

    formData.append("author", nickname);
    formData.append("password", passwordInput.value);
  }

  formData.append('title', document.getElementById('title').value);
  formData.append('content', document.getElementById('content').value);
  formData.append('category', document.getElementById('category').value);

  const image = document.getElementById('image').files[0];
  if (image) formData.append('image', image);

  const res = await fetch('/posts', {
    method: 'POST',
    body: formData
  });

  if (res.ok) {
    alert('작성 완료');
    window.location.href = 'index.html';
  } else {
    const errorText = await res.text();
    alert('작성 실패: ' + errorText);
  }
});
