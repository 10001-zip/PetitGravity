const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const http = require('http');
const { URL } = require('url');

try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
  });
} catch (_) { }

let mainWindow;
let appTray;
let isQuitting = false;
let credentialCheckInterval;

// config.json 경로
const configPath = path.join(app.getPath('userData'), 'config.json');

// 기본 설정 데이터 구조
let config = {
  global: { alertThreshold: 20, alertModels: {}, enableNotifications: true, enableWindowSnap: true },
  currentAccount: null, // "email"
};

// 알림 발송 상태 저장 (계정+모델 별 알림 여부, 앱 재시작 시 초기화됨)
const notifiedModels = new Set();

// 설정 로드
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    } else {
      saveConfig();
    }
  } catch (err) {
    console.error('설정 로딩 실패:', err);
  }
}

// 설정 저장
function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('설정 저장 실패:', err);
  }
}

// === 멀티 계정 관리 ===
const accountsPath = path.join(app.getPath('userData'), 'accounts.json');
let accounts = [];

function loadAccounts() {
  try {
    if (fs.existsSync(accountsPath)) {
      const data = fs.readFileSync(accountsPath, 'utf8');
      accounts = JSON.parse(data);
    } else {
      accounts = [];
      saveAccounts();
    }
  } catch (err) {
    console.error('계정 목록 로딩 실패:', err);
    accounts = [];
  }
}

function saveAccounts() {
  try {
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf8');
  } catch (err) {
    console.error('계정 목록 저장 실패:', err);
  }
}

// Windows 알림 발송 (다중 모델 병합, 1회만 발송)
function sendQuotaNotification(email, modelsToAlert) {
  const modelsToNotify = [];

  for (const model of modelsToAlert) {
    const notifyKey = `${email}:${model.displayName}`;
    if (!notifiedModels.has(notifyKey)) {
      modelsToNotify.push(model);
      notifiedModels.add(notifyKey);
    }
  }

  if (modelsToNotify.length === 0) return;

  if (Notification.isSupported()) {
    const shortEmail = email.split('@')[0];
    const bodyText = `${shortEmail} - ` + modelsToNotify.map(m => `⚠️${m.displayName}: ${m.percentage}%`).join(', ');

    const notify = new Notification({
      title: '⚠️ Antigravity Quota Warning',
      body: bodyText,
      icon: path.join(__dirname, 'assets', 'icon_rounded.png'),
    });
    notify.show();
  }
}

// 비정형/유사 JSON 포맷 파서 (Windows Cmd 인용부호 제거 등으로 인한 포맷 깨짐 대응)
function parsePseudoJson(str) {
  if (!str) return null;
  str = str.trim();
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    str = str.substring(1, str.length - 1).trim();
  }

  function parseValue(index) {
    while (index < str.length && /\s/.test(str[index])) {
      index++;
    }

    if (index >= str.length) {
      return { value: null, nextIndex: index };
    }

    if (str[index] === '{') {
      const obj = {};
      index++; // skip '{'

      while (index < str.length) {
        while (index < str.length && /\s/.test(str[index])) {
          index++;
        }

        if (str[index] === '}') {
          index++; // skip '}'
          break;
        }

        let key = '';
        while (index < str.length && /[a-zA-Z0-9_-]/.test(str[index])) {
          key += str[index];
          index++;
        }

        while (index < str.length && /\s/.test(str[index])) {
          index++;
        }
        if (str[index] !== ':') {
          break;
        }
        index++; // skip ':'

        const valResult = parseValue(index);
        obj[key] = valResult.value;
        index = valResult.nextIndex;

        while (index < str.length && /\s/.test(str[index])) {
          index++;
        }

        if (str[index] === ',') {
          index++; // skip ','
        } else if (str[index] === '}') {
          index++; // skip '}'
          break;
        } else {
          break;
        }
      }
      return { value: obj, nextIndex: index };
    } else {
      let val = '';
      while (index < str.length && str[index] !== ',' && str[index] !== '}') {
        val += str[index];
        index++;
      }
      val = val.trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      return { value: val, nextIndex: index };
    }
  }

  try {
    const result = parseValue(0);
    return result.value;
  } catch (e) {
    return null;
  }
}

// Windows 자격 증명 (gemini:antigravity) 읽기
function readWindowsCredential() {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'helpers', 'read_cred.ps1').replace('app.asar', 'app.asar.unpacked');
    // cmd/powershell에서 ps1 실행
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Credential 읽기 에러:', error, stderr);
        return resolve(null);
      }

      const result = stdout.trim();
      if (result === 'not_found' || !result) {
        return resolve(null);
      }

      try {
        const parsed = JSON.parse(result);
        resolve(parsed);
      } catch (err) {
        try {
          const parsed = parsePseudoJson(result);
          if (parsed && parsed.token) {
            resolve(parsed);
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback credential 파싱 에러:', fallbackErr);
        }
        console.error('Credential 파싱 에러:', err, result);
        resolve(null);
      }
    });
  });
}


// Windows 자격 증명 (gemini:antigravity) 쓰기
function writeWindowsCredential(payloadString) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'helpers', 'write_cred.ps1').replace('app.asar', 'app.asar.unpacked');
    // base64 형태로 전달하여 특수문자나 인용부호 깨짐 방지
    const b64 = Buffer.from(payloadString).toString('base64');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -payloadB64 "${b64}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Credential 쓰기 에러:', error, stderr);
        return resolve(false);
      }
      const result = stdout.trim();
      resolve(result === 'success');
    });
  });
}

// Google OAuth 토큰 갱신
async function refreshAccessToken(refreshToken) {
  const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
  const CLIENT_SECRET = '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';
  const TOKEN_URL = 'https://oauth2.googleapis.com/token';

  try {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'vscode/1.X.X (Antigravity/4.2.1)'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data; // { access_token, expires_in, token_type }
  } catch (err) {
    console.error('토큰 갱신 API 오류:', err);
    return null;
  }
}

// Google UserInfo 조회 (이메일 획득)
async function getUserEmail(accessToken) {
  const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
  try {
    const response = await fetch(USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`UserInfo API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.email || null;
  } catch (err) {
    console.error('UserInfo API 오류:', err);
    return null;
  }
}

// Project ID 조회
async function fetchProjectId(accessToken) {
  const URL = 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:loadCodeAssist';
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity/4.2.1 (Windows NT 10.0; Win64; x64) Chrome/132.0.6834.160 Electron/39.2.3'
      },
      body: JSON.stringify({
        metadata: { ideType: 'ANTIGRAVITY' }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.cloudaicompanionProject || null;
  } catch (err) {
    console.error('Project ID 조회 오류:', err);
    return null;
  }
}

// Quota 정보 조회
async function fetchQuotaData(accessToken, projectId) {
  const endpoints = [
    { url: 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels', defaultProject: 'daily-cloudcode-pa' },
    { url: 'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels', defaultProject: 'daily-cloudcode-pa' },
    { url: 'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels', defaultProject: 'cloudcode-pa' },
  ];

  for (const item of endpoints) {
    // Try the provided projectId first, then fall back to the default project for this endpoint
    const projectsToTry = [];
    if (projectId) {
      projectsToTry.push(projectId);
    }
    if (item.defaultProject && item.defaultProject !== projectId) {
      projectsToTry.push(item.defaultProject);
    }
    if (projectsToTry.length === 0 && item.defaultProject) {
      projectsToTry.push(item.defaultProject);
    }

    for (const proj of projectsToTry) {
      try {
        const payload = proj ? { project: proj } : {};
        const response = await fetch(item.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Antigravity/4.2.1 (Windows NT 10.0; Win64; x64) Chrome/132.0.6834.160 Electron/39.2.3'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            console.log("=== RAW QUOTA API RESPONSE ===");
            console.log(JSON.stringify(data.models, null, 2));
            console.log("==============================");
            return data.models;
          }
        } else {
          console.warn(`Quota API ${item.url} with project ${proj} failed with status: ${response.status}`);
        }
      } catch (err) {
        console.warn(`Quota API ${item.url} with project ${proj} network error:`, err);
      }
    }
  }
  return null;
}

// === Quota Grouping Helper ===
function processModelsToGroups(models, threshold = null, currentEmail = null, notifiedModelsSet = null) {
  const groups = {
    'Gemini Models': { name: 'gemini_models', items: [], maxFraction: -1, quotaInfo: null },
    'Claude and GPT models': { name: 'claude_gpt_models', items: [], maxFraction: -1, quotaInfo: null }
  };

  for (const [name, info] of Object.entries(models)) {
    if (!info.quotaInfo) continue;
    
    let groupName = null;
    if (name.startsWith('gemini')) {
      groupName = 'Gemini Models';
    } else if (name.startsWith('claude') || name.startsWith('gpt')) {
      groupName = 'Claude and GPT models';
    }
    
    if (groupName) {
      const remainingFraction = info.quotaInfo.remainingFraction !== undefined ? info.quotaInfo.remainingFraction : 0;
      groups[groupName].items.push(info);
      if (!groups[groupName].quotaInfo || remainingFraction > groups[groupName].maxFraction) {
          groups[groupName].maxFraction = remainingFraction;
          groups[groupName].quotaInfo = info.quotaInfo;
      }
    }
  }
  
  const modelQuotas = [];
  const modelsToAlert = [];
  
  for (const [displayName, groupData] of Object.entries(groups)) {
    if (groupData.items.length === 0) continue;
    
    const MathPercentage = Math.round(groupData.maxFraction * 100);
    const percentage = MathPercentage < 0 ? 0 : MathPercentage;
    
    modelQuotas.push({
      name: groupData.name,
      displayName: displayName,
      percentage,
      quotaInfo: groupData.quotaInfo
    });
    
    if (threshold !== null) {
      if (percentage <= threshold) {
         modelsToAlert.push({ displayName, percentage });
      } else if (notifiedModelsSet && currentEmail) {
         notifiedModelsSet.delete(`${currentEmail}:${displayName}`);
      }
    }
  }
  
  return { modelQuotas, modelsToAlert };
}

// 활성 계정의 Quota 가져오기 및 상태 체크
let lastCheckedAccessToken = '';
let currentCachedEmail = '';
let currentCachedProjectId = null;

async function checkAndUpdateQuota() {
  try {
    const processes = await findAntigravityProcesses();
    const isAppRunning = processes.length > 0;

    const creds = await readWindowsCredential();

    if (!creds || !creds.token || !creds.token.access_token) {
      // 로그인 안 됨
      currentCachedEmail = '';
      currentCachedProjectId = null;
      lastCheckedAccessToken = '';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('account-status', { loggedIn: false, isAppRunning });
      }
      updateTrayMenu([], null);
      return;
    }

    let tokenData = creds.token;
    let accessToken = tokenData.access_token;
    let refreshToken = tokenData.refresh_token;

    // 만료 시간 체크 (현재 시간 기준 토큰 만료 여부 확인)
    let isExpired = false;
    if (tokenData.expiry) {
      const expiryTime = new Date(tokenData.expiry).getTime();
      const now = Date.now();
      // 10분 이하로 남았을 경우 만료된 것으로 판단하고 미리 갱신 시도
      if (expiryTime - now < 10 * 60 * 1000) {
        isExpired = true;
      }
    }

    if (isExpired && refreshToken) {
      console.log('토큰 만료 임박, 갱신을 시작합니다...');
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) {
        accessToken = refreshed.access_token;

        // 만료시각 갱신
        const newExpiry = new Date(Date.now() + (refreshed.expires_in * 1000)).toISOString();

        // Credential Manager에 다시 쓰기
        const newPayload = {
          token: {
            access_token: accessToken,
            token_type: 'Bearer',
            refresh_token: refreshToken,
            expiry: newExpiry
          },
          auth_method: creds.auth_method || 'consumer'
        };

        const writeSuccess = await writeWindowsCredential(JSON.stringify(newPayload));
        if (writeSuccess) {
          console.log('Credential Manager 토큰 갱신 성공');
        }
      }
    }

    // 계정 이메일 확인
    if (accessToken !== lastCheckedAccessToken || !currentCachedEmail) {
      lastCheckedAccessToken = accessToken;
      const email = await getUserEmail(accessToken);
      if (email) {
        currentCachedEmail = email;
        config.currentAccount = email;

        // 글로벌 설정이 없다면 초기화
        if (!config.global) {
          config.global = {
            alertThreshold: 20,
            alertModels: {}, // { modelName: true }
            enableNotifications: true,
            enableWindowSnap: true
          };
          saveConfig();
        }

        // Project ID 가져오기
        currentCachedProjectId = await fetchProjectId(accessToken);
      } else {
        // UserInfo 가져오기 실패 시 로그인 안된 것으로 간주
        currentCachedEmail = '';
        currentCachedProjectId = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('account-status', { loggedIn: false, isAppRunning });
        }
        updateTrayMenu([], null);
        return;
      }
    }

    // Quota 조회
    const models = await fetchQuotaData(accessToken, currentCachedProjectId);
    if (!models) {
      // API 임시 오류 시에도 UI에 계정 정보 및 빈 목록을 송신하여 "확인 중"에서 벗어나게 함
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('account-status', {
          loggedIn: true,
          email: currentCachedEmail,
          quotas: [],
          config: config.global || { alertThreshold: 20, alertModels: {} },
          isAppRunning
        });
      }
      updateTrayMenu([], currentCachedEmail);
      return;
    }

    // 화면 표시 및 모니터링 분석용 모델 리스트 구성
    const accountConfig = config.global || { alertThreshold: 20, alertModels: {} };
    const threshold = accountConfig.alertThreshold;

    const { modelQuotas, modelsToAlert } = processModelsToGroups(models, threshold, currentCachedEmail, notifiedModels);

    if (modelsToAlert.length > 0 && accountConfig.enableNotifications !== false) {
      sendQuotaNotification(currentCachedEmail, modelsToAlert);
    }

    // 표시 이름(displayName) 기준으로 알파벳 순 정렬하여 목록 순서가 뒤섞이는 현상 방지
    modelQuotas.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // UI로 송신
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('account-status', {
        loggedIn: true,
        email: currentCachedEmail,
        quotas: modelQuotas,
        config: accountConfig,
        isAppRunning
      });
    }
    
    updateTrayMenu(modelQuotas, currentCachedEmail);
  } catch (err) {
    console.error('checkAndUpdateQuota 에러 발생:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('account-status', {
        loggedIn: !!currentCachedEmail,
        email: currentCachedEmail || '에러 발생',
        quotas: [],
        config: config.global || { alertThreshold: 20, alertModels: {}, enableWindowSnap: true },
        isAppRunning: false // 에러 시 기본값
      });
    }
    updateTrayMenu([], currentCachedEmail);
  }
}

// === OAuth 로컬 루프백 서버로 계정 추가 ===
async function startOAuthFlow() {
  const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
  const CLIENT_SECRET = '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';
  const SCOPES = 'openid email profile https://www.googleapis.com/auth/cloud-platform';

  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/oauth-callback`;
      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&state=${encodeURIComponent(state)}` +
        `&access_type=offline` +
        `&prompt=consent`;
      shell.openExternal(authUrl);
      const timeout = setTimeout(() => { server.close(); reject(new Error('OAuth 타임아웃')); }, 180000);
      server.on('request', async (req, res) => {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        if (reqUrl.pathname !== '/oauth-callback') { res.writeHead(404); res.end(); return; }
        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const error = reqUrl.searchParams.get('error');
        if (error || !code || returnedState !== state) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h1 style="color:red">❌ 인증 실패</h1><p>창을 닫고 다시 시도해 주세요.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>');
          clearTimeout(timeout); server.close(); reject(new Error(error || '인증 실패')); return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h1 style="color:green">✅ 인증 성공!</h1><p>이 창을 닫아도 됩니다.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>');
        clearTimeout(timeout); server.close();
        try {
          const params = new URLSearchParams();
          params.append('client_id', CLIENT_ID);
          params.append('client_secret', CLIENT_SECRET);
          params.append('code', code);
          params.append('grant_type', 'authorization_code');
          params.append('redirect_uri', redirectUri);
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
          });
          if (!tokenResponse.ok) { const errText = await tokenResponse.text(); reject(new Error(`토큰 교환 실패: ${errText}`)); return; }
          const tokenData = await tokenResponse.json();
          const email = await getUserEmail(tokenData.access_token);
          if (!email) { reject(new Error('이메일 조회 실패')); return; }
          const expiry = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
          const existingIndex = accounts.findIndex(a => a.email === email);
          const accountData = { email, refreshToken: tokenData.refresh_token, accessToken: tokenData.access_token, expiry, order: existingIndex >= 0 ? accounts[existingIndex].order : accounts.length };
          if (existingIndex >= 0) { accounts[existingIndex] = accountData; } else { accounts.push(accountData); }
          saveAccounts();
          resolve({ account: accountData, alreadyExists: existingIndex >= 0 });
        } catch (err) { reject(err); }
      });
    });
    server.on('error', (err) => { reject(new Error(`OAuth 서버 시작 실패: ${err.message}`)); });
  });
}

// === Antigravity 프로세스 관리 ===
function findAntigravityProcesses() {
  return new Promise((resolve) => {
    exec('tasklist /FO CSV /NH', (error, stdout) => {
      if (error) { resolve([]); return; }
      const processes = [];
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/"([^"]+)","(\d+)"/);
        if (match && match[1].toLowerCase() === 'antigravity.exe') {
          processes.push({ name: match[1], pid: parseInt(match[2]) });
        }
      }
      resolve(processes);
    });
  });
}

async function killAntigravityProcesses() {
  const processes = await findAntigravityProcesses();
  if (processes.length === 0) return;
  for (const proc of processes) {
    await new Promise((resolve) => {
      exec(`taskkill /PID ${proc.pid} /F /T`, () => resolve());
    });
  }
  await new Promise(resolve => setTimeout(resolve, 3000));
}

async function restartAntigravityProcess() {
  const possiblePaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'Antigravity.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Antigravity', 'Antigravity.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Antigravity', 'Antigravity.exe'),
  ];
  for (const exePath of possiblePaths) {
    if (fs.existsSync(exePath)) {
      const child = exec(`"${exePath}"`, { detached: true, stdio: 'ignore' });
      if (child.unref) child.unref();
      console.log('Antigravity 재시작:', exePath);
      return;
    }
  }
  console.warn('Antigravity 실행 파일을 찾을 수 없습니다.');
}

// === 단일 계정의 Quota 조회 (모달용) ===
async function fetchQuotaForAccount(account) {
  try {
    let accessToken = account.accessToken;
    if (account.expiry && account.refreshToken) {
      const expiryTime = new Date(account.expiry).getTime();
      if (expiryTime - Date.now() < 10 * 60 * 1000) {
        const refreshed = await refreshAccessToken(account.refreshToken);
        if (refreshed) {
          accessToken = refreshed.access_token;
          account.accessToken = accessToken;
          account.expiry = new Date(Date.now() + (refreshed.expires_in * 1000)).toISOString();
          saveAccounts();
        }
      }
    }
    const projectId = await fetchProjectId(accessToken);
    const models = await fetchQuotaData(accessToken, projectId);
    if (!models) return { email: account.email, quotas: [] };
    const accountConfig = config.global || { alertThreshold: 20, alertModels: {} };
    const { modelQuotas } = processModelsToGroups(models);
    modelQuotas.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { email: account.email, quotas: modelQuotas };
  } catch (err) {
    console.error(`계정 ${account.email} Quota 조회 실패:`, err);
    return { email: account.email, quotas: [], error: err.message };
  }
}

// Electron 윈도우 생성
function createWindow(startHidden = false) {
  const bounds = config.windowBounds || {};

  mainWindow = new BrowserWindow({
    width: bounds.width || 440,
    height: bounds.height || 680,
    x: bounds.x,
    y: bounds.y,
    minWidth: 250,
    minHeight: 250,
    resizable: true,
    frame: false, // 프리미엄 룩을 위해 타이틀바 프레임 제거
    show: false,
    icon: path.join(__dirname, 'assets', 'icon_rounded.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (config.global && config.global.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow.show();
    }
  });

  const saveWindowState = () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      config.windowBounds = mainWindow.getBounds();
      saveConfig();
    }
  };

  let boundsTimeout;
  const debouncedSave = () => {
    clearTimeout(boundsTimeout);
    boundsTimeout = setTimeout(saveWindowState, 500);
  };

  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);

  let snapOffset = { x: 0, y: 0 };
  let lastWillMoveTime = 0;

  // 창 이동 중 스냅(자석) 효과
  mainWindow.on('will-move', (event, newBounds) => {
    const accountConfig = config.global || {};
    if (accountConfig.enableWindowSnap === false) return;

    const now = Date.now();
    // 500ms 이상 움직임이 없었으면 새로운 드래그로 간주하고 오프셋 초기화
    if (now - lastWillMoveTime > 500) {
      snapOffset = { x: 0, y: 0 };
    }
    lastWillMoveTime = now;

    const currentBounds = mainWindow.getBounds();
    const dx = newBounds.x - currentBounds.x;
    const dy = newBounds.y - currentBounds.y;

    if (dx === 0 && dy === 0) return;

    // 실제 마우스의 가상 누적 이동량 계산 (스냅으로 인해 씹힌 거리 포함)
    snapOffset.x += dx;
    snapOffset.y += dy;

    const virtualX = currentBounds.x + snapOffset.x;
    const virtualY = currentBounds.y + snapOffset.y;

    const displays = screen.getAllDisplays();
    let snappedX = virtualX;
    let snappedY = virtualY;
    const threshold = 15; // 자석 효과 픽셀 반경
    let isSnappedX = false;
    let isSnappedY = false;

    // 가상 좌표를 기준으로 모니터 경계선 검사 (여러 모니터 전체)
    for (const display of displays) {
      const { workArea } = display;
      
      if (Math.abs(virtualX - workArea.x) <= threshold) {
        snappedX = workArea.x;
        isSnappedX = true;
      } else if (Math.abs((virtualX + newBounds.width) - (workArea.x + workArea.width)) <= threshold) {
        snappedX = workArea.x + workArea.width - newBounds.width;
        isSnappedX = true;
      }
      
      if (Math.abs(virtualY - workArea.y) <= threshold) {
        snappedY = workArea.y;
        isSnappedY = true;
      } else if (Math.abs((virtualY + newBounds.height) - (workArea.y + workArea.height)) <= threshold) {
        snappedY = workArea.y + workArea.height - newBounds.height;
        isSnappedY = true;
      }
    }

    if (isSnappedX || isSnappedY) {
      event.preventDefault();
      
      const targetX = isSnappedX ? snappedX : virtualX;
      const targetY = isSnappedY ? snappedY : virtualY;
      
      // 이미 목표 위치에 도달해 있다면 setBounds 생략 (불필요한 호출 방지)
      if (targetX !== currentBounds.x || targetY !== currentBounds.y) {
        mainWindow.setBounds({
          x: Math.round(targetX),
          y: Math.round(targetY),
          width: newBounds.width,
          height: newBounds.height
        });
      }
      
      // 현재 창 위치와 가상 위치 간의 오프셋을 갱신 (스냅된 만큼 누적)
      snapOffset.x = virtualX - targetX;
      snapOffset.y = virtualY - targetY;
    } else {
      // 스냅 반경 밖일 때: 스냅에 걸려있다가 방금 탈출한 경우(오프셋이 존재함)
      if (snapOffset.x !== dx || snapOffset.y !== dy) {
        event.preventDefault();
        mainWindow.setBounds({
          x: Math.round(virtualX),
          y: Math.round(virtualY),
          width: newBounds.width,
          height: newBounds.height
        });
        snapOffset.x = 0;
        snapOffset.y = 0;
      } else {
        // 원래부터 스냅되지 않은 정상 이동 상태 (OS 기본 동작에 맡김)
        snapOffset.x = 0;
        snapOffset.y = 0;
      }
    }
  });

  // 창 닫기 이벤트 가로채기 (트레이 최소화)
  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateTrayMenu(modelQuotas = [], email = null) {
  if (!appTray) return;

  const template = [];

  // 1. 할당량 정보 (맨 위)
  if (email) {
    template.push({ label: email, enabled: false });

    if (modelQuotas && modelQuotas.length > 0) {
      for (const m of modelQuotas) {
          // OS 기본 컨텍스트 메뉴는 텍스트 색상 변경을 지원하지 않으므로 상태 표시 이모지를 사용합니다.
          let statusEmoji = '🟢'; // 61 이상
          if (m.percentage <= 20) {
            statusEmoji = '🔴';
          } else if (m.percentage <= 40) {
            statusEmoji = '🟠';
          } else if (m.percentage <= 60) {
            statusEmoji = '🟡';
          }
          
          template.push({
            label: `${statusEmoji} ${m.displayName}: ${m.percentage}%`,
            enabled: false
          });
      }
    } else {
      template.push({ label: '할당량 정보 없음', enabled: false });
    }
    template.push({ type: 'separator' });
  }

  // 2. 대시보드 열기
  template.push({
    label: '대시보드 열기',
    click: () => {
      if (mainWindow) mainWindow.show();
    }
  });

  // 3. 할당량 즉시 동기화
  template.push({
    label: '할당량 즉시 동기화',
    click: () => {
      checkAndUpdateQuota();
    }
  });

  template.push({ type: 'separator' });

  // 4. 종료
  template.push({
    label: '종료',
    click: () => {
      isQuitting = true;
      app.quit();
    }
  });

  const contextMenu = Menu.buildFromTemplate(template);
  appTray.setContextMenu(contextMenu);
}

// 시스템 트레이 생성
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon_rounded.png');
  // 아이콘 폴더 없으면 대비하여 헬퍼 생성
  if (!fs.existsSync(path.dirname(iconPath))) {
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
  }

  // 아이콘 파일이 없을 때를 대비하여 투명 임시 대안을 쓰거나, 
  // generate_image를 통해 획득할 예정임.
  appTray = new Tray(fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'assets', 'placeholder_icon.png'));

  appTray.setToolTip('PetitGravity');
  updateTrayMenu([], null);

  // 더블클릭 시 창 복구
  appTray.on('double-click', () => {
    mainWindow.show();
  });
}

// === Window Snapping Logic ===
const snapToCorner = (win, corner) => {
  if (!win) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const { workArea } = display;
  const { width, height } = win.getBounds();

  let newX = workArea.x;
  let newY = workArea.y;

  switch (corner) {
    case 'top-right':
      newX = workArea.x + workArea.width - width;
      break;
    case 'bottom-left':
      newY = workArea.y + workArea.height - height;
      break;
    case 'bottom-right':
      newX = workArea.x + workArea.width - width;
      newY = workArea.y + workArea.height - height;
      break;
  }
  win.setBounds({ x: Math.round(newX), y: Math.round(newY), width, height });
};

const snapToSide = (win, side) => {
  if (!win) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const { workArea } = display;
  const { width, height, x, y } = win.getBounds();

  let newX = x;
  let newY = y;

  switch (side) {
    case 'left':
      newX = workArea.x;
      break;
    case 'right':
      newX = workArea.x + workArea.width - width;
      break;
    case 'top':
      newY = workArea.y;
      break;
    case 'bottom':
      newY = workArea.y + workArea.height - height;
      break;
  }
  win.setBounds({ x: Math.round(newX), y: Math.round(newY), width, height });
};

const snapToCenter = (win, axis) => {
  if (!win) return;
  const display = screen.getDisplayMatching(win.getBounds());
  const { workArea } = display;
  const { width, height, x, y } = win.getBounds();

  let newX = x;
  let newY = y;

  if (axis === 'x') {
    newX = workArea.x + (workArea.width - width) / 2;
  } else {
    newY = workArea.y + (workArea.height - height) / 2;
  }
  win.setBounds({ x: Math.round(newX), y: Math.round(newY), width, height });
};

function registerSnapHandlers(win) {
  ipcMain.on('snap-top-left', () => snapToCorner(win, 'top-left'));
  ipcMain.on('snap-top-right', () => snapToCorner(win, 'top-right'));
  ipcMain.on('snap-bottom-left', () => snapToCorner(win, 'bottom-left'));
  ipcMain.on('snap-bottom-right', () => snapToCorner(win, 'bottom-right'));

  ipcMain.on('snap-left', () => snapToSide(win, 'left'));
  ipcMain.on('snap-right', () => snapToSide(win, 'right'));
  ipcMain.on('snap-top', () => snapToSide(win, 'top'));
  ipcMain.on('snap-bottom', () => snapToSide(win, 'bottom'));
  
  ipcMain.on('snap-center-x', () => snapToCenter(win, 'x'));
  ipcMain.on('snap-center-y', () => snapToCenter(win, 'y'));
}

// IPC 통신 이벤트 등록
function registerIpcEvents() {
  // UI로부터 설정 변경 수신
  ipcMain.on('update-config', (event, { checkInterval, modelName, isMonitored, threshold, models, enableNotifications, alwaysOnTop, runAtStartup, startMinimized, enableWindowSnap, enableSnapping }) => {
    if (!config.global) {
      config.global = { alertThreshold: 20, alertModels: {}, enableNotifications: true, enableWindowSnap: true, enableSnapping: true, checkInterval: 1 };
    }

    const accountConfig = config.global;

    if (checkInterval !== undefined) {
      const parsedInterval = parseFloat(checkInterval);
      if (!isNaN(parsedInterval) && parsedInterval >= 1) {
        accountConfig.checkInterval = parsedInterval;
        if (credentialCheckInterval) {
          clearInterval(credentialCheckInterval);
          credentialCheckInterval = setInterval(checkAndUpdateQuota, Math.floor(parsedInterval * 60 * 1000));
        }
      }
    }

    if (threshold !== undefined) {
      accountConfig.alertThreshold = parseInt(threshold, 10);
    }

    if (enableNotifications !== undefined) {
      accountConfig.enableNotifications = enableNotifications;
    }

    if (alwaysOnTop !== undefined) {
      accountConfig.alwaysOnTop = alwaysOnTop;
      if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop);
    }

    if (runAtStartup !== undefined) {
      accountConfig.runAtStartup = runAtStartup;
      app.setLoginItemSettings({
        openAtLogin: runAtStartup,
        args: accountConfig.startMinimized ? ['--hidden'] : []
      });
    }

    if (startMinimized !== undefined) {
      accountConfig.startMinimized = startMinimized;
      if (accountConfig.runAtStartup) {
        app.setLoginItemSettings({
          openAtLogin: true,
          args: startMinimized ? ['--hidden'] : []
        });
      }
    }

    if (enableWindowSnap !== undefined) {
      accountConfig.enableWindowSnap = enableWindowSnap;
    }

    if (enableSnapping !== undefined) {
      accountConfig.enableSnapping = enableSnapping;
    }

    if (models && Array.isArray(models)) {
      models.forEach(m => {
        accountConfig.alertModels[m.modelName] = m.isMonitored;
      });
    } else if (modelName !== undefined) {
      accountConfig.alertModels[modelName] = isMonitored;
    }

    saveConfig();

    // 설정 업데이트 후 즉시 갱신
    checkAndUpdateQuota();
  });

  // 즉시 갱신 요청
  ipcMain.on('request-sync', () => {
    checkAndUpdateQuota();
  });

  // 창 컨트롤
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.hide(); // 시스템 트레이로 숨김
  });

  // 안티그래비티 런처
  ipcMain.on('launch-app', () => {
    restartAntigravityProcess();
  });

  // === 계정 관리 IPC 핸들러 ===
  ipcMain.handle('get-all-accounts', () => {
    return accounts.sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  ipcMain.handle('add-account', async () => {
    try {
      const result = await startOAuthFlow();
      return { success: true, account: result.account, alreadyExists: result.alreadyExists };
    } catch (err) {
      console.error('계정 추가 실패:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-account', (event, email) => {
    const index = accounts.findIndex(a => a.email === email);
    if (index >= 0) {
      accounts.splice(index, 1);
      accounts.forEach((a, i) => a.order = i);
      saveAccounts();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('switch-account', async (event, email) => {
    try {
      const account = accounts.find(a => a.email === email);
      if (!account) return { success: false, error: '계정을 찾을 수 없습니다.' };
      let accessToken = account.accessToken;
      if (account.refreshToken) {
        const refreshed = await refreshAccessToken(account.refreshToken);
        if (refreshed) {
          accessToken = refreshed.access_token;
          account.accessToken = accessToken;
          account.expiry = new Date(Date.now() + (refreshed.expires_in * 1000)).toISOString();
          saveAccounts();
        }
      }
      await killAntigravityProcesses();
      let expiryDate = account.expiry ? new Date(account.expiry) : new Date(Date.now() + 3600000);
      let expiry = expiryDate.toISOString().replace('Z', '000Z');
      const credPayload = JSON.stringify({
        token: { access_token: accessToken, token_type: 'Bearer', refresh_token: account.refreshToken, expiry },
        auth_method: 'consumer'
      });
      const writeSuccess = await writeWindowsCredential(credPayload);
      if (!writeSuccess) return { success: false, error: '자격 증명 쓰기 실패' };
      await restartAntigravityProcess();
      config.currentAccount = email;
      saveConfig();
      currentCachedEmail = '';
      lastCheckedAccessToken = '';
      setTimeout(() => checkAndUpdateQuota(), 2000);
      return { success: true };
    } catch (err) {
      console.error('계정 전환 실패:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reorder-accounts', (event, orderedEmails) => {
    orderedEmails.forEach((email, index) => {
      const account = accounts.find(a => a.email === email);
      if (account) account.order = index;
    });
    saveAccounts();
    return { success: true };
  });

  ipcMain.handle('fetch-all-quotas', async () => {
    const results = await Promise.all(accounts.map(a => fetchQuotaForAccount(a)));
    return results;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.exit(0);
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // App 기동
  app.whenReady().then(() => {
    loadConfig();
    loadAccounts();

    // 에셋 및 임시 플레이스홀더 아이콘 생성
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir);
    }
    const placeholderIcon = path.join(assetsDir, 'placeholder_icon.png');
    if (!fs.existsSync(placeholderIcon)) {
      // 1x1 투명 png 파일 데이터를 간단히 생성하여 쓰거나, 이미지 생성 완료시 대체함
      const emptyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(placeholderIcon, emptyPng);
    }

    const isHidden = process.argv.includes('--hidden');
    createWindow(isHidden);
    createTray();
    registerIpcEvents();
    registerSnapHandlers(mainWindow);

    // 최초 즉시 실행
    setTimeout(() => {
      checkAndUpdateQuota();
    }, 1000);

    // 설정된 주기로 모니터링 데몬 작동 (기본 15초)
    const initialInterval = (config.global && config.global.checkInterval) ? Math.floor(config.global.checkInterval * 60 * 1000) : 60000;
    credentialCheckInterval = setInterval(checkAndUpdateQuota, initialInterval);
  });

  // 모든 창이 닫혀도 앱 종료 방지
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // 트레이에서 구동되므로 종료하지 않음
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('will-quit', () => {
    clearInterval(credentialCheckInterval);
  });
}
