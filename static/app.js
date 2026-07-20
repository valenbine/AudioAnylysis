const fileInput = document.querySelector("#fileInput");
const uploadButton = document.querySelector("#uploadButton");
const dropZone = document.querySelector("#dropZone");
const modeSingle = document.querySelector("#modeSingle");
const modeCompare = document.querySelector("#modeCompare");
const singleUploadPanel = document.querySelector("#singleUploadPanel");
const compareUploadPanel = document.querySelector("#compareUploadPanel");
const compareFileA = document.querySelector("#compareFileA");
const compareFileB = document.querySelector("#compareFileB");
const compareFileAButton = document.querySelector("#compareFileAButton");
const compareFileBButton = document.querySelector("#compareFileBButton");
const compareFileAName = document.querySelector("#compareFileAName");
const compareFileBName = document.querySelector("#compareFileBName");
const compareButton = document.querySelector("#compareButton");
const fileLabel = document.querySelector("#fileLabel");
const statusText = document.querySelector("#statusText");
const metadataGrid = document.querySelector("#metadataGrid");
const canvas = document.querySelector("#waveformCanvas");
const featurePanel = document.querySelector("#featurePanel");
const comparisonPanel = document.querySelector("#comparisonPanel");
const viewEyebrow = document.querySelector("#viewEyebrow");
const viewTitle = document.querySelector("#viewTitle");
const viewSwitchButtons = document.querySelectorAll(".view-switch-button");
const audioPlayer = document.querySelector("#audioPlayer");
const playButton = document.querySelector("#playButton");
const progressSlider = document.querySelector("#progressSlider");
const currentTimeLabel = document.querySelector("#currentTime");
const totalTimeLabel = document.querySelector("#totalTime");
const zoomSlider = document.querySelector("#zoomSlider");
const zoomValue = document.querySelector("#zoomValue");
const resetZoomButton = document.querySelector("#resetZoomButton");
const followToggle = document.querySelector("#followToggle");
const selectionReadout = document.querySelector("#selectionReadout");
const analyzeSelectionButton = document.querySelector("#analyzeSelectionButton");
const clearSelectionButton = document.querySelector("#clearSelectionButton");
const exportMarkdownButton = document.querySelector("#exportMarkdownButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const spectrogramControls = document.querySelector("#spectrogramControls");
const spectrogramReadout = document.querySelector("#spectrogramReadout");
const readoutTime = document.querySelector("#readoutTime");
const readoutFrequency = document.querySelector("#readoutFrequency");
const readoutIntensity = document.querySelector("#readoutIntensity");
const fftSizeSelect = document.querySelector("#fftSizeSelect");
const hopSizeSelect = document.querySelector("#hopSizeSelect");
const maxFrequencySelect = document.querySelector("#maxFrequencySelect");
const context = canvas.getContext("2d");
let currentWaveform = [];
let currentSpectrogram = null;
let currentFeatures = null;
let spectrogramCache = new Map();
let currentMetadata = null;
let currentViewMode = "waveform";
let currentFile = null;
let currentObjectUrl = null;
let currentZoom = 1;
let viewStartRatio = 0;
let isProgressDragging = false;
let isFollowEnabled = true;
let animationFrameId = null;
let canvasPixelWidth = 0;
let canvasPixelHeight = 0;
let playbackClockTime = 0;
let playbackClockStartedAt = 0;
let isSpectrogramLoading = false;
let isFeaturesLoading = false;
let spectrogramHover = null;
let renderedPitchFrameIndex = -1;
let featureHover = null;
let featureSelection = null;
let currentMode = "single";
let selectedRange = null;
let isSelectingRange = false;
let selectionAnchorRatio = 0;
let suppressNextCanvasClick = false;
let currentComparison = null;

const viewLabels = {
  waveform: { eyebrow: "Waveform", title: "波形视图" },
  spectrogram: { eyebrow: "Spectrogram", title: "频谱图" },
  features: { eyebrow: "Features", title: "特征分析" },
};

const metadataLabels = {
  sampleRate: "采样率",
  duration: "时长",
  channels: "声道",
  peakAmplitude: "峰值幅度",
  sampleCount: "采样点",
};

function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.classList.toggle("is-error", tone === "error");
  statusText.classList.toggle("is-success", tone === "success");
}

function formatValue(key, value) {
  if (key === "sampleRate") return `${value.toLocaleString()} Hz`;
  if (key === "duration") return `${Number(value).toFixed(3)} s`;
  if (key === "peakAmplitude") return Number(value).toFixed(4);
  return Number(value).toLocaleString();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatFrequency(frequency) {
  if (!Number.isFinite(frequency)) return "-- Hz";
  if (frequency >= 1000) return `${(frequency / 1000).toFixed(2)} kHz`;
  return `${Math.round(frequency)} Hz`;
}

function renderMetadata(metadata) {
  metadataGrid.innerHTML = Object.entries(metadataLabels).map(([key, label]) => `
    <article class="metadata-card">
      <span>${label}</span>
      <strong>${formatValue(key, metadata[key])}</strong>
    </article>
  `).join("");
}

function setMode(mode) {
  currentMode = mode;
  modeSingle.classList.toggle("is-active", mode === "single");
  modeCompare.classList.toggle("is-active", mode === "compare");
  singleUploadPanel.classList.toggle("is-hidden", mode !== "single");
  compareUploadPanel.classList.toggle("is-hidden", mode !== "compare");
  comparisonPanel.classList.toggle("is-hidden", mode !== "compare" || !currentComparison);
}

function setReportControlsEnabled(enabled) {
  exportMarkdownButton.disabled = !enabled;
  exportJsonButton.disabled = !enabled;
}

function setSelectionControlsEnabled(enabled) {
  analyzeSelectionButton.disabled = !enabled;
  clearSelectionButton.disabled = !enabled;
}

function updateSelectionReadout() {
  if (!selectedRange) {
    selectionReadout.textContent = "选区：未选择";
    setSelectionControlsEnabled(false);
    return;
  }

  selectionReadout.textContent = `选区：${formatTime(selectedRange.startTime)} - ${formatTime(selectedRange.endTime)}`;
  setSelectionControlsEnabled(true);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const nextWidth = Math.floor(rect.width * ratio);
  const nextHeight = Math.floor(rect.height * ratio);

  if (canvasPixelWidth !== nextWidth || canvasPixelHeight !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvasPixelWidth = nextWidth;
    canvasPixelHeight = nextHeight;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getTimelineLength() {
  if (currentViewMode === "features" && currentFeatures) {
    return Math.max(
      currentFeatures.loudness?.frameCount || 0,
      currentFeatures.pitch?.frameCount || 0,
    );
  }

  if (currentViewMode === "spectrogram" && currentSpectrogram?.frames?.length) {
    return currentSpectrogram.frames.length;
  }

  return currentWaveform.length;
}

function getVisibleRange(total = getTimelineLength()) {
  if (total === 0) return { start: 0, end: 0, startOffset: 0, visibleCount: 0, points: [] };

  const visibleCount = Math.max(2, Math.ceil(total / currentZoom));
  const maxStart = Math.max(0, total - visibleCount);
  const startOffset = maxStart * viewStartRatio;
  const start = Math.floor(startOffset);
  const end = Math.min(total, Math.ceil(startOffset + visibleCount) + 1);

  return { start, end, startOffset, visibleCount };
}

function getPlaybackSeconds() {
  if (!audioPlayer.duration) return audioPlayer.currentTime || 0;

  if (!audioPlayer.paused && playbackClockStartedAt > 0) {
    const elapsed = (performance.now() - playbackClockStartedAt) / 1000;
    return Math.min(audioPlayer.duration, playbackClockTime + elapsed);
  }

  return audioPlayer.currentTime || 0;
}

function syncPlaybackClock(time = audioPlayer.currentTime || 0) {
  playbackClockTime = time;
  playbackClockStartedAt = audioPlayer.paused ? 0 : performance.now();
}

function getPlaybackRatio() {
  if (!audioPlayer.duration) return 0;
  return Math.min(1, Math.max(0, getPlaybackSeconds() / audioPlayer.duration));
}

function keepPlayheadVisible() {
  const total = getTimelineLength();
  if (!total) return;

  if (currentZoom <= 1) {
    viewStartRatio = 0;
    return;
  }

  if (!isFollowEnabled) return;

  const visibleCount = Math.max(2, Math.ceil(total / currentZoom));
  const maxStart = Math.max(0, total - visibleCount);
  const playheadIndex = getPlaybackRatio() * total;
  const halfWindow = visibleCount / 2;
  const nextStart = Math.min(maxStart, Math.max(0, playheadIndex - halfWindow));
  viewStartRatio = maxStart ? nextStart / maxStart : 0;
}

function drawEmptyWaveform() {
  resizeCanvas();
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "rgba(157, 186, 178, 0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(24, height / 2);
  context.lineTo(width - 24, height / 2);
  context.stroke();
}

function drawCurrentVisualization() {
  if (currentViewMode === "features") {
    drawLoudnessCurve();
    return;
  }

  if (currentViewMode === "spectrogram") {
    drawSpectrogram();
    return;
  }

  drawWaveform();
}

function drawLoudnessCurve() {
  resizeCanvas();
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);

  const frames = currentFeatures?.loudness?.frames || [];
  const pitchFrames = currentFeatures?.pitch?.frames || [];
  const total = getTimelineLength();
  if (frames.length === 0 && pitchFrames.length === 0) {
    drawEmptyWaveform();
    return;
  }

  const padding = 24;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = getVisibleRange(total);
  const maxRms = currentFeatures.loudness.maxRms || 1;
  const maxPeak = currentFeatures.loudness.maxPeak || 1;
  const maxPitch = Math.max(600, currentFeatures.pitch?.maxFrequency || 0);
  const step = usableWidth / Math.max(range.visibleCount - 1, 1);

  context.fillStyle = "#071413";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(157, 186, 178, 0.18)";
  context.lineWidth = 1;
  context.strokeRect(padding, padding, usableWidth, usableHeight);

  drawFeatureSeries(frames, "rms", maxRms, total, range, padding, height - padding, usableHeight, step, "#2dd4bf", 3);
  drawFeatureSeries(frames, "peak", maxPeak, total, range, padding, height - padding, usableHeight, step, "#f59e0b", 2);
  drawBeatMarkers(currentFeatures.tempo?.beatTimes || [], range, padding, usableWidth, height, total);
  drawFeatureSeries(pitchFrames, "frequency", maxPitch, total, range, padding, height - padding, usableHeight, step, "#8b5cf6", 2);
  drawFeatureHover(range, padding, usableWidth, usableHeight, height, total);
  drawFeatureLegend(padding, height);
  drawPlayhead(range, padding, usableWidth, height, total);
}

function drawFeatureSeries(frames, key, maxValue, total, range, padding, bottom, usableHeight, step, color, lineWidth) {
  if (frames.length === 0 || total === 0) return;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  let hasPoint = false;
  frames.forEach((frame, index) => {
    const globalIndex = frames.length === 1 ? 0 : (index / (frames.length - 1)) * Math.max(0, total - 1);
    if (globalIndex < range.startOffset - 1 || globalIndex > range.startOffset + range.visibleCount + 1) return;

    const x = padding + (globalIndex - range.startOffset) * step;
    const y = bottom - (Number(frame[key]) / Math.max(maxValue, 1e-8)) * usableHeight;
    if (!hasPoint) {
      context.moveTo(x, y);
      hasPoint = true;
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
  context.restore();
}

function drawFeatureLegend(padding, height) {
  const items = [
    ["RMS", "#2dd4bf"],
    ["Peak", "#f59e0b"],
    ["Pitch", "#8b5cf6"],
    ["Beat", "rgba(238, 252, 247, 0.38)"],
  ];
  context.save();
  context.font = "12px Inter, ui-sans-serif, system-ui";
  context.textBaseline = "middle";
  items.forEach(([label, color], index) => {
    const x = padding + index * 74;
    const y = height - 12;
    context.fillStyle = color;
    context.fillRect(x, y - 4, 18, 4);
    context.fillStyle = "rgba(238, 252, 247, 0.76)";
    context.fillText(label, x + 24, y);
  });
  context.restore();
}

function drawBeatMarkers(beatTimes, range, padding, usableWidth, height, total) {
  if (!audioPlayer.duration || total === 0) return;

  context.save();
  context.strokeStyle = "rgba(238, 252, 247, 0.22)";
  context.lineWidth = 1;
  beatTimes.forEach((time) => {
    const index = (Number(time) / audioPlayer.duration) * total;
    if (index < range.startOffset || index > range.startOffset + range.visibleCount) return;
    const x = padding + ((index - range.startOffset) / Math.max(1, range.visibleCount)) * usableWidth;
    context.beginPath();
    context.moveTo(x, 24);
    context.lineTo(x, height - 24);
    context.stroke();
  });
  context.restore();
}

function getFeaturePointData(point, range, padding, usableWidth, total) {
  const pitchFrames = currentFeatures?.pitch?.frames || [];
  if (!point || total === 0 || pitchFrames.length === 0) return null;

  const clampedX = Math.min(padding + usableWidth, Math.max(padding, point.x));
  const visibleRatio = (clampedX - padding) / Math.max(1, usableWidth);
  const globalIndex = range.startOffset + visibleRatio * range.visibleCount;
  const pitchIndex = Math.min(
    pitchFrames.length - 1,
    Math.max(0, Math.round((globalIndex / Math.max(1, total - 1)) * (pitchFrames.length - 1))),
  );
  return { x: clampedX, index: pitchIndex, frame: pitchFrames[pitchIndex] };
}

function drawFeatureHover(range, padding, usableWidth, usableHeight, height, total) {
  const point = getFeaturePointData(featureSelection || featureHover, range, padding, usableWidth, total);
  if (!point?.frame) return;

  const maxPitch = Math.max(600, currentFeatures.pitch?.maxFrequency || 0);
  const y = height - padding - (Number(point.frame.frequency) / maxPitch) * usableHeight;
  context.save();
  context.strokeStyle = "rgba(238, 252, 247, 0.8)";
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(point.x, padding);
  context.lineTo(point.x, height - padding);
  context.moveTo(padding, y);
  context.lineTo(padding + usableWidth, y);
  context.stroke();
  context.fillStyle = "#8b5cf6";
  context.beginPath();
  context.arc(point.x, y, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function clearSpectrogramHover() {
  spectrogramHover = null;
}

function clearSpectrogramSelection() {
  spectrogramHover = null;
  updateSpectrogramReadout(null);
}

function clearFeatureInteraction() {
  featureHover = null;
  featureSelection = null;
}

function updateSpectrogramReadout(data) {
  if (!data) {
    readoutTime.textContent = "--:--";
    readoutFrequency.textContent = "-- Hz";
    readoutIntensity.textContent = "--";
    return;
  }

  readoutTime.textContent = formatTime(data.time);
  readoutFrequency.textContent = formatFrequency(data.frequency);
  readoutIntensity.textContent = `${Math.round(data.intensity * 100)}%`;
}

function drawWaveform(points = currentWaveform) {
  if (points !== currentWaveform) {
    currentWaveform = points;
  }
  resizeCanvas();
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);

  if (currentWaveform.length === 0) {
    drawEmptyWaveform();
    return;
  }

  const padding = 24;
  const mid = height / 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = getVisibleRange(currentWaveform.length);
  const visiblePoints = currentWaveform.slice(range.start, range.end);
  const step = usableWidth / Math.max(range.visibleCount, 1);

  context.strokeStyle = "rgba(157, 186, 178, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding, mid);
  context.lineTo(width - padding, mid);
  context.stroke();

  const gradient = context.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, "#2dd4bf");
  gradient.addColorStop(0.5, "#22c55e");
  gradient.addColorStop(1, "#f59e0b");

  context.strokeStyle = gradient;
  context.lineWidth = Math.max(1, Math.min(3, step * 0.72));
  context.lineCap = "round";

  visiblePoints.forEach((point, index) => {
    const globalIndex = range.start + index;
    const x = padding + (globalIndex - range.startOffset) * step;
    const yMin = mid - point.max * usableHeight * 0.46;
    const yMax = mid - point.min * usableHeight * 0.46;
    context.beginPath();
    context.moveTo(x, yMin);
    context.lineTo(x, yMax);
    context.stroke();
  });

  drawSelectionOverlay(range, padding, usableWidth, height, currentWaveform.length);
  drawPlayhead(range, padding, usableWidth, height, currentWaveform.length);
}

function drawSelectionOverlay(range, padding, usableWidth, height, totalCount) {
  if (!selectedRange || !audioPlayer.duration || totalCount === 0) return;

  const startIndex = (selectedRange.startTime / audioPlayer.duration) * totalCount;
  const endIndex = (selectedRange.endTime / audioPlayer.duration) * totalCount;
  const left = padding + ((startIndex - range.startOffset) / Math.max(1, range.visibleCount)) * usableWidth;
  const right = padding + ((endIndex - range.startOffset) / Math.max(1, range.visibleCount)) * usableWidth;
  const x = Math.max(padding, Math.min(left, right));
  const width = Math.min(padding + usableWidth, Math.max(left, right)) - x;
  if (width <= 0) return;

  context.save();
  context.fillStyle = "rgba(45, 212, 191, 0.16)";
  context.strokeStyle = "rgba(45, 212, 191, 0.62)";
  context.lineWidth = 1;
  context.fillRect(x, 20, width, height - 40);
  context.strokeRect(x, 20, width, height - 40);
  context.restore();
}

function getSpectrogramColor(value) {
  const intensity = Math.min(1, Math.max(0, value));
  const hue = 188 - intensity * 150;
  const lightness = 10 + intensity * 58;
  return `hsl(${hue} 86% ${lightness}%)`;
}

function drawSpectrogram() {
  resizeCanvas();
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);

  const frames = currentSpectrogram?.frames || [];
  if (frames.length === 0) {
    drawEmptyWaveform();
    return;
  }

  const padding = 24;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = getVisibleRange(frames.length);
  const visibleFrames = frames.slice(range.start, range.end);
  const step = usableWidth / Math.max(range.visibleCount, 1);
  const binCount = currentSpectrogram.binCount || visibleFrames[0]?.length || 1;
  const binHeight = usableHeight / Math.max(binCount, 1);

  context.fillStyle = "#071413";
  context.fillRect(0, 0, width, height);

  visibleFrames.forEach((frame, frameIndex) => {
    const globalIndex = range.start + frameIndex;
    const x = padding + (globalIndex - range.startOffset) * step;
    const cellWidth = Math.max(1, step + 0.8);

    frame.forEach((value, binIndex) => {
      const y = height - padding - (binIndex + 1) * binHeight;
      context.fillStyle = getSpectrogramColor(value);
      context.fillRect(x, y, cellWidth, Math.max(1, binHeight + 0.5));
    });
  });

  context.strokeStyle = "rgba(157, 186, 178, 0.18)";
  context.lineWidth = 1;
  context.strokeRect(padding, padding, usableWidth, usableHeight);
  drawFrequencyScale(padding, usableWidth, usableHeight, height);
  drawSpectrogramHover(range, padding, usableWidth, usableHeight, height, frames.length);
  drawPlayhead(range, padding, usableWidth, height, frames.length);
}

function drawFrequencyScale(padding, usableWidth, usableHeight, height) {
  const frequencies = currentSpectrogram?.frequencies || [];
  if (frequencies.length === 0) return;

  context.save();
  context.fillStyle = "rgba(238, 252, 247, 0.72)";
  context.strokeStyle = "rgba(157, 186, 178, 0.16)";
  context.lineWidth = 1;
  context.font = "12px Inter, ui-sans-serif, system-ui";
  context.textBaseline = "middle";

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const frequencyIndex = Math.min(frequencies.length - 1, Math.round(ratio * (frequencies.length - 1)));
    const y = height - padding - ratio * usableHeight;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(padding + usableWidth, y);
    context.stroke();
    context.fillText(formatFrequency(frequencies[frequencyIndex]), padding + 8, y - 8);
  });

  context.restore();
}

function getSpectrogramPointData(point, range, padding, usableWidth, usableHeight, height, totalFrames) {
  if (!point || totalFrames === 0) return null;

  const binCount = currentSpectrogram?.binCount || 0;
  if (binCount === 0) return null;

  const clampedX = Math.min(padding + usableWidth, Math.max(padding, point.x));
  const clampedY = Math.min(height - padding, Math.max(padding, point.y));
  const frameRatio = (clampedX - padding) / Math.max(1, usableWidth);
  const binRatio = (height - padding - clampedY) / Math.max(1, usableHeight);
  const frameIndex = Math.min(totalFrames - 1, Math.max(0, Math.round(range.startOffset + frameRatio * range.visibleCount)));
  const binIndex = Math.min(binCount - 1, Math.max(0, Math.round(binRatio * (binCount - 1))));
  const frame = currentSpectrogram.frames[frameIndex] || [];
  const intensity = Number(frame[binIndex] || 0);
  const frequency = Number(currentSpectrogram.frequencies[binIndex] || 0);
  const time = audioPlayer.duration ? (frameIndex / Math.max(1, totalFrames - 1)) * audioPlayer.duration : 0;

  return { x: clampedX, y: clampedY, time, frequency, intensity };
}

function drawSpectrogramHover(range, padding, usableWidth, usableHeight, height, totalFrames) {
  if (!spectrogramHover || totalFrames === 0) return;

  const point = getSpectrogramPointData(spectrogramHover, range, padding, usableWidth, usableHeight, height, totalFrames);
  if (!point) return;

  context.save();
  context.strokeStyle = "rgba(238, 252, 247, 0.86)";
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(point.x, padding);
  context.lineTo(point.x, height - padding);
  context.moveTo(padding, point.y);
  context.lineTo(padding + usableWidth, point.y);
  context.stroke();
  context.fillStyle = "#eefcf7";
  context.beginPath();
  context.arc(point.x, point.y, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPlayhead(range, padding, usableWidth, height, totalCount) {
  if (!audioPlayer.duration || totalCount === 0) return;

  const playheadIndex = getPlaybackRatio() * totalCount;
  if (playheadIndex < range.start || playheadIndex > range.end) return;

  const visibleRatio = (playheadIndex - range.startOffset) / Math.max(1, range.visibleCount);
  const x = padding + visibleRatio * usableWidth;

  context.save();
  context.strokeStyle = "#eefcf7";
  context.lineWidth = 2;
  context.shadowColor = "rgba(45, 212, 191, 0.8)";
  context.shadowBlur = 14;
  context.beginPath();
  context.moveTo(x, 18);
  context.lineTo(x, height - 18);
  context.stroke();
  context.fillStyle = "#2dd4bf";
  context.beginPath();
  context.arc(x, 18, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function updateTimeUi() {
  const duration = audioPlayer.duration || currentMetadata?.duration || 0;
  currentTimeLabel.textContent = formatTime(getPlaybackSeconds());
  totalTimeLabel.textContent = formatTime(duration);

  if (!isProgressDragging) {
    progressSlider.value = String(Math.round(getPlaybackRatio() * 1000));
  }
}

function renderPlaybackFrame() {
  updateTimeUi();
  if (currentViewMode === "features") {
    renderFeatureCards(currentFeatures);
  }
  keepPlayheadVisible();
  drawCurrentVisualization();

  if (!audioPlayer.paused) {
    animationFrameId = requestAnimationFrame(renderPlaybackFrame);
  }
}

function enablePlayerControls(enabled) {
  playButton.disabled = !enabled;
  progressSlider.disabled = !enabled;
  zoomSlider.disabled = !enabled;
  resetZoomButton.disabled = !enabled;
  followToggle.disabled = !enabled;
  followToggle.closest(".follow-toggle").classList.toggle("is-disabled", !enabled);
}

function setActiveViewMode(viewMode) {
  currentViewMode = viewMode;
  viewEyebrow.textContent = viewLabels[viewMode].eyebrow;
  viewTitle.textContent = viewLabels[viewMode].title;
  viewSwitchButtons.forEach((option) => {
    option.classList.toggle("is-active", option.dataset.view === viewMode);
  });
  spectrogramControls.classList.toggle("is-hidden", viewMode !== "spectrogram");
  spectrogramReadout.classList.toggle("is-hidden", viewMode !== "spectrogram");
  featurePanel.classList.toggle("is-hidden", viewMode !== "features");
  if (viewMode !== "spectrogram") {
    clearSpectrogramHover();
    updateSpectrogramReadout(null);
  }
}

function getCurrentPitchFrame(features) {
  if (featureSelection) {
    const total = getTimelineLength();
    const range = getVisibleRange(total);
    const point = getFeaturePointData(featureSelection, range, 24, canvas.getBoundingClientRect().width - 48, total);
    if (point?.frame) return { index: point.index, frame: point.frame };
  }

  if (featureHover) {
    const total = getTimelineLength();
    const range = getVisibleRange(total);
    const point = getFeaturePointData(featureHover, range, 24, canvas.getBoundingClientRect().width - 48, total);
    if (point?.frame) return { index: point.index, frame: point.frame };
  }

  const frames = features?.pitch?.frames || [];
  if (frames.length === 0) {
    return { index: -1, frame: features?.pitch?.summary || features?.pitch };
  }

  const currentTime = getPlaybackSeconds();
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  frames.forEach((frame, index) => {
    const distance = Math.abs(Number(frame.time) - currentTime);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return { index: bestIndex, frame: frames[bestIndex] };
}

function renderFeatureCards(features, force = false) {
  if (!features) {
    featurePanel.innerHTML = "";
    renderedPitchFrameIndex = -1;
    return;
  }

  const currentPitch = getCurrentPitchFrame(features);
  if (!force && currentPitch.index === renderedPitchFrameIndex && featurePanel.innerHTML) return;

  renderedPitchFrameIndex = currentPitch.index;
  const pitch = currentPitch.frame || features.pitch.summary || features.pitch;
  const loudness = features.loudness;
  const bands = features.bandEnergy;
  const quality = features.quality;
  const tempo = features.tempo;
  featurePanel.innerHTML = `
    <article class="feature-card">
      <span>Pitch</span>
      <strong>${pitch.tuningLabel || pitch.note} / ${pitch.frequency.toFixed(2)} Hz</strong>
      <p>当前 ${formatTime(pitch.time || 0)}，置信度 ${Math.round(pitch.confidence * 100)}%。显示最近音名和 cents 偏移。</p>
    </article>
    <article class="feature-card">
      <span>Loudness</span>
      <strong>RMS ${loudness.maxRms.toFixed(4)}</strong>
      <p>峰值 ${loudness.maxPeak.toFixed(4)}。RMS 反映持续响度，Peak 反映瞬时冲击。</p>
    </article>
    <article class="feature-card">
      <span>Tempo</span>
      <strong>${tempo.bpm ? tempo.bpm.toFixed(1) : "--"} BPM</strong>
      <p>置信度 ${Math.round(tempo.confidence * 100)}%，白色竖线标记估计节拍。</p>
    </article>
    <article class="feature-card">
      <span>Band Energy</span>
      <div class="band-stack">
        ${renderBandRow("低频", bands.low)}
        ${renderBandRow("中频", bands.mid)}
        ${renderBandRow("高频", bands.high)}
      </div>
      <p>显示低、中、高频能量占比，用来判断声音重心。</p>
    </article>
    <article class="feature-card">
      <span>Quality</span>
      <strong>${quality.isClipped ? "检测到削波" : "未检测到削波"}</strong>
      <p>LUFS 近似 ${quality.lufsApprox}，动态 ${quality.dynamicRangeDb} dB，噪声底 ${quality.noiseFloorDb} dB。${(quality.recommendations || []).join(" ")}</p>
    </article>
  `;
}

function renderBandRow(label, value) {
  const percent = Math.round(value * 100);
  return `
    <div class="band-row">
      <b>${label}</b>
      <span class="band-bar"><i style="width: ${percent}%"></i></span>
      <em>${percent}%</em>
    </div>
  `;
}

function getSpectrogramOptions() {
  return {
    fftSize: fftSizeSelect.value,
    hopSize: hopSizeSelect.value,
    maxFrequency: maxFrequencySelect.value,
  };
}

function getSpectrogramCacheKey() {
  const options = getSpectrogramOptions();
  return `${options.fftSize}:${options.hopSize}:${options.maxFrequency}`;
}

function getSpectrogramQuery() {
  return new URLSearchParams(getSpectrogramOptions()).toString();
}

function resetPlaybackState(file) {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = currentObjectUrl;
  audioPlayer.currentTime = 0;
  syncPlaybackClock(0);
  playButton.textContent = "播放";
  progressSlider.value = "0";
  currentZoom = 1;
  viewStartRatio = 0;
  isFollowEnabled = true;
  renderedPitchFrameIndex = -1;
  zoomSlider.value = "1";
  zoomValue.textContent = "1x";
  followToggle.checked = true;
  enablePlayerControls(true);
  updateTimeUi();
}

function seekToRatio(ratio) {
  if (!audioPlayer.duration) return;
  const nextTime = Math.min(1, Math.max(0, ratio)) * audioPlayer.duration;
  audioPlayer.currentTime = nextTime;
  syncPlaybackClock(nextTime);
  updateTimeUi();
  if (currentViewMode === "features") {
    renderFeatureCards(currentFeatures);
  }
  keepPlayheadVisible();
  drawCurrentVisualization();
}

function getCanvasRatio(event) {
  const rect = canvas.getBoundingClientRect();
  const padding = 24;
  const x = Math.min(rect.width - padding, Math.max(padding, event.clientX - rect.left));
  const total = getTimelineLength();
  const range = getVisibleRange(total);
  const visibleRatio = (x - padding) / Math.max(1, rect.width - padding * 2);
  const globalIndex = range.startOffset + visibleRatio * Math.max(1, range.visibleCount);
  return Math.min(1, Math.max(0, globalIndex / Math.max(1, total)));
}

function setSelectedRangeFromRatios(startRatio, endRatio) {
  if (!audioPlayer.duration) return;
  const start = Math.min(startRatio, endRatio) * audioPlayer.duration;
  const end = Math.max(startRatio, endRatio) * audioPlayer.duration;
  if (end - start < 0.05) return;
  selectedRange = { startTime: start, endTime: end };
  updateSelectionReadout();
}

async function analyzeFile(file) {
  if (!file) return;

  currentFile = file;
  currentSpectrogram = null;
  currentFeatures = null;
  currentComparison = null;
  selectedRange = null;
  spectrogramCache = new Map();
  isSpectrogramLoading = false;
  isFeaturesLoading = false;
  renderFeatureCards(null);
  comparisonPanel.classList.add("is-hidden");
  comparisonPanel.innerHTML = "";
  updateSelectionReadout();
  setReportControlsEnabled(false);
  clearSpectrogramSelection();
  clearFeatureInteraction();
  setActiveViewMode("waveform");
  fileLabel.textContent = file.name;
  setStatus("正在解析音频...", "neutral");
  uploadButton.disabled = true;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    }

    renderMetadata(payload.metadata);
    currentMetadata = payload.metadata;
    currentWaveform = payload.waveform;
    resetPlaybackState(file);
    setReportControlsEnabled(true);
    drawCurrentVisualization();
    setStatus("波形分析完成，可以播放、拖动进度、缩放波形或切换频谱图。", "success");
  } catch (error) {
    setStatus(error.message, "error");
    currentFile = null;
    currentWaveform = [];
    currentSpectrogram = null;
    currentFeatures = null;
    currentMetadata = null;
    selectedRange = null;
    renderFeatureCards(null);
    updateSelectionReadout();
    setReportControlsEnabled(false);
    clearFeatureInteraction();
    enablePlayerControls(false);
    drawEmptyWaveform();
  } finally {
    uploadButton.disabled = false;
  }
}

async function loadFeaturesIfNeeded() {
  if (currentFeatures || isFeaturesLoading || !currentFile) return;

  const requestedFile = currentFile;
  isFeaturesLoading = true;
  setStatus("正在生成特征分析...", "neutral");
  drawEmptyWaveform();

  const formData = new FormData();
  formData.append("file", requestedFile);

  try {
    const response = await fetch("/api/features", {
      method: "POST",
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    }

    if (currentFile !== requestedFile) return;

    currentFeatures = payload.features;
    renderFeatureCards(currentFeatures, true);
    setStatus("特征分析完成。", "success");
    if (currentViewMode === "features") {
      renderFeatureCards(currentFeatures, true);
      keepPlayheadVisible();
      drawCurrentVisualization();
    }
  } catch (error) {
    if (currentFile === requestedFile) {
      setStatus(error.message, "error");
      drawCurrentVisualization();
    }
  } finally {
    isFeaturesLoading = false;
  }
}

async function loadSpectrogramIfNeeded() {
  if (isSpectrogramLoading || !currentFile) return;

  const cacheKey = getSpectrogramCacheKey();
  if (spectrogramCache.has(cacheKey)) {
    currentSpectrogram = spectrogramCache.get(cacheKey);
    drawCurrentVisualization();
    return;
  }

  const requestedFile = currentFile;
  const requestedCacheKey = cacheKey;
  isSpectrogramLoading = true;
  setStatus("正在生成频谱图...", "neutral");
  clearSpectrogramSelection();
  drawEmptyWaveform();

  const formData = new FormData();
  formData.append("file", requestedFile);

  try {
    const response = await fetch(`/api/spectrogram?${getSpectrogramQuery()}`, {
      method: "POST",
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    }

    if (currentFile !== requestedFile) return;

    spectrogramCache.set(requestedCacheKey, payload.spectrogram);
    if (requestedCacheKey === getSpectrogramCacheKey()) {
      currentSpectrogram = payload.spectrogram;
      setStatus("频谱图生成完成。", "success");
    }

    if (currentViewMode === "spectrogram" && requestedCacheKey === getSpectrogramCacheKey()) {
      keepPlayheadVisible();
      drawCurrentVisualization();
    }
  } catch (error) {
    if (currentFile === requestedFile) {
      setStatus(error.message, "error");
      drawCurrentVisualization();
    }
  } finally {
    isSpectrogramLoading = false;
    if (currentFile === requestedFile && currentViewMode === "spectrogram" && !spectrogramCache.has(getSpectrogramCacheKey())) {
      await loadSpectrogramIfNeeded();
    }
  }
}

async function analyzeSelectedRange() {
  if (!currentFile || !selectedRange) return;

  const formData = new FormData();
  formData.append("file", currentFile);
  const query = new URLSearchParams({
    startTime: selectedRange.startTime.toFixed(4),
    endTime: selectedRange.endTime.toFixed(4),
  }).toString();

  try {
    setStatus("正在分析选区...", "neutral");
    const response = await fetch(`/api/features?${query}`, { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    currentFeatures = payload.features;
    renderFeatureCards(currentFeatures, true);
    setActiveViewMode("features");
    setStatus("选区特征分析完成。", "success");
    drawCurrentVisualization();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function exportCurrentReport(format) {
  const analysis = {
    metadata: currentMetadata || {},
    features: currentFeatures || {},
    comparison: currentComparison || null,
    selection: selectedRange || null,
  };

  try {
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, analysis }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    downloadText(`audioanylysis-report.${format === "json" ? "json" : "md"}`, payload.report);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function updateCompareFileName(input, label) {
  label.textContent = input.files[0]?.name || "点击选择音频";
}

async function compareFiles() {
  const fileA = compareFileA.files[0];
  const fileB = compareFileB.files[0];
  if (!fileA || !fileB) {
    setStatus("请选择两个音频文件进行 A/B 对比。", "error");
    return;
  }

  const formData = new FormData();
  formData.append("fileA", fileA);
  formData.append("fileB", fileB);
  try {
    compareButton.disabled = true;
    setStatus("正在生成 A/B 对比...", "neutral");
    const response = await fetch("/api/compare", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
    currentComparison = payload.comparison;
    renderComparison(currentComparison);
    comparisonPanel.classList.remove("is-hidden");
    setReportControlsEnabled(true);
    setStatus("A/B 对比完成。", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    compareButton.disabled = false;
  }
}

function renderComparison(comparison) {
  const a = comparison.fileA.features;
  const b = comparison.fileB.features;
  const diff = comparison.differences;
  comparisonPanel.innerHTML = `
    <article class="comparison-card">
      <span>File A</span>
      <strong>${a.pitch.tuningLabel || a.pitch.note} / ${a.tempo.bpm.toFixed(1)} BPM</strong>
      <p>RMS ${a.loudness.maxRms.toFixed(4)}，高频 ${Math.round(a.bandEnergy.high * 100)}%。</p>
    </article>
    <article class="comparison-card">
      <span>File B</span>
      <strong>${b.pitch.tuningLabel || b.pitch.note} / ${b.tempo.bpm.toFixed(1)} BPM</strong>
      <p>RMS ${b.loudness.maxRms.toFixed(4)}，高频 ${Math.round(b.bandEnergy.high * 100)}%。</p>
    </article>
    <article class="comparison-card">
      <span>Difference</span>
      <strong>更响：${diff.louder} / 高频更多：${diff.moreHighFrequency}</strong>
      <p>节奏更快：${diff.fasterTempo}，音高范围更高：${diff.pitchRange.higher}。</p>
    </article>
  `;
}

modeSingle.addEventListener("click", () => setMode("single"));
modeCompare.addEventListener("click", () => setMode("compare"));
compareButton.addEventListener("click", compareFiles);
compareFileAButton.addEventListener("click", () => compareFileA.click());
compareFileBButton.addEventListener("click", () => compareFileB.click());
compareFileA.addEventListener("change", () => updateCompareFileName(compareFileA, compareFileAName));
compareFileB.addEventListener("change", () => updateCompareFileName(compareFileB, compareFileBName));
analyzeSelectionButton.addEventListener("click", analyzeSelectedRange);
clearSelectionButton.addEventListener("click", () => {
  selectedRange = null;
  updateSelectionReadout();
  drawCurrentVisualization();
});
exportMarkdownButton.addEventListener("click", () => exportCurrentReport("markdown"));
exportJsonButton.addEventListener("click", () => exportCurrentReport("json"));

uploadButton.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  analyzeFile(fileInput.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  analyzeFile(event.dataTransfer.files[0]);
});

playButton.addEventListener("click", async () => {
  if (!audioPlayer.src) return;

  if (audioPlayer.paused) {
    await audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
});

audioPlayer.addEventListener("play", () => {
  playButton.textContent = "暂停";
  syncPlaybackClock();
  cancelAnimationFrame(animationFrameId);
  renderPlaybackFrame();
});

audioPlayer.addEventListener("pause", () => {
  playButton.textContent = "播放";
  syncPlaybackClock();
  cancelAnimationFrame(animationFrameId);
  updateTimeUi();
  drawCurrentVisualization();
});

audioPlayer.addEventListener("loadedmetadata", () => {
  syncPlaybackClock();
  updateTimeUi();
});

audioPlayer.addEventListener("ended", () => {
  playButton.textContent = "播放";
  syncPlaybackClock(audioPlayer.duration || audioPlayer.currentTime || 0);
  updateTimeUi();
  drawCurrentVisualization();
});

progressSlider.addEventListener("input", () => {
  isProgressDragging = true;
  seekToRatio(Number(progressSlider.value) / 1000);
});

progressSlider.addEventListener("change", () => {
  isProgressDragging = false;
  seekToRatio(Number(progressSlider.value) / 1000);
});

zoomSlider.addEventListener("input", () => {
  currentZoom = Number(zoomSlider.value);
  zoomValue.textContent = `${currentZoom.toFixed(currentZoom % 1 ? 1 : 0)}x`;
  keepPlayheadVisible();
  drawCurrentVisualization();
});

followToggle.addEventListener("change", () => {
  isFollowEnabled = followToggle.checked;
  keepPlayheadVisible();
  drawCurrentVisualization();
});

resetZoomButton.addEventListener("click", () => {
  currentZoom = 1;
  viewStartRatio = 0;
  zoomSlider.value = "1";
  zoomValue.textContent = "1x";
  drawCurrentVisualization();
});

viewSwitchButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    setActiveViewMode(button.dataset.view);
    keepPlayheadVisible();
    if (currentViewMode === "features") {
      renderFeatureCards(currentFeatures, true);
    }
    drawCurrentVisualization();
    if (currentViewMode === "spectrogram") {
      await loadSpectrogramIfNeeded();
    }
    if (currentViewMode === "features") {
      await loadFeaturesIfNeeded();
    }
  });
});

[fftSizeSelect, hopSizeSelect, maxFrequencySelect].forEach((select) => {
  select.addEventListener("change", async () => {
    currentSpectrogram = spectrogramCache.get(getSpectrogramCacheKey()) || null;
    clearSpectrogramSelection();
    if (currentViewMode === "spectrogram") {
      keepPlayheadVisible();
      drawCurrentVisualization();
      await loadSpectrogramIfNeeded();
    }
  });
});

canvas.addEventListener("click", (event) => {
  if (suppressNextCanvasClick) {
    suppressNextCanvasClick = false;
    return;
  }
  if (isSelectingRange) return;
  const total = getTimelineLength();
  if (!audioPlayer.duration || total === 0) return;

  const rect = canvas.getBoundingClientRect();
  const padding = 24;
  const x = Math.min(rect.width - padding, Math.max(padding, event.clientX - rect.left));

  if (currentViewMode === "spectrogram" && currentSpectrogram?.frames?.length) {
    const y = Math.min(rect.height - padding, Math.max(padding, event.clientY - rect.top));
    const range = getVisibleRange(currentSpectrogram.frames.length);
    const data = getSpectrogramPointData({ x, y }, range, padding, rect.width - padding * 2, rect.height - padding * 2, rect.height, currentSpectrogram.frames.length);
    updateSpectrogramReadout(data);
    drawCurrentVisualization();
    return;
  }

  if (currentViewMode === "features" && currentFeatures) {
    const y = Math.min(rect.height - padding, Math.max(padding, event.clientY - rect.top));
    featureSelection = { x, y };
    featureHover = null;
    renderFeatureCards(currentFeatures, true);
    drawCurrentVisualization();
    return;
  }

  const range = getVisibleRange();
  const visibleRatio = (x - padding) / Math.max(1, rect.width - padding * 2);
  const globalIndex = range.startOffset + visibleRatio * Math.max(1, range.visibleCount);
  seekToRatio(globalIndex / total);
});

canvas.addEventListener("pointerdown", (event) => {
  if (currentViewMode !== "waveform" || !audioPlayer.duration || currentWaveform.length === 0) return;

  isSelectingRange = true;
  selectionAnchorRatio = getCanvasRatio(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (!isSelectingRange) return;

  const endRatio = getCanvasRatio(event);
  isSelectingRange = false;
  setSelectedRangeFromRatios(selectionAnchorRatio, endRatio);
  suppressNextCanvasClick = true;
  drawCurrentVisualization();
});

canvas.addEventListener("pointermove", (event) => {
  if (isSelectingRange && currentViewMode === "waveform" && audioPlayer.duration) {
    setSelectedRangeFromRatios(selectionAnchorRatio, getCanvasRatio(event));
    drawCurrentVisualization();
    return;
  }

  if (currentViewMode === "features" && currentFeatures) {
    const rect = canvas.getBoundingClientRect();
    featureHover = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    renderFeatureCards(currentFeatures);
    drawCurrentVisualization();
    return;
  }

  if (currentViewMode !== "spectrogram" || !currentSpectrogram?.frames?.length) return;

  const rect = canvas.getBoundingClientRect();
  spectrogramHover = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  drawCurrentVisualization();
});

canvas.addEventListener("pointerleave", () => {
  isSelectingRange = false;
  if (currentViewMode === "features") {
    featureHover = null;
    renderFeatureCards(currentFeatures, true);
    drawCurrentVisualization();
    return;
  }

  if (currentViewMode !== "spectrogram") return;

  clearSpectrogramHover();
  drawCurrentVisualization();
});

window.addEventListener("resize", () => {
  if (getTimelineLength() > 0) {
    drawCurrentVisualization();
  } else {
    drawEmptyWaveform();
  }
});

drawEmptyWaveform();
