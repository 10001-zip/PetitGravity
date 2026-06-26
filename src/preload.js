const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 계정 상태 및 Quota 갱신 이벤트 수신
  onAccountStatus: (callback) => {
    ipcRenderer.on('account-status', (event, data) => callback(data));
  },
  
  // 설정 업데이트 송신
  updateConfig: (data) => {
    ipcRenderer.send('update-config', data);
  },
  
  // 즉시 동기화 요청 송신
  requestSync: () => {
    ipcRenderer.send('request-sync');
  },
  
  // 창 컨트롤
  minimizeWindow: () => {
    ipcRenderer.send('window-minimize');
  },
  
  closeWindow: () => {
    ipcRenderer.send('window-close');
  },
  
  launchApp: () => {
    ipcRenderer.send('launch-app');
  },

  // === 계정 관리 API ===
  openAccountWindow: () => ipcRenderer.send('open-account-window'),
  closeAccountWindow: () => ipcRenderer.send('close-account-window'),
  showMainSnackbar: (message, type, isHtml) => ipcRenderer.send('show-main-snackbar', { message, type, isHtml }),
  onShowSnackbar: (callback) => ipcRenderer.on('show-snackbar', (event, data) => callback(data)),
  getCurrentAccount: () => ipcRenderer.invoke('get-current-account'),
  getAllAccounts: () => ipcRenderer.invoke('get-all-accounts'),
  addAccount: () => ipcRenderer.invoke('add-account'),
  deleteAccount: (email) => ipcRenderer.invoke('delete-account', email),
  switchAccount: (email) => ipcRenderer.invoke('switch-account', email),
  fetchAllQuotas: () => ipcRenderer.invoke('fetch-all-quotas'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  onUpdateDownloading: (callback) => ipcRenderer.on('update-downloading', callback),
  installUpdate: () => ipcRenderer.send('install-update'),

  // === Window Snapping ===
  snapTopLeft: () => ipcRenderer.send('snap-top-left'),
  snapTopRight: () => ipcRenderer.send('snap-top-right'),
  snapBottomLeft: () => ipcRenderer.send('snap-bottom-left'),
  snapBottomRight: () => ipcRenderer.send('snap-bottom-right'),
  snapLeft: () => ipcRenderer.send('snap-left'),
  snapRight: () => ipcRenderer.send('snap-right'),
  snapTop: () => ipcRenderer.send('snap-top'),
  snapBottom: () => ipcRenderer.send('snap-bottom'),
  snapCenterX: () => ipcRenderer.send('snap-center-x'),
  snapCenterY: () => ipcRenderer.send('snap-center-y'),
});
