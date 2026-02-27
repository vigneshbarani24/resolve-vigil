/**
 * TubeForge — main.js
 * WebSocket client + app orchestration (ES module).
 * Adapted from bidi-demo app.js pattern.
 */

import { startAudioPlayer, startAudioRecorder } from "./audio.js";
import {
  updateConnectionStatus,
  createMessageBubble,
  updateMessageBubble,
  createImageBubble,
  addScriptSegment,
  updateProgress,
  showVideoPlayer,
  showDownloadButton,
  showToast,
} from "./ui.js";

// ============================================================
// Constants
// ============================================================
const USER_ID = "demo-user";
const SESSION_ID = crypto.randomUUID?.() ?? `s-${Date.now()}`;
const RECONNECT_DELAY_MS = 5000;

// ============================================================
// State
// ============================================================
let ws = null;
let isConnected = false;
let isAudioActive = false;

// Audio nodes
let playerNode = null;
let playerCtx = null;
let recorderNode = null;
let recorderCtx = null;
let recorderStream = null;

// Current streaming agent bubble (partial text)
let currentAgentBubble = null;
let currentAgentText = "";

// ============================================================
// DOM refs
// ============================================================
const chatMessages = document.getElementById("chat-messages");
const textInput = document.getElementById("text-input");
const sendBtn = document.getElementById("send-btn");
const audioBtn = document.getElementById("audio-btn");
const cameraBtn = document.getElementById("camera-btn");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");

// Camera modal
const cameraModal = document.getElementById("camera-modal");
const cameraPreview = document.getElementById("camera-preview");
const cameraCanvas = document.getElementById("camera-canvas");
const cameraCaptureBtn = document.getElementById("camera-capture-btn");
const cameraModalClose = document.getElementById("camera-modal-close");
const modalBackdrop = cameraModal.querySelector(".modal-backdrop");

// Niche presets
const nicheButtons = document.querySelectorAll(".niche-btn");

// ============================================================
// WebSocket connection
// ============================================================

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${location.host}/ws/${USER_ID}/${SESSION_ID}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    isConnected = true;
    updateConnectionStatus(true);
    showToast("Connected to TubeForge", "success");
  };

  ws.onclose = () => {
    isConnected = false;
    updateConnectionStatus(false);
    finalizeAgentBubble();
    showToast("Disconnected. Reconnecting...", "error");
    setTimeout(connect, RECONNECT_DELAY_MS);
  };

  ws.onerror = (err) => {
    console.error("[WS] error:", err);
  };

  ws.onmessage = (event) => {
    handleServerMessage(event);
  };
}

// ============================================================
// Incoming message handler
// ============================================================

function handleServerMessage(event) {
  // Binary frames are not expected from server; ignore gracefully
  if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
    return;
  }

  let data;
  try {
    data = JSON.parse(event.data);
  } catch {
    console.warn("[WS] Non-JSON text frame:", event.data);
    return;
  }

  // --- Turn complete ---
  if (data.turnComplete) {
    finalizeAgentBubble();
    return;
  }

  // --- Interrupted ---
  if (data.interrupted) {
    finalizeAgentBubble();
    return;
  }

  // --- Input transcription (user's spoken words) ---
  if (data.inputTranscription) {
    const { text, finished } = data.inputTranscription;
    if (text) {
      handleInputTranscription(text, finished);
    }
    return;
  }

  // --- Output transcription (agent's spoken words) ---
  if (data.outputTranscription) {
    const { text, finished } = data.outputTranscription;
    if (text) {
      handleOutputTranscription(text, finished);
    }
    return;
  }

  // --- Content parts ---
  if (data.content && data.content.parts) {
    for (const part of data.content.parts) {
      if (part.inlineData) {
        handleInlineData(part.inlineData);
      } else if (part.text) {
        handleAgentText(part.text);
      }
    }
    return;
  }

  // --- Tool-related events (script segments, progress, video, etc.) ---
  // These may come as custom fields from tool outputs relayed via the agent.
  if (data.scriptSegment) {
    const seg = data.scriptSegment;
    addScriptSegment(seg.index, seg.narration, seg.imageUrl);
  }
  if (data.progress) {
    updateProgress(data.progress.stage, data.progress.percent);
  }
  if (data.videoUrl) {
    showVideoPlayer(data.videoUrl);
    showDownloadButton(data.videoUrl);
  }
}

// ============================================================
// Input transcription handling (user speech)
// ============================================================
let inputTranscriptionBubble = null;

function handleInputTranscription(text, finished) {
  if (!inputTranscriptionBubble) {
    inputTranscriptionBubble = createMessageBubble(text, true, !finished);
    chatMessages.appendChild(inputTranscriptionBubble);
  } else {
    updateMessageBubble(inputTranscriptionBubble, text, !finished);
  }
  scrollChatToBottom();

  if (finished) {
    inputTranscriptionBubble = null;
  }
}

// ============================================================
// Output transcription handling (agent speech text mirror)
// ============================================================

function handleOutputTranscription(text, finished) {
  // Output transcription mirrors what the agent says via audio.
  // We show it as an agent text bubble.
  if (!currentAgentBubble) {
    currentAgentText = text;
    currentAgentBubble = createMessageBubble(text, false, !finished);
    chatMessages.appendChild(currentAgentBubble);
  } else {
    currentAgentText = text;
    updateMessageBubble(currentAgentBubble, text, !finished);
  }
  scrollChatToBottom();

  if (finished) {
    finalizeAgentBubble();
  }
}

// ============================================================
// Agent text content (non-transcription)
// ============================================================

function handleAgentText(text) {
  if (!currentAgentBubble) {
    currentAgentText = text;
    currentAgentBubble = createMessageBubble(text, false, true);
    chatMessages.appendChild(currentAgentBubble);
  } else {
    currentAgentText += text;
    updateMessageBubble(currentAgentBubble, currentAgentText, true);
  }
  scrollChatToBottom();
}

function finalizeAgentBubble() {
  if (currentAgentBubble) {
    updateMessageBubble(currentAgentBubble, currentAgentText, false);
    currentAgentBubble = null;
    currentAgentText = "";
  }
}

// ============================================================
// Inline data (audio, images)
// ============================================================

function handleInlineData(inlineData) {
  const { mimeType, data } = inlineData;

  if (mimeType && mimeType.startsWith("audio/")) {
    // Send to audio player
    playAudioChunk(data, mimeType);
  } else if (mimeType && mimeType.startsWith("image/")) {
    // Show image in chat
    const url = `data:${mimeType};base64,${data}`;
    const bubble = createImageBubble(url, false);
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
  }
}

// ============================================================
// Audio playback
// ============================================================

async function ensurePlayerReady() {
  if (!playerNode) {
    [playerNode, playerCtx] = await startAudioPlayer();
  }
  if (playerCtx.state === "suspended") {
    await playerCtx.resume();
  }
}

async function playAudioChunk(base64Data, mimeType) {
  try {
    await ensurePlayerReady();

    // Decode base64 to raw bytes
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    // If PCM, send Int16 data to player worklet
    if (mimeType.includes("pcm") || mimeType.includes("raw") || mimeType.includes("l16")) {
      const int16 = new Int16Array(bytes.buffer);
      playerNode.port.postMessage(int16);
    } else {
      // For other formats, try decoding via AudioContext
      const audioBuffer = await playerCtx.decodeAudioData(bytes.buffer.slice(0));
      const source = playerCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playerCtx.destination);
      source.start();
    }
  } catch (err) {
    console.warn("[Audio] playback error:", err);
  }
}

// ============================================================
// Send functions
// ============================================================

function sendTextMessage(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showToast("Not connected", "error");
    return;
  }
  if (!text.trim()) return;

  // Show user bubble
  const bubble = createMessageBubble(text, true, false);
  chatMessages.appendChild(bubble);
  scrollChatToBottom();

  // Send to server
  ws.send(JSON.stringify({ type: "text", text }));
}

function sendImageMessage(base64Data, mimeType = "image/jpeg") {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showToast("Not connected", "error");
    return;
  }

  // Show image bubble locally
  const url = `data:${mimeType};base64,${base64Data}`;
  const bubble = createImageBubble(url, true);
  chatMessages.appendChild(bubble);
  scrollChatToBottom();

  // Send to server
  ws.send(JSON.stringify({ type: "image", data: base64Data, mimeType }));
}

// ============================================================
// Audio recording (mic toggle)
// ============================================================

async function toggleAudio() {
  if (isAudioActive) {
    stopAudio();
  } else {
    await startAudio();
  }
}

async function startAudio() {
  try {
    // Ensure player is ready (for playback of agent audio)
    await ensurePlayerReady();

    // Start recorder
    const onAudioData = (float32Data) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // Convert Float32 to Int16 PCM
      const int16 = float32ToInt16(float32Data);
      ws.send(int16.buffer);
    };

    [recorderNode, recorderCtx, recorderStream] = await startAudioRecorder(onAudioData);
    isAudioActive = true;
    audioBtn.classList.add("active");
    showToast("Microphone active", "success");
  } catch (err) {
    console.error("[Audio] mic error:", err);
    showToast("Microphone access denied", "error");
  }
}

function stopAudio() {
  if (recorderStream) {
    recorderStream.getTracks().forEach((t) => t.stop());
    recorderStream = null;
  }
  if (recorderCtx) {
    recorderCtx.close().catch(() => {});
    recorderCtx = null;
  }
  recorderNode = null;
  isAudioActive = false;
  audioBtn.classList.remove("active");
  showToast("Microphone stopped");
}

/** Convert Float32Array [-1,1] to Int16Array */
function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

// ============================================================
// Camera capture
// ============================================================
let cameraStream = null;

async function openCameraModal() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    cameraPreview.srcObject = cameraStream;
    cameraModal.classList.remove("hidden");
  } catch (err) {
    console.error("[Camera] error:", err);
    showToast("Camera access denied", "error");
  }
}

function closeCameraModal() {
  cameraModal.classList.add("hidden");
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  cameraPreview.srcObject = null;
}

function captureFromCamera() {
  const video = cameraPreview;
  const canvas = cameraCanvas;
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1];

  sendImageMessage(base64, "image/jpeg");
  closeCameraModal();
  showToast("Photo captured and sent");
}

// ============================================================
// File upload
// ============================================================

function handleFileUpload(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please upload an image file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(",")[1];
    const mimeType = file.type || "image/jpeg";
    sendImageMessage(base64, mimeType);
    showToast(`Uploaded: ${file.name}`);
  };
  reader.onerror = () => {
    showToast("Failed to read file", "error");
  };
  reader.readAsDataURL(file);
}

// ============================================================
// Niche presets
// ============================================================

function selectNiche(niche) {
  // Toggle active class
  nicheButtons.forEach((btn) => btn.classList.remove("active"));
  const target = document.querySelector(`.niche-btn[data-niche="${niche}"]`);
  if (target) target.classList.add("active");

  // Send niche selection as text
  sendTextMessage(`I want to create a ${niche} style video.`);
}

// ============================================================
// Helpers
// ============================================================

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ============================================================
// Event listeners
// ============================================================

// Send text
sendBtn.addEventListener("click", () => {
  sendTextMessage(textInput.value);
  textInput.value = "";
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage(textInput.value);
    textInput.value = "";
  }
});

// Audio toggle
audioBtn.addEventListener("click", () => toggleAudio());

// Camera
cameraBtn.addEventListener("click", () => openCameraModal());
cameraCaptureBtn.addEventListener("click", () => captureFromCamera());
cameraModalClose.addEventListener("click", () => closeCameraModal());
modalBackdrop.addEventListener("click", () => closeCameraModal());

// File upload
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFileUpload(fileInput.files[0]);
    fileInput.value = ""; // Reset so same file can be re-uploaded
  }
});

// Niche presets
nicheButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectNiche(btn.dataset.niche);
  });
});

// ============================================================
// Initialize
// ============================================================
connect();
