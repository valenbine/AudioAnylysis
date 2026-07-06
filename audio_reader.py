import numpy as np

from audio_decoder import decode_audio_file


def read_wav_file(path: str) -> dict:
    samples, sample_rate = decode_audio_file(path)
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
