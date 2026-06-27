// ============================================================
// 계정 관리 로직 (accounts.html 전용)
// ============================================================

const btnCloseWindow = document.getElementById('btn-close-window');
const modalContainer = document.getElementById('modal-container');
const modalSearch = document.getElementById('modal-search');
const btnSearchClear = document.getElementById('btn-search-clear');
const searchIcon = document.querySelector('.search-icon');
const modalAccountList = document.getElementById('modal-account-list');
const btnAddAccount = document.getElementById('btn-add-account');
const btnEditAccounts = document.getElementById('btn-edit-accounts');
const modalSnackbar = document.getElementById('modal-snackbar');
const snackbarMessage = document.getElementById('snackbar-message');
const snackbarClose = document.getElementById('snackbar-close');
const btnSortAccounts = document.getElementById('btn-sort-accounts');
const sortContextMenu = document.getElementById('sort-context-menu');

const confirmModal = document.getElementById('confirm-modal');
const confirmModalText = document.getElementById('confirm-modal-text');
const btnConfirmCancel = document.getElementById('confirm-btn-cancel');
const btnConfirmDelete = document.getElementById('confirm-btn-delete');

const iconEdit = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const iconSelectAll = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 5-5"/></svg>`;
const iconDeselectAll = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
const iconSort = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="8" y2="18" /></svg>`;
const iconTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

let modalEditMode = false;
let currentSortMode = 'default';
let allAccountQuotas = {};
let selectedAccounts = new Set();

function showSnackbar(message, type, isHtml = false) {
  if (isHtml) {
    snackbarMessage.innerHTML = message;
  } else {
    snackbarMessage.textContent = message;
  }
  modalSnackbar.className = 'modal-snackbar visible ' + type;
}

function hideSnackbar() {
  modalSnackbar.className = 'modal-snackbar';
}

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmModalText.textContent = message;
    confirmModal.style.display = 'flex';
    // 강제 리플로우로 애니메이션 트리거
    void confirmModal.offsetWidth;
    confirmModal.classList.add('visible');

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleDelete = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      btnConfirmCancel.removeEventListener('click', handleCancel);
      btnConfirmDelete.removeEventListener('click', handleDelete);
      confirmModal.classList.remove('visible');
      setTimeout(() => {
        confirmModal.style.display = 'none';
      }, 200);
    };

    btnConfirmCancel.addEventListener('click', handleCancel);
    btnConfirmDelete.addEventListener('click', handleDelete);
  });
}

function getPctColorClass(percentage) {
  if (percentage <= 20) return 'pct-red';
  if (percentage <= 40) return 'pct-orange';
  if (percentage <= 60) return 'pct-yellow';
  return 'pct-green';
}

function getRefreshText(quotaInfo) {
  if (!quotaInfo) return '';
  
  let resetDate = null;
  const resetStr = quotaInfo.quotaResetTime || quotaInfo.resetTime || quotaInfo.nextResetTime || quotaInfo.quotaResetTimestamp || quotaInfo.refreshTime;
  
  if (typeof resetStr === 'string') {
    resetDate = new Date(resetStr);
  } else if (typeof resetStr === 'number') {
    resetDate = new Date(resetStr * 1000);
  } else if (resetStr && resetStr.seconds) {
    resetDate = new Date(resetStr.seconds * 1000);
  } else if (quotaInfo.resetTime && quotaInfo.resetTime.seconds) {
    resetDate = new Date(quotaInfo.resetTime.seconds * 1000);
  } else if (quotaInfo.quotaResetTime && quotaInfo.quotaResetTime.seconds) {
    resetDate = new Date(quotaInfo.quotaResetTime.seconds * 1000);
  }
  
  if (!resetDate || isNaN(resetDate.getTime())) return '';
  
  const diffMs = resetDate - new Date();
  if (diffMs <= 0) return 'soon';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m`;
  } else {
    return 'soon';
  }
}

async function loadAndRenderAccounts() {
  const accounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(accounts);
  const quotaResults = await window.electronAPI.fetchAllQuotas();
  allAccountQuotas = {};
  for (const result of quotaResults) {
    allAccountQuotas[result.email] = result.quotas || [];
  }
  const updatedAccounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(updatedAccounts);
}

async function renderAccountList(accounts) {
  const currentEmail = await window.electronAPI.getCurrentAccount();
  
  let sortedAccounts = [...accounts];
  
  // 정렬 기준에 따른 점수 계산 헬퍼 함수
  const getAccountTokenScore = (email) => {
    const quotas = allAccountQuotas[email];
    if (!quotas || quotas.length === 0) return 0;
    const monitoredQuotas = quotas;
    let total = 0;
    monitoredQuotas.forEach(q => { total += q.percentage || 0; });
    return total / monitoredQuotas.length;
  };

  sortedAccounts.sort((a, b) => {
    // 현재 계정은 항상 최상단 유지
    if (a.email === currentEmail) return -1;
    if (b.email === currentEmail) return 1;

    // 선택된 정렬 모드에 따라 정렬
    if (currentSortMode === 'asc') {
      return a.email.localeCompare(b.email);
    } else if (currentSortMode === 'desc') {
      return b.email.localeCompare(a.email);
    } else if (currentSortMode === 'tokens-high') {
      return getAccountTokenScore(b.email) - getAccountTokenScore(a.email);
    } else if (currentSortMode === 'tokens-low') {
      return getAccountTokenScore(a.email) - getAccountTokenScore(b.email);
    }
    return 0; // default (추가된 순서 등 원래 순서 유지)
  });

  const searchTerm = modalSearch.value.toLowerCase().trim();
  const filtered = searchTerm
    ? sortedAccounts.filter(a => a.email.toLowerCase().includes(searchTerm))
    : sortedAccounts;

  if (filtered.length === 0) {
    modalAccountList.innerHTML = '<div class="empty-state"><p>' +
      (searchTerm ? '검색 결과가 없습니다.' : '등록된 계정이 없습니다. 상단의 + 버튼으로 계정을 추가해 주세요.') +
      '</p></div>';
    return;
  }

  modalAccountList.innerHTML = '';
  modalAccountList.className = 'modal-account-list' + (modalEditMode ? ' edit-mode' : '');

  filtered.forEach(account => {
    const item = document.createElement('div');
    item.className = 'account-item' + (account.email === currentEmail ? ' current-account' : '');
    item.dataset.email = account.email;

    const quotas = allAccountQuotas[account.email];
    const monitoredQuotas = quotas ? quotas : null;

    let modelsHtml = '';
    if (monitoredQuotas === null) {
      modelsHtml = '<div class="account-models-loading">할당량 조회 중...</div>';
    } else if (monitoredQuotas.length > 0) {
      modelsHtml = '<div class="account-models">';
      monitoredQuotas.forEach(q => {
        const refreshText = getRefreshText(q.quotaInfo);
        const pctClass = getPctColorClass(q.percentage);
        modelsHtml += '<div class="account-model-item">' +
          '<span class="account-model-name" title="' + q.name + '">' + q.displayName + '</span>' +
          '<div class="account-model-stats">' +
          (refreshText ? '<span class="account-model-reset">' + refreshText + '</span>' : '') +
          '<span class="account-model-pct ' + pctClass + '">' + q.percentage + '%</span>' +
          '</div>' +
          '</div>';
      });
      modelsHtml += '</div>';
    }

    let checkboxHtml = '';
    if (modalEditMode) {
      const isChecked = selectedAccounts.has(account.email);
      checkboxHtml = '<label class="account-checkbox-label">' +
        '<input type="checkbox" class="account-checkbox" data-email="' + account.email + '"' + (isChecked ? ' checked' : '') + '>' +
        '<span class="account-checkbox-custom"></span>' +
        '</label>';
    }

    let actionBtn = '';
    if (modalEditMode) {
      actionBtn = '<button class="account-item-action delete-btn" data-email="' + account.email + '" title="삭제">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    } else {
      if (account.email !== currentEmail) {
        actionBtn = '<button class="account-item-action switch-action-btn" data-email="' + account.email + '" title="전환">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg></button>';
      } else {
        actionBtn = '<button class="account-item-action switch-action-btn" data-email="' + account.email + '" title="재실행">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg></button>';
      }
    }

    item.innerHTML = '<div class="account-item-header">' +
      '<div class="account-item-left">' +
      checkboxHtml +
      '<span class="account-item-email">' + account.email + '</span>' +
      '</div>' + actionBtn + '</div>' + modelsHtml;

    modalAccountList.appendChild(item);
  });

  if (modalEditMode) {
    modalAccountList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        const isConfirmed = await showConfirm(`'${email}' 계정을 삭제하시겠습니까?`);
        if (!isConfirmed) return;
        
        const result = await window.electronAPI.deleteAccount(email);
        if (result.success) {
          selectedAccounts.delete(email);
          showSnackbar(email + ' 계정이 삭제되었습니다.', 'success');
          loadAndRenderAccounts();
        } else {
          showSnackbar('계정 삭제에 실패했습니다.', 'error');
        }
      });
    });
    modalAccountList.querySelectorAll('.account-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const email = e.target.dataset.email;
        if (e.target.checked) {
          selectedAccounts.add(email);
        } else {
          selectedAccounts.delete(email);
        }
        updateSelectAllButton();
      });
    });
    updateSelectAllButton();
  } else {
    modalAccountList.querySelectorAll('.switch-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        const ab = e.currentTarget;
        const isCurrent = email === currentEmail;
        ab.disabled = true;
        ab.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>';
        ab.querySelector('svg').style.animation = 'spin 0.8s linear infinite';
        window.electronAPI.switchAccount(email);
      });
    });
  }
}

// === 이벤트 리스너 ===
btnCloseWindow.addEventListener('click', () => {
  window.electronAPI.closeAccountWindow();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.electronAPI.closeAccountWindow();
  }
});

snackbarClose.addEventListener('click', hideSnackbar);

modalSnackbar.addEventListener('click', async (e) => {
  if (e.target.classList.contains('switch-new-account-link')) {
    const email = e.target.dataset.email;
    e.target.textContent = '전환 중...';
    e.target.style.pointerEvents = 'none';
    e.target.style.opacity = '0.7';
    
    window.electronAPI.switchAccount(email);
  }
});

async function handleAddAccount() {
  showSnackbar('브라우저에서 로그인을 진행해 주세요.', 'success');
  
  const result = await window.electronAPI.addAccount();
  
  if (result.success) {
    if (result.alreadyExists) {
      showSnackbar(
        `${result.account.email} 은(는) 이미 등록되어 있는 계정입니다. <span class="switch-new-account-link" data-email="${result.account.email}" style="text-decoration: underline; cursor: pointer; margin-left: 10px; font-weight: 500;">바로 전환</span>`,
        'warning',
        true
      );
    } else {
      showSnackbar(
        `${result.account.email} 계정이 추가되었습니다. <span class="switch-new-account-link" data-email="${result.account.email}" style="text-decoration: underline; cursor: pointer; margin-left: 10px; font-weight: 500;">바로 전환</span>`,
        'success',
        true
      );
    }
    await loadAndRenderAccounts();
    const newItem = modalAccountList.querySelector(`.account-item[data-email="${result.account.email}"]`);
    if (newItem) {
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    if (result.error && result.error.includes('타임아웃')) {
      // 무시
    } else {
      showSnackbar('계정 추가 실패: ' + (result.error || '알 수 없는 오류'), 'error');
    }
  }
}

btnAddAccount.addEventListener('click', handleAddAccount);

function updateSelectAllButton() {
  const checkboxes = modalAccountList.querySelectorAll('.account-checkbox');
  const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
  btnAddAccount.innerHTML = allChecked ? iconSelectAll : iconDeselectAll;
  btnAddAccount.title = allChecked ? '전체 해제' : '전체 선택';
  if (modalEditMode) {
    btnSortAccounts.disabled = selectedAccounts.size === 0;
  }
}

function toggleSelectAll() {
  const checkboxes = modalAccountList.querySelectorAll('.account-checkbox');
  const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    const email = cb.dataset.email;
    if (!allChecked) {
      selectedAccounts.add(email);
    } else {
      selectedAccounts.delete(email);
    }
  });
  updateSelectAllButton();
}

btnEditAccounts.addEventListener('click', async () => {
  modalEditMode = !modalEditMode;
  if (modalEditMode) {
    btnEditAccounts.innerHTML = iconCheck;
    btnEditAccounts.title = '완료';
    // 추가 버튼을 전체 선택/해제 버튼으로 전환
    btnAddAccount.innerHTML = iconDeselectAll;
    btnAddAccount.title = '전체 선택';
    btnAddAccount.removeEventListener('click', handleAddAccount);
    btnAddAccount.addEventListener('click', toggleSelectAll);
    // 정렬 버튼을 삭제 버튼으로 전환
    btnSortAccounts.innerHTML = iconTrash;
    btnSortAccounts.title = '선택 항목 삭제';
    btnSortAccounts.classList.add('delete-mode');
    btnSortAccounts.disabled = selectedAccounts.size === 0;
    btnSortAccounts.removeEventListener('click', handleSortMenu);
    btnSortAccounts.addEventListener('click', handleDeleteSelected);
  } else {
    btnEditAccounts.innerHTML = iconEdit;
    btnEditAccounts.title = '편집';
    // 전체 선택 버튼을 추가 버튼으로 복원
    btnAddAccount.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>';
    btnAddAccount.title = '계정 추가';
    btnAddAccount.removeEventListener('click', toggleSelectAll);
    btnAddAccount.addEventListener('click', handleAddAccount);
    // 삭제 버튼을 정렬 버튼으로 복원
    btnSortAccounts.innerHTML = iconSort;
    btnSortAccounts.title = '정렬';
    btnSortAccounts.classList.remove('delete-mode');
    btnSortAccounts.disabled = false;
    btnSortAccounts.removeEventListener('click', handleDeleteSelected);
    btnSortAccounts.addEventListener('click', handleSortMenu);
    selectedAccounts.clear();
  }
  const accounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(accounts);
});

modalSearch.addEventListener('input', async () => {
  if (modalSearch.value.length > 0) {
    btnSearchClear.style.display = 'flex';
    if (searchIcon) searchIcon.style.display = 'none';
  } else {
    btnSearchClear.style.display = 'none';
    if (searchIcon) searchIcon.style.display = 'block';
  }
  const accounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(accounts);
});

btnSearchClear.addEventListener('click', async () => {
  modalSearch.value = '';
  btnSearchClear.style.display = 'none';
  if (searchIcon) searchIcon.style.display = 'block';
  modalSearch.focus();
  const accounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(accounts);
});

function handleSortMenu(e) {
  e.stopPropagation();
  sortContextMenu.classList.toggle('active');
}

async function handleDeleteSelected() {
  if (selectedAccounts.size === 0) return;
  
  const isConfirmed = await showConfirm(`선택한 ${selectedAccounts.size}개의 계정을 정말 삭제하시겠습니까?`);
  if (!isConfirmed) return;

  const emails = Array.from(selectedAccounts);
  let successCount = 0;
  
  btnSortAccounts.disabled = true;
  btnSortAccounts.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>';
  btnSortAccounts.querySelector('svg').style.animation = 'spin 0.8s linear infinite';
  
  for (const email of emails) {
    const result = await window.electronAPI.deleteAccount(email);
    if (result.success) {
      successCount++;
    }
  }
  selectedAccounts.clear();
  showSnackbar(`${successCount}개의 계정이 삭제되었습니다.`, 'success');
  btnSortAccounts.innerHTML = iconTrash;
  btnSortAccounts.disabled = true;
  loadAndRenderAccounts();
}

btnSortAccounts.addEventListener('click', handleSortMenu);

document.addEventListener('click', (e) => {
  if (!sortContextMenu.contains(e.target) && e.target !== btnSortAccounts) {
    sortContextMenu.classList.remove('active');
  }
});

document.querySelectorAll('.sort-menu-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.stopPropagation();
    currentSortMode = e.target.dataset.sort;
    sortContextMenu.classList.remove('active');
    const accounts = await window.electronAPI.getAllAccounts();
    await renderAccountList(accounts);
  });
});

// 초기 로드
loadAndRenderAccounts();
