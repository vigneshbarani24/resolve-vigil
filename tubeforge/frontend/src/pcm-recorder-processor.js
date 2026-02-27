/**
 * TubeForge — pcm-recorder-processor.js
 * AudioWorklet processor for PCM recording from microphone.
 * Adapted from bidi-demo.
 *
 * NOTE: This file is NOT an ES module. It runs inside an AudioWorklet scope.
 *
 * Protocol:
 *   - Captures Float32 audio from the microphone input.
 *   - Posts Float32Array chunks to the main thread via port.postMessage.
 *   - The main thread is responsible for converting Float32 to Int16 PCM
 *     before sending over the WebSocket.
 */

class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = true;

    this.port.onmessage = (event) => {
      if (event.data && event.data.command === "stop") {
        this._active = false;
      }
    };
  }

  /**
   * Called by the Web Audio rendering thread.
   * Capture input audio and post it to the main thread.
   */
  process(inputs) {
    if (!this._active) return false;

    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // mono
    if (channelData && channelData.length > 0) {
      // Copy the data (it is reused by the audio engine after process returns)
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);
      this.port.postMessage(copy);
    }

    return true; // keep processor alive
  }
}

registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
