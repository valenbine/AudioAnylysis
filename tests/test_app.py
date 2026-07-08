from io import BytesIO

import numpy as np
import soundfile as sf

from app import app, get_upload_suffix


def make_wav_upload(frequency=440, amplitude=0.5, duration=1.0, sample_rate=8000):
    buffer = BytesIO()
    time = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    samples = (amplitude * np.sin(2 * np.pi * frequency * time)).astype(np.float32)
    sf.write(buffer, samples, sample_rate, format="WAV", subtype="FLOAT")
    buffer.seek(0)
    return buffer


def test_index_page_loads():
    client = app.test_client()

    response = client.get("/")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert "Audio Analysis Lab" in html
    assert "viewEyebrow" in html
    assert "viewTitle" in html
    assert "data-view=\"waveform\"" in html
    assert "data-view=\"spectrogram\"" in html
    assert "data-view=\"features\"" in html
    assert "modeCompare" in html
    assert "analyzeSelectionButton" in html
    assert "exportMarkdownButton" in html
    assert "exportJsonButton" in html
    assert "fftSizeSelect" in html
    assert "hopSizeSelect" in html
    assert "maxFrequencySelect" in html
    assert "spectrogramReadout" in html
    assert "readoutFrequency" in html
    assert "points" not in html


def test_analyze_rejects_missing_upload():
    client = app.test_client()

    response = client.post("/api/analyze", data={})

    assert response.status_code == 400
    assert response.get_json()["error"] == "请选择一个音频文件。"


def test_analyze_returns_waveform_and_metadata_for_wav():
    client = app.test_client()

    response = client.post(
        "/api/analyze",
        data={"file": (make_wav_upload(), "tone.wav")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert payload["metadata"]["sampleRate"] == 8000
    assert payload["metadata"]["channels"] == 1
    assert payload["metadata"]["pointCount"] > 0
    assert payload["waveform"][0]["max"] >= payload["waveform"][0]["min"]
    assert "spectrogram" not in payload


def test_spectrogram_returns_frequency_data_for_wav():
    client = app.test_client()

    response = client.post(
        "/api/spectrogram",
        data={"file": (make_wav_upload(), "tone.wav")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert payload["spectrogram"]["sampleRate"] == 8000
    assert payload["spectrogram"]["binCount"] > 0
    assert len(payload["spectrogram"]["frames"]) > 0


def test_spectrogram_accepts_analysis_options():
    client = app.test_client()

    response = client.post(
        "/api/spectrogram?fftSize=2048&hopSize=256&maxFrequency=4000",
        data={"file": (make_wav_upload(), "tone.wav")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert payload["spectrogram"]["fftSize"] == 2048
    assert payload["spectrogram"]["hopSize"] == 256
    assert payload["spectrogram"]["maxFrequency"] == 4000


def test_features_returns_audio_feature_groups_for_wav():
    client = app.test_client()

    response = client.post(
        "/api/features",
        data={"file": (make_wav_upload(), "tone.wav")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert set(payload["features"]) == {"pitch", "loudness", "bandEnergy", "quality", "tempo", "selection"}
    assert {"bpm", "confidence", "beatTimes"}.issubset(payload["features"]["tempo"])
    assert payload["features"]["loudness"]["frameCount"] > 0


def test_features_accepts_time_selection_for_wav():
    client = app.test_client()

    response = client.post(
        "/api/features?startTime=0.25&endTime=0.75",
        data={"file": (make_wav_upload(duration=2.0), "tone.wav")},
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert payload["features"]["selection"] == {"startTime": 0.25, "endTime": 0.75, "duration": 0.5}
    assert "cents" in payload["features"]["pitch"]
    assert "lufsApprox" in payload["features"]["quality"]


def test_compare_returns_two_audio_summaries_and_differences():
    client = app.test_client()

    response = client.post(
        "/api/compare",
        data={
            "fileA": (make_wav_upload(frequency=220, amplitude=0.2), "a.wav"),
            "fileB": (make_wav_upload(frequency=440, amplitude=0.8), "b.wav"),
        },
        content_type="multipart/form-data",
    )

    payload = response.get_json()

    assert response.status_code == 200
    assert set(payload["comparison"]) == {"fileA", "fileB", "differences"}
    assert payload["comparison"]["differences"]["louder"] == "B"
    assert "pitchRange" in payload["comparison"]["differences"]


def test_report_exports_markdown_and_json():
    client = app.test_client()

    response = client.post(
        "/api/report",
        json={"format": "markdown", "analysis": {"metadata": {"duration": 1}, "features": {"tempo": {"bpm": 120}}}},
    )

    assert response.status_code == 200
    assert "# AudioAnylysis Report" in response.get_json()["report"]


def test_app_does_not_set_upload_size_limit():
    assert app.config.get("MAX_CONTENT_LENGTH") is None


def test_get_upload_suffix_keeps_original_audio_extension():
    assert get_upload_suffix("song.MP3") == ".mp3"
    assert get_upload_suffix("mix.m4a") == ".m4a"
