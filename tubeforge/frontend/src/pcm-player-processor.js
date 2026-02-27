/**
 * TubeForge — pcm-player-processor.js
 * AudioWorklet processor for PCM playback.
 * Adapted from bidi-demo.
 *
 * NOTE: This file is NOT an ES module. It runs inside an AudioWorklet scope.
 *
 * Protocol:
 *   - Main thread sends Int16Array chunks via port.postMessage(int16Array).
 *   - Main thread can send { command: "endOfAudio" } to clear the buffer.
 *   - The processor reads from a ring buffer and outputs Float32 audio
 *     at the AudioContext's sample rate (24kHz expected).
 */

class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Ring buffer: 24kHz * 180s = 4,320,000 samples max
    this.bufferSize = 24000 * 180;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.samplesAvailable = 0;

    this.port.onmessage = (event) => {
      const data = event.data;

      // Command messages
      if (data && typeof data === "object" && data.command === "endOfAudio") {
        this.clearBuffer();
        return;
      }

      // Int16Array PCM data
      if (data instanceof Int16Array) {
        this.enqueue(data);
        return;
      }

      // Accept ArrayBuffer as well (in case postMessage transfers)
      if (data instanceof ArrayBuffer) {
        this.enqueue(new Int16Array(data));
        return;
      }
    };
  }

  /**
   * Enqueue Int16 PCM samples into the ring buffer, converting to Float32.
   */
  enqueue(int16Data) {
    for (let i = 0; i < int16Data.length; i++) {
      if (this.samplesAvailable >= this.bufferSize) {
        // Buffer full — drop oldest samples by advancing readIndex
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
        this.samplesAvailable--;
      }
      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      this.buffer[this.writeIndex] = int16Data[i] / 32768.0;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      this.samplesAvailable++;
    }
  }

  /**
   * Clear the ring buffer (used on endOfAudio).
   */
  clearBuffer() {
    this.writeIndex = 0;
    this.readIndex = 0;
    this.samplesAvailable = 0;
  }

  /**
   * Called by the Web Audio rendering thread.
   * Fill the output buffer with samples from the ring buffer.
   */
  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const channel = output[0]; // mono
    for (let i = 0; i < channel.length; i++) {
      if (this.samplesAvailable > 0) {
        channel[i] = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
        this.samplesAvailable--;
      } else {
        channel[i] = 0; // silence when buffer is empty
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
