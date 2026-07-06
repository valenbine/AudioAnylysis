from band_energy import analyze_band_energy
from loudness_analysis import build_loudness_curve
from pitch_detection import build_pitch_curve
from quality_detection import detect_quality_issues
from tempo_detection import detect_tempo


def analyze_audio_features(samples, sample_rate):
    return {
        "pitch": build_pitch_curve(samples, sample_rate),
        "loudness": build_loudness_curve(samples, sample_rate),
        "bandEnergy": analyze_band_energy(samples, sample_rate),
        "quality": detect_quality_issues(samples, sample_rate),
        "tempo": detect_tempo(samples, sample_rate),
    }
