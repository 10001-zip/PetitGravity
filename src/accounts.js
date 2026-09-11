// ============================================================
// 계정 관리 로직 (accounts.html 전용)
// ============================================================

// i18n 단축 별칭
const { t, setLanguage, getLanguage, applyI18n } = window.i18n;

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
let allAccountTiers = {};
let selectedAccounts = new Set();

// shared-utils.js에서 제공되는 공용 유틸리티
const { getRefreshText, escapeHtml } = window.sharedUtils;

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

// i18n 초기화
if (window.electronAPI && window.electronAPI.getLanguage) {
  window.electronAPI.getLanguage().then(lang => {
    setLanguage(lang || 'ko');
    applyI18n();
    const htmlRoot = document.getElementById('html-root') || document.documentElement;
    htmlRoot.lang = lang || 'ko';
  });
} else {
  applyI18n();
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

// getRefreshText는 shared-utils.js에서 제공

async function loadAndRenderAccounts() {
  const accounts = await window.electronAPI.getAllAccounts();
  await renderAccountList(accounts);
  const quotaResults = await window.electronAPI.fetchAllQuotas();
  allAccountQuotas = {};
  allAccountTiers = {};
  for (const result of quotaResults) {
    allAccountQuotas[result.email] = result.quotas || [];
    if (result.tier) allAccountTiers[result.email] = result.tier;
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

  const getSpecificModelScore = (email, modelName) => {
    const quotas = allAccountQuotas[email];
    if (!quotas || quotas.length === 0) return 0;
    const modelQuota = quotas.find(q => q.name === modelName);
    return modelQuota ? (modelQuota.percentage || 0) : 0;
  };

  const getAccountTierRank = (accountObj) => {
    const tierValue = allAccountTiers[accountObj.email] !== undefined ? allAccountTiers[accountObj.email] : accountObj.tier;
    if (tierValue === undefined || tierValue === null) return 0;
    const rawTier = String(tierValue).toUpperCase();
    if (rawTier.includes('ULTRA')) return 2;
    if (rawTier.includes('PRO')) return 1;
    return 0;
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
    } else if (currentSortMode === 'tier-high') {
      return getAccountTierRank(b) - getAccountTierRank(a);
    } else if (currentSortMode === 'tier-low') {
      return getAccountTierRank(a) - getAccountTierRank(b);
    } else if (currentSortMode === 'tokens-high') {
      return getAccountTokenScore(b.email) - getAccountTokenScore(a.email);
    } else if (currentSortMode === 'tokens-low') {
      return getAccountTokenScore(a.email) - getAccountTokenScore(b.email);
    } else if (currentSortMode === 'gemini-high') {
      return getSpecificModelScore(b.email, 'gemini_models') - getSpecificModelScore(a.email, 'gemini_models');
    } else if (currentSortMode === 'gemini-low') {
      return getSpecificModelScore(a.email, 'gemini_models') - getSpecificModelScore(b.email, 'gemini_models');
    } else if (currentSortMode === 'claude-gpt-high') {
      return getSpecificModelScore(b.email, 'claude_gpt_models') - getSpecificModelScore(a.email, 'claude_gpt_models');
    } else if (currentSortMode === 'claude-gpt-low') {
      return getSpecificModelScore(a.email, 'claude_gpt_models') - getSpecificModelScore(b.email, 'claude_gpt_models');
    }
    return 0; // default (추가된 순서 등 원래 순서 유지)
  });

  const savedScrollTop = modalAccountList ? modalAccountList.scrollTop : 0;

  const searchTerm = modalSearch.value.toLowerCase().trim();
  const filtered = searchTerm
    ? sortedAccounts.filter(a => a.email.toLowerCase().includes(searchTerm))
    : sortedAccounts;

  if (filtered.length === 0) {
    modalAccountList.innerHTML = '<div class="empty-state"><p>' +
      (searchTerm ? t('accounts_search_empty') : t('accounts_empty')) +
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
      modelsHtml = '<div class="account-models">' +
        '<div class="account-models-loading-overlay">' + t('accounts_loading') + '</div>' +
        '<div class="account-model-item" style="visibility: hidden;"><span class="account-model-name">Gemini Models</span></div>' +
        '<div class="account-model-item" style="visibility: hidden;"><span class="account-model-name">Claude and GPT models</span></div>' +
        '</div>';
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
    } else {
      modelsHtml = '<div class="account-models">' +
        '<div class="account-models-loading-overlay" style="opacity: 0.5;">' + t('accounts_no_quota') + '</div>' +
        '<div class="account-model-item" style="visibility: hidden;"><span class="account-model-name">Gemini Models</span></div>' +
        '<div class="account-model-item" style="visibility: hidden;"><span class="account-model-name">Claude and GPT models</span></div>' +
        '</div>';
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
      actionBtn = '<button class="account-item-action delete-btn" data-email="' + account.email + '" data-i18n-title="btn_account_delete" title="' + t('btn_account_delete') + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    } else {
      if (account.email !== currentEmail) {
        actionBtn = '<button class="account-item-action switch-action-btn" data-email="' + account.email + '" title="' + t('btn_account_switch') + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg></button>';
      } else {
        actionBtn = '<button class="account-item-action switch-action-btn" data-email="' + account.email + '" title="' + t('btn_account_restart') + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg></button>';
      }
    }

    // 티어 뱃지 생성 (Pro / Ultra만 표시)
    let tierBadgeHtml = '';
    const tierValue = allAccountTiers[account.email] !== undefined ? allAccountTiers[account.email] : account.tier;
    if (tierValue !== undefined && tierValue !== null) {
      const rawTier = String(tierValue).toUpperCase();
      if (rawTier.includes('ULTRA')) {
        tierBadgeHtml = '<span class="tier-badge tier-ultra">Ultra</span>';
      } else if (rawTier.includes('PRO')) {
        tierBadgeHtml = '<span class="tier-badge tier-pro">Pro</span>';
      }
    }

    item.innerHTML = '<div class="account-item-header">' +
      '<div class="account-item-left">' +
      checkboxHtml +
      '<span class="account-item-email">' + account.email + '</span>' +
      tierBadgeHtml +
      '</div>' + actionBtn + '</div>' + modelsHtml;

    modalAccountList.appendChild(item);
  });

  if (modalEditMode) {
    modalAccountList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        const isConfirmed = await showConfirm(`'${email}' ${t('confirm_delete_single')}`);
        if (!isConfirmed) return;
        
        const result = await window.electronAPI.deleteAccount(email);
        if (result.success) {
          selectedAccounts.delete(email);
          showSnackbar(email + ' ' + t('accounts_deleted'), 'success');
          loadAndRenderAccounts();
        } else {
          showSnackbar(t('accounts_delete_failed'), 'error');
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
        const targetTier = allAccountTiers[email] || (sortedAccounts.find(a => a.email === email) || {}).tier;
        window.electronAPI.switchAccount(email, targetTier);
      });
    });
  }

  if (modalAccountList) {
    modalAccountList.scrollTop = savedScrollTop;
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
    e.target.textContent = t('accounts_switching');
    e.target.style.pointerEvents = 'none';
    e.target.style.opacity = '0.7';
    
    const targetTier = allAccountTiers[email];
    window.electronAPI.switchAccount(email, targetTier);
  }
});

async function handleAddAccount() {
  showSnackbar(t('accounts_login_please'), 'success');
  
  const result = await window.electronAPI.addAccount();
  
  if (result.success) {
    const safeEmail = escapeHtml(result.account.email);
    if (result.alreadyExists) {
      showSnackbar(
        `${safeEmail} ${t('accounts_already_exists')} <span class="switch-new-account-link" data-email="${safeEmail}" style="text-decoration: underline; cursor: pointer; margin-left: 10px; font-weight: 500;">${t('accounts_switch_now')}</span>`,
        'warning',
        true
      );
    } else {
      showSnackbar(
        `${safeEmail} ${t('accounts_added')} <span class="switch-new-account-link" data-email="${safeEmail}" style="text-decoration: underline; cursor: pointer; margin-left: 10px; font-weight: 500;">${t('accounts_switch_now')}</span>`,
        'success',
        true
      );
    }
    await loadAndRenderAccounts();
    const newItem = modalAccountList.querySelector(`.account-item[data-email="${CSS.escape(result.account.email)}"]`);
    if (newItem) {
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    if (result.error && result.error.includes('timeout')) {
      // 무시
    } else {
      showSnackbar(t('accounts_add_failed') + (result.error || ''), 'error');
    }
  }
}

btnAddAccount.addEventListener('click', handleAddAccount);

function updateSelectAllButton() {
  const checkboxes = modalAccountList.querySelectorAll('.account-checkbox');
  const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
  btnAddAccount.innerHTML = allChecked ? iconSelectAll : iconDeselectAll;
  btnAddAccount.title = allChecked ? t('btn_deselect_all') : t('btn_select_all');
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
    btnEditAccounts.title = t('btn_done');
    // 추가 버튼을 전체 선택/해제 버튼으로 전환
    btnAddAccount.innerHTML = iconDeselectAll;
    btnAddAccount.title = t('btn_select_all');
    btnAddAccount.removeEventListener('click', handleAddAccount);
    btnAddAccount.addEventListener('click', toggleSelectAll);
    // 정렬 버튼을 삭제 버튼으로 전환
    btnSortAccounts.innerHTML = iconTrash;
    btnSortAccounts.title = t('btn_delete_selected');
    btnSortAccounts.classList.add('delete-mode');
    btnSortAccounts.disabled = selectedAccounts.size === 0;
    btnSortAccounts.removeEventListener('click', handleSortMenu);
    btnSortAccounts.addEventListener('click', handleDeleteSelected);
  } else {
    btnEditAccounts.innerHTML = iconEdit;
    btnEditAccounts.title = t('btn_edit');
    // 전체 선택 버튼을 추가 버튼으로 복원
    btnAddAccount.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>';
    btnAddAccount.title = t('btn_add_account');
    btnAddAccount.removeEventListener('click', toggleSelectAll);
    btnAddAccount.addEventListener('click', handleAddAccount);
    // 삭제 버튼을 정렬 버튼으로 복원
    btnSortAccounts.innerHTML = iconSort;
    btnSortAccounts.title = t('btn_sort');
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
  
  const isConfirmed = await showConfirm(`${t('confirm_delete_multi_prefix')}${selectedAccounts.size}${t('confirm_delete_multi_suffix')}`);
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
  showSnackbar(`${successCount}${t('accounts_multi_deleted')}`, 'success');
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
