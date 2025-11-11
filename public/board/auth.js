// auth.js

export async function checkIfAdmin(boardName) {
  try {
    const res = await fetch('/api/check-admin', {
      method: 'GET',
      credentials: 'include', // 쿠키 전송
    });

    if (!res.ok) return false;

    const data = await res.json();
    const authority = data.authority || { admin: false, boards: [] };

    if (authority.admin) return true;
    if (Array.isArray(authority.boards) && boardName) {
      return authority.boards.includes(boardName);
    }

    return false;
  } catch (err) {
    console.error('관리자 확인 중 오류:', err);
    return false;
  }
}


// 쿠키 기반 로그인 UI 세팅
export async function setupLoginUI() {
  const logBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logoutBtn");
  const newsignBtn = document.getElementById("newsign");
  const welcome = document.getElementById("welcome");

  try {
    const res = await fetch('/api/check-login', {
      method: 'GET',
      credentials: 'include' // 쿠키 전송
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.loggedIn) return;

    const username = data.username;
    logBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    newsignBtn.style.display = "none";
    welcome.style.display = "inline-block";
    welcome.textContent = `환영합니다, ${username}님`;
    welcome.style.color = "white";
  } catch (err) {
    console.error('로그인 UI 설정 중 오류:', err);
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
      alert("로그아웃 되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("로그아웃 중 오류 발생");
    }
  });
}
