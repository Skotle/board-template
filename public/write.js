// DOM 요소 참조
const contentDiv = document.getElementById('content');
const imageInput = document.getElementById('image');
const postForm = document.getElementById('postForm');

// 로그인 상태 및 IP 앞부분 (예: 이 부분은 실제 앱에 맞게 수정 필요)
let ipFront = null;

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

// IP 앞부분 얻기
getIpFrontPart().then(front => { ipFront = front; });

// 이미지 다중 삽입: 선택한 이미지 파일을 읽어 contenteditable div 커서 위치에 삽입
imageInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  
  try {
    const response = await fetch('/upload-images', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.urls) {
      for (const url of result.urls) {
        insertImageAtCursor(url); // base64 → URL 삽입으로 변경됨
      }
    } else {
      alert('이미지 업로드 실패: ' + result.message);
    }
  } catch (err) {
    console.error('업로드 에러:', err);
    alert('이미지 업로드 중 오류가 발생했습니다.');
  }
  
  e.target.value = ''; // input 초기화
});


document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("accessToken");
  const authOnlyElements = document.querySelectorAll(".auth-only");
  const passwordInput = document.getElementById("password");

  if (token) {
    // 로그인 상태 → 닉네임, 비밀번호 숨김
    authOnlyElements.forEach(el => {
      el.style.display = "none";
      el.disabled = true;
      el.removeAttribute("required");
    });
    if (passwordInput) {
      passwordInput.style.display = "none";
      passwordInput.disabled = true;
      passwordInput.removeAttribute("required");
    }
  } else {
    // 비로그인 상태 → 닉네임, 비밀번호 보임
    authOnlyElements.forEach(el => {
      el.style.display = "block";  // block 또는 inline-block, CSS에 맞게 조절
      el.disabled = false;
      el.setAttribute("required", "true");
    });
    if (passwordInput) {
      passwordInput.style.display = "block";
      passwordInput.disabled = false;
      passwordInput.setAttribute("required", "true");
    }
  }
});


// contenteditable div 커서 위치에 이미지 삽입 함수
function insertImageAtCursor(imageSrc) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    contentDiv.focus();
  }
  const range = sel.getRangeAt(0);

  const img = document.createElement('img');
  img.src = imageSrc;
  img.style.maxWidth = '100%';
  img.alt = '첨부된 이미지';

  range.deleteContents();
  range.insertNode(img);

  // 커서를 이미지 뒤로 이동
  range.setStartAfter(img);
  range.setEndAfter(img);
  sel.removeAllRanges();
  sel.addRange(range);

  contentDiv.focus();
}

// 폼 제출 이벤트 처리
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 로그인 토큰, 닉네임 등 로컬스토리지에서 불러오기 (필요 시 앱에 맞게 수정)
  const token = localStorage.getItem("accessToken");

  const formData = new FormData();

  if (token) {
    const username = localStorage.getItem("username") || "익명";
    const userID = localStorage.getItem("ID") || "";
    formData.append("author", username);
    formData.append("sign", userID);
  } else {
    const author = document.getElementById('author').value.trim();
    const passwordInput = document.getElementById('password');
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!author) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    formData.append('author', author);
    formData.append('password', password);
    formData.append('nosign', ipFront || '');
  }

  const title = document.getElementById('title').value.trim();
  if (!title) {
    alert('제목을 입력해주세요.');
    return;
  }

  const contentHTML = contentDiv.innerHTML.trim();
  if (!contentHTML) {
    alert('본문 내용을 입력하세요.');
    contentDiv.focus();
    return;
  }

  formData.append('title', title);
  formData.append('content', contentHTML);
  formData.append('category', document.getElementById('category').value);

  // 이미지 여러 개 파일폼에 추가
  const imageFiles = imageInput.files;
  for (const file of imageFiles) {
    formData.append('images', file);
  }

  try {
    const res = await fetch('/posts', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      alert('작성 완료!');
      window.location.href = 'index.html';
    } else {
      const errorText = await res.text();
      alert('작성 실패: ' + errorText);
    }
  } catch (err) {
    alert('통신 오류: ' + err.message);
  }
});

async function uploadImages() {
  const input = document.getElementById('imageInput');
  const files = input.files;

  if (!files.length) return;

  const formData = new FormData();
  for (let file of files) {
    formData.append('images', file);
  }

  try {
    const response = await fetch('/upload-images', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.urls) {
      const contentEl = document.getElementById('content');
      for (const url of result.urls) {
        contentEl.value += `<img src="${url}" style="max-width:100%;"><br>\n`;
      }
    } else {
      alert('이미지 업로드 실패: ' + result.message);
    }
  } catch (err) {
    console.error('업로드 에러:', err);
    alert('이미지 업로드 중 오류가 발생했습니다.');
  }
}
