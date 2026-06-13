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
  getAllAccounts: () => ipcRenderer.invoke('get-all-accounts'),
  addAccount: () => ipcRenderer.invoke('add-account'),
  deleteAccount: (email) => ipcRenderer.invoke('delete-account', email),
  switchAccount: (email) => ipcRenderer.invoke('switch-account', email),
  reorderAccounts: (orderedEmails) => ipcRenderer.invoke('reorder-accounts', orderedEmails),
  fetchAllQuotas: () => ipcRenderer.invoke('fetch-all-quotas'),

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
