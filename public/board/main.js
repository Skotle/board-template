import { renderPosts, filterPostsByCategory, allPosts, setCategoryMap } from './posts.js';
import { checkIfAdmin, setupLoginUI } from './auth.js';

const params = new URLSearchParams(window.location.search);
const boardName = params.get('board');
let currentPage = parseInt(params.get('page')) || 1; // 기본 1페이지

const boardTitle = document.getElementById('boardTitle');
const postList = document.getElementById('postList');
const writeLink = document.getElementById('write-btn');
const adminCategoryAddContainer = document.getElementById('admin-category-add-container');

const prevPageLink = document.getElementById('prevPageLink');
const nextPageLink = document.getElementById('nextPageLink');
const paginationContainer = document.getElementById('pageInfo');

let isAdminFlag = false;

// ------------------- 관리자용 카테고리 추가 -------------------
async function addCategory(categoryName) {
  try {
    const url = `/board/${encodeURIComponent(boardName)}/category`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || '카테고리 추가 실패');
    }
    return true;
  } catch (err) {
    alert('카테고리 추가 중 오류가 발생했습니다: ' + err.message);
    console.error(err);
    return false;
  }
}

function createCategoryAddButton() {
  if (!adminCategoryAddContainer) return;

  adminCategoryAddContainer.innerHTML = '';
  const addBtn = document.createElement('button');
  addBtn.textContent = '카테고리 추가';
  addBtn.style.marginLeft = '10px';
  addBtn.classList.add('admin-category-add-btn');

  addBtn.addEventListener('click', async () => {
    const newCategory = prompt('추가할 카테고리명을 입력하세요:');
    if (!newCategory) return;

    const success = await addCategory(newCategory.trim());
    if (success) {
      alert('카테고리가 추가되었습니다. 페이지를 새로고침합니다.');
      location.reload();
    }
  });

  adminCategoryAddContainer.appendChild(addBtn);
}

// ------------------- 페이지네이션 -------------------
function updatePagination(totalPages) {
  const baseUrl = `${window.location.pathname}?board=${encodeURIComponent(boardName)}`;

  // 이전/다음 버튼
  const prevPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, totalPages);

  if (prevPageLink) {
    prevPageLink.href = `${baseUrl}&page=${prevPage}`;
    prevPageLink.style.display = currentPage > 1 ? 'inline' : 'none';
  }

  if (nextPageLink) {
    nextPageLink.href = `${baseUrl}&page=${nextPage}`;
    nextPageLink.style.display = currentPage < totalPages ? 'inline' : 'none';
  }

  // 숫자 페이지 버튼 최대 9개 표시
  if (!paginationContainer) return;
  paginationContainer.innerHTML = '';

  let startPage = Math.max(1, currentPage - 4);
  let endPage = Math.min(totalPages, startPage + 8);

  // 시작 페이지 조정
  if (endPage - startPage < 8) {
    startPage = Math.max(1, endPage - 8);
  }

  for (let i = startPage; i <= endPage; i++) {
    const a = document.createElement('a');
    a.textContent = i;
    a.href = `${baseUrl}&page=${i}`;
    a.style.margin = '0 4px';
    a.style.textDecoration = 'none';
    a.style.padding = '2px 6px';
    a.style.border = i === currentPage ? '1px solid #000' : '1px solid #ccc';
    a.style.borderRadius = '3px';
    a.style.backgroundColor = i === currentPage ? '#ddd' : '#f9f9f9';
    a.style.color = '#333';
    paginationContainer.appendChild(a);
  }
}

// ------------------- 게시판 글 불러오기 -------------------
async function loadAndRenderPosts() {
  isAdminFlag = await checkIfAdmin(boardName);
  window.isAdminFlag = isAdminFlag;

  if (!boardName) {
    boardTitle.textContent = '게시판이 지정되지 않았습니다.';
    postList.innerHTML = '<li>게시판이 지정되지 않았습니다.</li>';
    return;
  }

  try {
  // 페이지 쿼리 방식으로 변경
  const res = await fetch(`/board/${encodeURIComponent(boardName)}/posts?page=${currentPage}`);
  const boardData = await res.json();

  boardTitle.textContent = `${boardData.boardTitle} 보드`;
  document.title = boardData.boardTitle;
  writeLink.href = `/write.html?board=${encodeURIComponent(boardName)}`;

  // 기존 allPosts 배열 초기화 후 새 데이터 삽입
  allPosts.splice(0, allPosts.length, ...(boardData.posts || []));
  setCategoryMap(boardData.post_category || {});

  // 전체 카테고리 렌더링
  filterPostsByCategory('all', allPosts, isAdminFlag, boardName, postList);

  // 페이지네이션 업데이트
  updatePagination(boardData.totalPages);

  // 관리자라면 카테고리 추가 버튼 표시
  if (isAdminFlag) createCategoryAddButton();
} catch (err) {
  boardTitle.textContent = '게시판을 불러오지 못했습니다.';
  postList.innerHTML = '<li>글 목록을 불러오는 데 실패했습니다.</li>';
  console.error('Error loading posts:', err);
}

}

// ------------------- 카테고리 버튼 이벤트 -------------------
document.querySelectorAll('.category-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.dataset.category;
    filterPostsByCategory(category, allPosts, isAdminFlag, boardName, postList);
  });
});

// ------------------- 로그인 UI 초기화 -------------------
async function initPage() {
  try {
    await setupLoginUI();
    await loadAndRenderPosts();

    // 모든 렌더링 완료 후 화면 표시
    document.body.style.visibility = 'visible';
  } catch (err) {
    console.error('페이지 초기화 실패:', err);
    document.body.style.visibility = 'visible';
  }
}

initPage();
