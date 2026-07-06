import numpy as np
import soundfile as sf
from pydub import AudioSegment


def audio_segment_to_float_array(segment: AudioSegment) -> np.ndarray:
    raw_samples = np.array(segment.get_array_of_samples())
    channels = int(segment.channels)
    max_value = float(1 << (8 * segment.sample_width - 1))
    samples = raw_samples.astype(np.float32) / max_value

    if channels > 1:
        samples = samples.reshape((-1, channels)).mean(axis=1)

    return samples.astype(np.float32)


def decode_audio_file(path: str) -> tuple[np.ndarray, int]:
    try:
        samples, sample_rate = sf.read(path, always_2d=False)
        return np.asarray(samples, dtype=np.float32), int(sample_rate)
    except Exception:
        segment = AudioSegment.from_file(path)
        return audio_segment_to_float_array(segment), int(segment.frame_rate)
