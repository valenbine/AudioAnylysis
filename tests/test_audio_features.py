import numpy as np

from band_energy import analyze_band_energy
from feature_analysis import analyze_audio_features
from loudness_analysis import build_loudness_curve
from music_theory import pitch_calibration
from pitch_detection import build_pitch_curve, detect_pitch
from quality_detection import detect_quality_issues
from quality_metrics import build_quality_metrics
from report_export import export_report
from selection_analysis import slice_audio_segment
from tempo_detection import detect_tempo


def sine_wave(frequency=440, sample_rate=44_100, duration=1.0, amplitude=0.7):
    time = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return (amplitude * np.sin(2 * np.pi * frequency * time)).astype(np.float32)


def pulse_train(bpm=120, sample_rate=44_100, duration=4.0):
    samples = np.zeros(int(sample_rate * duration), dtype=np.float32)
    interval = 60 / bpm
    pulse_width = int(sample_rate * 0.025)
    for beat in np.arange(0, duration, interval):
        start = int(beat * sample_rate)
        end = min(samples.size, start + pulse_width)
        samples[start:end] = np.hanning(end - start)
    return samples


def test_detect_pitch_estimates_a4_for_440hz_sine():
    result = detect_pitch(sine_wave(), 44_100)

    assert result["note"] == "A4"
    assert abs(result["frequency"] - 440) < 3
    assert result["confidence"] > 0.5


def test_pitch_calibration_reports_cents_from_nearest_note():
    result = pitch_calibration(443)

    assert result["nearestNote"] == "A4"
    assert 10 < result["cents"] < 13
    assert result["tuningLabel"] == "A4 +12 cents"


def test_detect_pitch_uses_fundamental_when_second_harmonic_is_stronger():
    samples = sine_wave(220, amplitude=0.35) + sine_wave(440, amplitude=0.9)

    result = detect_pitch(samples, 44_100)

    assert result["note"] == "A3"
    assert abs(result["frequency"] - 220) < 5


def test_build_pitch_curve_tracks_pitch_changes_over_time():
    first = sine_wave(220, duration=0.25)
    second = sine_wave(440, duration=0.25)
    samples = np.concatenate([first, second])

    result = build_pitch_curve(samples, 44_100, frame_size=4096, hop_size=2048)
    voiced_frames = [frame for frame in result["frames"] if frame["frequency"] > 0]

    assert result["frameCount"] > 2
    assert len(result["frames"]) == result["frameCount"]
    assert voiced_frames[0]["frequency"] < voiced_frames[-1]["frequency"]
    assert voiced_frames[0]["note"] == "A3"
    assert voiced_frames[-1]["note"] == "A4"
    assert "cents" in voiced_frames[0]


def test_build_loudness_curve_returns_rms_and_peak_frames():
    result = build_loudness_curve(sine_wave(duration=0.5), 44_100, frame_size=1024, hop_size=512)

    assert result["frameCount"] > 0
    assert len(result["frames"]) == result["frameCount"]
    assert result["maxRms"] > 0
    assert result["maxPeak"] > 0
    assert {"time", "rms", "peak"}.issubset(result["frames"][0])


def test_analyze_band_energy_returns_normalized_bands():
    result = analyze_band_energy(sine_wave(120), 44_100)


    assert set(result) == {"low", "mid", "high"}
    assert abs(sum(result.values()) - 1) < 0.01
    assert result["low"] > result["mid"]


def test_detect_quality_issues_finds_silence_and_clipping():
    samples = np.concatenate([
        np.zeros(2048, dtype=np.float32),
        np.array([0.0, 1.0, -1.0, 0.5], dtype=np.float32),
    ])

    result = detect_quality_issues(samples, 44_100, frame_size=512, hop_size=512)

    assert result["maxPeak"] == 1.0
    assert result["isClipped"] is True
    assert result["silenceFrameCount"] > 0
    assert {"noiseFloorDb", "dynamicRangeDb", "lufsApprox", "recommendations"}.issubset(result)


def test_build_quality_metrics_reports_recording_recommendations():
    quiet = sine_wave(amplitude=0.02)
    result = build_quality_metrics(quiet)

    assert result["lufsApprox"] < -25
    assert any("音量偏低" in item for item in result["recommendations"])


def test_slice_audio_segment_limits_analysis_window():
    samples = sine_wave(duration=2.0)
    sliced = slice_audio_segment(samples, 44_100, 0.5, 1.0)

    assert sliced.size == 22_050


def test_detect_tempo_estimates_bpm_from_regular_pulses():
    result = detect_tempo(pulse_train(120), 44_100)

    assert abs(result["bpm"] - 120) < 4
    assert result["confidence"] > 0.4
    assert len(result["beatTimes"]) >= 6


def test_analyze_audio_features_combines_all_feature_groups():
    result = analyze_audio_features(sine_wave(duration=2.0), 44_100, start_time=0.25, end_time=0.75)

    assert set(result) == {"pitch", "loudness", "bandEnergy", "quality", "tempo", "selection"}
    assert result["selection"] == {"startTime": 0.25, "endTime": 0.75, "duration": 0.5}
    assert result["pitch"]["note"] == "A4"
    assert result["pitch"]["summary"]["note"] == "A4"
    assert result["pitch"]["frameCount"] > 0
    assert len(result["pitch"]["frames"]) == result["pitch"]["frameCount"]
    assert result["loudness"]["frameCount"] > 0
    assert {"bpm", "confidence", "beatTimes"}.issubset(result["tempo"])


def test_export_report_supports_markdown_and_json():
    analysis = {"metadata": {"duration": 1.0}, "features": {"tempo": {"bpm": 120}}}

    markdown = export_report(analysis, "markdown")
    json_report = export_report(analysis, "json")

    assert "# AudioAnylysis Report" in markdown
    assert "120" in json_report
