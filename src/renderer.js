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
const accountTierBadge = document.getElementById('account-tier-badge');

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
let currentIsLoading = false;

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
  
  if (currentIsLoading) {
    modelsListContainer.innerHTML = `
      <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary); animation: spin 0.8s linear infinite;">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <p>서버에서 계정 할당량 정보를 받아오는 중입니다...</p>
      </div>
    `;
    return;
  }

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
          ${refreshText ? `<span class="model-refresh-info" style="font-size: 11px; color: #888; white-space: nowrap;">${refreshText}</span>` : ''}
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
    if (accountTierBadge) accountTierBadge.style.display = 'none';
    currentQuotas = [];
    renderModels();
    return;
  }

  // 로그인 됨
  textEmail.textContent = data.email;

  // 티어 뱃지 업데이트
  if (accountTierBadge) {
    if (data.tier !== undefined && data.tier !== null) {
      const tier = String(data.tier).toUpperCase();
      if (tier.includes('ULTRA')) {
        accountTierBadge.textContent = 'Ultra';
        accountTierBadge.className = 'tier-badge tier-ultra';
        accountTierBadge.style.display = '';
      } else if (tier.includes('PRO')) {
        accountTierBadge.textContent = 'Pro';
        accountTierBadge.className = 'tier-badge tier-pro';
        accountTierBadge.style.display = '';
      } else {
        accountTierBadge.style.display = 'none';
      }
    } else {
      accountTierBadge.style.display = 'none';
    }
  }
  
  currentIsLoading = !!data.isLoading;
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

const btnSwitchAccount = document.getElementById('btn-switch-account');

const mainSnackbar = document.getElementById('main-snackbar');
const mainSnackbarMessage = document.getElementById('main-snackbar-message');
const mainSnackbarClose = document.getElementById('main-snackbar-close');

let snackbarTimeout = null;

function showSnackbar(message, type, isHtml = false) {
  if (snackbarTimeout) {
    clearTimeout(snackbarTimeout);
  }
  if (isHtml) {
    mainSnackbarMessage.innerHTML = message;
  } else {
    mainSnackbarMessage.textContent = message;
  }
  mainSnackbar.className = 'modal-snackbar visible ' + type;
  
  // 3초 뒤 자동 닫기
  snackbarTimeout = setTimeout(() => {
    hideSnackbar();
  }, 3000);
}

function hideSnackbar() {
  mainSnackbar.className = 'modal-snackbar';
}

if (mainSnackbarClose) {
  mainSnackbarClose.addEventListener('click', hideSnackbar);
}

if (window.electronAPI.onShowSnackbar) {
  window.electronAPI.onShowSnackbar((data) => {
    showSnackbar(data.message, data.type, data.isHtml);
  });
}

btnSwitchAccount.addEventListener('click', () => {
  window.electronAPI.openAccountWindow();
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

if (window.electronAPI.onUpdateReady) {
  window.electronAPI.onUpdateReady(() => {
    if (updateModalOverlay) {
      updateModalOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        updateModalOverlay.classList.add('active');
      });
    }
  });
}

function closeUpdateModal() {
  if (!updateModalOverlay) return;
  updateModalOverlay.classList.remove('active');
  setTimeout(() => {
    updateModalOverlay.style.display = 'none';
  }, 250);
}

if (btnUpdateLater) {
  btnUpdateLater.addEventListener('click', closeUpdateModal);
}

const btnCloseUpdateModal = document.getElementById('btn-close-update-modal');
if (btnCloseUpdateModal) {
  btnCloseUpdateModal.addEventListener('click', closeUpdateModal);
}

if (btnUpdateNow) {
  btnUpdateNow.addEventListener('click', () => {
    btnUpdateNow.textContent = '설치 중...';
    btnUpdateNow.style.opacity = '0.7';
    btnUpdateNow.disabled = true;
    window.electronAPI.installUpdate();
  });
}
