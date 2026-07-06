# Audio Waveform Lab Design

## Goal

Build a beginner-friendly audio analysis web app that accepts a WAV file, reads its audio data in Python, and displays an attractive waveform view in the browser. The first version focuses on the foundation needed for later pitch, chord, beat, BPM, and source separation lessons.

## Scope

- Provide a polished single-page UI with a hero section, upload area, waveform canvas, and audio metadata cards.
- Accept WAV uploads from the browser.
- Validate uploaded files before analysis.
- Read WAV data on the server with Python.
- Convert raw samples into compact waveform points suitable for frontend drawing.
- Return metadata such as sample rate, duration, channel count, peak amplitude, and point count.
- Keep each separable backend responsibility in its own Python file.

## Architecture

The project will use Flask for the web server and plain HTML/CSS/JavaScript for the frontend. This keeps the learning stack small while leaving the backend Python modules easy to inspect and extend.

Project layout:

```text
audio-lab/
  app.py
  audio_reader.py
  waveform.py
  validators.py
  static/
    app.css
    app.js
  templates/
    index.html
  uploads/
  requirements.txt
```

## Backend Modules

- `app.py`: Flask app, page route, upload API, JSON responses.
- `audio_reader.py`: Reads WAV files and normalizes channel/sample metadata.
- `waveform.py`: Downsamples audio into min/max waveform buckets for rendering.
- `validators.py`: Checks extension, file presence, and upload constraints.

## Frontend

The UI will present the app as an audio learning lab with a high-end hero section. The main interaction is a drag-and-drop upload panel followed by a large waveform display.

The page will include:

- Hero section with strong typography and a music-analysis visual style.
- Upload panel with drag/drop and file picker support.
- Loading and error states.
- Canvas waveform renderer.
- Metadata cards for sample rate, duration, channels, peak amplitude, and waveform points.

## Data Flow

1. User selects or drops a WAV file.
2. Frontend posts the file to `/api/analyze`.
3. `validators.py` validates the upload.
4. `audio_reader.py` loads sample data and metadata.
5. `waveform.py` generates compact waveform data.
6. Flask returns JSON.
7. Frontend updates metadata cards and draws the waveform.

## Error Handling

- Missing file returns a user-readable upload error.
- Unsupported extension returns a WAV-only validation message.
- Audio decoding failures return a readable analysis error.
- Frontend displays errors inside the upload/workspace area without page reloads.

## Verification

- Install dependencies from `requirements.txt`.
- Start the Flask app locally.
- Upload a small WAV file and verify metadata appears.
- Confirm the waveform canvas renders visible amplitude changes.
- Confirm unsupported files show a friendly error.

## Future Extensions

- Add spectrogram generation.
- Add BPM and beat tracking with librosa.
- Add pitch tracking.
- Add chord feature visualization with Chroma.
- Add source separation using Demucs.
