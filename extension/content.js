/**
 * Resolve AI Navigator — Content Script
 *
 * Injected into every page. Responsibilities:
 * 1. Capture interactive DOM elements with bounding rects
 * 2. Render annotation overlays (highlights, labels, arrows)
 * 3. Execute actions (click, fill, scroll) on behalf of the agent
 *
 * Domain-agnostic — all branding comes from messages sent by background.js.
 */

(function () {
  'use strict';

  /* ──────────────────────────── State ──────────────────────────── */

  const OVERLAY_CONTAINER_ID = '__resolve_nav_overlay__';
  const INTERACTIVE_SELECTORS = [
    'a[href]', 'button', 'input', 'select', 'textarea',
    'label', 'summary', '[role="button"]', '[role="link"]',
    '[role="tab"]', '[role="menuitem"]', '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const MAX_ELEMENTS = 150;
  const MAX_TEXT = 80;

  /* ──────────────────────── DOM Capture ─────────────────────── */

  function captureDOM() {
    const elements = [];
    const nodes = document.querySelectorAll(INTERACTIVE_SELECTORS);

    for (let i = 0; i < nodes.length && elements.length < MAX_ELEMENTS; i++) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();

      // Skip invisible / off-screen elements
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      if (rect.right < 0 || rect.left > window.innerWidth) continue;

      const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '')
        .trim()
        .slice(0, MAX_TEXT);

      elements.push({
        index: elements.length,
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        id: el.id || null,
        name: el.name || null,
        className: el.className ? String(el.className).slice(0, 100) : null,
        text,
        href: el.href || null,
        placeholder: el.placeholder || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        role: el.getAttribute('role') || null,
        disabled: el.disabled || false,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    }

    return {
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      elements,
    };
  }

  /* ─────────────────── Annotation Rendering ─────────────────── */

  function getOverlayContainer() {
    let container = document.getElementById(OVERLAY_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = OVERLAY_CONTAINER_ID;
      document.body.appendChild(container);
    }
    return container;
  }

  function clearAnnotations() {
    const container = document.getElementById(OVERLAY_CONTAINER_ID);
    if (container) container.innerHTML = '';
  }

  function renderAnnotations(actions) {
    clearAnnotations();
    const container = getOverlayContainer();

    actions.forEach((action, idx) => {
      const coords = action.coordinates;
      if (!coords) return;

      // Try to find actual element for precise positioning
      let targetEl = null;
      if (action.selector) {
        try { targetEl = document.querySelector(action.selector); } catch (_) {}
      }
      if (!targetEl && typeof action.element_index === 'number') {
        const allInteractive = document.querySelectorAll(INTERACTIVE_SELECTORS);
        if (action.element_index < allInteractive.length) {
          targetEl = allInteractive[action.element_index];
        }
      }

      // Use element rect if found, otherwise use coordinates from Gemini
      const rect = targetEl
        ? targetEl.getBoundingClientRect()
        : { x: coords.x, y: coords.y, width: coords.width || 100, height: coords.height || 40 };

      // Highlight box
      const highlight = document.createElement('div');
      highlight.className = '__resolve_highlight__';
      const typeClass = {
        click: '__resolve_highlight_click__',
        fill: '__resolve_highlight_fill__',
        scroll: '__resolve_highlight_scroll__',
        highlight: '__resolve_highlight_info__',
      }[action.type] || '__resolve_highlight_info__';
      highlight.classList.add(typeClass);

      highlight.style.left = `${rect.x + window.scrollX - 4}px`;
      highlight.style.top = `${rect.y + window.scrollY - 4}px`;
      highlight.style.width = `${rect.width + 8}px`;
      highlight.style.height = `${rect.height + 8}px`;

      // Step number badge
      const badge = document.createElement('span');
      badge.className = '__resolve_badge__';
      badge.textContent = String(idx + 1);
      highlight.appendChild(badge);

      // Label
      if (action.label) {
        const label = document.createElement('div');
        label.className = '__resolve_label__';
        label.textContent = action.label;
        highlight.appendChild(label);
      }

      container.appendChild(highlight);

      // Scroll into view if off-screen
      if (idx === 0 && targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /* ───────────────────── Action Execution ───────────────────── */

  function executeAction(action) {
    let targetEl = null;

    // Find element by selector
    if (action.selector) {
      try { targetEl = document.querySelector(action.selector); } catch (_) {}
    }

    // Fallback: find by element_index
    if (!targetEl && typeof action.element_index === 'number') {
      const allInteractive = document.querySelectorAll(INTERACTIVE_SELECTORS);
      if (action.element_index < allInteractive.length) {
        targetEl = allInteractive[action.element_index];
      }
    }

    // Fallback: find by coordinates
    if (!targetEl && action.coordinates) {
      targetEl = document.elementFromPoint(action.coordinates.x, action.coordinates.y);
    }

    if (!targetEl) {
      return { success: false, error: 'Element not found' };
    }

    switch (action.type) {
      case 'click':
        targetEl.focus();
        targetEl.click();
        return { success: true, action: 'clicked' };

      case 'fill':
        if (action.value != null) {
          targetEl.focus();
          targetEl.value = action.value;
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, action: 'filled', value: action.value };
        }
        return { success: false, error: 'No value provided' };

      case 'scroll':
        const dir = action.direction || 'down';
        const amount = action.amount || 300;
        window.scrollBy({
          top: dir === 'down' ? amount : -amount,
          behavior: 'smooth',
        });
        return { success: true, action: 'scrolled', direction: dir };

      case 'highlight':
        // Just render the annotation, no action needed
        return { success: true, action: 'highlighted' };

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  /* ────────────────── Screenshare Support ────────────────── */

  let _screenshareStream = null;
  let _screenshareInterval = null;

  async function startScreenshare(intervalMs) {
    if (_screenshareStream) return { success: true, message: 'Already sharing' };

    try {
      _screenshareStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const track = _screenshareStream.getVideoTracks()[0];
      track.addEventListener('ended', () => stopScreenshare());

      // Periodically capture frames and send to background
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.srcObject = _screenshareStream;
      video.muted = true;
      await video.play();

      _screenshareInterval = setInterval(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const frame = canvas.toDataURL('image/jpeg', 0.7);
        chrome.runtime.sendMessage({
          type: 'screenshare_frame',
          frame: frame.split(',')[1], // base64 only
        });
      }, intervalMs || 2000);

      return { success: true, message: 'Screen sharing started' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function stopScreenshare() {
    if (_screenshareInterval) {
      clearInterval(_screenshareInterval);
      _screenshareInterval = null;
    }
    if (_screenshareStream) {
      _screenshareStream.getTracks().forEach(t => t.stop());
      _screenshareStream = null;
    }
    chrome.runtime.sendMessage({ type: 'screenshare_stopped' });
    return { success: true, message: 'Screen sharing stopped' };
  }

  /* ───────────────── Message Listener ───────────────── */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'capture_dom':
        sendResponse(captureDOM());
        break;

      case 'render_annotations':
        renderAnnotations(msg.actions || []);
        sendResponse({ success: true });
        break;

      case 'execute_action':
        sendResponse(executeAction(msg.action));
        break;

      case 'execute_actions':
        const results = (msg.actions || []).map(a => executeAction(a));
        sendResponse({ success: true, results });
        break;

      case 'clear_annotations':
        clearAnnotations();
        sendResponse({ success: true });
        break;

      case 'start_screenshare':
        startScreenshare(msg.intervalMs).then(sendResponse);
        return true; // async response

      case 'stop_screenshare':
        sendResponse(stopScreenshare());
        break;

      default:
        sendResponse({ error: `Unknown message type: ${msg.type}` });
    }

    return false;
  });

})();
