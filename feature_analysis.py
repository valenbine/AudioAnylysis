from band_energy import analyze_band_energy
from loudness_analysis import build_loudness_curve
from pitch_detection import build_pitch_curve
from quality_detection import detect_quality_issues
from selection_analysis import selection_metadata, slice_audio_segment
from tempo_detection import detect_tempo


def analyze_audio_features(samples, sample_rate, start_time=None, end_time=None):
    duration = len(samples) / sample_rate if sample_rate else 0
    selected = slice_audio_segment(samples, sample_rate, start_time, end_time)
    return {
        "pitch": build_pitch_curve(selected, sample_rate),
        "loudness": build_loudness_curve(selected, sample_rate),
        "bandEnergy": analyze_band_energy(selected, sample_rate),
        "quality": detect_quality_issues(selected, sample_rate),
        "tempo": detect_tempo(selected, sample_rate),
        "selection": selection_metadata(duration, start_time, end_time),
    }
