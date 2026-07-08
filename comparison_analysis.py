from band_energy import analyze_band_energy
from feature_analysis import analyze_audio_features
from spectrum import build_spectrogram
from waveform import build_waveform_points


def compare_audio_records(audio_a, audio_b):
    file_a = build_audio_summary(audio_a)
    file_b = build_audio_summary(audio_b)
    return {
        "fileA": file_a,
        "fileB": file_b,
        "differences": compare_summaries(file_a, file_b),
    }


def build_audio_summary(audio):
    spectrogram = build_spectrogram(audio["samples"], audio["sample_rate"])
    return {
        "metadata": build_metadata(audio),
        "waveform": build_waveform_points(audio["samples"], target_points=240),
        "spectrogramSummary": {
            "frameCount": len(spectrogram["frames"]),
            "binCount": spectrogram["binCount"],
            "maxFrequency": spectrogram["maxFrequency"],
        },
        "features": analyze_audio_features(audio["samples"], audio["sample_rate"]),
    }


def build_metadata(audio):
    return {
        "sampleRate": audio["sample_rate"],
        "channels": audio["channels"],
        "duration": audio["duration"],
        "peakAmplitude": audio["peak_amplitude"],
        "sampleCount": audio["sample_count"],
    }


def compare_summaries(file_a, file_b):
    features_a = file_a["features"]
    features_b = file_b["features"]
    high_a = features_a["bandEnergy"]["high"]
    high_b = features_b["bandEnergy"]["high"]
    tempo_a = features_a["tempo"]["bpm"]
    tempo_b = features_b["tempo"]["bpm"]
    pitch_a = features_a["pitch"]["maxFrequency"]
    pitch_b = features_b["pitch"]["maxFrequency"]
    loud_a = features_a["loudness"]["maxRms"]
    loud_b = features_b["loudness"]["maxRms"]

    return {
        "louder": choose_side(loud_a, loud_b),
        "moreHighFrequency": choose_side(high_a, high_b),
        "fasterTempo": choose_side(tempo_a, tempo_b),
        "pitchRange": {
            "fileA": pitch_a,
            "fileB": pitch_b,
            "higher": choose_side(pitch_a, pitch_b),
        },
    }


def choose_side(value_a, value_b):
    if abs(value_a - value_b) < 1e-6:
        return "tie"
    return "A" if value_a > value_b else "B"
