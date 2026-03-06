/**
 * ui.js — TubeForge UI state: pipeline, previews, gallery, status bar.
 */

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
const STAGES = [
  { key: "research", label: "Research" },
  { key: "script", label: "Script" },
  { key: "voiceover", label: "Voice" },
  { key: "thumbnail", label: "Visuals" },
  { key: "broll", label: "B-Roll" },
  { key: "assembly", label: "Final" },
];

const TOOL_STAGE_MAP = {
  google_search: "research",
  generate_script: "script",
  generate_voiceover: "voiceover",
  generate_thumbnail: "thumbnail",
  generate_broll: "broll",
  assemble_video: "assembly",
};

const stageState = {};

export function initPipeline() {
  const container = document.getElementById("pipelineSteps");
  if (!container) return;
  container.innerHTML = "";

  STAGES.forEach((s, i) => {
    stageState[s.key] = "pending";

    const pill = document.createElement("div");
    pill.className = "pipe-step-pill";
    pill.dataset.stage = s.key;
    pill.innerHTML = `
      <span class="pipe-dot"></span>
      <span>${s.label}</span>
    `;
    container.appendChild(pill);

    // Add connector between pills (not after last)
    if (i < STAGES.length - 1) {
      const conn = document.createElement("div");
      conn.className = "pipe-connector";
      container.appendChild(conn);
    }
  });
}

export function setPipelineStage(stageKey, state) {
  if (!stageState.hasOwnProperty(stageKey)) return;
  stageState[stageKey] = state;

  // Update pill
  const pill = document.querySelector(`.pipe-step-pill[data-stage="${stageKey}"]`);
  if (pill) {
    pill.className = `pipe-step-pill ${state}`;
  }

  // Update status bar text
  if (state === "active") {
    const stage = STAGES.find((s) => s.key === stageKey);
    updatePipelineStatus(stage ? stage.label + "..." : stageKey);
  }
  if (state === "complete" && stageKey === "assembly") {
    updatePipelineStatus("Complete!");
  }
}

export function toolToStage(toolName) {
  return TOOL_STAGE_MAP[toolName] || null;
}

// ---------------------------------------------------------------------------
// Script Preview
// ---------------------------------------------------------------------------

export function showScriptPreview(segments) {
  const hero = document.getElementById("uploadHero");
  const preview = document.getElementById("scriptPreview");
  const meta = document.getElementById("scriptMeta");
  const container = document.getElementById("sceneCards");
  const emptyState = document.getElementById("emptyState");

  if (hero) hero.style.display = "none";
  if (preview) preview.classList.remove("hidden");
  if (preview) preview.classList.add("flex");
  if (emptyState) emptyState.style.display = "none";

  const totalDuration = segments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  if (meta) meta.textContent = `${segments.length} scenes | ~${Math.round(totalDuration)}s`;

  if (!container) return;
  container.innerHTML = "";

  segments.forEach((seg, i) => {
    const card = document.createElement("div");
    card.className = "scene-card";

    const imgSrc = seg.image_id ? `/outputs/images/${seg.image_id}` : "";
    const imgHtml = imgSrc
      ? `<img class="scene-img" src="${imgSrc}" alt="Scene ${i + 1}" />`
      : `<div class="scene-img-placeholder">No image</div>`;

    card.innerHTML = `
      <div class="text-[10px] uppercase text-zinc-400 tracking-wider font-mono writing-mode-vertical">${i + 1}</div>
      <div>${imgHtml}</div>
      <div class="min-w-0">
        <p class="text-xs text-primary font-semibold uppercase tracking-wide mb-1">${seg.scene_description || ""}</p>
        <p class="text-sm text-zinc-600 leading-relaxed line-clamp-3">${seg.narration || ""}</p>
      </div>
      <div class="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full whitespace-nowrap font-mono">${(seg.duration_seconds || 0).toFixed(1)}s</div>
    `;
    container.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// Thumbnail Preview
// ---------------------------------------------------------------------------

export function showThumbnail(src) {
  const section = document.getElementById("thumbnailSection");
  const img = document.getElementById("thumbnailImg");
  const emptyState = document.getElementById("emptyState");
  if (section) section.classList.remove("hidden");
  if (img) img.src = src;
  if (emptyState) emptyState.style.display = "none";
  addAsset("image", src, "Thumbnail");
}

// ---------------------------------------------------------------------------
// Video Preview
// ---------------------------------------------------------------------------

export function showVideo(src) {
  const section = document.getElementById("videoSection");
  const player = document.getElementById("videoPlayer");
  const dlBtn = document.getElementById("downloadVideoBtn");
  const emptyState = document.getElementById("emptyState");

  if (section) section.classList.remove("hidden");
  if (player) player.src = src;
  if (emptyState) emptyState.style.display = "none";
  if (dlBtn) {
    dlBtn.href = src;
    dlBtn.download = src.split("/").pop();
  }
}

// ---------------------------------------------------------------------------
// Asset Gallery
// ---------------------------------------------------------------------------

let assetList = [];

export function addAsset(type, src, name) {
  if (assetList.find((a) => a.src === src)) return;
  assetList.push({ type, src, name });
  renderAssetGrid();
}

function renderAssetGrid() {
  const grid = document.getElementById("assetGrid");
  const count = document.getElementById("assetCount");
  const emptyState = document.getElementById("emptyState");
  if (!grid) return;
  if (count) count.textContent = assetList.length;
  if (emptyState && assetList.length > 0) emptyState.style.display = "none";

  grid.innerHTML = "";
  assetList.forEach((a) => {
    const item = document.createElement("a");
    item.className = "asset-item";
    item.href = a.src;
    item.target = "_blank";
    item.title = a.name;

    if (a.type === "image") {
      item.innerHTML = `<img src="${a.src}" alt="${a.name}" />`;
    } else if (a.type === "video") {
      item.innerHTML = `<div class="text-zinc-400"><span class="material-symbols-outlined !text-[20px]">play_circle</span></div>`;
    } else {
      item.innerHTML = `<div class="text-zinc-400"><span class="material-symbols-outlined !text-[20px]">graphic_eq</span></div>`;
    }
    grid.appendChild(item);
  });
}

export async function refreshAssets() {
  try {
    const res = await fetch("/api/assets");
    if (!res.ok) return;
    const data = await res.json();

    (data.images || []).forEach((f) => addAsset("image", `/outputs/images/${f}`, f));
    (data.videos || []).forEach((f) => addAsset("video", `/outputs/videos/${f}`, f));
    (data.audio || []).forEach((f) => addAsset("audio", `/outputs/audio/${f}`, f));
    (data.final || []).forEach((f) => addAsset("video", `/outputs/final/${f}`, f));
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// Upload Hero
// ---------------------------------------------------------------------------

export function hideUploadHero() {
  const hero = document.getElementById("uploadHero");
  if (hero) hero.style.display = "none";
}

export function showUploadHero() {
  const hero = document.getElementById("uploadHero");
  const preview = document.getElementById("scriptPreview");
  if (hero) hero.style.display = "block";
  if (preview) {
    preview.classList.add("hidden");
    preview.classList.remove("flex");
  }
}

// ---------------------------------------------------------------------------
// Hero Transcript (voice orb area)
// ---------------------------------------------------------------------------

export function setHeroTranscript(text) {
  const el = document.getElementById("heroTranscript");
  if (el && text) el.textContent = text;
}

export function setHeroStatus(text) {
  const el = document.getElementById("heroStatus");
  if (el) el.textContent = text;
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------

export function updatePipelineStatus(text) {
  const el = document.getElementById("pipelineStatusText");
  if (el) el.textContent = text;
}

export function updateAudioStatus(active) {
  const el = document.getElementById("audioStatus");
  if (el) el.textContent = active ? "Mic: ON" : "Mic: Off";
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

let timerInterval = null;
let timerStart = 0;

export function startTimer() {
  timerStart = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const el = document.getElementById("timerDisplay");
    if (el) el.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 1000);
}

export function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

// ---------------------------------------------------------------------------
// Handle tool events from the ADK event stream
// ---------------------------------------------------------------------------

export function handleToolEvent(event) {
  // Pattern 1: toolCall field (ADK live events)
  const toolCall = event.toolCall || event.tool_call;
  if (toolCall) {
    const calls = toolCall.functionCalls || toolCall.function_calls || [];
    for (const call of calls) {
      const stage = toolToStage(call.name);
      if (stage) setPipelineStage(stage, "active");
    }
  }

  // Pattern 2: functionCall / functionResponse in content parts
  if (event.content && event.content.parts) {
    for (const part of event.content.parts) {
      const fc = part.functionCall || part.function_call;
      if (fc) {
        const stage = toolToStage(fc.name);
        if (stage) setPipelineStage(stage, "active");
      }

      const fr = part.functionResponse || part.function_response;
      if (fr) {
        const stage = toolToStage(fr.name);
        if (stage) {
          const result = fr.response || fr.result || {};
          if (result.status === "success") {
            setPipelineStage(stage, "complete");
            handleToolSuccess(fr.name, result);
          } else if (result.status === "error") {
            setPipelineStage(stage, "error");
          }
        }
      }
    }
  }
}

function handleToolSuccess(name, result) {
  if (name === "generate_script" && result.segments) {
    showScriptPreview(result.segments);
    result.segments.forEach((seg, i) => {
      if (seg.image_id) addAsset("image", `/outputs/images/${seg.image_id}`, `Scene ${i + 1}`);
    });
  }
  if (name === "generate_thumbnail" && result.thumbnail_id) {
    showThumbnail(`/outputs/images/${result.thumbnail_id}`);
  }
  if (name === "generate_voiceover" && result.voiceover_id) {
    addAsset("audio", `/outputs/audio/${result.voiceover_id}.wav`, "Voiceover");
  }
  if (name === "generate_broll" && result.video_id) {
    addAsset("video", `/outputs/videos/${result.video_id}`, "B-Roll");
  }
  if (name === "assemble_video" && result.video_id) {
    showVideo(`/outputs/final/${result.video_id}`);
    addAsset("video", `/outputs/final/${result.video_id}`, "Final Video");
  }
}
