// main.js
import { loadProfileData, renderProfile } from './profileData.js';
import { checkLogin, renderEditButton } from './auth.js';
import { loadUserActivity, renderActivity } from './userActivity.js';

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");
  if (!userId) return;

  const profile = await loadProfileData(userId);
  renderProfile(profile);

  const loginInfo = await checkLogin();
  renderEditButton(userId, loginInfo);

  const { activity, boards } = await loadUserActivity(userId);
  renderActivity(activity, boards);
});
