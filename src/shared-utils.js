/**
 * shared-utils.js — Shared utility functions for PetitGravity renderer pages
 * Loaded via <script> in index.html and accounts.html before page-specific scripts.
 */
;(function() {

/**
 * Quota 리셋 시간 포맷 함수
 */
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

/**
 * HTML 이스케이프 함수 (XSS 방지)
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.sharedUtils = { getRefreshText, escapeHtml };

})();
