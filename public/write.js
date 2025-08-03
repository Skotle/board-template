// 전역 변수로 선언 (초기값 null)
let ipFront;

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

// 전역 변수에 할당
getIpFrontPart().then(front => {
  ipFront = front;
  if (ipFront) {
    console.log('IP 앞부분 할당 완료:', ipFront);
  } else {
    console.log('IP를 가져올 수 없습니다.');
  }
});

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
  const token = localStorage.getItem("ID");

  if (token) {
    const username = localStorage.getItem("username") || "익명";
    const userID = localStorage.getItem("ID");
    formData.append('author', username);
    formData.append('sign', userID);
  } else {
    formData.append('nosign', ipFront);
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
