/**
 * Resolve AI Navigator — Popup Logic
 *
 * Two modes:
 *   1. SHIELD (primary) — scam/phishing/fake site detection, auto-scans pages
 *   2. ASSIST — visual UI guidance for IT helpdesk support
 */

/* ──────────────────── Languages ──────────────────── */

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ru', label: 'Русский' },
  { code: 'pl', label: 'Polski' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
];

/* ──────────────────── Elements ──────────────────── */

const $ = (s) => document.querySelector(s);

// Header
const $logoIcon = $('#logo-icon');
const $tagline = $('#tagline');
const $statusDot = $('#status-dot');
const $statusText = $('#status-text');

// Mode toggle
const $modeShield = $('#mode-shield');
const $modeAssist = $('#mode-assist');

// Settings
const $serverUrl = $('#server-url');
const $languageSelect = $('#language-select');
const $connectBtn = $('#connect-btn');
const $settingsSection = $('#settings-section');

// Shield
const $shieldSection = $('#shield-section');
const $shieldToggle = $('#shield-toggle');
const $shieldIcon = $('#shield-icon');
const $shieldTitle = $('#shield-title');
const $shieldSubtitle = $('#shield-subtitle');
const $shieldResult = $('#shield-result');
const $verdictIcon = $('#verdict-icon');
const $verdictLevel = $('#verdict-level');
const $verdictText = $('#verdict-text');
const $threatDetails = $('#threat-details');
const $scanNowBtn = $('#scan-now-btn');

// Assist
const $analyzeSection = $('#analyze-section');
const $queryInput = $('#query-input');
const $analyzeBtn = $('#analyze-btn');
const $clearBtn = $('#clear-btn');
const $screenshareBtn = $('#screenshare-btn');
const $results = $('#results');
const $resultsBody = $('#results-body');
const $executeBtn = $('#execute-btn');
const $explanation = $('#explanation');

// Shared
const $loading = $('#loading');
const $loadingText = $('#loading-text');
const $error = $('#error');

/* ──────────────────── State ──────────────────── */

let currentMode = 'shield'; // 'shield' | 'assist'
let isConnected = false;
let isAnalyzing = false;
let isScreensharing = false;
let lastActions = [];

/* ──────────────────── Init ──────────────────── */

async function init() {
  LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.label;
    $languageSelect.appendChild(opt);
  });

  const settings = await sendMessage({ type: 'get_settings' });
  if (settings.serverUrl) $serverUrl.value = settings.serverUrl;
  if (settings.language) $languageSelect.value = settings.language;
  if (settings.mode) currentMode = settings.mode;
  if (settings.connected) setConnected(true);

  updateModeUI();
  checkConnection();
}

/* ──────────────────── Mode Switching ──────────────────── */

function updateModeUI() {
  $modeShield.classList.toggle('active', currentMode === 'shield');
  $modeAssist.classList.toggle('active', currentMode === 'assist');

  if (isConnected) {
    $shieldSection.classList.toggle('hidden', currentMode !== 'shield');
    $analyzeSection.classList.toggle('hidden', currentMode !== 'assist');
  }

  if (currentMode === 'shield') {
    $tagline.textContent = 'Vigil — Scam, Spam & AI Content Shield';
  } else {
    $tagline.textContent = 'AI Visual Guidance';
  }
}

function switchMode(mode) {
  currentMode = mode;
  updateModeUI();
  sendMessage({ type: 'save_settings', mode });

  // Clear results when switching
  $shieldResult.classList.add('hidden');
  $results.classList.add('hidden');
  $explanation.classList.add('hidden');
  $error.classList.add('hidden');
}

/* ──────────────────── UI Helpers ──────────────────── */

function setConnected(connected) {
  isConnected = connected;
  $statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  $statusText.textContent = connected ? 'Connected' : 'Disconnected';
  $connectBtn.textContent = connected ? 'Disconnect' : 'Connect';

  if (connected) {
    updateModeUI();
  } else {
    $shieldSection.classList.add('hidden');
    $analyzeSection.classList.add('hidden');
  }
}

function showLoading(show, text) {
  isAnalyzing = show;
  $loading.classList.toggle('hidden', !show);
  $loadingText.textContent = text || 'Analyzing...';
  $analyzeBtn.disabled = show;
  $scanNowBtn.disabled = show;
}

function showError(msg) {
  $error.textContent = msg;
  $error.classList.remove('hidden');
  setTimeout(() => $error.classList.add('hidden'), 5000);
}

/* ──────────────────── Shield Mode ──────────────────── */

function showShieldResult(result) {
  const level = result.threat_level || 'safe';
  const verdicts = {
    safe: { icon: '\u2705', label: 'Safe', cssClass: 'safe' },
    low: { icon: '\u2705', label: 'Low Risk', cssClass: 'safe' },
    medium: { icon: '\u26A0\uFE0F', label: 'Suspicious', cssClass: 'warning' },
    high: { icon: '\u{1F6A8}', label: 'Danger', cssClass: 'danger' },
    critical: { icon: '\u{1F6D1}', label: 'Scam Detected', cssClass: 'danger' },
  };

  const v = verdicts[level] || verdicts.safe;

  $shieldResult.className = `shield-result ${v.cssClass}`;
  $verdictIcon.textContent = v.icon;
  $verdictLevel.textContent = v.label;
  $verdictText.textContent = result.summary || 'No threats detected.';

  // Threat details
  $threatDetails.innerHTML = '';
  if (result.threats && result.threats.length > 0) {
    result.threats.forEach(threat => {
      const item = document.createElement('div');
      item.className = 'threat-item';
      item.textContent = threat;
      $threatDetails.appendChild(item);
    });
  }

  $shieldResult.classList.remove('hidden');

  // Update shield icon in header
  if (level === 'high' || level === 'critical') {
    $shieldIcon.textContent = '\u{1F6D1}';
    $shieldTitle.textContent = 'Threat Detected!';
    $shieldSubtitle.textContent = 'This page may be dangerous';
  } else if (level === 'medium') {
    $shieldIcon.textContent = '\u26A0\uFE0F';
    $shieldTitle.textContent = 'Suspicious Page';
    $shieldSubtitle.textContent = 'Proceed with caution';
  } else {
    $shieldIcon.textContent = '\u{1F6E1}';
    $shieldTitle.textContent = 'Shield Active';
    $shieldSubtitle.textContent = 'This page appears safe';
  }
}

async function handleShieldScan() {
  if (isAnalyzing) return;

  showLoading(true, 'Scanning for threats...');
  $shieldResult.classList.add('hidden');
  $error.classList.add('hidden');

  try {
    const result = await sendMessage({
      type: 'shield_scan',
      language: $languageSelect.value,
    });

    if (result.error) {
      showError(result.error);
    } else {
      showShieldResult(result);
    }
  } catch (err) {
    showError(err.message || 'Scan failed');
  } finally {
    showLoading(false);
  }
}

/* ──────────────────── Assist Mode ──────────────────── */

function showResults(result) {
  lastActions = result.actions || [];

  if (lastActions.length === 0) {
    $results.classList.add('hidden');
    $explanation.textContent = result.explanation || 'No actions identified.';
    $explanation.classList.remove('hidden');
    return;
  }

  $resultsBody.innerHTML = '';
  lastActions.forEach((action, idx) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    const icon = {
      click: '\u{1F446}', fill: '\u{270F}\u{FE0F}',
      scroll: '\u{2B07}\u{FE0F}', highlight: '\u{1F4A1}',
    }[action.type] || '\u{2728}';

    item.innerHTML = `
      <span class="result-step">${idx + 1}</span>
      <span class="result-icon">${icon}</span>
      <span class="result-label">${action.label || action.type}</span>
    `;
    $resultsBody.appendChild(item);
  });

  $results.classList.remove('hidden');

  if (result.explanation) {
    $explanation.textContent = result.explanation;
    $explanation.classList.remove('hidden');
  } else {
    $explanation.classList.add('hidden');
  }
}

async function handleAnalyze() {
  if (isAnalyzing) return;
  const query = $queryInput.value.trim();
  if (!query) {
    showError('Please describe what you need help with');
    return;
  }

  showLoading(true, 'Analyzing page...');
  $error.classList.add('hidden');
  $results.classList.add('hidden');
  $explanation.classList.add('hidden');

  try {
    const result = await sendMessage({
      type: 'analyze_page',
      query,
      language: $languageSelect.value,
    });
    if (result.error) {
      showError(result.error);
    } else {
      showResults(result);
    }
  } catch (err) {
    showError(err.message || 'Analysis failed');
  } finally {
    showLoading(false);
  }
}

async function handleExecuteAll() {
  if (lastActions.length === 0) return;
  const result = await sendMessage({
    type: 'execute_actions',
    actions: lastActions.filter(a => a.type !== 'highlight'),
  });
  if (result.error) showError(result.error);
}

async function handleClear() {
  await sendMessage({ type: 'clear_annotations' });
  $results.classList.add('hidden');
  $explanation.classList.add('hidden');
  lastActions = [];
}

async function handleScreenshare() {
  if (isScreensharing) {
    await sendMessage({ type: 'stop_screenshare' });
    isScreensharing = false;
    $screenshareBtn.innerHTML = '<span class="btn-icon">&#x1F4F9;</span> Share Screen';
    $screenshareBtn.classList.remove('active');
    return;
  }
  const result = await sendMessage({ type: 'start_screenshare', intervalMs: 2000 });
  if (result.success) {
    isScreensharing = true;
    $screenshareBtn.innerHTML = '<span class="btn-icon">&#x1F6D1;</span> Stop Sharing';
    $screenshareBtn.classList.add('active');
  } else {
    showError(result.error || 'Screen sharing failed');
  }
}

/* ──────────────────── Connection ──────────────────── */

async function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      resolve(response || {});
    });
  });
}

async function checkConnection() {
  const result = await sendMessage({ type: 'check_health' });
  setConnected(result.connected || false);
}

async function handleConnect() {
  if (isConnected) {
    setConnected(false);
    await sendMessage({ type: 'save_settings', connected: false });
    return;
  }
  const url = $serverUrl.value.trim();
  const lang = $languageSelect.value;
  if (!url) {
    showError('Please enter a server URL');
    return;
  }
  await sendMessage({ type: 'save_settings', serverUrl: url, language: lang });
  await checkConnection();
  if (!isConnected) showError('Cannot connect to server. Is it running?');
}

/* ──────────────────── Event Listeners ──────────────────── */

$modeShield.addEventListener('click', () => switchMode('shield'));
$modeAssist.addEventListener('click', () => switchMode('assist'));
$connectBtn.addEventListener('click', handleConnect);
$scanNowBtn.addEventListener('click', handleShieldScan);
$analyzeBtn.addEventListener('click', handleAnalyze);
$clearBtn.addEventListener('click', handleClear);
$executeBtn.addEventListener('click', handleExecuteAll);
$screenshareBtn.addEventListener('click', handleScreenshare);
$languageSelect.addEventListener('change', () => {
  sendMessage({ type: 'save_settings', language: $languageSelect.value });
});
$queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); }
});
$shieldToggle.addEventListener('change', () => {
  const enabled = $shieldToggle.checked;
  sendMessage({ type: 'shield_auto_scan', enabled });
  $shieldTitle.textContent = enabled ? 'Shield Active' : 'Shield Paused';
  $shieldSubtitle.textContent = enabled ? 'Auto-scanning pages for threats' : 'Manual scan only';
});

/* ──────────────────── Boot ──────────────────── */

init();
