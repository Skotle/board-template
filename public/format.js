const contentDiv = document.getElementById('content');

const formatState = {
  bold: false,
  underline: false,
  strike: false,
  fontSize: ''
};

const boldBtn = document.getElementById('boldBtn');
const underlineBtn = document.getElementById('underlineBtn');
const strikeBtn = document.getElementById('strikeBtn');
const clearFormatBtn = document.getElementById('clearFormatBtn');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const currentFontSizeDisplay = document.getElementById('currentFontSize');

// 버튼 누른 상태 토글 및 적용 관리
function setupToggleButton(button, styleKey) {
  button.addEventListener('mousedown', e => {
    e.preventDefault();
    formatState[styleKey] = true;
    button.classList.add('active');
  });
  document.addEventListener('mouseup', e => {
    if (formatState[styleKey]) {
      formatState[styleKey] = false;
      button.classList.remove('active');
    }
  });
}

// 서식 삭제 버튼
clearFormatBtn.addEventListener('click', () => {
  clearSelectionFormats();
});

setupToggleButton(boldBtn, 'bold');
setupToggleButton(underlineBtn, 'underline');
setupToggleButton(strikeBtn, 'strike');

fontSizeSelect.addEventListener('change', () => {
  formatState.fontSize = fontSizeSelect.value || '';
  updateCurrentFontSize();
});

// 실시간 서식 적용: keydown / input 이벤트에서 적용
contentDiv.addEventListener('beforeinput', e => {
  // text 입력 전에 실행되어 커스텀 서식 적용 가능
  if (e.inputType === 'insertText' && e.data) {
    e.preventDefault(); // 기본 입력 방지

    let span = document.createElement('span');

    if (formatState.bold) span.style.fontWeight = 'bold';
    if (formatState.underline) span.style.textDecoration = span.style.textDecoration ? span.style.textDecoration + ' underline' : 'underline';
    if (formatState.strike) span.style.textDecoration = span.style.textDecoration ? span.style.textDecoration + ' line-through' : 'line-through';
    if (formatState.fontSize) span.style.fontSize = formatState.fontSize;

    span.textContent = e.data;

    // 현재 커서 위치에 삽입
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    range.deleteContents();
    range.insertNode(span);

    // 커서 위치를 새로 삽입된 노드 뒤로 이동
    range.setStartAfter(span);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    updateCurrentFontSize();
  }
});

// 선택 영역 내 모든 스타일 span 제거 (서식 삭제)
function clearSelectionFormats() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return; // 선택 영역이 없으면 리턴

  // 선택 영역 내 노드 탐색 및 span 태그 제거
  const fragment = range.cloneContents();
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT, {
    acceptNode: node => node.tagName === 'SPAN' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  });

  let nodesToClear = [];
  while (walker.nextNode()) {
    nodesToClear.push(walker.currentNode);
  }

  // 선택 영역 내용 HTML 가져오기
  let html = fragment.innerHTML;

  // span 태그 제거 (스타일 유지하지 않음)
  html = html.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  // 선택 영역에 정리된 HTML 삽입
  document.execCommand('insertHTML', false, html);

  contentDiv.focus();
}

// 현재 커서 위치 폰트 사이즈 표시
function updateCurrentFontSize() {
  const sel = window.getSelection();
  if (!sel.rangeCount) {
    currentFontSizeDisplay.textContent = '(기본)';
    return;
  }
  const node = sel.anchorNode;
  if (!node) {
    currentFontSizeDisplay.textContent = '(기본)';
    return;
  }
  let el = node.nodeType === 3 ? node.parentElement : node;
  if (!el) {
    currentFontSizeDisplay.textContent = '(기본)';
    return;
  }
  const fontSize = window.getComputedStyle(el).fontSize;
  currentFontSizeDisplay.textContent = `(${fontSize})`;
}

// 초기 표시
updateCurrentFontSize();
