/**
 * Vigil Voice — Offscreen Document
 *
 * Handles microphone capture and audio playback for voice sessions.
 * Chrome MV3 extensions cannot use getUserMedia in popups or service workers,
 * so we use an offscreen document as the audio bridge.
 */

let ws = null;
let audioCtx = null;
let micStream = null;
let scriptNode = null;
let sourceNode = null;
let playbackCtx = null;
let isActive = false;

// Queued playback to avoid overlapping BufferSource nodes
let playbackQueue = [];
let isPlaying = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return false;

  switch (msg.type) {
    case 'start_voice':
      startVoice(msg.wsUrl, msg.setupMessage).then(sendResponse);
      return true;

    case 'stop_voice':
      stopVoice();
      sendResponse({ success: true });
      return false;

    case 'voice_status':
      sendResponse({ active: isActive });
      return false;
  }
});

async function startVoice(wsUrl, setupMessage) {
  if (isActive) return { success: true, message: 'Already active' };

  try {
    // 1. Get microphone access (works in offscreen documents)
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 2. Open WebSocket
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });

    // 3. Send setup message
    ws.send(JSON.stringify(setupMessage));

    // 4. Handle incoming messages
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary audio — queue for playback
        queueAudioPlayback(event.data);
        return;
      }
      // Forward JSON events to popup via background
      try {
        const data = JSON.parse(event.data);
        chrome.runtime.sendMessage({
          type: 'voice_event',
          source: 'offscreen',
          data,
        });
      } catch {}
    };

    ws.onclose = () => {
      stopVoice();
      chrome.runtime.sendMessage({
        type: 'voice_event',
        source: 'offscreen',
        data: { type: 'voice_closed' },
      });
    };

    // 5. Start audio capture
    audioCtx = new AudioContext({ sampleRate: 16000 });
    sourceNode = audioCtx.createMediaStreamSource(micStream);
    scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);

    scriptNode.onaudioprocess = (e) => {
      if (!isActive || !ws || ws.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);
      // Convert Float32 → Int16 PCM
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      ws.send(int16.buffer);
    };

    sourceNode.connect(scriptNode);
    scriptNode.connect(audioCtx.destination);

    isActive = true;
    return { success: true };

  } catch (err) {
    stopVoice();
    return { success: false, error: err.message };
  }
}

function queueAudioPlayback(arrayBuffer) {
  if (!playbackCtx) {
    playbackCtx = new AudioContext({ sampleRate: 24000 });
  }

  // Convert Int16 PCM → Float32
  const int16 = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 0x7FFF;
  }

  const buffer = playbackCtx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);

  playbackQueue.push(buffer);
  processPlaybackQueue();
}

function processPlaybackQueue() {
  if (isPlaying || playbackQueue.length === 0) return;

  isPlaying = true;
  const buffer = playbackQueue.shift();
  const source = playbackCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackCtx.destination);
  source.onended = () => {
    isPlaying = false;
    processPlaybackQueue();
  };
  source.start();
}

function stopVoice() {
  isActive = false;

  if (scriptNode) { scriptNode.disconnect(); scriptNode = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (ws) { ws.close(); ws = null; }
  if (playbackCtx) { playbackCtx.close().catch(() => {}); playbackCtx = null; }
  playbackQueue = [];
  isPlaying = false;
}
