(() => {
  // 게시판 목록 API 호출
  async function getBoardList() {
    try {
      const res = await fetch('/boards');
      if (!res.ok) return [];
      return await res.json(); // [{id, name, count}]
    } catch {
      return [];
    }
  }

  // localStorage에 {id, board} 형태로 저장 (중복 제거, 최대 10개 유지)
  function addVisitedBoard(boardId, boardName) {
    if (!boardId || !boardName) return;

    let visited = JSON.parse(localStorage.getItem('visitedBoards') || '[]');

    // 중복 제거
    visited = visited.filter(b => b.id !== boardId);

    // 최신 방문 추가 (왼쪽부터 최신)
    visited.unshift({ id: boardId, board: boardName });

    // 최대 10개 유지
    if (visited.length > 10) visited = visited.slice(0, 10);


    localStorage.setItem('visitedBoards', JSON.stringify(visited));
  }

  // URL에서 ?board= 값 추출
  function getBoardIdFromURL() {
    return new URLSearchParams(window.location.search).get('board');
  }

  // 최근 방문 기록 표시
  async function showVisitedBoards() {
    const logbox = document.querySelector('.log-bar');
    if (!logbox) return;
    if (document.getElementById('visited-boards-container')) return;

    let visited = JSON.parse(localStorage.getItem('visitedBoards') || '[]');
    if (!visited.length) return;

    const boards = await getBoardList();
    if (!boards.length) return;

    // API로 유효한 게시판만 필터링
    visited = visited.filter(v => boards.some(b => b.id === v.id));
    localStorage.setItem('visitedBoards', JSON.stringify(visited));

    if (!visited.length) return;

    const container = document.createElement('div');
    container.id = 'visited-boards-container';
    Object.assign(container.style, {
      color: 'white',
      fontSize: '0.9em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      marginRight: '20px',
    });

    const label = document.createElement('span');
    label.textContent = '최근 방문:';
    container.appendChild(label);

    visited.forEach(({ id, board }) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '5px';

      const link = document.createElement('a');
      link.href = `/board.html?board=${encodeURIComponent(id)}`;
      link.textContent = board;
      link.style.color = 'white';
      link.style.textDecoration = 'underline';
      link.dataset.boardId = id;

      const btn = document.createElement('span');
      btn.textContent = '✖';
      btn.style.cursor = 'pointer';
      btn.style.color = 'red';
      btn.style.fontWeight = 'bold';
      btn.title = '방문 기록에서 제거';
      btn.addEventListener('click', e => {
        e.preventDefault();
        removeVisitedBoard(id);
      });

      wrapper.appendChild(link);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    });

    if (container.children.length > 1) {
      logbox.parentNode.insertBefore(container, logbox);
    }
  }

  // 방문 기록에서 제거
  function removeVisitedBoard(boardId) {
    let visited = JSON.parse(localStorage.getItem('visitedBoards') || '[]');
    visited = visited.filter(b => b.id !== boardId);
    localStorage.setItem('visitedBoards', JSON.stringify(visited));

    const elem = document.querySelector(`[data-board-id="${boardId}"]`)?.parentElement;
    if (elem) elem.remove();

    // 기록이 다 없어졌으면 전체 컨테이너 제거
    if (!visited.length) {
      document.getElementById('visited-boards-container')?.remove();
    }
  }

  // 방문 기록에 추가 시도
  async function tryAddVisitedBoard() {
    const boardId = getBoardIdFromURL();
    if (!boardId) return;

    // API에서 게시판 이름 찾기
    const boards = await getBoardList();
    const boardInfo = boards.find(b => b.id === boardId);
    if (boardInfo) {
      addVisitedBoard(boardInfo.id, boardInfo.name);
    }
  }

  // 진입점
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await tryAddVisitedBoard();
      showVisitedBoards();
    });
  } else {
    (async () => {
      await tryAddVisitedBoard();
      showVisitedBoards();
    })();
  }
})();
