document.addEventListener("DOMContentLoaded", async () => {
  const boardList = document.getElementById('boardList');
  const addForm = document.getElementById("addBoardArea");
  const logBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logoutBtn");
  const newsignBtn = document.getElementById("newsign");
  const welcome = document.getElementById("welcome");

  // 방문 기록 저장 함수
  function addVisitedBoard(boardName) {
    let visited = JSON.parse(localStorage.getItem('visitedBoards') || '[]');
    visited = visited.filter(name => name !== boardName);
    visited.unshift(boardName);
    if (visited.length > 5) visited.pop();
    localStorage.setItem('visitedBoards', JSON.stringify(visited));
  }

  // 쿠키 기반 로그인 상태 확인
  async function checkLogin() {
    try {
      const res = await fetch("/api/check-login", {
        method: "GET",
        credentials: "include" // 쿠키 전송
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.loggedIn ? data.username : null;
    } catch (err) {
      console.error("로그인 상태 확인 오류:", err);
      return null;
    }
  }

  const username = await checkLogin();

  if (username) {
    logBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    newsignBtn.style.display = "none";
    welcome.style.display = "inline-block";
    welcome.textContent = `환영합니다, ${username}님`;
  }

  // 로그아웃 기능
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
});
