/**
 * TubeForge — ui.js
 * UI utility functions (ES module).
 */

// ============================================================
// DOM references
// ============================================================
const connectionStatus = document.getElementById("connection-status");
const statusText = connectionStatus.querySelector(".status-text");
const chatMessages = document.getElementById("chat-messages");
const scriptSegments = document.getElementById("script-segments");
const progressSection = document.getElementById("progress-section");
const progressStage = document.getElementById("progress-stage");
const progressPercent = document.getElementById("progress-percent");
const progressBar = document.getElementById("progress-bar");
const videoPlayerSection = document.getElementById("video-player-section");
const videoPlayer = document.getElementById("video-player");
const downloadBtn = document.getElementById("download-btn");
const toastContainer = document.getElementById("toast-container");

// Track whether empty state has been cleared
let emptyStateCleared = false;

// ============================================================
// Connection status
// ============================================================

/**
 * Update the connection status indicator.
 * @param {boolean} connected
 */
export function updateConnectionStatus(connected) {
  connectionStatus.classList.remove("connected", "disconnected", "processing");
  if (connected) {
    connectionStatus.classList.add("connected");
    statusText.textContent = "Connected";
  } else {
    connectionStatus.classList.add("disconnected");
    statusText.textContent = "Disconnected";
  }
}

/**
 * Set status to "processing" (yellow pulsing dot).
 */
export function setProcessingStatus() {
  connectionStatus.classList.remove("connected", "disconnected", "processing");
  connectionStatus.classList.add("processing");
  statusText.textContent = "Processing...";
}

// ============================================================
// Chat bubbles
// ============================================================

/**
 * Create a message bubble and return the DOM element.
 * @param {string} text       Message text content
 * @param {boolean} isUser    True for user, false for agent
 * @param {boolean} isPartial True if still streaming
 * @returns {HTMLElement}
 */
export function createMessageBubble(text, isUser, isPartial = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-bubble ${isUser ? "user" : "agent"} ${isPartial ? "partial" : ""}`;

  // Sender label
  const sender = document.createElement("div");
  sender.className = "bubble-sender";
  sender.textContent = isUser ? "You" : "Forge";
  wrapper.appendChild(sender);

  // Text content
  const content = document.createElement("div");
  content.className = "bubble-text";
  content.textContent = text;
  wrapper.appendChild(content);

  return wrapper;
}

/**
 * Update an existing message bubble with new text.
 * @param {HTMLElement} element   The bubble element
 * @param {string} text           New text content
 * @param {boolean} isPartial     True if still streaming
 */
export function updateMessageBubble(element, text, isPartial = false) {
  const content = element.querySelector(".bubble-text");
  if (content) {
    content.textContent = text;
  }
  if (isPartial) {
    element.classList.add("partial");
  } else {
    element.classList.remove("partial");
  }
}

/**
 * Create an image bubble and return the DOM element.
 * @param {string} imageUrl    Data URL or HTTP URL for the image
 * @param {boolean} isUser     True for user, false for agent
 * @returns {HTMLElement}
 */
export function createImageBubble(imageUrl, isUser) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-bubble ${isUser ? "user" : "agent"}`;

  // Sender label
  const sender = document.createElement("div");
  sender.className = "bubble-sender";
  sender.textContent = isUser ? "You" : "Forge";
  wrapper.appendChild(sender);

  // Image
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = isUser ? "Uploaded image" : "Generated image";
  img.loading = "lazy";
  wrapper.appendChild(img);

  return wrapper;
}

// ============================================================
// Preview panel: script segments
// ============================================================

/**
 * Remove the empty-state placeholder if it still exists.
 */
function clearEmptyState() {
  if (emptyStateCleared) return;
  const empty = scriptSegments.querySelector(".empty-state");
  if (empty) {
    empty.remove();
  }
  emptyStateCleared = true;
}

/**
 * Add a script segment card to the preview panel.
 * @param {number} index       Segment number (1-based)
 * @param {string} narration   Narration text for this segment
 * @param {string|null} imageUrl  Optional scene image URL
 */
export function addScriptSegment(index, narration, imageUrl = null) {
  clearEmptyState();

  const card = document.createElement("div");
  card.className = "script-segment";
  card.dataset.segmentIndex = index;

  // Header
  const header = document.createElement("div");
  header.className = "segment-header";

  const num = document.createElement("span");
  num.className = "segment-number";
  num.textContent = index;
  header.appendChild(num);

  const label = document.createElement("span");
  label.className = "segment-label";
  label.textContent = `Scene ${index}`;
  header.appendChild(label);

  card.appendChild(header);

  // Narration
  if (narration) {
    const narrationEl = document.createElement("p");
    narrationEl.className = "segment-narration";
    narrationEl.textContent = narration;
    card.appendChild(narrationEl);
  }

  // Image
  if (imageUrl) {
    const img = document.createElement("img");
    img.className = "segment-image";
    img.src = imageUrl;
    img.alt = `Scene ${index}`;
    img.loading = "lazy";
    card.appendChild(img);
  }

  scriptSegments.appendChild(card);
  scriptSegments.scrollTop = scriptSegments.scrollHeight;
}

// ============================================================
// Preview panel: progress bar
// ============================================================

/**
 * Update the progress bar.
 * @param {string} stage   Human-readable stage name (e.g., "Generating script...")
 * @param {number} percent Progress percentage (0-100)
 */
export function updateProgress(stage, percent) {
  progressSection.classList.remove("hidden");

  progressStage.textContent = stage;
  progressPercent.textContent = `${Math.round(percent)}%`;
  progressBar.style.width = `${percent}%`;

  // Hide when complete
  if (percent >= 100) {
    setTimeout(() => {
      progressSection.classList.add("hidden");
    }, 2000);
  }
}

// ============================================================
// Preview panel: video player
// ============================================================

/**
 * Show the video player with the given video URL.
 * @param {string} videoUrl  URL to the video file
 */
export function showVideoPlayer(videoUrl) {
  videoPlayer.src = videoUrl;
  videoPlayerSection.classList.remove("hidden");
  videoPlayer.load();
}

/**
 * Show the download button for the final video.
 * @param {string} videoUrl  URL to the video file
 */
export function showDownloadButton(videoUrl) {
  downloadBtn.href = videoUrl;
  downloadBtn.download = "tubeforge-video.mp4";
  downloadBtn.classList.remove("hidden");
}

// ============================================================
// Toast notifications
// ============================================================

/**
 * Show a toast notification.
 * @param {string} message    Toast message text
 * @param {"info"|"success"|"error"} type  Toast type (default: "info")
 * @param {number} duration   Duration in ms before auto-remove (default: 4000)
 */
export function showToast(message, type = "info", duration = 4000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, duration);
}
