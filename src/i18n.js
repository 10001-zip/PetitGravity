/**
 * i18n.js — Localization module for PetitGravity
 * Supports: ko (Korean), en (English)
 * Usage (renderer): loaded via <script>, exposes window.i18n
 * Usage (main):     const { t, setLanguage } = require('./i18n');
 */
;(function() {

const translations = {
  ko: {
    // === 공통 ===
    app_title: 'PetitGravity',

    // === 타이틀바 버튼 ===
    btn_launch_app: '안티그래비티 실행',
    btn_settings: '설정',
    btn_refresh: '새로고침',
    btn_minimize: '최소화',
    btn_close: '닫기',
    btn_close_settings_modal: '닫기 (Esc)',

    // === 메인 창 계정 카드 ===
    account_loading: '안티그래비티 계정을 불러오는 중입니다.',
    account_switch_title: '계정 전환',
    account_not_logged_in: '안티그래비티 앱에 로그인해 주세요.',

    // === 모델 목록 ===
    models_loading: '서버에서 계정 할당량 정보를 받아오는 중입니다...',
    models_empty: '조회된 모델 정보가 없습니다. 안티그래비티 앱이 켜져 있고 로그인되어 있는지 확인해 주세요.',
    models_initial_empty: '안티그래비티 앱이 켜져 있거나 정상적으로 로그인되어 있어야 모델 정보를 표시할 수 있습니다.',

    // === 설정 모달 ===
    settings_title: '설정',
    settings_section_general: '일반',
    settings_section_notifications: '알림',

    settings_language: '언어',
    settings_check_interval: '쿼터 체크 주기 (분)',
    settings_check_interval_desc: '너무 짧은 주기로 설정하면 서버에서 조회를 일시적으로 차단할 수 있습니다. (최소: 1분, 기본값: 1분)',
    settings_always_on_top: '항상 위 고정',
    settings_always_on_top_shortcut: '(단축키: Ctrl+P)',
    settings_window_snapping_shortcuts: '창 위치 스냅 단축키',
    settings_window_snapping_shortcuts_desc: '(단축키: Alt+Shift+방향키)',
    settings_run_at_startup: '컴퓨터를 켤 때 자동으로 실행',
    settings_start_minimized: '최소화된 상태로 실행',
    settings_window_snap: '화면 가장자리에 창 스냅',
    settings_window_snap_desc: '화면 가장자리로 창을 이동하면 자석처럼 붙습니다.',
    settings_minimize_on_close: '창 닫기 시 트레이로 최소화',
    settings_enable_notifications: '할당량 알림 활성화',
    settings_alert_threshold: '알림 임계값 설정',
    settings_alert_threshold_desc: '계정의 남은 할당량이 설정값 이하로 내려가면 알림을 보냅니다.',

    // === 업데이트 모달 ===
    update_title: '업데이트 알림',
    update_available: '새로운 버전이 출시되었습니다.',
    update_ask: '지금 설치하고 앱을 다시 시작하시겠습니까?',
    update_later: '나중에',
    update_now: '지금 설치',
    update_installing: '설치 중...',

    // === 스낵바 메시지 ===
    snackbar_min_interval: '최소 체크 주기는 1분입니다.',

    // === 트레이 메뉴 ===
    tray_open_dashboard: '대시보드 열기',
    tray_switch_account: '계정 전환',
    tray_sync_quota: '할당량 즉시 동기화',
    tray_quit: '종료',
    tray_no_quota: '할당량 정보 없음',

    // === 계정 창 ===
    accounts_title: '계정 목록',
    accounts_empty: '등록된 계정이 없습니다. 상단의 + 버튼으로 계정을 추가해 주세요.',
    accounts_search_placeholder: '검색...',
    accounts_loading: '할당량 조회 중...',
    accounts_no_quota: '조회된 할당량 없음',
    accounts_search_empty: '검색 결과가 없습니다.',

    // 계정 창 버튼 title
    btn_add_account: '계정 추가',
    btn_sort: '정렬',
    btn_edit: '편집',
    btn_done: '완료',
    btn_select_all: '전체 선택',
    btn_deselect_all: '전체 해제',
    btn_delete_selected: '선택 항목 삭제',
    btn_account_switch: '전환',
    btn_account_restart: '재실행',
    btn_account_delete: '삭제',
    btn_close_window: '닫기 (Esc)',
    btn_clear_search: '검색어 지우기',

    // 정렬 메뉴
    sort_asc: '오름차순',
    sort_desc: '내림차순',
    sort_tier_high: '계정 티어 높은 순',
    sort_tier_low: '계정 티어 낮은 순',
    sort_tokens_high: '토큰 많은 순',
    sort_tokens_low: '토큰 적은 순',
    sort_gemini_high: 'Gemini 많은 순',
    sort_gemini_low: 'Gemini 적은 순',
    sort_claude_gpt_high: 'Claude&GPT 많은 순',
    sort_claude_gpt_low: 'Claude&GPT 적은 순',

    // 계정 스낵바
    accounts_login_please: '브라우저에서 로그인을 진행해 주세요.',
    accounts_already_exists: '은(는) 이미 등록되어 있는 계정입니다.',
    accounts_added: '계정이 추가되었습니다.',
    accounts_switch_now: '바로 전환',
    accounts_switching: '전환 중...',
    accounts_deleted: '계정이 삭제되었습니다.',
    accounts_multi_deleted: '개의 계정이 삭제되었습니다.',
    accounts_delete_failed: '계정 삭제에 실패했습니다.',
    accounts_add_failed: '계정 추가 실패: ',

    // 삭제 확인 모달
    confirm_delete_title: '계정 삭제',
    confirm_delete_single: '계정을 삭제하시겠습니까?',
    confirm_delete_multi_prefix: '선택한 ',
    confirm_delete_multi_suffix: '개의 계정을 정말 삭제하시겠습니까?',
    confirm_cancel: '취소',
    confirm_delete: '삭제',

    // 계정 전환 (main.js 스낵바)
    switching_to: '계정으로 전환 중...',
    restarting_app: '안티그래비티 재실행 중...',
    switched_to: '계정으로 전환되었습니다.',
    restarted_app: '안티그래비티가 재실행되었습니다.',
    switch_failed_not_found: '계정 전환 실패: 계정을 찾을 수 없습니다.',
    switch_failed_cred: '계정 전환 실패: 자격 증명 쓰기 실패',
    switch_failed: '계정 전환 실패: ',

    // OAuth
    oauth_auth_fail_title: '❌ 인증 실패',
    oauth_auth_fail_body: '창을 닫고 다시 시도해 주세요.',
    oauth_auth_success_title: '✅ 인증 성공!',
    oauth_auth_success_body: '이 창을 닫아도 됩니다.',
  },

  en: {
    // === 공통 ===
    app_title: 'PetitGravity',

    // === 타이틀바 버튼 ===
    btn_launch_app: 'Launch Antigravity',
    btn_settings: 'Settings',
    btn_refresh: 'Refresh',
    btn_minimize: 'Minimize',
    btn_close: 'Close',
    btn_close_settings_modal: 'Close (Esc)',

    // === 메인 창 계정 카드 ===
    account_loading: 'Loading Antigravity account...',
    account_switch_title: 'Switch Account',
    account_not_logged_in: 'Please sign in to Antigravity.',

    // === 모델 목록 ===
    models_loading: 'Fetching quota info from server...',
    models_empty: 'No quota data found. Make sure Antigravity is running and signed in.',
    models_initial_empty: 'Antigravity must be running and signed in to display quota info.',

    // === 설정 모달 ===
    settings_title: 'Settings',
    settings_section_general: 'General',
    settings_section_notifications: 'Notifications',

    settings_language: 'Language',
    settings_check_interval: 'Quota Check Interval (min)',
    settings_check_interval_desc: 'Setting a very short interval may temporarily block quota fetching on the server side. (Min: 1 min, Default: 1 min)',
    settings_always_on_top: 'Always on Top',
    settings_always_on_top_shortcut: '(Shortcut: Ctrl+P)',
    settings_window_snapping_shortcuts: 'Window Snap Shortcuts',
    settings_window_snapping_shortcuts_desc: '(Shortcut: Alt+Shift+Arrow Keys)',
    settings_run_at_startup: 'Run at Startup',
    settings_start_minimized: 'Start Minimized',
    settings_window_snap: 'Snap to Screen Edges',
    settings_window_snap_desc: 'Moving the window near screen edges snaps it like a magnet.',
    settings_minimize_on_close: 'Minimize to Tray on Close',
    settings_enable_notifications: 'Enable Quota Alerts',
    settings_alert_threshold: 'Alert Threshold',
    settings_alert_threshold_desc: 'Sends a notification when the remaining quota of the account drops below this value.',

    // === 업데이트 모달 ===
    update_title: 'Update Available',
    update_available: 'A new version has been released.',
    update_ask: 'Would you like to install it and restart the app now?',
    update_later: 'Later',
    update_now: 'Install Now',
    update_installing: 'Installing...',

    // === 스낵바 메시지 ===
    snackbar_min_interval: 'Minimum check interval is 1 minute.',

    // === 트레이 메뉴 ===
    tray_open_dashboard: 'Open Dashboard',
    tray_switch_account: 'Switch Account',
    tray_sync_quota: 'Sync Quota Now',
    tray_quit: 'Quit',
    tray_no_quota: 'No quota info',

    // === 계정 창 ===
    accounts_title: 'Accounts',
    accounts_empty: 'No accounts registered. Use the + button above to add one.',
    accounts_search_placeholder: 'Search...',
    accounts_loading: 'Loading quota...',
    accounts_no_quota: 'No quota data',
    accounts_search_empty: 'No results found.',

    // 계정 창 버튼 title
    btn_add_account: 'Add Account',
    btn_sort: 'Sort',
    btn_edit: 'Edit',
    btn_done: 'Done',
    btn_select_all: 'Select All',
    btn_deselect_all: 'Deselect All',
    btn_delete_selected: 'Delete Selected',
    btn_account_switch: 'Switch',
    btn_account_restart: 'Restart',
    btn_account_delete: 'Delete',
    btn_close_window: 'Close (Esc)',
    btn_clear_search: 'Clear search',

    // 정렬 메뉴
    sort_asc: 'Ascending',
    sort_desc: 'Descending',
    sort_tier_high: 'Tier: High to Low',
    sort_tier_low: 'Tier: Low to High',
    sort_tokens_high: 'Tokens: High to Low',
    sort_tokens_low: 'Tokens: Low to High',
    sort_gemini_high: 'Gemini: High to Low',
    sort_gemini_low: 'Gemini: Low to High',
    sort_claude_gpt_high: 'Claude&GPT: High to Low',
    sort_claude_gpt_low: 'Claude&GPT: Low to High',

    // 계정 스낵바
    accounts_login_please: 'Please sign in via your browser.',
    accounts_already_exists: 'is already registered.',
    accounts_added: 'account has been added.',
    accounts_switch_now: 'Switch Now',
    accounts_switching: 'Switching...',
    accounts_deleted: 'account has been deleted.',
    accounts_multi_deleted: 'account(s) deleted.',
    accounts_delete_failed: 'Failed to delete account.',
    accounts_add_failed: 'Failed to add account: ',

    // 삭제 확인 모달
    confirm_delete_title: 'Delete Account',
    confirm_delete_single: 'Are you sure you want to delete this account?',
    confirm_delete_multi_prefix: 'Are you sure you want to delete ',
    confirm_delete_multi_suffix: ' selected account(s)?',
    confirm_cancel: 'Cancel',
    confirm_delete: 'Delete',

    // 계정 전환 (main.js 스낵바)
    switching_to: 'Switching to account...',
    restarting_app: 'Restarting Antigravity...',
    switched_to: 'Switched to account.',
    restarted_app: 'Antigravity has been restarted.',
    switch_failed_not_found: 'Switch failed: Account not found.',
    switch_failed_cred: 'Switch failed: Could not write credentials.',
    switch_failed: 'Switch failed: ',

    // OAuth
    oauth_auth_fail_title: '❌ Authentication Failed',
    oauth_auth_fail_body: 'Please close this window and try again.',
    oauth_auth_success_title: '✅ Authentication Successful!',
    oauth_auth_success_body: 'You can close this window.',
  }
};

// 현재 언어 (기본: 한국어)
let _currentLang = 'ko';

function setLanguage(lang) {
  if (translations[lang]) {
    _currentLang = lang;
  }
}

function getLanguage() {
  return _currentLang;
}

function t(key) {
  const dict = translations[_currentLang] || translations['ko'];
  return dict[key] !== undefined ? dict[key] : (translations['ko'][key] || key);
}

/**
 * DOM의 [data-i18n] 속성을 순회하며 텍스트/속성 치환
 * data-i18n="key"          → element.textContent
 * data-i18n-title="key"    → element.title
 * data-i18n-placeholder="key" → element.placeholder
 * data-i18n-html="key"     → element.innerHTML
 */
function applyI18n(root) {
  const el = root || document;

  el.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    node.textContent = t(key);
  });

  el.querySelectorAll('[data-i18n-title]').forEach(node => {
    const key = node.getAttribute('data-i18n-title');
    node.title = t(key);
  });

  el.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.getAttribute('data-i18n-placeholder');
    node.placeholder = t(key);
  });

  el.querySelectorAll('[data-i18n-html]').forEach(node => {
    const key = node.getAttribute('data-i18n-html');
    node.innerHTML = t(key);
  });
}

// UMD: Node.js(main process)와 브라우저(renderer) 양쪽 지원
var _exports = { t: t, setLanguage: setLanguage, getLanguage: getLanguage, applyI18n: applyI18n, translations: translations };
if (typeof module !== 'undefined' && module.exports) {
  // Node.js (main process)
  module.exports = _exports;
} else {
  // Browser (renderer process)
  window.i18n = _exports;
}
})();
