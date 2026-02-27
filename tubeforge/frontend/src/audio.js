/**
 * TubeForge — audio.js
 * Audio worklet management for PCM playback and recording (ES module).
 * Adapted from bidi-demo audio handling.
 */

/**
 * Start the PCM audio player.
 * Creates an AudioContext at 24kHz and loads the pcm-player-processor worklet.
 *
 * @returns {Promise<[AudioWorkletNode, AudioContext]>}
 */
export async function startAudioPlayer() {
  const ctx = new AudioContext({ sampleRate: 24000 });

  await ctx.audioWorklet.addModule("/static/src/pcm-player-processor.js");

  const playerNode = new AudioWorkletNode(ctx, "pcm-player-processor");
  playerNode.connect(ctx.destination);

  return [playerNode, ctx];
}

/**
 * Start the PCM audio recorder.
 * Creates an AudioContext at 16kHz, captures mic input, and sends
 * Float32 audio data to the provided handler callback.
 *
 * @param {(float32Data: Float32Array) => void} handler
 *   Called each time a chunk of Float32 audio is available from the mic.
 * @returns {Promise<[AudioWorkletNode, AudioContext, MediaStream]>}
 */
export async function startAudioRecorder(handler) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const ctx = new AudioContext({ sampleRate: 16000 });

  await ctx.audioWorklet.addModule("/static/src/pcm-recorder-processor.js");

  const source = ctx.createMediaStreamSource(stream);
  const recorderNode = new AudioWorkletNode(ctx, "pcm-recorder-processor");

  // Forward audio data from the worklet to the handler
  recorderNode.port.onmessage = (event) => {
    if (event.data && event.data instanceof Float32Array) {
      handler(event.data);
    }
  };

  source.connect(recorderNode);
  // The recorder node does not produce output — do not connect to destination
  // to avoid feedback. Instead it only posts data via the port.

  return [recorderNode, ctx, stream];
}
