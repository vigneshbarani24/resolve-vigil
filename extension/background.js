/**
 * Resolve AI Navigator — Background Service Worker
 *
 * Manages communication between popup, content script, and the Resolve backend.
 * Handles both Shield Mode (scam/phishing detection) and Assist Mode (UI guidance).
 */

/* ─────────────────────── Storage Keys ─────────────────────── */

const DEFAULTS = {
  serverUrl: 'http://localhost:8080',
  language: 'en',
  mode: 'shield',
  connected: false,
  shieldAutoScan: true,
};

async function getSettings() {
  const data = await chrome.storage.local.get(DEFAULTS);
  return data;
}

async function setSetting(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

/* ──────────────────── Screenshot Capture ──────────────────── */

async function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl.split(',')[1]);
      }
    });
  });
}

/* ──────────────────── DOM Capture (via content script) ──────────────────── */

async function captureDOMFromTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'capture_dom' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/* ──────────────────── Backend API ──────────────────── */

async function callNavigateAPI(screenshot, domSummary, query, language) {
  const settings = await getSettings();
  const url = `${settings.serverUrl}/api/navigate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screenshot,
      dom_summary: domSummary,
      query,
      language: language || settings.language,
      page_url: domSummary?.url || '',
      page_title: domSummary?.title || '',
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function callShieldAPI(screenshot, domSummary, language) {
  const settings = await getSettings();
  const url = `${settings.serverUrl}/api/shield`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screenshot,
      dom_summary: domSummary,
      language: language || settings.language,
      page_url: domSummary?.url || '',
      page_title: domSummary?.title || '',
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function checkBackendHealth() {
  const settings = await getSettings();
  try {
    const resp = await fetch(`${settings.serverUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/* ──────────────── Shield Scan Flow ──────────────── */

async function shieldScan(tabId, language) {
  // 1. Capture screenshot + DOM
  const [screenshot, domSummary] = await Promise.all([
    captureScreenshot(),
    captureDOMFromTab(tabId),
  ]);

  // 2. Send to backend for threat analysis
  const result = await callShieldAPI(screenshot, domSummary, language);

  // 3. Show safety banner on the page
  chrome.tabs.sendMessage(tabId, {
    type: 'show_shield_banner',
    threat_level: result.threat_level,
    summary: result.summary,
    threats: result.threats || [],
  });

  // 4. Update extension badge
  updateBadge(result.threat_level);

  return result;
}

function updateBadge(threatLevel) {
  const badges = {
    safe: { text: '', color: '#81c784' },
    low: { text: '', color: '#81c784' },
    medium: { text: '!', color: '#f0ab00' },
    high: { text: '!!', color: '#e57373' },
    critical: { text: 'X', color: '#f44336' },
  };
  const b = badges[threatLevel] || badges.safe;

  chrome.action.setBadgeText({ text: b.text });
  chrome.action.setBadgeBackgroundColor({ color: b.color });
}

/* ──────────────── Analyze Page Flow (Assist) ──────────────── */

async function analyzePage(tabId, query, language) {
  const [screenshot, domSummary] = await Promise.all([
    captureScreenshot(),
    captureDOMFromTab(tabId),
  ]);

  const result = await callNavigateAPI(screenshot, domSummary, query, language);

  if (result.actions && result.actions.length > 0) {
    chrome.tabs.sendMessage(tabId, {
      type: 'render_annotations',
      actions: result.actions,
    });
  }

  return result;
}

/* ──────────────── Execute Actions Flow ──────────────── */

async function executeActions(tabId, actions) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'execute_actions', actions }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

/* ──────────────── Screenshare Frame Relay ──────────────── */

let _screenshareWs = null;

async function relayScreenshareFrame(frameBase64) {
  const settings = await getSettings();

  if (!_screenshareWs || _screenshareWs.readyState !== WebSocket.OPEN) {
    const wsUrl = settings.serverUrl.replace(/^http/, 'ws') + '/ws/extension';
    _screenshareWs = new WebSocket(wsUrl);

    _screenshareWs.onopen = () => {
      _screenshareWs.send(JSON.stringify({
        type: 'screenshare_start',
        language: settings.language,
      }));
    };

    _screenshareWs.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'annotations') {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.sendMessage(tab.id, { type: 'render_annotations', actions: msg.actions });
          }
        }
      } catch {}
    };

    await new Promise((resolve, reject) => {
      _screenshareWs.addEventListener('open', resolve, { once: true });
      _screenshareWs.addEventListener('error', reject, { once: true });
    });
  }

  _screenshareWs.send(JSON.stringify({ type: 'screenshare_frame', frame: frameBase64 }));
}

function stopScreenshareRelay() {
  if (_screenshareWs) { _screenshareWs.close(); _screenshareWs = null; }
}

/* ──────────────── Auto-Scan on Navigation ──────────────── */

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const settings = await getSettings();
  if (!settings.connected || !settings.shieldAutoScan) return;

  // Auto-scan in shield mode
  try {
    // Small delay to let page render
    setTimeout(async () => {
      try {
        const result = await shieldScan(tabId, settings.language);
        // Badge already updated in shieldScan()
      } catch {
        // Silently fail on auto-scan (page might not have content script yet)
      }
    }, 1500);
  } catch {}
});

/* ──────────────── Message Handler ──────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (msg.type) {
        /* ── Shield ── */
        case 'shield_scan': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return await shieldScan(tab.id, msg.language);
        }

        case 'shield_auto_scan': {
          await setSetting('shieldAutoScan', msg.enabled);
          if (!msg.enabled) {
            chrome.action.setBadgeText({ text: '' });
          }
          return { success: true };
        }

        /* ── Assist ── */
        case 'analyze_page': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return await analyzePage(tab.id, msg.query, msg.language);
        }

        case 'execute_actions': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return await executeActions(tab.id, msg.actions);
        }

        case 'clear_annotations': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) chrome.tabs.sendMessage(tab.id, { type: 'clear_annotations' });
          return { success: true };
        }

        /* ── Settings ── */
        case 'check_health': {
          const healthy = await checkBackendHealth();
          await setSetting('connected', healthy);
          return { connected: healthy };
        }

        case 'save_settings': {
          if (msg.serverUrl) await setSetting('serverUrl', msg.serverUrl);
          if (msg.language) await setSetting('language', msg.language);
          if (msg.mode) await setSetting('mode', msg.mode);
          return { success: true };
        }

        case 'get_settings': {
          return await getSettings();
        }

        /* ── Screenshare ── */
        case 'start_screenshare': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'start_screenshare', intervalMs: msg.intervalMs || 2000,
            }, resolve);
          });
        }

        case 'stop_screenshare': {
          stopScreenshareRelay();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) chrome.tabs.sendMessage(tab.id, { type: 'stop_screenshare' });
          return { success: true };
        }

        case 'screenshare_frame': {
          await relayScreenshareFrame(msg.frame);
          return { success: true };
        }

        case 'screenshare_stopped': {
          stopScreenshareRelay();
          return { success: true };
        }

        default:
          return { error: `Unknown message type: ${msg.type}` };
      }
    } catch (err) {
      return { error: err.message };
    }
  };

  handleAsync().then(sendResponse);
  return true;
});
