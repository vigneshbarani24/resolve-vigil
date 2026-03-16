/**
 * Vigil Shield — Content Script
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

  /* ─────────────────── Shield Mode Banner ─────────────────── */

  const BANNER_ID = '__resolve_shield_banner__';

  function showShieldBanner(threatLevel, summary, threats) {
    removeShieldBanner();

    const levelConfig = {
      safe: { bg: 'rgba(129, 199, 132, 0.95)', icon: '\u2705', text: '#1b5e20', label: 'Safe' },
      low: { bg: 'rgba(129, 199, 132, 0.95)', icon: '\u2705', text: '#1b5e20', label: 'Low Risk' },
      medium: { bg: 'rgba(240, 171, 0, 0.95)', icon: '\u26A0\uFE0F', text: '#4a3800', label: 'Suspicious' },
      high: { bg: 'rgba(229, 115, 115, 0.95)', icon: '\u{1F6A8}', text: '#fff', label: 'DANGER' },
      critical: { bg: 'rgba(244, 67, 54, 0.97)', icon: '\u{1F6D1}', text: '#fff', label: 'SCAM DETECTED' },
    };

    const cfg = levelConfig[threatLevel] || levelConfig.safe;

    // Don't show banner for safe sites
    if (threatLevel === 'safe' || threatLevel === 'low') return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      background: ${cfg.bg}; color: ${cfg.text};
      padding: 12px 20px; display: flex; align-items: center; gap: 12px;
      font-family: 'Nunito', system-ui, sans-serif; font-size: 14px; font-weight: 700;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: __resolve_slideDown__ 0.3s ease forwards;
      backdrop-filter: blur(8px);
    `;

    const icon = document.createElement('span');
    icon.style.fontSize = '24px';
    icon.textContent = cfg.icon;
    banner.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 2px;';

    const title = document.createElement('span');
    title.style.cssText = 'font-size: 14px; font-weight: 800; letter-spacing: 0.02em;';
    title.textContent = `${cfg.label} — ${summary || 'Potential threat detected'}`;
    info.appendChild(title);

    if (threats && threats.length > 0) {
      const detail = document.createElement('span');
      detail.style.cssText = 'font-size: 12px; font-weight: 600; opacity: 0.9;';
      detail.textContent = threats.slice(0, 2).join(' \u2022 ');
      info.appendChild(detail);
    }

    banner.appendChild(info);

    // Close button
    const close = document.createElement('button');
    close.style.cssText = `
      background: rgba(255,255,255,0.2); border: none; color: ${cfg.text};
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
    `;
    close.textContent = '\u2715';
    close.addEventListener('click', removeShieldBanner);
    banner.appendChild(close);

    document.body.appendChild(banner);

    // Auto-dismiss safe/low after 5 seconds
    if (threatLevel === 'medium') {
      setTimeout(removeShieldBanner, 10000);
    }
  }

  function removeShieldBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();
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

  /* ─────────────── Shield Annotation Rendering ─────────────── */

  const SHIELD_ANNOTATION_ID = '__vigil_shield_annotations__';

  function renderShieldAnnotations(annotations) {
    // Remove old shield annotations
    const old = document.getElementById(SHIELD_ANNOTATION_ID);
    if (old) old.remove();

    if (!annotations || annotations.length === 0) return;

    const container = document.createElement('div');
    container.id = SHIELD_ANNOTATION_ID;
    container.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483640;';
    document.body.appendChild(container);

    // Try to find images on the page to annotate directly
    const images = document.querySelectorAll('img, video, picture, [style*="background-image"]');
    const imageRects = [];
    images.forEach((img, idx) => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50 && rect.bottom > 0 && rect.top < window.innerHeight) {
        imageRects.push({ el: img, rect, idx });
      }
    });

    annotations.forEach((ann, i) => {
      const region = (ann.region || '').toLowerCase();
      const label = ann.label || 'Suspicious';
      const detail = ann.detail || '';
      const type = ann.type || 'ai_generated';

      // Try to match annotation to an actual image element
      let targetRect = null;

      // If region is a CSS selector, try it
      if (region.startsWith('.') || region.startsWith('#') || region.startsWith('[')) {
        try {
          const el = document.querySelector(region);
          if (el) targetRect = el.getBoundingClientRect();
        } catch {}
      }

      // Try matching by region description to image positions
      if (!targetRect && imageRects.length > 0) {
        const pageHeight = document.documentElement.scrollHeight;
        const pageWidth = document.documentElement.scrollWidth;
        const vpHeight = window.innerHeight;
        const vpWidth = window.innerWidth;

        // Map region names to viewport areas
        let bestMatch = null;
        let bestScore = Infinity;

        imageRects.forEach(({ rect }, idx) => {
          const centerX = rect.x + rect.width / 2;
          const centerY = rect.y + rect.height / 2;
          let targetX = vpWidth / 2;
          let targetY = vpHeight / 2;

          if (region.includes('top')) targetY = vpHeight * 0.25;
          if (region.includes('bottom')) targetY = vpHeight * 0.75;
          if (region.includes('left')) targetX = vpWidth * 0.25;
          if (region.includes('right')) targetX = vpWidth * 0.75;

          const dist = Math.sqrt((centerX - targetX) ** 2 + (centerY - targetY) ** 2);
          if (dist < bestScore) {
            bestScore = dist;
            bestMatch = rect;
          }
        });

        if (bestMatch) targetRect = bestMatch;
      }

      // Fallback: use region-based positioning on viewport
      if (!targetRect) {
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        let x = vpW * 0.3, y = vpH * 0.3, w = vpW * 0.4, h = vpH * 0.3;

        if (region.includes('top')) y = 80;
        if (region.includes('bottom')) y = vpH * 0.6;
        if (region.includes('left')) x = 20;
        if (region.includes('right')) x = vpW * 0.55;
        if (region.includes('center') && !region.includes('left') && !region.includes('right')) x = vpW * 0.25;

        targetRect = { x, y, width: w, height: h };
      }

      // Create annotation overlay
      const overlay = document.createElement('div');
      const colors = {
        deepfake: { border: '#ff1744', bg: 'rgba(255, 23, 68, 0.12)', text: '#ff1744' },
        ai_generated: { border: '#ff9100', bg: 'rgba(255, 145, 0, 0.12)', text: '#ff9100' },
        fake_review: { border: '#ff6d00', bg: 'rgba(255, 109, 0, 0.12)', text: '#ff6d00' },
        fake_button: { border: '#d50000', bg: 'rgba(213, 0, 0, 0.15)', text: '#d50000' },
        dark_pattern: { border: '#aa00ff', bg: 'rgba(170, 0, 255, 0.1)', text: '#aa00ff' },
        phishing_form: { border: '#d50000', bg: 'rgba(213, 0, 0, 0.15)', text: '#d50000' },
        unverified_claim: { border: '#ffab00', bg: 'rgba(255, 171, 0, 0.15)', text: '#ffab00' },
        debunked_claim: { border: '#ff1744', bg: 'rgba(255, 23, 68, 0.15)', text: '#ff1744' },
      };
      const c = colors[type] || colors.ai_generated;

      overlay.style.cssText = `
        position: absolute;
        left: ${targetRect.x + window.scrollX - 4}px;
        top: ${targetRect.y + window.scrollY - 4}px;
        width: ${targetRect.width + 8}px;
        height: ${targetRect.height + 8}px;
        border: 3px solid ${c.border};
        background: ${c.bg};
        border-radius: 8px;
        pointer-events: none;
        z-index: 2147483641;
        animation: __vigil_pulse__ 2s ease-in-out infinite;
      `;

      // Badge
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -12px;
        left: 8px;
        background: ${c.border};
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        font-family: 'Nunito', system-ui, sans-serif;
        padding: 2px 8px;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: auto;
        cursor: help;
        letter-spacing: 0.03em;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      badge.textContent = label;
      badge.title = detail;
      overlay.appendChild(badge);

      // Detail tooltip on hover
      if (detail) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position: absolute;
          bottom: -30px;
          left: 8px;
          background: rgba(0,0,0,0.85);
          color: #fff;
          font-size: 11px;
          font-family: 'Nunito', system-ui, sans-serif;
          padding: 4px 10px;
          border-radius: 4px;
          max-width: 280px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        tooltip.textContent = detail;
        overlay.appendChild(tooltip);
      }

      container.appendChild(overlay);
    });

    // Add pulse animation if not already added
    if (!document.getElementById('__vigil_pulse_style__')) {
      const style = document.createElement('style');
      style.id = '__vigil_pulse_style__';
      style.textContent = `
        @keyframes __vigil_pulse__ {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ───────────────── Message Listener ───────────────── */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'ping':
        sendResponse({ ok: true });
        break;

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
        removeShieldBanner();
        sendResponse({ success: true });
        break;

      case 'show_shield_banner':
        showShieldBanner(msg.threat_level, msg.summary, msg.threats);
        sendResponse({ success: true });
        break;

      case 'render_shield_annotations':
        renderShieldAnnotations(msg.annotations || []);
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
