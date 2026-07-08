# AudioAnylysis

AudioAnylysis is a Flask-based audio analysis learning app. It lets you upload common audio formats, inspect waveform and spectrogram views, play audio with zoom/follow controls, and review audio features such as pitch, loudness, tempo, band energy, silence, peaks, and clipping.

## Features

- Upload WAV, MP3, FLAC, OGG, M4A, and AAC files.
- Decode audio with SoundFile first and pydub/ffmpeg fallback for broader format support.
- View waveform with playback, seeking, horizontal zoom, and follow playhead.
- Generate spectrograms with configurable FFT size, hop size, and frequency range.
- Analyze pitch with frame-based autocorrelation and subharmonic correction.
- Analyze loudness with RMS and peak curves.
- Estimate tempo/BPM from onset energy and show beat markers.
- Compare low, mid, and high frequency energy ratios.
- Detect silence frames, peak level, and clipping risk.
- Select a time range on the waveform and analyze only that segment.
- Compare two audio files side by side with A/B difference summaries.
- Export analysis reports as Markdown or JSON.
- Show pitch calibration with nearest note and cents offset.
- Estimate noise floor, dynamic range, and approximate LUFS with recording recommendations.

## Tech Stack

- Python 3.11+
- Flask 3
- NumPy
- SoundFile
- pydub
- Plain HTML, CSS, and JavaScript
- pytest

## Requirements

Install Python dependencies:

```bash
pip install -r requirements.txt
```

For MP3, M4A, AAC, and other fallback formats, install `ffmpeg` on the system path.

## Run Locally

```bash
python3 app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Run Tests

```bash
pytest -q
```

## API Overview

### `POST /api/analyze`

Accepts a multipart upload field named `file` and returns metadata plus waveform buckets.

### `POST /api/spectrogram`

Accepts a multipart upload field named `file` and returns spectrogram frames.

Optional query parameters:

- `fftSize`: `512`, `1024`, `2048`, or `4096`
- `hopSize`: `128`, `256`, `512`, or `1024`
- `maxFrequency`: `2000`, `4000`, `8000`, `12000`, or `20000`

### `POST /api/features`

Accepts a multipart upload field named `file` and returns:

- `pitch`: pitch summary and frame-by-frame pitch curve
- `loudness`: RMS and peak loudness curve
- `bandEnergy`: low, mid, and high frequency energy ratios
- `quality`: silence, peak, and clipping indicators
- `tempo`: BPM estimate, confidence, and beat times

Optional query parameters:

- `startTime`: selection start in seconds
- `endTime`: selection end in seconds

### `POST /api/compare`

Accepts multipart upload fields named `fileA` and `fileB`. Returns both audio summaries and differences for loudness, high-frequency energy, tempo, and pitch range.

### `POST /api/report`

Accepts JSON with `format` (`markdown` or `json`) and an `analysis` object. Returns a shareable report string.

## Project Structure

```text
app.py                  Flask routes and upload handling
audio_decoder.py        Audio decoding through SoundFile and pydub
audio_reader.py         Sample normalization and metadata extraction
waveform.py             Waveform bucket generation
spectrum.py             Spectrogram generation
feature_analysis.py     Combined feature analysis entry point
pitch_detection.py      Pitch detection and pitch curves
loudness_analysis.py    RMS and peak loudness curves
band_energy.py          Low/mid/high band energy ratios
quality_detection.py    Silence, peak, and clipping checks
tempo_detection.py      BPM and beat time estimation
comparison_analysis.py  A/B audio summary and difference analysis
report_export.py        Markdown and JSON report export
selection_analysis.py   Time-range parsing and sample slicing
music_theory.py         Pitch calibration helpers
quality_metrics.py      Noise floor, dynamic range, and LUFS estimates
templates/index.html    Application shell
static/app.css          UI styling
static/app.js           Browser interactions and canvas rendering
```

## Notes

- The app intentionally does not set a Flask upload size limit.
- Uploaded files are saved to temporary files during analysis and removed after decoding.
- Tempo estimation works best on audio with clear rhythmic onsets. Pure tones may produce low-confidence BPM estimates.
