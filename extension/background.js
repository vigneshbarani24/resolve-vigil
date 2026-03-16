/**
 * Resolve AI Navigator — Background Service Worker
 *
 * Manages communication between popup, content script, and the Resolve backend.
 * Handles screenshot capture, REST calls, and screenshare frame relay.
 */

/* ─────────────────────── Storage Keys ─────────────────────── */

const DEFAULTS = {
  serverUrl: 'http://localhost:8080',
  language: 'en',
  connected: false,
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
        // Strip data URL prefix, return raw base64
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

/* ──────────────── Analyze Page Flow ──────────────── */

async function analyzePage(tabId, query, language) {
  // 1. Capture screenshot + DOM in parallel
  const [screenshot, domSummary] = await Promise.all([
    captureScreenshot(),
    captureDOMFromTab(tabId),
  ]);

  // 2. Send to backend for Gemini vision analysis
  const result = await callNavigateAPI(screenshot, domSummary, query, language);

  // 3. Send annotations to content script for rendering
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
    chrome.tabs.sendMessage(tabId, {
      type: 'execute_actions',
      actions,
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/* ──────────────── Screenshare Frame Relay ──────────────── */

let _screenshareWs = null;

async function relayScreenshareFrame(frameBase64) {
  const settings = await getSettings();

  // Open WS if not connected
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
          // Forward annotations to the active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'render_annotations',
              actions: msg.actions,
            });
          }
        }
      } catch {}
    };

    // Wait for connection
    await new Promise((resolve, reject) => {
      _screenshareWs.addEventListener('open', resolve, { once: true });
      _screenshareWs.addEventListener('error', reject, { once: true });
    });
  }

  _screenshareWs.send(JSON.stringify({
    type: 'screenshare_frame',
    frame: frameBase64,
  }));
}

function stopScreenshareRelay() {
  if (_screenshareWs) {
    _screenshareWs.close();
    _screenshareWs = null;
  }
}

/* ──────────────── Message Handler ──────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (msg.type) {
        case 'analyze_page': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          const result = await analyzePage(tab.id, msg.query, msg.language);
          return result;
        }

        case 'execute_actions': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return await executeActions(tab.id, msg.actions);
        }

        case 'clear_annotations': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.sendMessage(tab.id, { type: 'clear_annotations' });
          }
          return { success: true };
        }

        case 'check_health': {
          const healthy = await checkBackendHealth();
          await setSetting('connected', healthy);
          return { connected: healthy };
        }

        case 'save_settings': {
          if (msg.serverUrl) await setSetting('serverUrl', msg.serverUrl);
          if (msg.language) await setSetting('language', msg.language);
          return { success: true };
        }

        case 'get_settings': {
          return await getSettings();
        }

        case 'start_screenshare': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error('No active tab');
          return new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'start_screenshare',
              intervalMs: msg.intervalMs || 2000,
            }, resolve);
          });
        }

        case 'stop_screenshare': {
          stopScreenshareRelay();
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.sendMessage(tab.id, { type: 'stop_screenshare' });
          }
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
  return true; // async response
});
