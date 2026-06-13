// DOM 엘리먼트 획득
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const btnToggleFilter = document.getElementById('btn-toggle-filter');
const btnRefreshTitlebar = document.getElementById('btn-refresh-titlebar');
const btnSettings = document.getElementById('btn-settings');
const btnLaunchApp = document.getElementById('btn-launch-app');

const textEmail = document.getElementById('account-email');
const accountAvatar = document.getElementById('account-avatar');
const modelsListContainer = document.getElementById('models-list');

const inputThreshold = document.getElementById('input-threshold');
const labelThreshold = document.getElementById('label-threshold');
const sliderSegments = document.getElementById('slider-segments');
const toggleNotifications = document.getElementById('toggle-notifications');
const containerThresholdSettings = document.getElementById('container-threshold-settings');
const inputCheckInterval = document.getElementById('input-check-interval');

const toggleAlwaysOnTop = document.getElementById('toggle-always-on-top');
const toggleRunAtStartup = document.getElementById('toggle-run-at-startup');
const toggleStartMinimized = document.getElementById('toggle-start-minimized');
const containerStartMinimized = document.getElementById('container-start-minimized');
const toggleWindowSnapping = document.getElementById('toggle-window-snapping');
const toggleWindowSnap = document.getElementById('toggle-window-snap');
const toggleMinimizeOnClose = document.getElementById('toggle-minimize-on-close');

// 앱 버전 표시
if (window.electronAPI.getAppVersion) {
  window.electronAPI.getAppVersion().then(version => {
    const el = document.getElementById('app-version-display');
    if (el) el.textContent = `v${version}`;
  });
}

// UI 로컬 상태
let currentQuotas = [];
let currentConfig = { alertThreshold: 20, alertModels: {}, enableNotifications: true };

// 윈도우 창 컨트롤 이벤트 바인딩
btnMinimize.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

// 타이틀바 새로고침 버튼
if (btnRefreshTitlebar) {
  btnRefreshTitlebar.addEventListener('click', () => {
    btnRefreshTitlebar.classList.add('spinning');
    setTimeout(() => {
      btnRefreshTitlebar.classList.remove('spinning');
    }, 1000);
    window.electronAPI.requestSync();
  });
}

if (btnLaunchApp) {
  const playIconSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`;
  const spinnerSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
  </svg>`;

  btnLaunchApp.addEventListener('click', () => {
    btnLaunchApp.innerHTML = spinnerSVG;
    btnLaunchApp.classList.add('spinning');
    
    // 1.5초 로딩 애니메이션 후 버튼을 즉시 숨깁니다 (낙관적 UI 업데이트)
    setTimeout(() => {
      btnLaunchApp.classList.remove('spinning');
      btnLaunchApp.innerHTML = playIconSVG;
      btnLaunchApp.style.display = 'none';
    }, 1500);
    
    window.electronAPI.launchApp();
  });
}



// 슬라이더 동적 채우기 함수
function updateSliderFills(val) {
  if (!sliderSegments) return;
  const fills = sliderSegments.querySelectorAll('.segment-fill');
  fills.forEach((fill, index) => {
    const threshold = (index + 1) * 10;
    fill.style.width = val >= threshold ? '100%' : '0%';
  });
}

// 슬라이더 조절 이벤트
inputThreshold.addEventListener('input', (e) => {
  const value = parseInt(e.target.value, 10);
  labelThreshold.textContent = `${value}%`;
  updateSliderFills(value);
});

inputThreshold.addEventListener('change', (e) => {
  const value = e.target.value;
  window.electronAPI.updateConfig({ threshold: value });
});

if (toggleNotifications) {
  toggleNotifications.addEventListener('change', (e) => {
    const checked = e.target.checked;
    window.electronAPI.updateConfig({ enableNotifications: checked });
    if (containerThresholdSettings) {
      if (checked) {
        containerThresholdSettings.style.opacity = '1';
        containerThresholdSettings.style.maxHeight = '200px';
        containerThresholdSettings.style.pointerEvents = 'auto';
        
        const scrollContainer = containerThresholdSettings.closest('.modal-account-list');
        if (scrollContainer) {
          const startTime = performance.now();
          const duration = 450;
          function syncScroll(currentTime) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            if (currentTime - startTime < duration) {
              requestAnimationFrame(syncScroll);
            }
          }
          requestAnimationFrame(syncScroll);
        }
      } else {
        containerThresholdSettings.style.opacity = '0';
        containerThresholdSettings.style.maxHeight = '0px';
        containerThresholdSettings.style.pointerEvents = 'none';
      }
    }
  });
}

function updateStartMinimizedUI() {
  if (toggleRunAtStartup && toggleStartMinimized && containerStartMinimized) {
    if (toggleRunAtStartup.checked) {
      containerStartMinimized.style.opacity = '1';
      containerStartMinimized.style.pointerEvents = 'auto';
      // 복구할 때는 실제 설정값으로 보여주기
      toggleStartMinimized.checked = !!currentConfig.startMinimized;
    } else {
      containerStartMinimized.style.opacity = '0.5';
      containerStartMinimized.style.pointerEvents = 'none';
      // 실제 값과 무관하게 off로 보여주기
      toggleStartMinimized.checked = false;
    }
  }
}

if (inputCheckInterval) {
  inputCheckInterval.addEventListener('change', (e) => {
    let value = parseFloat(e.target.value);
    if (isNaN(value)) {
      value = 1;
    }
    
    if (value < 1) {
      value = 1;
      e.target.value = 1;
      showSnackbar('최소 체크 주기는 1분입니다.', 'warning');
    }
    
    currentConfig.checkInterval = value;
    window.electronAPI.updateConfig({ checkInterval: value });
  });
}

if (toggleAlwaysOnTop) {
  toggleAlwaysOnTop.addEventListener('change', (e) => {
    currentConfig.alwaysOnTop = e.target.checked;
    window.electronAPI.updateConfig({ alwaysOnTop: e.target.checked });
  });
}

if (toggleWindowSnapping) {
  toggleWindowSnapping.addEventListener('change', (e) => {
    currentConfig.enableSnapping = e.target.checked;
    window.electronAPI.updateConfig({ enableSnapping: e.target.checked });
  });
}

if (toggleRunAtStartup) {
  toggleRunAtStartup.addEventListener('change', (e) => {
    currentConfig.runAtStartup = e.target.checked;
    window.electronAPI.updateConfig({ runAtStartup: e.target.checked });
    updateStartMinimizedUI();
  });
}

if (toggleStartMinimized) {
  toggleStartMinimized.addEventListener('change', (e) => {
    currentConfig.startMinimized = e.target.checked;
    window.electronAPI.updateConfig({ startMinimized: e.target.checked });
  });
}

if (toggleWindowSnap) {
  toggleWindowSnap.addEventListener('change', (e) => {
    currentConfig.enableWindowSnap = e.target.checked;
    window.electronAPI.updateConfig({ enableWindowSnap: e.target.checked });
  });
}

if (toggleMinimizeOnClose) {
  toggleMinimizeOnClose.addEventListener('change', (e) => {
    currentConfig.minimizeOnClose = e.target.checked;
    window.electronAPI.updateConfig({ minimizeOnClose: e.target.checked });
  });
}

// 글로벌 단축키 (Ctrl + P)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    if (toggleAlwaysOnTop) {
      const newState = !currentConfig.alwaysOnTop;
      toggleAlwaysOnTop.checked = newState;
      currentConfig.alwaysOnTop = newState;
      window.electronAPI.updateConfig({ alwaysOnTop: newState });
    }
  }
});

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

// 모델 카드 리스트 렌더링 함수
function renderModels() {
  modelsListContainer.innerHTML = '';
  
  if (currentQuotas.length === 0) {
    modelsListContainer.innerHTML = `
      <div class="empty-state">
        <p>조회된 모델 정보가 없습니다. 안티그래비티 앱이 켜져 있고 로그인되어 있는지 확인해 주세요.</p>
      </div>
    `;
    return;
  }

  const displayModels = currentQuotas;

  displayModels.forEach(model => {
    const card = document.createElement('div');
    
    // 퍼센티지에 따른 게이지 색상 결정 (20%빨강, 40%주황, 60%노랑, 그 이상 검정)
    let gaugeClass = 'gauge-black';
    if (model.percentage <= 20) {
      gaugeClass = 'gauge-red';
    } else if (model.percentage <= 40) {
      gaugeClass = 'gauge-orange';
    } else if (model.percentage <= 60) {
      gaugeClass = 'gauge-yellow';
    }
    
    card.className = `model-card ${gaugeClass}`;
    
    // 임계값 이하일 경우 경고 상태 클래스 추가
    const isAlert = model.percentage <= currentConfig.alertThreshold;
    if (isAlert) {
      card.classList.add('alert-state');
    }

    const refreshText = getRefreshText(model.quotaInfo);

    card.innerHTML = `
      <div class="model-card-header">
        <div class="model-name-wrapper">
          <span class="model-name" title="${model.name}">${model.displayName}</span>
        </div>
        <div class="model-pct-wrapper" style="display: flex; align-items: center; gap: 8px;">
          ${refreshText ? `<span class="model-refresh-info" style="font-size: 11px; color: #888;">${refreshText}</span>` : ''}
          <span class="model-pct">${model.percentage}%</span>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar-fill" style="width: ${model.percentage}%"></div>
      </div>
    `;

    modelsListContainer.appendChild(card);
  });
}

// 메인 백엔드로부터 계정 상태 업데이트 수신
window.electronAPI.onAccountStatus((data) => {
  if (btnLaunchApp) {
    btnLaunchApp.style.display = data.isAppRunning ? 'none' : 'flex';
  }

  if (accountAvatar) {
    accountAvatar.classList.remove('spinning');
    accountAvatar.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    `;
  }

  if (!data.loggedIn) {
    textEmail.textContent = '안티그래비티 앱에 로그인해 주세요.';
    currentQuotas = [];
    renderModels();
    return;
  }

  // 로그인 됨
  textEmail.textContent = data.email;
  
  currentQuotas = data.quotas || [];
  currentConfig = data.config || { alertThreshold: 20, alertModels: {}, enableNotifications: true };

  // 토글 동기화
  if (toggleNotifications) {
    const isEnabled = currentConfig.enableNotifications !== false;
    toggleNotifications.checked = isEnabled;
    if (containerThresholdSettings) {
      if (isEnabled) {
        containerThresholdSettings.style.opacity = '1';
        containerThresholdSettings.style.maxHeight = '200px';
        containerThresholdSettings.style.pointerEvents = 'auto';
      } else {
        containerThresholdSettings.style.opacity = '0';
        containerThresholdSettings.style.maxHeight = '0px';
        containerThresholdSettings.style.pointerEvents = 'none';
      }
    }
  }
  
  if (inputCheckInterval) {
    inputCheckInterval.value = currentConfig.checkInterval || 1;
  }
  
  if (toggleAlwaysOnTop) toggleAlwaysOnTop.checked = !!currentConfig.alwaysOnTop;
  if (toggleWindowSnapping) toggleWindowSnapping.checked = currentConfig.enableSnapping !== false;
  if (toggleRunAtStartup) toggleRunAtStartup.checked = !!currentConfig.runAtStartup;
  if (toggleStartMinimized) toggleStartMinimized.checked = !!currentConfig.startMinimized;
  if (toggleWindowSnap) toggleWindowSnap.checked = currentConfig.enableWindowSnap !== false;
  if (toggleMinimizeOnClose) toggleMinimizeOnClose.checked = currentConfig.minimizeOnClose !== false;
  updateStartMinimizedUI();

  // 슬라이더 값 동기화
  inputThreshold.value = currentConfig.alertThreshold;
  labelThreshold.textContent = `${currentConfig.alertThreshold}%`;
  updateSliderFills(currentConfig.alertThreshold);

  renderModels();
});

// sync-btn 스피너 CSS 회전 정의 추가를 위한 style 태그 생성 (회전 지속 방지용)
const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .sync-btn.spinning svg, .custom-action-btn.spinning svg, .avatar.spinning svg {
    animation: spin 0.8s linear infinite;
  }
`;
document.head.appendChild(style);

// ============================================================
// 계정 관리 모달 로직
// ============================================================

const btnSwitchAccount = document.getElementById('btn-switch-account');
const modalOverlay = document.getElementById('modal-overlay');
const modalContainer = document.getElementById('modal-container');
const modalSearch = document.getElementById('modal-search');
const btnSearchClear = document.getElementById('btn-search-clear');
const searchIcon = document.querySelector('.search-icon');
const modalAccountList = document.getElementById('modal-account-list');
const btnAddAccount = document.getElementById('btn-add-account');
const btnEditAccounts = document.getElementById('btn-edit-accounts');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalSnackbar = document.getElementById('modal-snackbar');
const snackbarMessage = document.getElementById('snackbar-message');
const snackbarClose = document.getElementById('snackbar-close');
const btnSortAccounts = document.getElementById('btn-sort-accounts');
const sortContextMenu = document.getElementById('sort-context-menu');

let modalEditMode = false;
let currentSortMode = 'default'; // 'default', 'asc', 'desc', 'tokens-high', 'tokens-low'
let allAccountQuotas = {};
let sortableInstance = null;

function openAccountModal() {
  modalEditMode = false;
  btnEditAccounts.querySelector('span').textContent = '편집';
  btnAddAccount.style.display = '';
  modalSearch.value = '';
  btnSearchClear.style.display = 'none';
  if (searchIcon) searchIcon.style.display = 'block';
  hideSnackbar();
  modalOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    modalOverlay.classList.add('active');
  });
  loadAndRenderAccounts();
}

function closeAccountModal() {
  modalOverlay.classList.remove('active');
  setTimeout(() => {
    modalOverlay.style.display = 'none';
  }, 250);
  if (modalEditMode) {
    modalEditMode = false;
    destroySortable();
  }
}

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

function getPctColorClass(percentage) {
  if (percentage <= 20) return 'pct-red';
  if (percentage <= 40) return 'pct-orange';
  if (percentage <= 60) return 'pct-yellow';
  return 'pct-green';
}

async function loadAndRenderAccounts() {
  const accounts = await window.electronAPI.getAllAccounts();
  renderAccountList(accounts);
  const quotaResults = await window.electronAPI.fetchAllQuotas();
  allAccountQuotas = {};
  for (const result of quotaResults) {
    allAccountQuotas[result.email] = result.quotas || [];
  }
  const updatedAccounts = await window.electronAPI.getAllAccounts();
  renderAccountList(updatedAccounts);
}

function renderAccountList(accounts) {
  const currentEmail = textEmail.textContent;
  
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
          (refreshText ? '<span class="account-model-reset">' + refreshText + '</span>' : '') +
          '<span class="account-model-pct ' + pctClass + '">' + q.percentage + '%</span>' +
          '</div>';
      });
      modelsHtml += '</div>';
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
      '<div class="drag-handle"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
      '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>' +
      '<circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>' +
      '<circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></div>' +
      '<span class="account-item-email">' + account.email + '</span>' +
      '</div>' + actionBtn + '</div>' + modelsHtml;

    modalAccountList.appendChild(item);
  });

  if (modalEditMode) {
    modalAccountList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        const result = await window.electronAPI.deleteAccount(email);
        if (result.success) {
          showSnackbar(email + ' 계정이 삭제되었습니다.', 'success');
          loadAndRenderAccounts();
        } else {
          showSnackbar('계정 삭제에 실패했습니다.', 'error');
        }
      });
    });
    initSortable();
  } else {
    destroySortable();
    modalAccountList.querySelectorAll('.switch-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        const ab = e.currentTarget;
        const isCurrent = email === currentEmail;
        ab.disabled = true;
        ab.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>';
        ab.querySelector('svg').style.animation = 'spin 0.8s linear infinite';
        const result = await window.electronAPI.switchAccount(email);
        if (result.success) {
          showSnackbar(isCurrent ? '안티그래비티가 재실행되었습니다.' : email + ' 계정으로 전환되었습니다.', 'success');
          setTimeout(() => closeAccountModal(), 1500);
        } else {
          showSnackbar((isCurrent ? '재실행 실패: ' : '계정 전환 실패: ') + (result.error || '알 수 없는 오류'), 'error');
          ab.disabled = false;
          if (isCurrent) {
            ab.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>';
          } else {
            ab.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>';
          }
        }
      });
    });
  }
}

function initSortable() {
  destroySortable();
  if (typeof Sortable !== 'undefined') {
    sortableInstance = Sortable.create(modalAccountList, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async () => {
        const items = modalAccountList.querySelectorAll('.account-item');
        const orderedEmails = Array.from(items).map(item => item.dataset.email);
        await window.electronAPI.reorderAccounts(orderedEmails);
      }
    });
  }
}

function destroySortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

// === 이벤트 리스너 ===
btnSwitchAccount.addEventListener('click', openAccountModal);
btnCloseModal.addEventListener('click', closeAccountModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeAccountModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeAccountModal();
});

snackbarClose.addEventListener('click', hideSnackbar);

modalSnackbar.addEventListener('click', async (e) => {
  if (e.target.classList.contains('switch-new-account-link')) {
    const email = e.target.dataset.email;
    e.target.textContent = '전환 중...';
    e.target.style.pointerEvents = 'none';
    e.target.style.opacity = '0.7';
    
    const result = await window.electronAPI.switchAccount(email);
    if (result.success) {
      showSnackbar(email + ' 계정으로 전환되었습니다.', 'success');
      setTimeout(() => closeAccountModal(), 1500);
    } else {
      showSnackbar('계정 전환 실패: ' + (result.error || '알 수 없는 오류'), 'error');
    }
  }
});

btnAddAccount.addEventListener('click', async () => {
  showSnackbar('새 창이 열렸습니다. 브라우저에서 로그인을 진행해 주세요.', 'success');
  
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
      // 타임아웃(사용자가 로그인을 완료하지 않음)은 무시
    } else {
      showSnackbar('계정 추가 실패: ' + (result.error || '알 수 없는 오류'), 'error');
    }
  }
});

btnEditAccounts.addEventListener('click', async () => {
  modalEditMode = !modalEditMode;
  if (modalEditMode) {
    btnEditAccounts.querySelector('span').textContent = '완료';
    btnAddAccount.style.display = 'none';
  } else {
    btnEditAccounts.querySelector('span').textContent = '편집';
    btnAddAccount.style.display = '';
    destroySortable();
  }
  const accounts = await window.electronAPI.getAllAccounts();
  renderAccountList(accounts);
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
  renderAccountList(accounts);
});

btnSearchClear.addEventListener('click', async () => {
  modalSearch.value = '';
  btnSearchClear.style.display = 'none';
  if (searchIcon) searchIcon.style.display = 'block';
  modalSearch.focus();
  const accounts = await window.electronAPI.getAllAccounts();
  renderAccountList(accounts);
});

// 정렬 버튼 클릭 시 컨텍스트 메뉴 토글
btnSortAccounts.addEventListener('click', (e) => {
  e.stopPropagation();
  sortContextMenu.classList.toggle('active');
});

// 컨텍스트 메뉴 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  if (!sortContextMenu.contains(e.target) && e.target !== btnSortAccounts) {
    sortContextMenu.classList.remove('active');
  }
});

// 정렬 메뉴 아이템 클릭 처리
document.querySelectorAll('.sort-menu-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.stopPropagation();
    currentSortMode = e.target.dataset.sort;
    sortContextMenu.classList.remove('active');
    
    // 정렬 모드 변경 후 리스트 다시 렌더링
    const accounts = await window.electronAPI.getAllAccounts();
    renderAccountList(accounts);
  });
});

// ============================================================
// 설정 모달 로직
// ============================================================
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');

function openSettingsModal() {
  settingsModalOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    settingsModalOverlay.classList.add('active');
  });
}

function closeSettingsModal() {
  settingsModalOverlay.classList.remove('active');
  setTimeout(() => {
    settingsModalOverlay.style.display = 'none';
  }, 250);
}

btnSettings.addEventListener('click', openSettingsModal);
btnCloseSettingsModal.addEventListener('click', closeSettingsModal);

settingsModalOverlay.addEventListener('click', (e) => {
  if (e.target === settingsModalOverlay) closeSettingsModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && settingsModalOverlay.classList.contains('active')) closeSettingsModal();
});

// ============================================================
// Window Snapping Logic
// ============================================================
const pressedKeys = new Set();

const handleKeyDown = (e) => {
  pressedKeys.add(e.key);

  if (currentConfig.enableSnapping === false) return;

  // Alt + Shift 가 동시에 눌려있는 상태인지 확인
  if (e.altKey && e.shiftKey) {
    const hasUp = pressedKeys.has('ArrowUp');
    const hasDown = pressedKeys.has('ArrowDown');
    const hasLeft = pressedKeys.has('ArrowLeft');
    const hasRight = pressedKeys.has('ArrowRight');

    let handled = false;

    // 우선순위 1: 마주보는 방향키 조합 (중앙 스냅)
    if (hasLeft && hasRight) {
      window.electronAPI?.snapCenterX();
      handled = true;
    } else if (hasUp && hasDown) {
      window.electronAPI?.snapCenterY();
      handled = true;
    }
    // 우선순위 2: 대각선 방향키 조합 (코너 스냅)
    else if (hasUp && hasLeft) {
      window.electronAPI?.snapTopLeft();
      handled = true;
    } else if (hasUp && hasRight) {
      window.electronAPI?.snapTopRight();
      handled = true;
    } else if (hasDown && hasLeft) {
      window.electronAPI?.snapBottomLeft();
      handled = true;
    } else if (hasDown && hasRight) {
      window.electronAPI?.snapBottomRight();
      handled = true;
    }
    // 우선순위 3: 단일 방향키 조합 (사이드 스냅)
    else if (e.key === 'ArrowUp') {
      window.electronAPI?.snapTop();
      handled = true;
    } else if (e.key === 'ArrowDown') {
      window.electronAPI?.snapBottom();
      handled = true;
    } else if (e.key === 'ArrowLeft') {
      window.electronAPI?.snapLeft();
      handled = true;
    } else if (e.key === 'ArrowRight') {
      window.electronAPI?.snapRight();
      handled = true;
    }

    // 스냅 로직이 실행되었다면 브라우저 기본 동작 차단
    if (handled) {
      e.preventDefault();
    }
  }
};

const handleKeyUp = (e) => {
  pressedKeys.delete(e.key);
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// 앱 업데이트 모달 컨트롤
const updateModalOverlay = document.getElementById('update-modal-overlay');
const btnUpdateLater = document.getElementById('btn-update-later');
const btnUpdateNow = document.getElementById('btn-update-now');

if (window.electronAPI.onUpdateDownloading) {
  window.electronAPI.onUpdateDownloading(() => {
    showSnackbar('새 버전 업데이트를 백그라운드에서 다운로드 중입니다. 잠시만 기다려주세요...', 'info');
  });
}

if (window.electronAPI.onUpdateReady) {
  window.electronAPI.onUpdateReady(() => {
    if (updateModalOverlay) updateModalOverlay.classList.add('active');
  });
}

if (btnUpdateLater) {
  btnUpdateLater.addEventListener('click', () => {
    updateModalOverlay.classList.remove('active');
  });
}

const btnCloseUpdateModal = document.getElementById('btn-close-update-modal');
if (btnCloseUpdateModal) {
  btnCloseUpdateModal.addEventListener('click', () => {
    updateModalOverlay.classList.remove('active');
  });
}

if (btnUpdateNow) {
  btnUpdateNow.addEventListener('click', () => {
    btnUpdateNow.textContent = '설치 중...';
    btnUpdateNow.style.opacity = '0.7';
    btnUpdateNow.disabled = true;
    window.electronAPI.installUpdate();
  });
}
