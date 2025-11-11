// ===== 전역 변수 =====
let ID = null;
let username = null;
let authority = null;
let loggedIn = false;
let ipFront = null;

// ===== 로그인 상태 확인 =====
async function checkLogin() {
  try {
    const res = await fetch("/api/check-login", { method: "GET", credentials: "include" });
    if (!res.ok) { loggedIn = false; return false; }
    const data = await res.json();
    loggedIn = !!data.loggedIn;
    username = data.username || null;
    authority = data.authority || null;
    ID = data.ID || null;
    return loggedIn;
  } catch (err) {
    console.error("로그인 상태 확인 오류:", err);
    loggedIn = false;
    return false;
  }
}

// ===== 로그인 UI 처리 =====
function updateUIByLogin() {
  const authOnlyElements = document.querySelectorAll('.auth-only');
  const passwordInput = document.getElementById('password');
  if (loggedIn) {
    authOnlyElements.forEach(el => { el.style.display = 'none'; el.disabled = true; el.removeAttribute('required'); });
    if (passwordInput) { passwordInput.style.display = 'none'; passwordInput.disabled = true; passwordInput.removeAttribute('required'); }
  } else {
    authOnlyElements.forEach(el => { el.style.display = 'inline-block'; el.disabled = false; el.setAttribute('required', 'true'); });
    if (passwordInput) { passwordInput.style.display = 'block'; passwordInput.disabled = false; passwordInput.setAttribute('required', 'true'); }
  }
}

// ===== IP 앞부분 가져오기 (비로그인 시) =====
async function getIpFrontPart() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip.split('.').slice(0,2).join('.');
  } catch (err) {
    console.error('IP 가져오기 실패:', err);
    return null;
  }
}

// ===== 커서 위치 이미지 삽입 =====
function insertImageAtCursor(url) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    const editor = document.getElementById('content');
    editor.focus();
    const newSel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    newSel.removeAllRanges();
    newSel.addRange(range);
  }
  const range = window.getSelection().getRangeAt(0);
  const img = document.createElement('img');
  img.src = url; img.style.maxWidth = '100%';
  range.insertNode(img);
}

// ===== 커서 위치 오디오 삽입 =====
function insertAudioAtCursor(url) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) document.getElementById('content').focus();
  const range = sel.getRangeAt(0);
  const audio = document.createElement('audio');
  audio.controls = true; audio.src = url; audio.style.display = 'block'; audio.style.marginTop = '10px';
  range.deleteContents();
  range.insertNode(audio);
  range.setStartAfter(audio); range.setEndAfter(audio);
  sel.removeAllRanges(); sel.addRange(range);
  document.getElementById('content').focus();
}

// ===== 유튜브 및 URL 자동 변환 =====
function convertContentLinks(contentDiv) {
  const html = contentDiv.innerHTML;

  // 유튜브 변환
  const youtubePattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]{11})/g;
  let replaced = html.replace(youtubePattern, (m,id) => `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);

  // 일반 URL
  const urlPattern = /(?<!["'>])(https?:\/\/[^\s<]+)/g;
  replaced = replaced.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

  if (contentDiv.innerHTML !== replaced) {
    contentDiv.innerHTML = replaced;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(contentDiv);
    range.collapse(false);
    sel.removeAllRanges(); sel.addRange(range);
  }
}

// ===== DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', async () => {
  const contentDiv = document.getElementById('content');
  const imageInput = document.getElementById('image');
  const postForm = document.getElementById('postForm');
  const categorySelect = document.getElementById('category');

  loggedIn = await checkLogin();
  updateUIByLogin();
  if (!loggedIn) ipFront = await getIpFrontPart();

  // 게시판 이름 추출
  const params = new URLSearchParams(location.search);
  const boardName = params.get('board');
  if (!boardName) { alert('게시판 정보가 없습니다.'); return; }

  // 카테고리 로드
  try {
    const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts`);
    const data = await res.json();
    categorySelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value=''; defaultOption.textContent='카테고리 선택';
    categorySelect.appendChild(defaultOption);
    Object.entries(data.post_category || {}).forEach(([id,name]) => {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = name;
      categorySelect.appendChild(opt);
    });
  } catch(err){ console.error('카테고리 로드 실패:', err); }

  // content input 이벤트
  contentDiv.addEventListener('input', () => convertContentLinks(contentDiv));

  // 이미지 업로드
  imageInput.addEventListener('change', async e => {
  const files = e.target.files; 
  if (!files.length) return;

  const formData = new FormData();
  for (const f of files) formData.append('images', f); // 서버와 동일하게 'images' // 서버에서 'files'로 받도록 통일
  try {
    const res = await fetch('/uploads', { method:'POST', body: formData });
    const result = await res.json();
    if (res.ok && result.urls) result.urls.forEach(url => insertImageAtCursor(url));
    else alert('업로드 실패: '+(result.message||''));
  } catch(err){
    console.error(err);
    alert('업로드 오류');
  }
  e.target.value = '';
});


  // 오디오 녹음
  let mediaRecorder, recordedChunks=[];
  document.getElementById('startRecord').addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRecorder = new MediaRecorder(stream); recordedChunks=[];
      mediaRecorder.ondataavailable = e => { if(e.data.size>0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks,{type:'audio/webm'});
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        try {
          const res = await fetch('/upload-audio',{method:'POST',body:formData});
          const result = await res.json();
          if(res.ok && result.url) insertAudioAtCursor(result.url);
          else alert('오디오 업로드 실패: '+(result.message||''));
        } catch(err){ console.error(err); alert('오디오 업로드 오류'); }
      };
      mediaRecorder.start();
      document.getElementById('startRecord').disabled = true;
      document.getElementById('stopRecord').disabled = false;
    } catch(err){ alert('마이크 접근 불가'); console.error(err); }
  });
  document.getElementById('stopRecord').addEventListener('click', () => {
    mediaRecorder.stop();
    document.getElementById('startRecord').disabled=false;
    document.getElementById('stopRecord').disabled=true;
  });

  // 글 작성
  postForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const contentHTML = contentDiv.innerHTML.trim();
    const category = categorySelect.value || '';

    if(!title){ alert('제목 입력'); return; }
    if(!contentHTML){ alert('본문 입력'); contentDiv.focus(); return; }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', contentHTML);
    formData.append('category', category);

    if(loggedIn){ formData.append('author', username); formData.append('uid', ID); }
    else {
      const author = document.getElementById('author').value.trim();
      const password = document.getElementById('password').value.trim();
      if(!author || !password){ alert('닉네임/비밀번호 입력'); return; }
      formData.append('author', author); formData.append('password', password); formData.append('ipFront', ipFront||'');
    }

    const imageFiles = imageInput.files;
    for(const f of imageFiles) formData.append('images', f);

    try {
      const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts`, { method:'POST', body:formData });
      if(res.ok){ alert('작성 완료'); location.href=`board.html?board=${encodeURIComponent(boardName)}`; }
      else { const errText = await res.text(); alert('작성 실패: '+errText); }
    } catch(err){ console.error(err); alert('서버 통신 오류'); }
  });
});
