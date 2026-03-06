/**
 * TubeForge app.js — Main application (bidi-demo pattern + studio UI).
 */

import { startAudioPlayerWorklet } from "./audio-player.js";
import { startAudioRecorderWorklet } from "./audio-recorder.js";
import {
  initPipeline,
  setPipelineStage,
  handleToolEvent,
  showScriptPreview,
  showThumbnail,
  showVideo,
  addAsset,
  refreshAssets,
  hideUploadHero,
  updatePipelineStatus,
  updateAudioStatus,
  setHeroTranscript,
  setHeroStatus,
  startTimer,
  stopTimer,
} from "./ui.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const userId = "user-" + Math.random().toString(36).substring(2, 8);
const sessionId = "session-" + Date.now().toString(36);
let ws = null;
let isAudio = false;
let selectedPreset = "documentary";

// Audio nodes
let audioPlayerNode = null;
let audioPlayerCtx = null;
let audioRecorderNode = null;
let audioRecorderCtx = null;
let micStream = null;

// Transcription tracking
let currentMessageId = null;
let currentBubbleElement = null;
let currentInputTranscriptionId = null;
let currentInputTranscriptionElement = null;
let currentOutputTranscriptionId = null;
let currentOutputTranscriptionElement = null;
let inputTranscriptionFinished = false;
let hasOutputTranscriptionInTurn = false;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const messagesDiv = $("#messages");
const messageForm = $("#messageForm");
const messageInput = $("#messageInput");
const sendBtn = $("#sendBtn");
const voiceBtn = $("#voiceBtn");
const cameraBtn = $("#cameraBtn");
const fileUpload = $("#fileUpload");
const hiddenFileInput = $("#hiddenFileInput");
const dropZone = $("#dropZone");
const consoleContent = $("#consoleContent");
const showAudioEventsCheckbox = $("#showAudioEvents");
const statusDot = $("#statusDot");
const statusLabel = $("#statusLabel");

// Camera
const cameraModal = $("#cameraModal");
const cameraPreview = $("#cameraPreview");
let cameraStream = null;

// Voice orb pulse elements
const orbPulse1 = $("#orbPulse1");
const orbPulse2 = $("#orbPulse2");

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------
function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${proto}//${location.host}/ws/${userId}/${sessionId}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    setConnected(true);
    sendBtn.disabled = false;
    addSystemMessage("Connected to Forge -- your AI Creative Director");
    setHeroStatus("Connected -- speak or type to begin");
    logConsole("down", "WebSocket connected", { userId, sessionId });
  };

  ws.onmessage = (evt) => {
    const event = JSON.parse(evt.data);
    handleEvent(event);
  };

  ws.onclose = () => {
    setConnected(false);
    sendBtn.disabled = true;
    addSystemMessage("Disconnected. Reconnecting...");
    setHeroStatus("Reconnecting...");
    logConsole("err", "Disconnected", null);
    setTimeout(connect, 4000);
  };

  ws.onerror = () => {
    setConnected(false);
    logConsole("err", "WebSocket error", null);
  };
}

function setConnected(ok) {
  if (statusDot) {
    statusDot.className = ok
      ? "size-2 rounded-full bg-emerald-500 transition-colors"
      : "size-2 rounded-full bg-red-500 transition-colors";
  }
  if (statusLabel) statusLabel.textContent = ok ? "Connected" : "Disconnected";
}

// ---------------------------------------------------------------------------
// Event handler (from ADK via WebSocket)
// ---------------------------------------------------------------------------
function handleEvent(event) {
  handleToolEvent(event);

  if (event.turnComplete === true) {
    finalizeTurn();
    logConsole("down", "Turn complete", null);
    return;
  }

  if (event.interrupted === true) {
    if (audioPlayerNode) audioPlayerNode.port.postMessage({ command: "endOfAudio" });
    interruptCurrent();
    logConsole("down", "Interrupted", null);
    return;
  }

  if (event.inputTranscription && event.inputTranscription.text) {
    handleInputTranscription(event.inputTranscription);
  }

  if (event.outputTranscription && event.outputTranscription.text) {
    handleOutputTranscription(event.outputTranscription);
  }

  if (event.content && event.content.parts) {
    handleContentParts(event);
  }

  const hasAudioOnly =
    event.content &&
    event.content.parts &&
    event.content.parts.some((p) => p.inlineData) &&
    !event.content.parts.some((p) => p.text);

  if (!hasAudioOnly && !event.turnComplete && !event.interrupted) {
    const summary = summarizeEvent(event);
    logConsole("down", summary, event);
  }
}

function summarizeEvent(event) {
  if (event.inputTranscription) return `Input: "${truncate(event.inputTranscription.text, 60)}"`;
  if (event.outputTranscription) return `Output: "${truncate(event.outputTranscription.text, 60)}"`;
  if (event.content && event.content.parts) {
    const textPart = event.content.parts.find((p) => p.text);
    if (textPart) return `Text: "${truncate(textPart.text, 80)}"`;
    const audioPart = event.content.parts.find((p) => p.inlineData);
    if (audioPart) return `Audio chunk`;
  }
  return "Event";
}

// ---------------------------------------------------------------------------
// Transcription handling (voice mode)
// ---------------------------------------------------------------------------
function handleInputTranscription(t) {
  const text = t.text;
  const finished = t.finished;
  if (!text || inputTranscriptionFinished) return;

  // Update hero transcript with what user is saying
  setHeroTranscript(`"${text}"`);
  setHeroStatus("Listening...");

  if (!currentInputTranscriptionId) {
    currentInputTranscriptionId = rndId();
    currentInputTranscriptionElement = createBubble(text, true, !finished);
    currentInputTranscriptionElement.id = currentInputTranscriptionId;
    currentInputTranscriptionElement.classList.add("transcription");
    messagesDiv.appendChild(currentInputTranscriptionElement);
  } else if (!currentOutputTranscriptionId && !currentMessageId) {
    if (finished) {
      updateBubble(currentInputTranscriptionElement, text, false);
    } else {
      const existing = currentInputTranscriptionElement.querySelector(".bubble-text").textContent;
      updateBubble(currentInputTranscriptionElement, existing + text, true);
    }
  }

  if (finished) {
    currentInputTranscriptionId = null;
    currentInputTranscriptionElement = null;
    inputTranscriptionFinished = true;
    setHeroStatus("Processing...");
  }
  scrollChat();
}

function handleOutputTranscription(t) {
  const text = t.text;
  const finished = t.finished;
  if (!text) return;
  hasOutputTranscriptionInTurn = true;

  // Update hero with what Forge is saying
  setHeroTranscript(`"${truncate(text, 120)}"`);
  setHeroStatus("Forge is speaking...");

  if (currentInputTranscriptionId && !currentOutputTranscriptionId) {
    clearTyping(currentInputTranscriptionElement);
    currentInputTranscriptionId = null;
    currentInputTranscriptionElement = null;
    inputTranscriptionFinished = true;
  }

  if (!currentOutputTranscriptionId) {
    currentOutputTranscriptionId = rndId();
    currentOutputTranscriptionElement = createBubble(text, false, !finished);
    currentOutputTranscriptionElement.id = currentOutputTranscriptionId;
    currentOutputTranscriptionElement.classList.add("transcription");
    messagesDiv.appendChild(currentOutputTranscriptionElement);
  } else {
    if (finished) {
      updateBubble(currentOutputTranscriptionElement, text, false);
    } else {
      const existing = currentOutputTranscriptionElement.querySelector(".bubble-text").textContent;
      updateBubble(currentOutputTranscriptionElement, existing + text, true);
    }
  }

  if (finished) {
    currentOutputTranscriptionId = null;
    currentOutputTranscriptionElement = null;
  }
  scrollChat();
}

// ---------------------------------------------------------------------------
// Content parts (text, audio, images from agent)
// ---------------------------------------------------------------------------
function handleContentParts(event) {
  if (currentInputTranscriptionId && !currentMessageId && !currentOutputTranscriptionId) {
    clearTyping(currentInputTranscriptionElement);
    currentInputTranscriptionId = null;
    currentInputTranscriptionElement = null;
    inputTranscriptionFinished = true;
  }

  for (const part of event.content.parts) {
    if (part.inlineData) {
      const mime = part.inlineData.mimeType || "";
      if (mime.startsWith("audio/pcm") && audioPlayerNode) {
        audioPlayerNode.port.postMessage(base64ToArrayBuffer(part.inlineData.data));
      }
      if (showAudioEventsCheckbox && showAudioEventsCheckbox.checked) {
        logConsole("down", `Audio: ${Math.floor((part.inlineData.data || "").length * 0.75)} bytes`, null, true);
      }
    }

    if (part.text) {
      if (part.thought) continue;
      if (!event.partial && hasOutputTranscriptionInTurn) continue;

      if (!currentMessageId) {
        currentMessageId = rndId();
        currentBubbleElement = createBubble(part.text, false, true);
        currentBubbleElement.id = currentMessageId;
        messagesDiv.appendChild(currentBubbleElement);
      } else {
        const existing = currentBubbleElement.querySelector(".bubble-text").textContent;
        updateBubble(currentBubbleElement, existing + part.text, true);
      }
      scrollChat();
    }

    if (part.functionCall || part.function_call) {
      const fc = part.functionCall || part.function_call;
      addSystemMessage(`Calling: ${fc.name}...`);
      setHeroStatus(`Running ${fc.name}...`);
      logConsole("down", `Tool call: ${fc.name}`, fc);
    }

    if (part.functionResponse || part.function_response) {
      const fr = part.functionResponse || part.function_response;
      const status = (fr.response || fr.result || {}).status || "unknown";
      addSystemMessage(`${fr.name}: ${status}`);
      logConsole("down", `Tool result: ${fr.name} -> ${status}`, fr);
    }
  }
}

// ---------------------------------------------------------------------------
// Turn management
// ---------------------------------------------------------------------------
function finalizeTurn() {
  clearTyping(currentBubbleElement);
  clearTyping(currentOutputTranscriptionElement);
  currentMessageId = null;
  currentBubbleElement = null;
  currentOutputTranscriptionId = null;
  currentOutputTranscriptionElement = null;
  inputTranscriptionFinished = false;
  hasOutputTranscriptionInTurn = false;
  setHeroStatus("Ready");
}

function interruptCurrent() {
  if (currentBubbleElement) {
    clearTyping(currentBubbleElement);
    currentBubbleElement.classList.add("interrupted");
  }
  if (currentOutputTranscriptionElement) {
    clearTyping(currentOutputTranscriptionElement);
    currentOutputTranscriptionElement.classList.add("interrupted");
  }
  finalizeTurn();
}

// ---------------------------------------------------------------------------
// Bubble helpers
// ---------------------------------------------------------------------------
function createBubble(text, isUser, isPartial = false) {
  const msg = document.createElement("div");
  msg.className = `message ${isUser ? "user" : "agent"}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const p = document.createElement("p");
  p.className = "bubble-text";
  p.textContent = text;

  if (isPartial && !isUser) {
    const ti = document.createElement("span");
    ti.className = "typing-indicator";
    p.appendChild(ti);
  }

  bubble.appendChild(p);
  msg.appendChild(bubble);
  return msg;
}

function createImageBubble(dataUrl, isUser) {
  const msg = document.createElement("div");
  msg.className = `message ${isUser ? "user" : "agent"}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble image-bubble";
  const img = document.createElement("img");
  img.src = dataUrl;
  img.className = "bubble-image";
  img.alt = "Image";
  bubble.appendChild(img);
  msg.appendChild(bubble);
  return msg;
}

function updateBubble(el, text, isPartial) {
  if (!el) return;
  const p = el.querySelector(".bubble-text");
  const ti = p.querySelector(".typing-indicator");
  if (ti) ti.remove();
  p.textContent = text;
  if (isPartial) {
    const span = document.createElement("span");
    span.className = "typing-indicator";
    p.appendChild(span);
  }
}

function clearTyping(el) {
  if (!el) return;
  const ti = el.querySelector(".typing-indicator");
  if (ti) ti.remove();
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  messagesDiv.appendChild(div);
  scrollChat();
}

function scrollChat() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ---------------------------------------------------------------------------
// Send messages
// ---------------------------------------------------------------------------
function sendText(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "text", text }));
  logConsole("up", `User: ${text}`, null);
}

function sendImage(base64Data, mimeType = "image/jpeg") {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "image", data: base64Data, mimeType }));
  logConsole("up", `Image: ${Math.floor(base64Data.length * 0.75)} bytes`, null);
}

// ---------------------------------------------------------------------------
// Image upload (drag & drop + file picker)
// ---------------------------------------------------------------------------
function setupDragDrop() {
  if (!dropZone) return;

  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

  dropZone.addEventListener("dragenter", (e) => { prevent(e); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragover", (e) => { prevent(e); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", (e) => { prevent(e); dropZone.classList.remove("drag-over"); });
  dropZone.addEventListener("drop", (e) => {
    prevent(e);
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      handleImageFile(files[0]);
    }
  });

  dropZone.addEventListener("click", () => hiddenFileInput && hiddenFileInput.click());
}

function setupFileInputs() {
  if (hiddenFileInput) {
    hiddenFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
      e.target.value = "";
    });
  }
  if (fileUpload) {
    fileUpload.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
      e.target.value = "";
    });
  }
}

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;

    const bubble = createImageBubble(dataUrl, true);
    messagesDiv.appendChild(bubble);
    scrollChat();

    const base64 = dataUrl.split(",")[1];
    const mimeType = file.type || "image/jpeg";
    sendImage(base64, mimeType);

    hideUploadHero();
    startTimer();
    setHeroTranscript("Photo uploaded -- Forge is analyzing...");
    setHeroStatus("Processing image...");

    if (selectedPreset) {
      setTimeout(() => {
        const hint = `I'd like a ${selectedPreset}-style video about this.`;
        const userBubble = createBubble(hint, true);
        messagesDiv.appendChild(userBubble);
        scrollChat();
        sendText(hint);
      }, 500);
    }
  };
  reader.readAsDataURL(file);
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
function setupCamera() {
  if (cameraBtn) cameraBtn.addEventListener("click", openCamera);
  if ($("#closeCameraModal")) $("#closeCameraModal").addEventListener("click", closeCamera);
  if ($("#cancelCamera")) $("#cancelCamera").addEventListener("click", closeCamera);
  if ($("#captureImage")) $("#captureImage").addEventListener("click", captureFromCamera);
  if ($("#cameraBackdrop")) $("#cameraBackdrop").addEventListener("click", closeCamera);
}

async function openCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 768 }, height: { ideal: 768 }, facingMode: "user" },
    });
    cameraPreview.srcObject = cameraStream;
    cameraModal.classList.add("show");
    cameraModal.classList.remove("hidden");
  } catch (err) {
    addSystemMessage(`Camera error: ${err.message}`);
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (cameraPreview) cameraPreview.srcObject = null;
  if (cameraModal) {
    cameraModal.classList.remove("show");
    cameraModal.classList.add("hidden");
  }
}

function captureFromCamera() {
  if (!cameraStream) return;
  const canvas = document.createElement("canvas");
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;
  canvas.getContext("2d").drawImage(cameraPreview, 0, 0);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const bubble = createImageBubble(dataUrl, true);
  messagesDiv.appendChild(bubble);
  scrollChat();

  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result.split(",")[1];
      sendImage(b64, "image/jpeg");
    };
    reader.readAsDataURL(blob);
  }, "image/jpeg", 0.85);

  closeCamera();
  hideUploadHero();
  startTimer();
}

// ---------------------------------------------------------------------------
// Audio (voice mode)
// ---------------------------------------------------------------------------
function setupAudio() {
  if (!voiceBtn) return;
  voiceBtn.addEventListener("click", toggleAudio);
}

async function toggleAudio() {
  if (isAudio) {
    isAudio = false;
    voiceBtn.classList.remove("active");
    updateAudioStatus(false);
    setVoiceOrbActive(false);
    addSystemMessage("Voice mode off");
    setHeroStatus("Voice mode off");
    return;
  }

  try {
    if (!audioPlayerNode) {
      const [node, ctx] = await startAudioPlayerWorklet();
      audioPlayerNode = node;
      audioPlayerCtx = ctx;
    }
    if (!audioRecorderNode) {
      const [node, ctx, stream] = await startAudioRecorderWorklet(audioRecorderHandler);
      audioRecorderNode = node;
      audioRecorderCtx = ctx;
      micStream = stream;
    }
    isAudio = true;
    voiceBtn.classList.add("active");
    updateAudioStatus(true);
    setVoiceOrbActive(true);
    addSystemMessage("Voice mode on -- speak to Forge");
    setHeroTranscript("Listening... speak to Forge");
    setHeroStatus("Voice mode active");
  } catch (err) {
    addSystemMessage(`Audio error: ${err.message}`);
  }
}

function setVoiceOrbActive(active) {
  if (orbPulse1) orbPulse1.classList.toggle("hidden", !active);
  if (orbPulse2) orbPulse2.classList.toggle("hidden", !active);
}

function audioRecorderHandler(pcmData) {
  if (ws && ws.readyState === WebSocket.OPEN && isAudio) {
    ws.send(pcmData);
  }
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
function setupPresets() {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach((b) => {
        b.className = "preset-btn w-full text-left px-3 py-1.5 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors";
      });
      btn.className = "preset-btn w-full text-left px-3 py-1.5 rounded-md text-sm font-medium bg-primary/10 text-primary border border-primary/20 transition-colors";
      selectedPreset = btn.dataset.preset;
    });
  });
}

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------
function setupConsole() {
  const drawer = $("#consoleDrawer");
  const toggleBtn = $("#toggleConsole");
  const closeBtn = $("#closeConsole");
  const clearBtn = $("#clearConsole");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      drawer && drawer.classList.toggle("open");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      drawer && drawer.classList.remove("open");
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (consoleContent) consoleContent.innerHTML = "";
    });
  }
}

function logConsole(type, message, data, isAudioEvt = false) {
  if (!consoleContent) return;
  if (isAudioEvt && showAudioEventsCheckbox && !showAudioEventsCheckbox.checked) return;

  const entry = document.createElement("div");
  entry.className = `con-entry ${type}`;

  const now = new Date();
  const ts = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const dirLabel = type === "up" ? "UP" : type === "down" ? "DN" : "ER";

  let html = `<span class="con-time">${ts}</span><span class="con-dir">${dirLabel}</span><span class="con-msg">${escapeHtml(message)}</span>`;

  if (data) {
    entry.classList.add("expandable");
    html += `<div class="con-json"><pre>${escapeHtml(JSON.stringify(sanitizeForConsole(data), null, 2))}</pre></div>`;
    entry.addEventListener("click", () => entry.classList.toggle("expanded"));
  }

  entry.innerHTML = html;
  consoleContent.appendChild(entry);
  consoleContent.scrollTop = consoleContent.scrollHeight;
}

function sanitizeForConsole(obj) {
  const s = JSON.parse(JSON.stringify(obj));
  if (s && s.content && s.content.parts) {
    s.content.parts = s.content.parts.map((p) => {
      if (p.inlineData && p.inlineData.data && p.inlineData.data.length > 100) {
        const bytes = Math.floor(p.inlineData.data.length * 0.75);
        return { ...p, inlineData: { ...p.inlineData, data: `(${bytes.toLocaleString()} bytes)` } };
      }
      return p;
    });
  }
  return s;
}

// ---------------------------------------------------------------------------
// Form submit
// ---------------------------------------------------------------------------
function setupForm() {
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    const bubble = createBubble(text, true);
    messagesDiv.appendChild(bubble);
    scrollChat();
    messageInput.value = "";
    sendText(text);

    setHeroTranscript(`"${truncate(text, 80)}"`);
    setHeroStatus("Processing...");
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function base64ToArrayBuffer(b64) {
  let std = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (std.length % 4) std += "=";
  const bin = atob(std);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function rndId() {
  return Math.random().toString(36).substring(2, 9);
}

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  initPipeline();
  setupForm();
  setupDragDrop();
  setupFileInputs();
  setupCamera();
  setupAudio();
  setupPresets();
  setupConsole();
  connect();

  setInterval(refreshAssets, 15000);
}

init();
