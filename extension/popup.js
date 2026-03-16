/**
 * Resolve AI Navigator — Popup Logic
 *
 * Handles user interaction in the extension popup.
 * All backend communication goes through background.js.
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
const $serverUrl = $('#server-url');
const $languageSelect = $('#language-select');
const $connectBtn = $('#connect-btn');
const $statusDot = $('#status-dot');
const $statusText = $('#status-text');
const $settingsSection = $('#settings-section');
const $analyzeSection = $('#analyze-section');
const $queryInput = $('#query-input');
const $analyzeBtn = $('#analyze-btn');
const $clearBtn = $('#clear-btn');
const $screenshareBtn = $('#screenshare-btn');
const $results = $('#results');
const $resultsBody = $('#results-body');
const $executeBtn = $('#execute-btn');
const $explanation = $('#explanation');
const $loading = $('#loading');
const $error = $('#error');

/* ──────────────────── State ──────────────────── */

let isConnected = false;
let isAnalyzing = false;
let isScreensharing = false;
let lastActions = [];

/* ──────────────────── Init ──────────────────── */

async function init() {
  // Populate languages
  LANGUAGES.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.label;
    $languageSelect.appendChild(opt);
  });

  // Load saved settings
  const settings = await sendMessage({ type: 'get_settings' });
  if (settings.serverUrl) $serverUrl.value = settings.serverUrl;
  if (settings.language) $languageSelect.value = settings.language;
  if (settings.connected) {
    setConnected(true);
  }

  // Auto-check health
  checkConnection();
}

/* ──────────────────── UI Helpers ──────────────────── */

function setConnected(connected) {
  isConnected = connected;
  $statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  $statusText.textContent = connected ? 'Connected' : 'Disconnected';
  $connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
  $analyzeSection.classList.toggle('hidden', !connected);
}

function showLoading(show) {
  isAnalyzing = show;
  $loading.classList.toggle('hidden', !show);
  $analyzeBtn.disabled = show;
}

function showError(msg) {
  $error.textContent = msg;
  $error.classList.remove('hidden');
  setTimeout(() => $error.classList.add('hidden'), 5000);
}

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

    const icon = { click: '\u{1F446}', fill: '\u{270F}\u{FE0F}', scroll: '\u{2B07}\u{FE0F}', highlight: '\u{1F4A1}' }[action.type] || '\u{2728}';

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

/* ──────────────────── Actions ──────────────────── */

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

  if (!isConnected) {
    showError('Cannot connect to server. Is it running?');
  }
}

async function handleAnalyze() {
  if (isAnalyzing) return;

  const query = $queryInput.value.trim();
  if (!query) {
    showError('Please describe what you need help with');
    return;
  }

  showLoading(true);
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

  if (result.error) {
    showError(result.error);
  }
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

/* ──────────────────── Save language on change ──────────────────── */

$languageSelect.addEventListener('change', () => {
  sendMessage({ type: 'save_settings', language: $languageSelect.value });
});

/* ──────────────────── Event Listeners ──────────────────── */

$connectBtn.addEventListener('click', handleConnect);
$analyzeBtn.addEventListener('click', handleAnalyze);
$clearBtn.addEventListener('click', handleClear);
$executeBtn.addEventListener('click', handleExecuteAll);
$screenshareBtn.addEventListener('click', handleScreenshare);

// Enter key in query input
$queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAnalyze();
  }
});

/* ──────────────────── Boot ──────────────────── */

init();
