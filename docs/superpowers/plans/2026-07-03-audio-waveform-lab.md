# Audio Waveform Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished Flask web app that uploads a WAV file, analyzes it with focused Python modules, and renders a waveform in the browser.

**Architecture:** Flask serves one HTML page and an `/api/analyze` endpoint. Backend modules are split by responsibility: upload validation, WAV reading, and waveform bucket generation. Plain JavaScript handles upload interactions and canvas rendering.

**Tech Stack:** Python 3, Flask, NumPy, SoundFile, pytest, HTML, CSS, Canvas JavaScript.

## Global Constraints

- Keep each separable backend responsibility in its own Python file.
- Accept WAV uploads only.
- Provide a polished single-page UI with a hero section, upload area, waveform canvas, and audio metadata cards.
- Return sample rate, duration, channel count, peak amplitude, and waveform point count.
- Display frontend loading and error states without page reloads.

---

## File Structure

- Create `requirements.txt`: runtime and test dependencies.
- Create `app.py`: Flask page route and upload analysis API.
- Create `audio_reader.py`: WAV decoding and metadata extraction.
- Create `waveform.py`: waveform point generation.
- Create `validators.py`: upload validation helpers.
- Create `templates/index.html`: single-page application shell.
- Create `static/app.css`: high-end hero and app styling.
- Create `static/app.js`: upload flow, API call, canvas rendering.
- Create `tests/test_validators.py`: upload validation tests.
- Create `tests/test_waveform.py`: waveform bucket tests.
- Create `tests/test_audio_reader.py`: generated WAV reading tests.

---

### Task 1: Dependencies and Validation Module

**Files:**
- Create: `requirements.txt`
- Create: `validators.py`
- Create: `tests/test_validators.py`

**Interfaces:**
- Produces: `validate_wav_upload(file_storage) -> tuple[bool, str | None]`
- Produces: `is_allowed_wav(filename: str) -> bool`

- [ ] **Step 1: Write validation tests**

```python
from io import BytesIO

from werkzeug.datastructures import FileStorage

from validators import is_allowed_wav, validate_wav_upload


def make_file(filename):
    return FileStorage(stream=BytesIO(b"data"), filename=filename)


def test_is_allowed_wav_accepts_wav_extension_case_insensitive():
    assert is_allowed_wav("sample.WAV") is True


def test_is_allowed_wav_rejects_other_extensions():
    assert is_allowed_wav("sample.mp3") is False


def test_validate_wav_upload_rejects_missing_file():
    valid, message = validate_wav_upload(None)
    assert valid is False
    assert message == "请选择一个 WAV 文件。"


def test_validate_wav_upload_rejects_empty_filename():
    valid, message = validate_wav_upload(make_file(""))
    assert valid is False
    assert message == "请选择一个 WAV 文件。"


def test_validate_wav_upload_accepts_wav():
    valid, message = validate_wav_upload(make_file("voice.wav"))
    assert valid is True
    assert message is None
```

- [ ] **Step 2: Run failing tests**

Run: `pytest tests/test_validators.py -v`
Expected: FAIL because `validators.py` does not exist yet.

- [ ] **Step 3: Add dependencies and validation module**

```text
Flask==3.0.3
numpy==1.26.4
soundfile==0.12.1
pytest==8.2.2
```

```python
ALLOWED_EXTENSIONS = {"wav"}


def is_allowed_wav(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_wav_upload(file_storage):
    if file_storage is None or not file_storage.filename:
        return False, "请选择一个 WAV 文件。"

    if not is_allowed_wav(file_storage.filename):
        return False, "当前版本只支持 WAV 文件。"

    return True, None
```

- [ ] **Step 4: Run validation tests**

Run: `pytest tests/test_validators.py -v`
Expected: PASS.

---

### Task 2: Audio Reader Module

**Files:**
- Create: `audio_reader.py`
- Create: `tests/test_audio_reader.py`

**Interfaces:**
- Consumes: WAV file path string.
- Produces: `read_wav_file(path: str) -> dict` with keys `samples`, `sample_rate`, `channels`, `duration`, `peak_amplitude`, `sample_count`.

- [ ] **Step 1: Write audio reader tests**

```python
import numpy as np
import soundfile as sf

from audio_reader import read_wav_file


def test_read_wav_file_returns_metadata_for_mono_file(tmp_path):
    path = tmp_path / "tone.wav"
    samples = np.array([0.0, 0.5, -0.5, 1.0], dtype=np.float32)
    sf.write(path, samples, 8000)

    result = read_wav_file(str(path))

    assert result["sample_rate"] == 8000
    assert result["channels"] == 1
    assert result["sample_count"] == 4
    assert result["duration"] == 0.0005
    assert result["peak_amplitude"] == 1.0
    assert result["samples"].shape == (4,)


def test_read_wav_file_mixes_stereo_to_mono_samples(tmp_path):
    path = tmp_path / "stereo.wav"
    samples = np.array([[1.0, -1.0], [0.5, 0.5]], dtype=np.float32)
    sf.write(path, samples, 8000)

    result = read_wav_file(str(path))

    assert result["channels"] == 2
    assert result["samples"].shape == (2,)
```

- [ ] **Step 2: Run failing tests**

Run: `pytest tests/test_audio_reader.py -v`
Expected: FAIL because `audio_reader.py` does not exist yet.

- [ ] **Step 3: Implement WAV reader**

```python
import numpy as np
import soundfile as sf


def read_wav_file(path: str) -> dict:
    samples, sample_rate = sf.read(path, always_2d=False)
    samples = np.asarray(samples, dtype=np.float32)

    if samples.ndim == 1:
        channels = 1
        mono_samples = samples
    else:
        channels = samples.shape[1]
        mono_samples = samples.mean(axis=1)

    sample_count = int(mono_samples.shape[0])
    duration = sample_count / float(sample_rate) if sample_rate else 0.0
    peak = float(np.max(np.abs(mono_samples))) if sample_count else 0.0

    return {
        "samples": mono_samples,
        "sample_rate": int(sample_rate),
        "channels": int(channels),
        "duration": round(duration, 6),
        "peak_amplitude": round(peak, 6),
        "sample_count": sample_count,
    }
```

- [ ] **Step 4: Run audio reader tests**

Run: `pytest tests/test_audio_reader.py -v`
Expected: PASS.

---

### Task 3: Waveform Module

**Files:**
- Create: `waveform.py`
- Create: `tests/test_waveform.py`

**Interfaces:**
- Consumes: NumPy-like sample array and optional width.
- Produces: `build_waveform_points(samples, target_points: int = 1200) -> list[dict[str, float]]`.

- [ ] **Step 1: Write waveform tests**

```python
import numpy as np

from waveform import build_waveform_points


def test_build_waveform_points_returns_min_max_buckets():
    samples = np.array([0.0, 0.5, -0.5, 1.0, -1.0, 0.25], dtype=np.float32)

    points = build_waveform_points(samples, target_points=3)

    assert points == [
        {"min": 0.0, "max": 0.5},
        {"min": -0.5, "max": 1.0},
        {"min": -1.0, "max": 0.25},
    ]


def test_build_waveform_points_handles_empty_samples():
    assert build_waveform_points(np.array([], dtype=np.float32)) == []


def test_build_waveform_points_limits_output_count():
    samples = np.linspace(-1.0, 1.0, 1000, dtype=np.float32)

    points = build_waveform_points(samples, target_points=100)

    assert len(points) == 100
```

- [ ] **Step 2: Run failing tests**

Run: `pytest tests/test_waveform.py -v`
Expected: FAIL because `waveform.py` does not exist yet.

- [ ] **Step 3: Implement waveform buckets**

```python
import math

import numpy as np


def build_waveform_points(samples, target_points: int = 1200) -> list[dict[str, float]]:
    sample_array = np.asarray(samples, dtype=np.float32)
    if sample_array.size == 0:
        return []

    target_points = max(1, int(target_points))
    bucket_size = max(1, math.ceil(sample_array.size / target_points))
    points = []

    for start in range(0, sample_array.size, bucket_size):
        bucket = sample_array[start:start + bucket_size]
        points.append({
            "min": round(float(np.min(bucket)), 6),
            "max": round(float(np.max(bucket)), 6),
        })

    return points[:target_points]
```

- [ ] **Step 4: Run waveform tests**

Run: `pytest tests/test_waveform.py -v`
Expected: PASS.

---

### Task 4: Flask API and Page Shell

**Files:**
- Create: `app.py`
- Create: `templates/index.html`

**Interfaces:**
- Consumes: `validate_wav_upload`, `read_wav_file`, `build_waveform_points`.
- Produces: `GET /` HTML page and `POST /api/analyze` JSON response.

- [ ] **Step 1: Implement Flask app**

```python
import os
from tempfile import NamedTemporaryFile

from flask import Flask, jsonify, render_template, request

from audio_reader import read_wav_file
from validators import validate_wav_upload
from waveform import build_waveform_points


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/analyze")
def analyze_audio():
    upload = request.files.get("file")
    valid, message = validate_wav_upload(upload)
    if not valid:
        return jsonify({"error": message}), 400

    temp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            upload.save(temp_file.name)
            temp_path = temp_file.name

        audio = read_wav_file(temp_path)
        points = build_waveform_points(audio["samples"])

        return jsonify({
            "metadata": {
                "sampleRate": audio["sample_rate"],
                "channels": audio["channels"],
                "duration": audio["duration"],
                "peakAmplitude": audio["peak_amplitude"],
                "sampleCount": audio["sample_count"],
                "pointCount": len(points),
            },
            "waveform": points,
        })
    except Exception:
        return jsonify({"error": "音频解析失败，请确认文件是有效的 WAV。"}), 400
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```

- [ ] **Step 2: Implement HTML shell**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Audio Analysis Lab</title>
    <link rel="stylesheet" href="/static/app.css">
  </head>
  <body>
    <main class="page-shell">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Audio Analysis Lab</p>
          <h1>从一段 WAV 开始理解声音</h1>
          <p class="hero-text">上传音频，查看波形、采样率、声道和幅度信息，为音高识别、和弦识别、节拍分析和音轨分离打基础。</p>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="orbital-line"></div>
          <div class="spectrum-bars">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
      </section>

      <section class="workspace">
        <div class="upload-panel" id="dropZone">
          <input id="fileInput" type="file" accept=".wav,audio/wav" hidden>
          <button class="upload-button" id="uploadButton" type="button">选择 WAV 文件</button>
          <p id="fileLabel">也可以把文件拖到这里</p>
          <p class="status" id="statusText">等待上传</p>
        </div>

        <div class="waveform-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Waveform</p>
              <h2>波形视图</h2>
            </div>
            <span id="pointBadge">0 points</span>
          </div>
          <canvas id="waveformCanvas" width="1200" height="360"></canvas>
        </div>

        <div class="metadata-grid" id="metadataGrid"></div>
      </section>
    </main>
    <script src="/static/app.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Run tests**

Run: `pytest -v`
Expected: PASS.

---

### Task 5: Frontend Styling and Canvas Interaction

**Files:**
- Create: `static/app.css`
- Create: `static/app.js`

**Interfaces:**
- Consumes: `/api/analyze` JSON response.
- Produces: polished UI and waveform canvas rendering.

- [ ] **Step 1: Add CSS**

Use a dark high-end visual design with responsive layout, hero, upload panel, waveform panel, and metadata cards.

- [ ] **Step 2: Add JavaScript**

Implement drag/drop upload, loading state, error state, metadata rendering, and canvas waveform drawing.

- [ ] **Step 3: Run Flask server**

Run: `python app.py`
Expected: Flask starts on port 5000.

- [ ] **Step 4: Manual verification**

Upload a WAV file. Expected: metadata cards update and waveform appears in the canvas.

---

## Self-Review

- Spec coverage: The plan covers validation, WAV reading, waveform point generation, Flask API, polished UI, loading/error states, and verification.
- Placeholder scan: No TBD or TODO placeholders remain. The CSS and JS task describes concrete responsibilities and will be implemented directly in execution.
- Type consistency: Function names and response keys are consistent across backend and frontend tasks.
