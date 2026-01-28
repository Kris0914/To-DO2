// ===== Firebase 설정 =====
const firebaseConfig = {
    apiKey: "AIzaSyBZ-QHnfdcJahVW7dlUKa_ZWzjGzdJTv_I",
    authDomain: "to-do1-8a741.firebaseapp.com",
    projectId: "to-do1-8a741",
    storageBucket: "to-do1-8a741.firebasestorage.app",
    messagingSenderId: "737085001297",
    appId: "1:737085001297:web:576ba566bbac36a9b53270",
    measurementId: "G-0RDZ3XXN5R"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== 전역 상태 =====
let currentDate = new Date();
let selectedDate = null;
let isAdmin = false;
let currentTodoId = null;
let selectedPriority = 1;
let editSelectedPriority = 1;
let todosCache = {}; // 날짜별 투두 캐시

// ===== 관리자 비밀번호 =====
const ADMIN_PASSWORD = '13241001';

// ===== DOM 요소 =====
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarContainer = document.getElementById('calendarContainer');
const addTodoBtn = document.getElementById('addTodoBtn');

// 모달 요소
const adminModal = document.getElementById('adminModal');
const todoModal = document.getElementById('todoModal');
const todoListSheet = document.getElementById('todoListSheet');
const todoDetailModal = document.getElementById('todoDetailModal');

// 관리자 모달 요소
const adminBtn = document.getElementById('adminBtn');
const closeAdminModal = document.getElementById('closeAdminModal');
const adminPassword = document.getElementById('adminPassword');
const adminError = document.getElementById('adminError');
const confirmAdmin = document.getElementById('confirmAdmin');
const cancelAdmin = document.getElementById('cancelAdmin');

// 투두 작성 모달 요소
const closeTodoModal = document.getElementById('closeTodoModal');
const todoTitle = document.getElementById('todoTitle');
const todoMemo = document.getElementById('todoMemo');
const saveTodo = document.getElementById('saveTodo');
const cancelTodo = document.getElementById('cancelTodo');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const priorityBtns = document.querySelectorAll('.priority-selector .star-btn');

// 투두 리스트 시트 요소
const sheetDateTitle = document.getElementById('sheetDateTitle');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const closeSheet = document.getElementById('closeSheet');
const addTodoFromSheet = document.getElementById('addTodoFromSheet');
const sheetFooter = document.getElementById('sheetFooter');

// 투두 상세 모달 요소
const closeTodoDetail = document.getElementById('closeTodoDetail');
const detailContent = document.getElementById('detailContent');
const editContent = document.getElementById('editContent');
const detailActions = document.getElementById('detailActions');
const editActions = document.getElementById('editActions');
const deleteTodo = document.getElementById('deleteTodo');
const editTodo = document.getElementById('editTodo');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');
const editTodoTitle = document.getElementById('editTodoTitle');
const editTodoMemo = document.getElementById('editTodoMemo');
const editPrioritySelector = document.getElementById('editPrioritySelector');

// 토스트
const toast = document.getElementById('toast');

// ===== 유틸리티 함수 =====
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayName})`;
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===== 캘린더 렌더링 =====
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 월 표시 업데이트
    currentMonthEl.textContent = `${year}년 ${month + 1}월`;
    
    // 달력 그리드 초기화
    calendarGrid.innerHTML = '';
    
    // 이번 달 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫째 날의 요일 (0: 일요일)
    const startDayOfWeek = firstDay.getDay();
    
    // 이전 달의 마지막 날
    const prevLastDay = new Date(year, month, 0).getDate();
    
    // 오늘 날짜
    const today = new Date();
    const todayStr = formatDate(today);
    
    // 이전 달 날짜 채우기
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDay - i;
        const dateStr = formatDate(new Date(year, month - 1, day));
        const cell = createDateCell(day, dateStr, true, startDayOfWeek - 1 - i);
        calendarGrid.appendChild(cell);
    }
    
    // 이번 달 날짜 채우기
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = formatDate(new Date(year, month, day));
        const dayOfWeek = new Date(year, month, day).getDay();
        const isToday = dateStr === todayStr;
        const cell = createDateCell(day, dateStr, false, dayOfWeek, isToday);
        calendarGrid.appendChild(cell);
    }
    
    // 다음 달 날짜 채우기 (6주 맞추기)
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells; // 6주 x 7일 = 42
    
    for (let day = 1; day <= remainingCells; day++) {
        const dateStr = formatDate(new Date(year, month + 1, day));
        const dayOfWeek = new Date(year, month + 1, day).getDay();
        const cell = createDateCell(day, dateStr, true, dayOfWeek);
        calendarGrid.appendChild(cell);
    }
    
    // 투두 데이터 로드
    loadMonthTodos(year, month);
}

function createDateCell(day, dateStr, isOtherMonth, dayOfWeek, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'date-cell';
    cell.dataset.date = dateStr;
    
    if (isOtherMonth) {
        cell.classList.add('other-month');
    }
    
    if (isToday) {
        cell.classList.add('today');
    }
    
    if (dayOfWeek === 0) {
        cell.classList.add('sunday');
    } else if (dayOfWeek === 6) {
        cell.classList.add('saturday');
    }
    
    cell.innerHTML = `
        <span class="date-number">${day}</span>
        <span class="star-indicator"></span>
    `;
    
    cell.addEventListener('click', () => handleDateClick(dateStr));
    
    return cell;
}

// ===== 투두 데이터 로드 =====
async function loadMonthTodos(year, month) {
    try {
        // 해당 월의 시작과 끝 날짜 계산
        const startDate = formatDate(new Date(year, month, 1));
        const endDate = formatDate(new Date(year, month + 1, 0));
        
        // Firebase에서 해당 월의 투두 가져오기
        const snapshot = await db.collection('todos')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        
        // 날짜별로 투두 그룹화 및 최고 중요도 계산
        const dateMaxPriority = {};
        
        snapshot.forEach(doc => {
            const todo = doc.data();
            const date = todo.date;
            const priority = todo.priority || 1;
            
            // 캐시에 저장
            if (!todosCache[date]) {
                todosCache[date] = [];
            }
            
            // 중복 체크 후 추가
            const existingIndex = todosCache[date].findIndex(t => t.id === doc.id);
            if (existingIndex === -1) {
                todosCache[date].push({ id: doc.id, ...todo });
            } else {
                todosCache[date][existingIndex] = { id: doc.id, ...todo };
            }
            
            // 해당 날짜의 최고 중요도 업데이트
            if (!dateMaxPriority[date] || priority > dateMaxPriority[date]) {
                dateMaxPriority[date] = priority;
            }
        });
        
        // 캘린더 UI 업데이트
        updateCalendarUI(dateMaxPriority);
        
    } catch (error) {
        console.error('투두 로드 오류:', error);
        showToast('데이터를 불러오는 중 오류가 발생했습니다');
    }
}

function updateCalendarUI(dateMaxPriority) {
    const cells = calendarGrid.querySelectorAll('.date-cell');
    
    cells.forEach(cell => {
        const date = cell.dataset.date;
        
        // 기존 투두 클래스 제거
        cell.classList.remove('has-todo-1', 'has-todo-2', 'has-todo-3');
        
        // 별 표시 초기화
        const starIndicator = cell.querySelector('.star-indicator');
        if (starIndicator) {
            starIndicator.textContent = '';
        }
        
        // 해당 날짜에 투두가 있으면 최고 중요도에 따른 색상 적용
        if (dateMaxPriority[date]) {
            const maxPriority = dateMaxPriority[date];
            cell.classList.add(`has-todo-${maxPriority}`);
            
            // 별 표시
            if (starIndicator && maxPriority >= 1) {
                starIndicator.textContent = '⭐'.repeat(maxPriority);
            }
        }
    });
}

// ===== 날짜 클릭 처리 =====
async function handleDateClick(dateStr) {
    selectedDate = dateStr;
    
    // 해당 날짜의 투두 로드
    await loadDateTodos(dateStr);
    
    // 하단 시트 열기
    openTodoListSheet(dateStr);
}

async function loadDateTodos(dateStr) {
    try {
        const snapshot = await db.collection('todos')
            .where('date', '==', dateStr)
            .orderBy('priority', 'desc')
            .orderBy('createdAt', 'desc')
            .get();
        
        todosCache[dateStr] = [];
        snapshot.forEach(doc => {
            todosCache[dateStr].push({ id: doc.id, ...doc.data() });
        });
        
    } catch (error) {
        console.error('투두 로드 오류:', error);
    }
}

function openTodoListSheet(dateStr) {
    sheetDateTitle.textContent = formatDisplayDate(dateStr);
    
    renderTodoList(dateStr);
    
    // 관리자만 추가 버튼 표시
    sheetFooter.style.display = isAdmin ? 'block' : 'none';
    
    todoListSheet.classList.add('active');
}

function renderTodoList(dateStr) {
    const todos = todosCache[dateStr] || [];
    
    todoList.innerHTML = '';
    
    if (todos.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // 중요도 순으로 정렬
    const sortedTodos = [...todos].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    sortedTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item priority-${todo.priority}`;
        li.dataset.id = todo.id;
        
        li.innerHTML = `
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}"></div>
            <div class="todo-content">
                <div class="todo-title ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.title)}</div>
                ${todo.memo ? `<div class="todo-meta">${escapeHtml(todo.memo.substring(0, 30))}${todo.memo.length > 30 ? '...' : ''}</div>` : ''}
            </div>
            <div class="todo-priority">${'⭐'.repeat(todo.priority)}</div>
        `;
        
        // 체크박스 클릭
        const checkbox = li.querySelector('.todo-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isAdmin) {
                toggleTodoComplete(todo.id, !todo.completed);
            } else {
                showToast('관리자만 수정할 수 있습니다');
            }
        });
        
        // 아이템 클릭 -> 상세 보기
        li.addEventListener('click', () => openTodoDetail(todo));
        
        todoList.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 투두 완료 토글 =====
async function toggleTodoComplete(todoId, completed) {
    try {
        await db.collection('todos').doc(todoId).update({
            completed: completed,
            updatedAt: new Date().toISOString()
        });
        
        // 캐시 업데이트
        if (todosCache[selectedDate]) {
            const todo = todosCache[selectedDate].find(t => t.id === todoId);
            if (todo) {
                todo.completed = completed;
            }
        }
        
        renderTodoList(selectedDate);
        showToast(completed ? '완료 처리되었습니다' : '완료 해제되었습니다');
        
    } catch (error) {
        console.error('완료 토글 오류:', error);
        showToast('오류가 발생했습니다');
    }
}

// ===== 투두 상세 모달 =====
function openTodoDetail(todo) {
    currentTodoId = todo.id;
    
    // 상세 내용 표시
    detailContent.innerHTML = `
        <div class="detail-title">${escapeHtml(todo.title)}</div>
        ${todo.memo ? `<div class="detail-memo">${escapeHtml(todo.memo)}</div>` : ''}
        <div class="detail-priority">
            <span>중요도:</span>
            <span>${'⭐'.repeat(todo.priority)}</span>
        </div>
        ${todo.completed ? `
            <div class="detail-completed">
                <span>✓</span>
                <span>완료됨</span>
            </div>
        ` : ''}
    `;
    
    // 수정/삭제 버튼 표시 (관리자만)
    deleteTodo.style.display = isAdmin ? 'inline-block' : 'none';
    editTodo.style.display = isAdmin ? 'inline-block' : 'none';
    
    // 모드 초기화
    detailContent.style.display = 'block';
    editContent.style.display = 'none';
    detailActions.style.display = 'flex';
    editActions.style.display = 'none';
    
    // 수정 폼 초기화
    editTodoTitle.value = todo.title;
    editTodoMemo.value = todo.memo || '';
    editSelectedPriority = todo.priority;
    updateEditPriorityUI();
    
    todoDetailModal.classList.add('active');
}

function updateEditPriorityUI() {
    const editStarBtns = editPrioritySelector.querySelectorAll('.star-btn');
    editStarBtns.forEach((btn, index) => {
        if (index < editSelectedPriority) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ===== 투두 작성 모달 =====
function openTodoModal() {
    // 폼 초기화
    todoTitle.value = '';
    todoMemo.value = '';
    selectedPriority = 1;
    updatePriorityUI();
    
    selectedDateDisplay.textContent = formatDisplayDate(selectedDate);
    document.getElementById('todoModalTitle').textContent = '할 일 추가';
    
    todoModal.classList.add('active');
    todoTitle.focus();
}

function updatePriorityUI() {
    priorityBtns.forEach((btn, index) => {
        if (index < selectedPriority) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ===== 투두 저장 =====
async function saveTodoItem() {
    const title = todoTitle.value.trim();
    const memo = todoMemo.value.trim();
    
    if (!title) {
        showToast('할 일 제목을 입력하세요');
        todoTitle.focus();
        return;
    }
    
    try {
        const todoData = {
            title: title,
            memo: memo,
            priority: selectedPriority,
            date: selectedDate,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('todos').add(todoData);
        
        // 캐시 업데이트
        if (!todosCache[selectedDate]) {
            todosCache[selectedDate] = [];
        }
        todosCache[selectedDate].push({ id: docRef.id, ...todoData });
        
        // 모달 닫기
        todoModal.classList.remove('active');
        
        // 캘린더 UI 업데이트
        updateDateCellUI(selectedDate);
        
        // 리스트 갱신
        renderTodoList(selectedDate);
        
        showToast('할 일이 추가되었습니다');
        
    } catch (error) {
        console.error('저장 오류:', error);
        showToast('저장 중 오류가 발생했습니다');
    }
}

// ===== 투두 수정 =====
async function updateTodoItem() {
    const title = editTodoTitle.value.trim();
    const memo = editTodoMemo.value.trim();
    
    if (!title) {
        showToast('할 일 제목을 입력하세요');
        editTodoTitle.focus();
        return;
    }
    
    try {
        await db.collection('todos').doc(currentTodoId).update({
            title: title,
            memo: memo,
            priority: editSelectedPriority,
            updatedAt: new Date().toISOString()
        });
        
        // 캐시 업데이트
        if (todosCache[selectedDate]) {
            const todo = todosCache[selectedDate].find(t => t.id === currentTodoId);
            if (todo) {
                todo.title = title;
                todo.memo = memo;
                todo.priority = editSelectedPriority;
            }
        }
        
        // 모달 닫기
        todoDetailModal.classList.remove('active');
        
        // 캘린더 UI 업데이트
        updateDateCellUI(selectedDate);
        
        // 리스트 갱신
        renderTodoList(selectedDate);
        
        showToast('수정되었습니다');
        
    } catch (error) {
        console.error('수정 오류:', error);
        showToast('수정 중 오류가 발생했습니다');
    }
}

// ===== 투두 삭제 =====
async function deleteTodoItem() {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await db.collection('todos').doc(currentTodoId).delete();
        
        // 캐시에서 제거
        if (todosCache[selectedDate]) {
            todosCache[selectedDate] = todosCache[selectedDate].filter(t => t.id !== currentTodoId);
        }
        
        // 모달 닫기
        todoDetailModal.classList.remove('active');
        
        // 캘린더 UI 업데이트
        updateDateCellUI(selectedDate);
        
        // 리스트 갱신
        renderTodoList(selectedDate);
        
        showToast('삭제되었습니다');
        
    } catch (error) {
        console.error('삭제 오류:', error);
        showToast('삭제 중 오류가 발생했습니다');
    }
}

// ===== 날짜 셀 UI 업데이트 =====
function updateDateCellUI(dateStr) {
    const cell = calendarGrid.querySelector(`[data-date="${dateStr}"]`);
    if (!cell) return;
    
    const todos = todosCache[dateStr] || [];
    
    // 기존 클래스 제거
    cell.classList.remove('has-todo-1', 'has-todo-2', 'has-todo-3');
    
    // 별 표시 초기화
    const starIndicator = cell.querySelector('.star-indicator');
    if (starIndicator) {
        starIndicator.textContent = '';
    }
    
    if (todos.length > 0) {
        // 최고 중요도 찾기
        const maxPriority = Math.max(...todos.map(t => t.priority));
        cell.classList.add(`has-todo-${maxPriority}`);
        
        if (starIndicator) {
            starIndicator.textContent = '⭐'.repeat(maxPriority);
        }
    }
}

// ===== 관리자 인증 =====
function checkAdmin() {
    const password = adminPassword.value;
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        adminBtn.classList.add('active');
        adminBtn.querySelector('.lock-icon').textContent = '🔓';
        adminBtn.querySelector('.admin-text').textContent = '관리자 모드';
        adminModal.classList.remove('active');
        adminPassword.value = '';
        adminError.textContent = '';
        
        // 플로팅 버튼 표시
        addTodoBtn.style.display = 'block';
        
        // 시트 푸터 업데이트
        if (todoListSheet.classList.contains('active')) {
            sheetFooter.style.display = 'block';
        }
        
        showToast('관리자 모드가 활성화되었습니다');
    } else {
        adminError.textContent = '비밀번호가 올바르지 않습니다';
        adminPassword.value = '';
        adminPassword.focus();
    }
}

function logoutAdmin() {
    isAdmin = false;
    adminBtn.classList.remove('active');
    adminBtn.querySelector('.lock-icon').textContent = '🔒';
    adminBtn.querySelector('.admin-text').textContent = '관리자 확인';
    
    // 플로팅 버튼 숨기기
    addTodoBtn.style.display = 'none';
    
    // 시트 푸터 업데이트
    if (todoListSheet.classList.contains('active')) {
        sheetFooter.style.display = 'none';
    }
    
    showToast('관리자 모드가 해제되었습니다');
}

// ===== 스크롤 기반 월 이동 =====
let scrollTimeout = null;
let lastScrollTime = 0;
const SCROLL_DEBOUNCE = 500; // 디바운스 시간 (ms)

function handleScroll(e) {
    const now = Date.now();
    
    // 디바운스 처리
    if (now - lastScrollTime < SCROLL_DEBOUNCE) {
        return;
    }
    
    // 스크롤 방향 확인
    const delta = e.deltaY || e.detail || -e.wheelDelta;
    
    if (delta > 0) {
        // 아래로 스크롤 -> 다음 달
        changeMonth(1);
    } else if (delta < 0) {
        // 위로 스크롤 -> 이전 달
        changeMonth(-1);
    }
    
    lastScrollTime = now;
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    todosCache = {}; // 캐시 초기화
    renderCalendar();
}

// ===== 터치 제스처 지원 =====
let touchStartY = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50;

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
            // 위로 스와이프 -> 다음 달
            changeMonth(1);
        } else {
            // 아래로 스와이프 -> 이전 달
            changeMonth(-1);
        }
    }
}

// ===== 이벤트 리스너 등록 =====
function initEventListeners() {
    // 월 네비게이션
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    // 스크롤 이벤트
    calendarContainer.addEventListener('wheel', handleScroll, { passive: true });
    
    // 터치 이벤트
    calendarContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // 관리자 버튼
    adminBtn.addEventListener('click', () => {
        if (isAdmin) {
            logoutAdmin();
        } else {
            adminModal.classList.add('active');
            adminPassword.focus();
        }
    });
    
    // 관리자 모달
    closeAdminModal.addEventListener('click', () => {
        adminModal.classList.remove('active');
        adminPassword.value = '';
        adminError.textContent = '';
    });
    
    confirmAdmin.addEventListener('click', checkAdmin);
    cancelAdmin.addEventListener('click', () => {
        adminModal.classList.remove('active');
        adminPassword.value = '';
        adminError.textContent = '';
    });
    
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAdmin();
        }
    });
    
    // 플로팅 추가 버튼
    addTodoBtn.addEventListener('click', () => {
        if (!selectedDate) {
            selectedDate = formatDate(new Date());
        }
        openTodoModal();
    });
    
    // 투두 작성 모달
    closeTodoModal.addEventListener('click', () => {
        todoModal.classList.remove('active');
    });
    
    cancelTodo.addEventListener('click', () => {
        todoModal.classList.remove('active');
    });
    
    saveTodo.addEventListener('click', saveTodoItem);
    
    // 중요도 선택
    priorityBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            selectedPriority = index + 1;
            updatePriorityUI();
        });
    });
    
    // 수정 모달의 중요도 선택
    const editStarBtns = editPrioritySelector.querySelectorAll('.star-btn');
    editStarBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            editSelectedPriority = index + 1;
            updateEditPriorityUI();
        });
    });
    
    // 투두 리스트 시트
    closeSheet.addEventListener('click', () => {
        todoListSheet.classList.remove('active');
    });
    
    todoListSheet.addEventListener('click', (e) => {
        if (e.target === todoListSheet) {
            todoListSheet.classList.remove('active');
        }
    });
    
    addTodoFromSheet.addEventListener('click', () => {
        openTodoModal();
    });
    
    // 투두 상세 모달
    closeTodoDetail.addEventListener('click', () => {
        todoDetailModal.classList.remove('active');
    });
    
    closeDetailBtn.addEventListener('click', () => {
        todoDetailModal.classList.remove('active');
    });
    
    editTodo.addEventListener('click', () => {
        // 수정 모드로 전환
        detailContent.style.display = 'none';
        editContent.style.display = 'block';
        detailActions.style.display = 'none';
        editActions.style.display = 'flex';
        editTodoTitle.focus();
    });
    
    cancelEdit.addEventListener('click', () => {
        // 상세 모드로 복귀
        detailContent.style.display = 'block';
        editContent.style.display = 'none';
        detailActions.style.display = 'flex';
        editActions.style.display = 'none';
    });
    
    saveEdit.addEventListener('click', updateTodoItem);
    
    deleteTodo.addEventListener('click', deleteTodoItem);
    
    // 모달 외부 클릭으로 닫기
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.classList.remove('active');
            adminPassword.value = '';
            adminError.textContent = '';
        }
    });
    
    todoModal.addEventListener('click', (e) => {
        if (e.target === todoModal) {
            todoModal.classList.remove('active');
        }
    });
    
    todoDetailModal.addEventListener('click', (e) => {
        if (e.target === todoDetailModal) {
            todoDetailModal.classList.remove('active');
        }
    });
    
    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            adminModal.classList.remove('active');
            todoModal.classList.remove('active');
            todoListSheet.classList.remove('active');
            todoDetailModal.classList.remove('active');
        }
    });
    
    // 입력 필드 엔터키
    todoTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            saveTodoItem();
        }
    });
}

// ===== 앱 초기화 =====
function init() {
    initEventListeners();
    renderCalendar();
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', init);
