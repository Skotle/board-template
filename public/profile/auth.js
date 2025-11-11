// auth.js
export async function checkLogin() {
  try {
    const res = await fetch("/api/check-login", { method: "GET", credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.loggedIn ? data : null;
  } catch (err) {
    console.error("로그인 상태 확인 오류:", err);
    return null;
  }
}

export function renderEditButton(userId, loginInfo) {
  if (loginInfo && loginInfo.ID === userId) {
    const editBtn = document.getElementById("editBtn");
    if (editBtn) editBtn.style.display = "inline-block";
  }
}
