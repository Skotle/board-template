// profileData.js
export async function loadProfileData(userId) {
  try {
    const res = await fetch(`/api/profile/${userId}`);
    if (!res.ok) throw new Error("프로필 API 호출 실패");
    return await res.json();
  } catch (err) {
    console.error("프로필 로드 오류:", err);
    return null;
  }
}

export function renderProfile(profile) {
  if (!profile) return;
  document.getElementById("username").textContent = profile.username;
  document.getElementById("userID").textContent = profile.userID;
  document.getElementById("statusMessage").textContent = profile.statusMessage || "";
  document.getElementById("joinDate").textContent = profile.joinDate || "";
  document.getElementById("lastLogin").textContent = profile.lastLogin || "";
  document.getElementById("postCount").textContent = profile.postCount || 0;
  document.getElementById("commentCount").textContent = profile.commentCount || 0;
  document.getElementById("likeCount").textContent = profile.likeCount || 0;
  document.getElementById("bio").textContent = profile.bio || "";
}
