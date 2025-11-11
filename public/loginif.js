document.addEventListener("DOMContentLoaded", async () => {
  const boardList = document.getElementById('boardList');
  const addForm = document.getElementById("addBoardArea");
  const logBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logoutBtn");
  const token = localStorage.getItem("accessToken");
  const newsignBtn = document.getElementById("newsign");
  const welcome = document.getElementById("welcome");
  const username = localStorage.getItem("username");

  // 방문 기록 저장 함수
  function addVisitedBoard(boardName) {
    let visited = JSON.parse(localStorage.getItem('visitedBoards') || '[]');
    visited = visited.filter(name => name !== boardName);
    visited.unshift(boardName);
    if (visited.length > 5) visited.pop();
    localStorage.setItem('visitedBoards', JSON.stringify(visited));
  }

  // 로그인 상태 UI 변경
  if (token) {
    logBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    newsignBtn.style.display = "none";
    welcome.style.display = "inline-block";
    welcome.textContent = `환영합니다, ${username}님`;
  }

  // 로그아웃 기능
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    localStorage.removeItem("ID");
    alert("로그아웃 되었습니다.");
    window.location.reload();
  });
})