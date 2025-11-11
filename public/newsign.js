let isUserIDChecked = false;
let isUsernameChecked = false;
let verified = false;
let currentEmail = "";

function validatePassword(pw) {
  const minLength = pw.length >= 8;
  const hasLowercaseLetter = /[a-z]/.test(pw);
  const onlyLowercaseAndNumber = /^[a-z0-9]+$/.test(pw);
  return minLength && hasLowercaseLetter && onlyLowercaseAndNumber;
}

// 기존 중복 체크 함수(아이디, 사용자명)
async function checkDuplicate(field) {
  const inputEl = document.getElementById(field);
  const value = inputEl.value.trim();
  const statusEl = document.getElementById(field + 'Status');

  if (!value) {
    statusEl.textContent = '값을 입력하세요.';
    statusEl.style.color = 'red';
    return;
  }

  if (field === 'userID' && !/^[a-z0-9]+$/.test(value)) {
    statusEl.textContent = '영문 소문자와 숫자만 입력 가능합니다.';
    statusEl.style.color = 'red';
    isUserIDChecked = false;
    return;
  }

  try {
    const res = await fetch(`/api/check-duplicate?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`);
    if (!res.ok) throw new Error('서버 오류 발생');
    const data = await res.json();

    if (data.isDuplicate) {
      statusEl.textContent = '중복됨 ❌';
      statusEl.style.color = 'red';
      if (field === 'userID') isUserIDChecked = false;
      else isUsernameChecked = false;
    } else {
      statusEl.textContent = '사용 가능 ✔️';
      statusEl.style.color = 'green';
      if (field === 'userID') isUserIDChecked = true;
      else isUsernameChecked = true;
    }
  } catch (error) {
    statusEl.textContent = '서버와 통신 중 오류 발생';
    statusEl.style.color = 'red';
  }
}

// 이메일 인증번호 전송
document.getElementById('sendCodeBtn').addEventListener('click', async () => {
  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim();
  const statusEl = document.getElementById('emailStatus');
  const sendBtn = document.getElementById('sendCodeBtn');

  if (!email) {
    statusEl.textContent = '이메일을 입력해주세요.';
    statusEl.style.color = 'red';
    return;
  }

  // 버튼 비활성화 및 스피너 표시
  sendBtn.disabled = true;
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  sendBtn.appendChild(spinner);

  try {
    const res = await fetch('/send-code', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      sendBtn.textContent = data.message || '전송 완료';
      statusEl.textContent = data.message;
      statusEl.style.color = 'green';
      currentEmail = email;
    } else {
      statusEl.textContent = data.message || '인증번호 전송 실패';
      statusEl.style.color = 'red';
      emailInput.focus();
    }
  } catch {
    statusEl.textContent = '서버 오류 발생';
    statusEl.style.color = 'red';
  } finally {
    sendBtn.removeChild(spinner);
    sendBtn.disabled = false;
  }
});

// 이메일 인증번호 확인
document.getElementById('verifyCodeBtn').addEventListener('click', async () => {
  const codeInput = document.getElementById('verificationCode');
  const code = codeInput.value.trim();
  const statusEl = document.getElementById('codeStatus');

  if (!code) {
    statusEl.textContent = '인증번호를 입력해주세요.';
    statusEl.style.color = 'red';
    return;
  }
  try {
    const res = await fetch('/verify-code', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email: currentEmail, code })
    });
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = '인증 성공 ✔️';
      statusEl.style.color = 'green';
      verified = true;
      document.getElementById('submitBtn').disabled = false;
    } else {
      statusEl.textContent = data.message || '인증 실패';
      statusEl.style.color = 'red';
      verified = false;
      document.getElementById('submitBtn').disabled = true;
    }
  } catch {
    statusEl.textContent = '서버 오류 발생';
    statusEl.style.color = 'red';
  }
});

// 비밀번호 보기 토글
document.getElementById('togglePasswordBtn').addEventListener('click', () => {
  const pwInput = document.getElementById('password');
  const btn = document.getElementById('togglePasswordBtn');
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    btn.textContent = '숨기기';
  } else {
    pwInput.type = 'password';
    btn.textContent = '보기';
  }
  pwInput.focus();
});

// 폼 제출 시
document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!verified) {
    alert("이메일 인증을 완료해주세요.");
    return;
  }

  const userID = document.getElementById('userID').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = currentEmail;

  if (!isUserIDChecked || !isUsernameChecked) {
    alert('userID와 username 중복 확인을 해주세요.');
    return;
  }

  if (!validatePassword(password)) {
    alert('비밀번호는 최소 8자 이상이며, 영문자와 숫자를 포함해야 합니다.');
    return;
  }

  try {
    const res = await fetch('/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userID, username, password, email })
    });
    const data = await res.json();
    if (res.ok) {
      alert('성공적으로 추가되었습니다.');
      document.getElementById('userForm').reset();
      document.getElementById('userIDStatus').textContent = '';
      document.getElementById('usernameStatus').textContent = '';
      document.getElementById('emailStatus').textContent = '';
      document.getElementById('codeStatus').textContent = '';
      isUserIDChecked = false;
      isUsernameChecked = false;
      verified = false;
      currentEmail = "";
      document.getElementById('submitBtn').disabled = true;
      window.location.href = "/";
    } else {
      alert(data.message || '에러가 발생했습니다.');
    }
  } catch {
    alert('서버 오류가 발생했습니다.');
  }
});

// nextBtn 클릭 시 이메일 중복 체크 후 2단계 인증 화면 전환 및 이메일 표시
document.getElementById('nextBtn').addEventListener('click', async () => {
  const captchaResponse = grecaptcha.getResponse();
  if (!captchaResponse) {
    alert('캡차 인증을 완료해주세요.');
    return;
  }

  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email').value.trim();
  const emailStatus = document.getElementById('emailStatus');

  if (!isUserIDChecked || !isUsernameChecked) {
    alert('아이디와 닉네임 중복 확인을 해주세요.');
    return;
  }
  if (!validatePassword(password)) {
    alert('비밀번호는 최소 8자 이상이며, 영문자와 숫자를 포함해야 합니다.');
    return;
  }
  if (!email) {
    alert('이메일을 입력해주세요.');
    return;
  }

  try {
    const res = await fetch(`/api/check-duplicate?field=email&value=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('서버 오류 발생');
    const data = await res.json();

    if (data.isDuplicate) {
      emailStatus.textContent = '이미 사용 중인 이메일입니다.';
      emailStatus.style.color = 'red';
      return; // 2단계로 못 넘어감
    } else {
      emailStatus.textContent = '사용 가능한 이메일입니다.';
      emailStatus.style.color = 'green';
      currentEmail = email;

      // 1단계 숨기고 2단계 표시
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';

      // 2단계 인증화면에 이메일 표시 (있으면)
      const emailDisplay = document.getElementById('emailDisplay');
      if (emailDisplay) {
        emailDisplay.textContent = currentEmail;
      }
    }
  } catch (err) {
    emailStatus.textContent = '이메일 확인 중 오류 발생';
    emailStatus.style.color = 'red';
  }
});
