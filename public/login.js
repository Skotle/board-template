async function login() {
  const id = document.getElementById("id").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  try {
    const response = await fetch("https://irisen-com.onrender.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password })
    });

    const data = await response.json();

    if (response.ok) {
      // 로그인 성공 시
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("username", data.username); // 화면 표시용

      message.style.color = "green";
      message.innerHTML = "로그인 성공!";
      window.location.href = "/";
    } else {
      message.style.color = "red";
      message.innerHTML = data.message;
    }
  } catch (error) {
    console.error("로그인 오류:", error);
    message.style.color = "red";
    message.innerHTML = "서버와 연결할 수 없습니다.";
  }
}
