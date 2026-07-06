# Audio Player Waveform Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio playback controls, waveform seeking, moving playhead cursor, horizontal zoom, and common audio format support.

**Architecture:** The frontend keeps a local object URL for browser playback and uses backend waveform metadata for visualization. The backend accepts common audio extensions and decodes them through a dedicated Python module, using SoundFile first and ffmpeg-backed pydub as fallback. Canvas rendering maps visible waveform slices to the current zoom window and playhead time.

**Tech Stack:** Flask, NumPy, SoundFile, pydub, ffmpeg, pytest, HTML, CSS, Canvas JavaScript, native HTMLAudioElement.

## Global Constraints

- Keep each separable backend responsibility in its own Python file.
- Support common audio formats: WAV, MP3, FLAC, OGG, M4A, AAC.
- Use browser-native audio playback for user playback controls.
- Keep backend analysis format-agnostic by returning samples and metadata.
- Waveform click must seek playback time.
- Playback cursor must move with audio time.
- Horizontal zoom must change waveform time scale without changing audio playback speed.

---

## File Structure

- Modify `requirements.txt`: add `pydub`.
- Modify `validators.py`: support common audio extensions.
- Create `audio_decoder.py`: format-agnostic audio decoding with SoundFile and pydub fallback.
- Modify `audio_reader.py`: delegate decoding to `audio_decoder.py` and normalize samples.
- Modify `tests/test_validators.py`: validate common extensions.
- Create `tests/test_audio_decoder.py`: test pydub sample conversion helpers.
- Modify `templates/index.html`: add audio element, transport bar, time display, zoom controls.
- Modify `static/app.css`: style transport controls and waveform interaction affordances.
- Modify `static/app.js`: implement playback state, progress dragging, waveform click seek, playhead, zoom.

---

### Task 1: Common Audio Format Validation

**Files:**
- Modify: `validators.py`
- Modify: `tests/test_validators.py`

**Interfaces:**
- Produces: `is_allowed_audio(filename: str) -> bool`
- Keeps: `is_allowed_wav(filename: str) -> bool` as compatibility alias.

- [ ] Write failing tests for MP3, FLAC, OGG, M4A, AAC acceptance and unsupported extension rejection.
- [ ] Run `pytest tests/test_validators.py -v` and verify failures.
- [ ] Implement common extension validation.
- [ ] Run `pytest tests/test_validators.py -v` and verify pass.

---

### Task 2: Format-Agnostic Audio Decoder

**Files:**
- Create: `audio_decoder.py`
- Modify: `audio_reader.py`
- Create: `tests/test_audio_decoder.py`
- Modify: `tests/test_audio_reader.py`

**Interfaces:**
- Produces: `decode_audio_file(path: str) -> tuple[np.ndarray, int]`
- Produces: `audio_segment_to_float_array(segment) -> np.ndarray`
- Consumes: `read_wav_file(path: str) -> dict` existing interface.

- [ ] Write failing tests for pydub sample conversion and reader using decoded samples.
- [ ] Run decoder and reader tests and verify failures.
- [ ] Implement decoder with SoundFile first, pydub fallback.
- [ ] Run decoder and reader tests and verify pass.

---

### Task 3: Playback Controls Markup and Styling

**Files:**
- Modify: `templates/index.html`
- Modify: `static/app.css`

**Interfaces:**
- Adds DOM ids: `audioPlayer`, `playButton`, `progressSlider`, `currentTime`, `totalTime`, `zoomSlider`, `zoomValue`, `resetZoomButton`.

- [ ] Add player controls inside waveform panel.
- [ ] Add CSS for transport bar, sliders, time readouts, and clickable waveform cursor.
- [ ] Run backend tests to verify templates still render.

---

### Task 4: Playback, Seeking, Cursor, and Zoom JavaScript

**Files:**
- Modify: `static/app.js`

**Interfaces:**
- Uses browser `HTMLAudioElement` object URL for playback.
- Maintains `currentZoom`, `viewStartRatio`, `currentWaveform`, `currentMetadata`.

- [ ] Store uploaded file object URL after successful analysis.
- [ ] Wire play/pause button and time/progress updates.
- [ ] Draw playhead cursor over waveform.
- [ ] Seek when progress slider changes.
- [ ] Seek when canvas is clicked.
- [ ] Implement horizontal zoom slider and reset zoom.
- [ ] Preserve responsive redraw on resize.

---

## Self-Review

- Spec coverage: The plan covers playback progress, dragging, moving cursor, waveform click seeking, horizontal zoom, and common audio formats.
- Placeholder scan: No placeholder sections remain.
- Type consistency: Backend function names and frontend DOM ids are named explicitly and consistently.
