/**
 * TubeForge app.js — Direct adaptation of bidi-demo app.js
 * Proven working pattern from google/adk-samples
 */

// --- WebSocket ---
const userId = "demo-user";
const sessionId = "demo-session-" + Math.random().toString(36).substring(7);
let websocket = null;
let is_audio = false;

// --- DOM Elements ---
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("message");
const messagesDiv = document.getElementById("messages");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const consoleContent = document.getElementById("consoleContent");
const clearConsoleBtn = document.getElementById("clearConsole");
const showAudioEventsCheckbox = document.getElementById("showAudioEvents");

let currentMessageId = null;
let currentBubbleElement = null;
let currentInputTranscriptionId = null;
let currentInputTranscriptionElement = null;
let currentOutputTranscriptionId = null;
let currentOutputTranscriptionElement = null;
let inputTranscriptionFinished = false;
let hasOutputTranscriptionInTurn = false;

// --- Console logging ---
function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function addConsoleEntry(type, content, data = null, emoji = null, author = null, isAudio = false) {
  if (isAudio && !showAudioEventsCheckbox.checked) return;

  const entry = document.createElement("div");
  entry.className = `console-entry ${type}`;

  const header = document.createElement("div");
  header.className = "console-entry-header";

  const leftSection = document.createElement("div");
  leftSection.className = "console-entry-left";

  if (emoji) {
    const emojiIcon = document.createElement("span");
    emojiIcon.className = "console-entry-emoji";
    emojiIcon.textContent = emoji;
    leftSection.appendChild(emojiIcon);
  }

  const expandIcon = document.createElement("span");
  expandIcon.className = "console-expand-icon";
  expandIcon.textContent = data ? ">" : "";

  const typeLabel = document.createElement("span");
  typeLabel.className = "console-entry-type";
  typeLabel.textContent = type === 'outgoing' ? 'UP' : type === 'incoming' ? 'DOWN' : 'ERR';

  leftSection.appendChild(expandIcon);
  leftSection.appendChild(typeLabel);

  if (author) {
    const authorBadge = document.createElement("span");
    authorBadge.className = "console-entry-author";
    authorBadge.textContent = author;
    authorBadge.setAttribute('data-author', author);
    leftSection.appendChild(authorBadge);
  }

  const timestamp = document.createElement("span");
  timestamp.className = "console-entry-timestamp";
  timestamp.textContent = formatTimestamp();

  header.appendChild(leftSection);
  header.appendChild(timestamp);

  const contentDiv = document.createElement("div");
  contentDiv.className = "console-entry-content";
  contentDiv.textContent = content;

  entry.appendChild(header);
  entry.appendChild(contentDiv);

  if (data) {
    const jsonDiv = document.createElement("div");
    jsonDiv.className = "console-entry-json collapsed";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    jsonDiv.appendChild(pre);
    entry.appendChild(jsonDiv);

    entry.classList.add("expandable");
    entry.addEventListener("click", () => {
      const isExpanded = !jsonDiv.classList.contains("collapsed");
      if (isExpanded) {
        jsonDiv.classList.add("collapsed");
        expandIcon.textContent = ">";
        entry.classList.remove("expanded");
      } else {
        jsonDiv.classList.remove("collapsed");
        expandIcon.textContent = "v";
        entry.classList.add("expanded");
      }
    });
  }

  consoleContent.appendChild(entry);
  consoleContent.scrollTop = consoleContent.scrollHeight;
}

clearConsoleBtn.addEventListener('click', () => { consoleContent.innerHTML = ''; });

// --- Connection status ---
function updateConnectionStatus(connected) {
  if (connected) {
    statusIndicator.classList.remove("disconnected");
    statusText.textContent = "Connected";
  } else {
    statusIndicator.classList.add("disconnected");
    statusText.textContent = "Disconnected";
  }
}

// --- Message bubbles ---
function createMessageBubble(text, isUser, isPartial = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "agent"}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";

  const textP = document.createElement("p");
  textP.className = "bubble-text";
  textP.textContent = text;

  if (isPartial && !isUser) {
    const typingSpan = document.createElement("span");
    typingSpan.className = "typing-indicator";
    textP.appendChild(typingSpan);
  }

  bubbleDiv.appendChild(textP);
  messageDiv.appendChild(bubbleDiv);
  return messageDiv;
}

function createImageBubble(imageDataUrl, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "agent"}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble image-bubble";

  const img = document.createElement("img");
  img.src = imageDataUrl;
  img.className = "bubble-image";
  img.alt = "Captured image";

  bubbleDiv.appendChild(img);
  messageDiv.appendChild(bubbleDiv);
  return messageDiv;
}

function updateMessageBubble(element, text, isPartial = false) {
  const textElement = element.querySelector(".bubble-text");
  const existingIndicator = textElement.querySelector(".typing-indicator");
  if (existingIndicator) existingIndicator.remove();

  textElement.textContent = text;

  if (isPartial) {
    const typingSpan = document.createElement("span");
    typingSpan.className = "typing-indicator";
    textElement.appendChild(typingSpan);
  }
}

function addSystemMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "system-message";
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  scrollToBottom();
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Sanitize event data for console ---
function sanitizeEventForDisplay(event) {
  const sanitized = JSON.parse(JSON.stringify(event));
  if (sanitized.content && sanitized.content.parts) {
    sanitized.content.parts = sanitized.content.parts.map(part => {
      if (part.inlineData && part.inlineData.data) {
        const byteSize = Math.floor(part.inlineData.data.length * 0.75);
        return { ...part, inlineData: { ...part.inlineData, data: `(${byteSize.toLocaleString()} bytes)` } };
      }
      return part;
    });
  }
  return sanitized;
}

// --- WebSocket ---
function connectWebsocket() {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws_url = wsProtocol + "//" + window.location.host + "/ws/" + userId + "/" + sessionId;
  websocket = new WebSocket(ws_url);

  websocket.onopen = function () {
    console.log("WebSocket connection opened.");
    updateConnectionStatus(true);
    addSystemMessage("Connected to Forge — your AI Creative Director");
    addConsoleEntry('incoming', 'WebSocket Connected', { userId, sessionId, url: ws_url }, '=', 'system');
    document.getElementById("sendButton").disabled = false;
    addSubmitHandler();
  };

  websocket.onmessage = function (event) {
    const adkEvent = JSON.parse(event.data);
    console.log("[AGENT TO CLIENT] ", adkEvent);

    let eventSummary = 'Event';
    let eventEmoji = '<';
    const author = adkEvent.author || 'system';

    if (adkEvent.turnComplete) {
      eventSummary = 'Turn Complete';
      eventEmoji = '*';
    } else if (adkEvent.interrupted) {
      eventSummary = 'Interrupted';
      eventEmoji = '!';
    } else if (adkEvent.inputTranscription) {
      const t = adkEvent.inputTranscription.text || '';
      eventSummary = `Input: "${t.length > 60 ? t.substring(0, 60) + '...' : t}"`;
      eventEmoji = '>';
    } else if (adkEvent.outputTranscription) {
      const t = adkEvent.outputTranscription.text || '';
      eventSummary = `Output: "${t.length > 60 ? t.substring(0, 60) + '...' : t}"`;
      eventEmoji = '<';
    } else if (adkEvent.content && adkEvent.content.parts) {
      const hasText = adkEvent.content.parts.some(p => p.text);
      const hasAudio = adkEvent.content.parts.some(p => p.inlineData);

      if (hasText) {
        const textPart = adkEvent.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
          const t = textPart.text;
          eventSummary = `Text: "${t.length > 80 ? t.substring(0, 80) + '...' : t}"`;
          eventEmoji = '#';
        }
      }

      if (hasAudio) {
        const audioPart = adkEvent.content.parts.find(p => p.inlineData);
        if (audioPart && audioPart.inlineData) {
          const dataLength = audioPart.inlineData.data ? audioPart.inlineData.data.length : 0;
          const byteSize = Math.floor(dataLength * 0.75);
          eventSummary = `Audio: ${byteSize.toLocaleString()} bytes`;
          eventEmoji = '~';
        }
        const sanitizedEvent = sanitizeEventForDisplay(adkEvent);
        addConsoleEntry('incoming', eventSummary, sanitizedEvent, eventEmoji, author, true);
      }
    }

    // Log non-audio-only events
    const isAudioOnlyEvent = adkEvent.content && adkEvent.content.parts &&
      adkEvent.content.parts.some(p => p.inlineData) &&
      !adkEvent.content.parts.some(p => p.text);
    if (!isAudioOnlyEvent) {
      const sanitizedEvent = sanitizeEventForDisplay(adkEvent);
      addConsoleEntry('incoming', eventSummary, sanitizedEvent, eventEmoji, author);
    }

    // Handle turn complete
    if (adkEvent.turnComplete === true) {
      if (currentBubbleElement) {
        const el = currentBubbleElement.querySelector(".bubble-text");
        const ti = el.querySelector(".typing-indicator");
        if (ti) ti.remove();
      }
      if (currentOutputTranscriptionElement) {
        const el = currentOutputTranscriptionElement.querySelector(".bubble-text");
        const ti = el.querySelector(".typing-indicator");
        if (ti) ti.remove();
      }
      currentMessageId = null;
      currentBubbleElement = null;
      currentOutputTranscriptionId = null;
      currentOutputTranscriptionElement = null;
      inputTranscriptionFinished = false;
      hasOutputTranscriptionInTurn = false;
      return;
    }

    // Handle interrupted
    if (adkEvent.interrupted === true) {
      if (audioPlayerNode) {
        audioPlayerNode.port.postMessage({ command: "endOfAudio" });
      }
      if (currentBubbleElement) {
        const el = currentBubbleElement.querySelector(".bubble-text");
        const ti = el.querySelector(".typing-indicator");
        if (ti) ti.remove();
        currentBubbleElement.classList.add("interrupted");
      }
      if (currentOutputTranscriptionElement) {
        const el = currentOutputTranscriptionElement.querySelector(".bubble-text");
        const ti = el.querySelector(".typing-indicator");
        if (ti) ti.remove();
        currentOutputTranscriptionElement.classList.add("interrupted");
      }
      currentMessageId = null;
      currentBubbleElement = null;
      currentOutputTranscriptionId = null;
      currentOutputTranscriptionElement = null;
      inputTranscriptionFinished = false;
      hasOutputTranscriptionInTurn = false;
      return;
    }

    // Handle input transcription
    if (adkEvent.inputTranscription && adkEvent.inputTranscription.text) {
      const transcriptionText = adkEvent.inputTranscription.text;
      const isFinished = adkEvent.inputTranscription.finished;

      if (transcriptionText) {
        if (inputTranscriptionFinished) return;

        if (currentInputTranscriptionId == null) {
          currentInputTranscriptionId = Math.random().toString(36).substring(7);
          currentInputTranscriptionElement = createMessageBubble(transcriptionText, true, !isFinished);
          currentInputTranscriptionElement.id = currentInputTranscriptionId;
          currentInputTranscriptionElement.classList.add("transcription");
          messagesDiv.appendChild(currentInputTranscriptionElement);
        } else {
          if (currentOutputTranscriptionId == null && currentMessageId == null) {
            if (isFinished) {
              updateMessageBubble(currentInputTranscriptionElement, transcriptionText, false);
            } else {
              const existingText = currentInputTranscriptionElement.querySelector(".bubble-text").textContent;
              updateMessageBubble(currentInputTranscriptionElement, existingText + transcriptionText, true);
            }
          }
        }

        if (isFinished) {
          currentInputTranscriptionId = null;
          currentInputTranscriptionElement = null;
          inputTranscriptionFinished = true;
        }
        scrollToBottom();
      }
    }

    // Handle output transcription
    if (adkEvent.outputTranscription && adkEvent.outputTranscription.text) {
      const transcriptionText = adkEvent.outputTranscription.text;
      const isFinished = adkEvent.outputTranscription.finished;
      hasOutputTranscriptionInTurn = true;

      if (transcriptionText) {
        if (currentInputTranscriptionId != null && currentOutputTranscriptionId == null) {
          const el = currentInputTranscriptionElement.querySelector(".bubble-text");
          const ti = el.querySelector(".typing-indicator");
          if (ti) ti.remove();
          currentInputTranscriptionId = null;
          currentInputTranscriptionElement = null;
          inputTranscriptionFinished = true;
        }

        if (currentOutputTranscriptionId == null) {
          currentOutputTranscriptionId = Math.random().toString(36).substring(7);
          currentOutputTranscriptionElement = createMessageBubble(transcriptionText, false, !isFinished);
          currentOutputTranscriptionElement.id = currentOutputTranscriptionId;
          currentOutputTranscriptionElement.classList.add("transcription");
          messagesDiv.appendChild(currentOutputTranscriptionElement);
        } else {
          if (isFinished) {
            updateMessageBubble(currentOutputTranscriptionElement, transcriptionText, false);
          } else {
            const existingText = currentOutputTranscriptionElement.querySelector(".bubble-text").textContent;
            updateMessageBubble(currentOutputTranscriptionElement, existingText + transcriptionText, true);
          }
        }

        if (isFinished) {
          currentOutputTranscriptionId = null;
          currentOutputTranscriptionElement = null;
        }
        scrollToBottom();
      }
    }

    // Handle content events (text or audio)
    if (adkEvent.content && adkEvent.content.parts) {
      const parts = adkEvent.content.parts;

      if (currentInputTranscriptionId != null && currentMessageId == null && currentOutputTranscriptionId == null) {
        const el = currentInputTranscriptionElement.querySelector(".bubble-text");
        const ti = el.querySelector(".typing-indicator");
        if (ti) ti.remove();
        currentInputTranscriptionId = null;
        currentInputTranscriptionElement = null;
        inputTranscriptionFinished = true;
      }

      for (const part of parts) {
        // Audio
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType;
          const data = part.inlineData.data;
          if (mimeType && mimeType.startsWith("audio/pcm") && audioPlayerNode) {
            audioPlayerNode.port.postMessage(base64ToArray(data));
          }
        }

        // Text
        if (part.text) {
          if (part.thought) continue;
          if (!adkEvent.partial && hasOutputTranscriptionInTurn) continue;

          if (currentMessageId == null) {
            currentMessageId = Math.random().toString(36).substring(7);
            currentBubbleElement = createMessageBubble(part.text, false, true);
            currentBubbleElement.id = currentMessageId;
            messagesDiv.appendChild(currentBubbleElement);
          } else {
            const existingText = currentBubbleElement.querySelector(".bubble-text").textContent;
            updateMessageBubble(currentBubbleElement, existingText + part.text, true);
          }
          scrollToBottom();
        }
      }
    }
  };

  websocket.onclose = function () {
    console.log("WebSocket connection closed.");
    updateConnectionStatus(false);
    document.getElementById("sendButton").disabled = true;
    addSystemMessage("Connection closed. Reconnecting in 5 seconds...");
    addConsoleEntry('error', 'WebSocket Disconnected', { status: 'closed', reconnecting: true }, '!', 'system');
    setTimeout(() => {
      addConsoleEntry('outgoing', 'Reconnecting...', { userId, sessionId }, '~', 'system');
      connectWebsocket();
    }, 5000);
  };

  websocket.onerror = function (e) {
    console.log("WebSocket error: ", e);
    updateConnectionStatus(false);
    addConsoleEntry('error', 'WebSocket Error', { error: e.type }, '!', 'system');
  };
}
connectWebsocket();

// --- Form submit ---
function addSubmitHandler() {
  messageForm.onsubmit = function (e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      const userBubble = createMessageBubble(message, true, false);
      messagesDiv.appendChild(userBubble);
      scrollToBottom();
      messageInput.value = "";
      sendMessage(message);
    }
    return false;
  };
}

function sendMessage(message) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type: "text", text: message }));
    addConsoleEntry('outgoing', 'User: ' + message, null, '>', 'user');
  }
}

// --- Base64 decode ---
function base64ToArray(base64) {
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (standardBase64.length % 4) standardBase64 += '=';
  const binaryString = window.atob(standardBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

// --- Camera ---
const cameraButton = document.getElementById("cameraButton");
const cameraModal = document.getElementById("cameraModal");
const cameraPreview = document.getElementById("cameraPreview");
const closeCameraModal = document.getElementById("closeCameraModal");
const cancelCamera = document.getElementById("cancelCamera");
const captureImageBtn = document.getElementById("captureImage");
let cameraStream = null;

async function openCameraPreview() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 768 }, height: { ideal: 768 }, facingMode: 'user' }
    });
    cameraPreview.srcObject = cameraStream;
    cameraModal.classList.add('show');
  } catch (error) {
    addSystemMessage(`Camera error: ${error.message}`);
    addConsoleEntry('error', 'Camera failed', { error: error.message }, '!', 'system');
  }
}

function closeCameraPreview() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraPreview.srcObject = null;
  cameraModal.classList.remove('show');
}

function captureImageFromPreview() {
  if (!cameraStream) { addSystemMessage('No camera stream'); return; }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    canvas.getContext('2d').drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const imageBubble = createImageBubble(imageDataUrl, true);
    messagesDiv.appendChild(imageBubble);
    scrollToBottom();

    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        sendImage(base64data);
      };
      reader.readAsDataURL(blob);
      addConsoleEntry('outgoing', `Image: ${blob.size} bytes`, { size: blob.size, type: 'image/jpeg' }, '>', 'user');
    }, 'image/jpeg', 0.85);

    closeCameraPreview();
  } catch (error) {
    addSystemMessage(`Capture error: ${error.message}`);
  }
}

function sendImage(base64Image) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ type: "image", data: base64Image, mimeType: "image/jpeg" }));
  }
}

cameraButton.addEventListener("click", openCameraPreview);
closeCameraModal.addEventListener("click", closeCameraPreview);
cancelCamera.addEventListener("click", closeCameraPreview);
captureImageBtn.addEventListener("click", captureImageFromPreview);
cameraModal.addEventListener("click", (event) => {
  if (event.target === cameraModal) closeCameraPreview();
});

// --- Audio ---
let audioPlayerNode;
let audioPlayerContext;
let audioRecorderNode;
let audioRecorderContext;
let micStream;

import { startAudioPlayerWorklet } from "./audio-player.js";
import { startAudioRecorderWorklet } from "./audio-recorder.js";

function startAudio() {
  startAudioPlayerWorklet().then(([node, ctx]) => {
    audioPlayerNode = node;
    audioPlayerContext = ctx;
  });
  startAudioRecorderWorklet(audioRecorderHandler).then(([node, ctx, stream]) => {
    audioRecorderNode = node;
    audioRecorderContext = ctx;
    micStream = stream;
  });
}

const startAudioButton = document.getElementById("startAudioButton");
startAudioButton.addEventListener("click", () => {
  startAudioButton.disabled = true;
  startAudio();
  is_audio = true;
  addSystemMessage("Audio mode enabled — speak to Forge");
  addConsoleEntry('outgoing', 'Audio enabled', { status: 'active' }, '~', 'system');
});

function audioRecorderHandler(pcmData) {
  if (websocket && websocket.readyState === WebSocket.OPEN && is_audio) {
    websocket.send(pcmData);
  }
}
