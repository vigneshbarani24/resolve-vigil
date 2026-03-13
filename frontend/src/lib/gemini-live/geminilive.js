/**
 * Gemini Live API Utilities
 * Based on Immergo's multimodalLiveApi - converted to JavaScript
 */

// Response type constants
export const MultimodalLiveResponseType = {
  TEXT: "TEXT",
  AUDIO: "AUDIO",
  SETUP_COMPLETE: "SETUP COMPLETE",
  INTERRUPTED: "INTERRUPTED",
  TURN_COMPLETE: "TURN COMPLETE",
  TOOL_CALL: "TOOL_CALL",
  SERVER_TOOL_CALL: "SERVER_TOOL_CALL",
  ERROR: "ERROR",
  INPUT_TRANSCRIPTION: "INPUT_TRANSCRIPTION",
  OUTPUT_TRANSCRIPTION: "OUTPUT_TRANSCRIPTION",
};

/**
 * Parses response messages from the Gemini Live API
 */
export class MultimodalLiveResponseMessage {
  constructor(data) {
    this.data = "";
    this.type = "";
    this.endOfTurn = false;

    this.endOfTurn = data?.serverContent?.turnComplete;

    const parts = data?.serverContent?.modelTurn?.parts;

    try {
      if (data?.setupComplete) {
        this.type = MultimodalLiveResponseType.SETUP_COMPLETE;
      } else if (data?.serverContent?.turnComplete) {
        this.type = MultimodalLiveResponseType.TURN_COMPLETE;
      } else if (data?.serverContent?.interrupted) {
        this.type = MultimodalLiveResponseType.INTERRUPTED;
      } else if (data?.serverContent?.inputTranscription) {
        this.type = MultimodalLiveResponseType.INPUT_TRANSCRIPTION;
        this.data = {
          text: data.serverContent.inputTranscription.text || "",
          finished: data.serverContent.inputTranscription.finished || false,
        };
      } else if (data?.serverContent?.outputTranscription) {
        this.type = MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION;
        this.data = {
          text: data.serverContent.outputTranscription.text || "",
          finished: data.serverContent.outputTranscription.finished || false,
        };
      } else if (data?.toolCall) {
        this.type = MultimodalLiveResponseType.TOOL_CALL;
        this.data = data?.toolCall;
      } else if (data?.type === "tool_call") {
        // Server-side backend tool call event
        this.type = MultimodalLiveResponseType.SERVER_TOOL_CALL;
        this.data = { name: data.name, args: data.args, result: data.result };
      } else if (data?.type === "interrupted") {
        this.type = MultimodalLiveResponseType.INTERRUPTED;
      } else if (data?.type === "session_state") {
        this.type = "SESSION_STATE";
        this.data = data.data;
      } else if (data?.type === "error") {
        this.type = MultimodalLiveResponseType.ERROR;
        this.data = data.error;
      } else if (parts?.length && parts[0].text) {
        this.data = parts[0].text;
        this.type = MultimodalLiveResponseType.TEXT;
      } else if (parts?.length && parts[0].inlineData) {
        this.data = parts[0].inlineData.data;
        this.type = MultimodalLiveResponseType.AUDIO;
      }
    } catch {
    }
  }
}

/**
 * Function call definition for tool use
 */
export class FunctionCallDefinition {
  constructor(name, description, parameters, requiredParameters) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.requiredParameters = requiredParameters;
  }

  functionToCall(parameters) {
  }

  getDefinition() {
    const definition = {
      name: this.name,
      description: this.description,
      parameters: { required: this.requiredParameters, ...this.parameters },
    };
    return definition;
  }

  runFunction(parameters) {
    this.functionToCall(parameters);
  }
}

/**
 * Main Gemini Live API client
 */
export class GeminiLiveAPI {
  constructor() {
    this.responseModalities = ["AUDIO"];
    this.systemInstructions = "";
    this.googleGrounding = false;
    this.enableAffectiveDialog = false;
    this.voiceName = "Puck";
    this.temperature = 0.7;
    this.proactivity = { proactiveAudio: false };
    this.inputAudioTranscription = false;
    this.outputAudioTranscription = false;
    this.enableFunctionCalls = false;
    this.functions = [];
    this.functionsMap = {};
    this.previousImage = null;
    this.totalBytesSent = 0;

    // Automatic activity detection settings — tuned to prevent multi-response
    this.automaticActivityDetection = {
      disabled: false,
      silence_duration_ms: 2000,
      prefix_padding_ms: 500,
      end_of_speech_sensitivity: "END_SENSITIVITY_LOW",
      start_of_speech_sensitivity: "START_SENSITIVITY_LOW",
    };

    this.connected = false;
    this.webSocket = null;
    this.lastSetupMessage = null;

    // Default callbacks
    this.onReceiveResponse = (message) => {
    };

    this.onConnectionStarted = () => {
    };

    this.onErrorMessage = (message) => {
      console.error("[GeminiLiveAPI] Error:", message);
      this.connected = false;
    };

    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};

  }

  setSystemInstructions(newSystemInstructions) {
    this.systemInstructions = newSystemInstructions;
  }

  setGoogleGrounding(newGoogleGrounding) {
    this.googleGrounding = newGoogleGrounding;
  }

  setResponseModalities(modalities) {
    this.responseModalities = modalities;
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
  }

  setProactivity(proactivity) {
    this.proactivity = proactivity;
  }

  setInputAudioTranscription(enabled) {
    this.inputAudioTranscription = enabled;
  }

  setOutputAudioTranscription(enabled) {
    this.outputAudioTranscription = enabled;
  }

  setEnableFunctionCalls(enabled) {
    this.enableFunctionCalls = enabled;
  }

  addFunction(newFunction) {
    this.functions.push(newFunction);
    this.functionsMap[newFunction.name] = newFunction;
  }

  callFunction(functionName, parameters) {
    const functionToCall = this.functionsMap[functionName];
    functionToCall.runFunction(parameters);
  }

  async connect(token, language = "English") {
    try {
      // 1. Authenticate
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptcha_token: token, language: language }),
      });

      if (!response.ok) {
        const error = new Error("Authentication failed");
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      const sessionToken = data.session_token;
      this.sessionToken = sessionToken;  // Store for post-session summary

      // 2. Connect WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${sessionToken}`;

      this.setupWebSocketToService(wsUrl);
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }

  disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.connected = false;
    }
  }

  sendMessage(message) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  onReceiveMessage(messageEvent) {

    // Handle binary audio data
    if (messageEvent.data instanceof ArrayBuffer) {
      const message = new MultimodalLiveResponseMessage({
        serverContent: {
          modelTurn: {
            parts: [{ inlineData: { data: messageEvent.data } }],
          },
        },
      });
      message.type = MultimodalLiveResponseType.AUDIO;
      message.data = messageEvent.data;
      this.onReceiveResponse(message);
      return;
    }

    const messageData = JSON.parse(messageEvent.data);
    const message = new MultimodalLiveResponseMessage(messageData);
    this.onReceiveResponse(message);
  }

  setupWebSocketToService(url) {

    this.webSocket = new WebSocket(url);
    this.webSocket.binaryType = "arraybuffer";

    this.webSocket.onclose = (event) => {
      this.connected = false;
      if (this.onClose) this.onClose(event);
    };

    this.webSocket.onerror = (event) => {
      this.connected = false;
      if (this.onError) this.onError(event);
    };

    this.webSocket.onopen = (event) => {
      this.connected = true;
      this.totalBytesSent = 0;
      this.sendInitialSetupMessages();
      this.onConnectionStarted();
      if (this.onOpen) this.onOpen(event);
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  getFunctionDefinitions() {
    const tools = [];

    for (let index = 0; index < this.functions.length; index++) {
      const func = this.functions[index];
      tools.push(func.getDefinition());
    }
    return tools;
  }

  sendInitialSetupMessages() {
    const tools = this.getFunctionDefinitions();

    const sessionSetupMessage = {
      setup: {
        generation_config: {
          response_modalities: this.responseModalities,
          temperature: this.temperature,
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.voiceName,
              },
            },
          },
        },
        system_instruction: { parts: [{ text: this.systemInstructions }] },
        tools: { function_declarations: tools },
        proactivity: this.proactivity,

        realtime_input_config: {
          automatic_activity_detection: this.automaticActivityDetection,
        },
      },
    };

    // Add transcription config if enabled
    if (this.inputAudioTranscription) {
      sessionSetupMessage.setup.input_audio_transcription = {};
    }
    if (this.outputAudioTranscription) {
      sessionSetupMessage.setup.output_audio_transcription = {};
    }

    if (this.googleGrounding) {
      sessionSetupMessage.setup.tools.google_search = {};
      delete sessionSetupMessage.setup.tools.function_declarations;
    }

    // Add affective dialog if enabled
    if (this.enableAffectiveDialog) {
      sessionSetupMessage.setup.generation_config.enable_affective_dialog = true;
    }

    // Store the setup message for later access
    this.lastSetupMessage = sessionSetupMessage;

    this.sendMessage(sessionSetupMessage);
  }

  sendTextMessage(text) {
    const textMessage = {
      client_content: {
        turns: [
          {
            role: "user",
            parts: [{ text: text }],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendMessage(textMessage);
  }

  sendToolResponse(toolCallId, response) {
    const message = {
      tool_response: {
        id: toolCallId,
        response: response,
      },
    };
    this.sendMessage(message);
  }

  sendRealtimeInputMessage(data, mime_type) {
    const message = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mime_type,
            data: data,
          },
        ],
      },
    };
    this.sendMessage(message);
    this.addToBytesSent(data);
  }

  addToBytesSent(data) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    this.totalBytesSent += encodedData.length;
  }

  getBytesSent() {
    return this.totalBytesSent;
  }

  sendAudioMessage(pcmData) {
    // Send binary audio data directly
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(pcmData);
      this.totalBytesSent += pcmData.byteLength;
    }
  }

  async sendImageMessage(base64Image, mime_type = "image/jpeg") {
    this.sendRealtimeInputMessage(base64Image, mime_type);
  }
}

