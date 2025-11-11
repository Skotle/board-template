document.addEventListener("DOMContentLoaded", async () => {
  const userId = new URLSearchParams(window.location.search).get("id");
  if (!userId) return alert("유효하지 않은 사용자 ID입니다.");

  try {
    // ── 1️⃣ 토큰/권한 확인 API 호출 ──
    const authRes = await fetch("/api/check-profile-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 쿠키 전송
      body: JSON.stringify({ profileId: userId })
    });

    if (!authRes.ok) throw new Error("권한 확인 실패");

    const authData = await authRes.json();

    if (!authData.canEdit) {
      alert("해당 프로필을 수정할 권한이 없습니다.");
      window.location.href = `/profile.html?id=${userId}`;
      return; // 페이지 접속 차단
    }

    console.log("✅ 프로필 수정 권한 확인 완료");

    // ── 2️⃣ 기존 프로필 불러오기 ──
    const profileRes = await fetch(`/api/profile/${userId}`, { credentials: "include" });
    if (!profileRes.ok) throw new Error("프로필 불러오기 실패");
    const profile = await profileRes.json();

    document.querySelector('input[name="statusMessage"]').value = profile.statusMessage || "";
    document.querySelector('textarea[name="bio"]').value = profile.bio || "";

    // 기존 프로필 이미지 표시
    if (profile.profileImage) {
      document.getElementById("preview").src = `/img/${profile.profileImage}`;
    }

    // ── 3️⃣ 폼 제출 이벤트 등록 ──
    setupForm(userId);

  } catch (err) {
    console.error("접속 차단 또는 로드 실패:", err);
    alert("권한이 없거나 오류 발생");
    window.location.href = "/";
  }
});

function setupForm(userId) {
  const previewImg = document.getElementById("preview");
  const fileInput = document.querySelector('input[name="profileImage"]');
  let cropper = null;

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewImg.src = URL.createObjectURL(file);

    if (cropper) cropper.destroy();

    cropper = new Cropper(previewImg, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true
    });
  });

  document.getElementById("editForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("statusMessage", e.target.statusMessage.value);
    formData.append("bio", e.target.bio.value);

    if (cropper) {
      cropper.getCroppedCanvas({ width: 900, height: 900 }).toBlob((blob) => {
        formData.append("profileImage", blob, `${userId}.png`);
        sendProfileData(userId, formData);
      });
    } else {
      sendProfileData(userId, formData);
    }
  });
}

async function sendProfileData(userId, formData) {
  try {
    const res = await fetch(`/api/profile/${userId}`, {
      method: "PUT",
      credentials: "include",
      body: formData
    });

    if (res.ok) {
      alert("프로필 수정 완료");
      window.location.href = `/profile.html?id=${userId}`;
    } else {
      const errData = await res.json();
      alert("수정 실패: " + (errData.message || ""));
    }
  } catch (err) {
    alert("오류: " + err.message);
  }
}
