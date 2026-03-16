/**
 * Vigil — Chrome Extension Popup Logic
 *
 * Shield-only: scam/phishing/fake site detection with auto-scan.
 * Voice + UI navigation flows through the Vigil web app.
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
const $tagline = $('#tagline');
const $statusDot = $('#status-dot');
const $statusText = $('#status-text');

// Settings
const $serverUrl = $('#server-url');
const $languageSelect = $('#language-select');
const $connectBtn = $('#connect-btn');

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
const $assistSection = $('#assist-section');
const $assistInput = $('#assist-input');
const $guideBtn = $('#guide-btn');
const $assistResult = $('#assist-result');
const $assistExplanation = $('#assist-explanation');
const $assistActionCount = $('#assist-action-count');
const $executeAllBtn = $('#execute-all-btn');

// Shared
const $loading = $('#loading');
const $loadingText = $('#loading-text');
const $error = $('#error');

// Live Status
const $statusTabVal = $('#status-tab-val');
const $statusUrlVal = $('#status-url-val');
const $statusLastScanVal = $('#status-last-scan-val');
const $statusVerdictVal = $('#status-verdict-val');
const $statusServerVal = $('#status-server-val');

/* ──────────────────── State ──────────────────── */

let isConnected = false;
let isAnalyzing = false;
let lastAssistActions = [];

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
  if (settings.connected) setConnected(true);

  if (isConnected) {
    $shieldSection.classList.remove('hidden');
    $assistSection.classList.remove('hidden');
  }

  checkConnection();

  // Load cached scan for current tab
  const cached = await sendMessage({ type: 'get_tab_scan' });
  if (cached && cached.threat_level) {
    updateLiveStatusScan('done', cached.threat_level);
  }
}

/* ──────────────────── UI Helpers ──────────────────── */

function setConnected(connected) {
  isConnected = connected;
  $statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  $statusText.textContent = connected ? 'Connected' : 'Disconnected';
  $connectBtn.textContent = connected ? 'Disconnect' : 'Connect';

  if (connected) {
    $shieldSection.classList.remove('hidden');
    $assistSection.classList.remove('hidden');
  } else {
    $shieldSection.classList.add('hidden');
    $assistSection.classList.add('hidden');
  }
}

function showLoading(show, text) {
  isAnalyzing = show;
  $loading.classList.toggle('hidden', !show);
  $loadingText.textContent = text || 'Scanning...';
  $scanNowBtn.disabled = show;
}

function showError(msg) {
  $error.textContent = msg;
  $error.classList.remove('hidden');
  setTimeout(() => $error.classList.add('hidden'), 5000);
}

/* ──────────────────── Shield ──────────────────── */

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

  // Render detailed findings
  $threatDetails.innerHTML = '';

  const findings = result.findings || [];
  if (findings.length > 0) {
    findings.forEach(f => {
      const item = document.createElement('div');
      item.className = 'finding-item';
      item.innerHTML = `
        <div class="finding-header">
          <span class="finding-severity ${f.severity || 'safe'}">${(f.severity || 'safe').toUpperCase()}</span>
          <span class="finding-category">${formatCategory(f.category)}</span>
        </div>
        <div class="finding-detail">${escapeHtml(f.detail || '')}</div>
        ${f.evidence ? `<div class="finding-evidence">${escapeHtml(f.evidence)}</div>` : ''}
        ${f.source ? `<div class="finding-source">${escapeHtml(f.source)}</div>` : ''}
      `;
      $threatDetails.appendChild(item);
    });
  } else if (result.threats && result.threats.length > 0) {
    result.threats.forEach(threat => {
      const item = document.createElement('div');
      item.className = 'threat-item';
      item.textContent = threat;
      $threatDetails.appendChild(item);
    });
  }

  // Show OSINT domain score
  if (result.osint && result.osint.domain_score !== undefined) {
    const osintDiv = document.createElement('div');
    osintDiv.className = 'finding-item';
    const score = result.osint.domain_score;
    const scoreColor = score >= 90 ? '#81c784' : score >= 70 ? '#f0ab00' : '#e57373';
    osintDiv.innerHTML = `
      <div class="finding-header">
        <span class="finding-severity safe">OSINT</span>
        <span class="finding-category">Domain Authority</span>
      </div>
      <div class="finding-detail">
        <span style="color:${scoreColor};font-weight:700;font-size:14px">${score}/100</span>
        <span style="margin-left:6px">${result.osint.domain} (.${result.osint.tld})</span>
      </div>
      ${result.osint.flags.length ? `<div class="finding-evidence">${result.osint.flags.join(' \u00B7 ')}</div>` : ''}
    `;
    $threatDetails.insertBefore(osintDiv, $threatDetails.firstChild);
  }

  // Show layers used
  if (result.layers_used) {
    const layerDiv = document.createElement('div');
    layerDiv.className = 'finding-source';
    layerDiv.style.marginTop = '6px';
    layerDiv.style.paddingTop = '6px';
    layerDiv.style.borderTop = '1px solid var(--color-border)';
    layerDiv.textContent = `Layers: ${result.layers_used.map(l => l.replace(/_/g, ' ')).join(' \u2192 ')}`;
    $threatDetails.appendChild(layerDiv);
  }

  $shieldResult.classList.remove('hidden');
  $('#clear-shield-btn').classList.remove('hidden');

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

function clearShieldResult() {
  $shieldResult.classList.add('hidden');
  $threatDetails.innerHTML = '';
  $shieldIcon.textContent = '\u{1F6E1}';
  $shieldTitle.textContent = 'Shield Active';
  $shieldSubtitle.textContent = 'Auto-scanning pages for threats';
  $('#clear-shield-btn').classList.add('hidden');
  sendMessage({ type: 'shield_auto_scan', enabled: $shieldToggle.checked });
}

function formatCategory(cat) {
  const names = {
    web_risk: 'Web Risk API',
    domain: 'Domain OSINT',
    phishing: 'Phishing',
    scam: 'Scam Indicators',
    transaction: 'Transaction Risk',
    content: 'Content',
    ai_generated: 'AI Content',
    visual_clone: 'Visual Cloning',
    ssl: 'SSL/Security',
    spam: 'Spam',
    search_grounding: 'Search Verification',
  };
  return names[cat] || (cat || '').replace(/_/g, ' ');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function handleShieldScan() {
  if (isAnalyzing) return;

  showLoading(true, 'Scanning for threats...');
  updateLiveStatusScan('scanning');
  $shieldResult.classList.add('hidden');
  $error.classList.add('hidden');

  try {
    const result = await sendMessage({
      type: 'shield_scan',
      language: $languageSelect.value,
    });

    if (result.error) {
      showError(result.error);
      updateLiveStatusScan('done', 'safe');
    } else {
      showShieldResult(result);
      updateLiveStatusScan('done', result.threat_level);
    }
  } catch (err) {
    showError(err.message || 'Scan failed');
    updateLiveStatusScan('done', 'safe');
  } finally {
    showLoading(false);
  }
}

/* ──────────────────── Assist ──────────────────── */

async function handleAssist() {
  const query = $assistInput.value.trim();
  if (!query || isAnalyzing) return;

  showLoading(true, 'Analyzing page...');
  $assistResult.classList.add('hidden');
  $error.classList.add('hidden');
  lastAssistActions = [];

  try {
    const result = await sendMessage({
      type: 'analyze_page',
      instruction: query,
      language: $languageSelect.value,
    });

    if (result.error) {
      showError(result.error);
      return;
    }

    const explanation = result.explanation || 'No guidance available.';
    const actions = result.actions || [];
    lastAssistActions = actions;

    $assistExplanation.textContent = explanation;
    $assistActionCount.textContent = actions.length > 0
      ? `${actions.length} action${actions.length > 1 ? 's' : ''} found`
      : 'No actions needed';
    $executeAllBtn.classList.toggle('hidden', actions.length === 0);
    $assistResult.classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Assist failed');
  } finally {
    showLoading(false);
  }
}

async function handleExecuteAll() {
  if (!lastAssistActions.length || isAnalyzing) return;

  showLoading(true, 'Executing actions...');
  $error.classList.add('hidden');

  try {
    const result = await sendMessage({
      type: 'execute_actions',
      actions: lastAssistActions,
    });

    if (result.error) {
      showError(result.error);
    } else {
      $assistExplanation.textContent = 'Actions executed successfully.';
      $executeAllBtn.classList.add('hidden');
      $assistActionCount.textContent = 'Done';
    }
  } catch (err) {
    showError(err.message || 'Execution failed');
  } finally {
    showLoading(false);
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

$connectBtn.addEventListener('click', handleConnect);
$scanNowBtn.addEventListener('click', handleShieldScan);
$guideBtn.addEventListener('click', handleAssist);
$executeAllBtn.addEventListener('click', handleExecuteAll);
$assistInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAssist();
});
$('#clear-shield-btn').addEventListener('click', clearShieldResult);
$languageSelect.addEventListener('change', () => {
  sendMessage({ type: 'save_settings', language: $languageSelect.value });
});
$shieldToggle.addEventListener('change', () => {
  const enabled = $shieldToggle.checked;
  sendMessage({ type: 'shield_auto_scan', enabled });
  $shieldTitle.textContent = enabled ? 'Shield Active' : 'Shield Paused';
  $shieldSubtitle.textContent = enabled ? 'Auto-scanning pages for threats' : 'Manual scan only';
});

/* ──────────────────── Live Status ──────────────────── */

async function updateLiveStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      $statusTabVal.textContent = (tab.title || 'Unknown').slice(0, 35);
      try {
        const parsed = new URL(tab.url || '');
        $statusUrlVal.textContent = parsed.hostname;
      } catch {
        $statusUrlVal.textContent = (tab.url || '').slice(0, 30);
      }
    }
  } catch {}

  if (isConnected) {
    $statusServerVal.textContent = 'Connected';
    $statusServerVal.className = 'status-val safe';
  } else {
    $statusServerVal.textContent = 'Disconnected';
    $statusServerVal.className = 'status-val danger';
  }
}

function updateLiveStatusScan(phase, verdict) {
  if (phase === 'scanning') {
    $statusLastScanVal.textContent = 'Scanning...';
    $statusLastScanVal.className = 'status-val scanning';
    $statusVerdictVal.textContent = '...';
    $statusVerdictVal.className = 'status-val';
  } else if (phase === 'done') {
    $statusLastScanVal.textContent = new Date().toLocaleTimeString();
    $statusLastScanVal.className = 'status-val';

    const level = verdict || 'safe';
    const labels = {
      safe: 'Safe', low: 'Low Risk',
      medium: 'Suspicious', high: 'Danger', critical: 'Scam Detected',
    };
    const cls = (level === 'high' || level === 'critical') ? 'danger'
      : level === 'medium' ? 'warning' : 'safe';
    $statusVerdictVal.textContent = labels[level] || 'Safe';
    $statusVerdictVal.className = `status-val ${cls}`;
  }
}

setInterval(updateLiveStatus, 2000);

/* ──────────────────── Boot ──────────────────── */

init();
updateLiveStatus();
