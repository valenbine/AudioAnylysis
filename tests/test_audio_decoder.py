import numpy as np
from pydub import AudioSegment

from audio_decoder import audio_segment_to_float_array


def test_audio_segment_to_float_array_decodes_mono_samples():
    samples = np.array([0, 16384, -16384], dtype=np.int16)
    segment = AudioSegment(
        samples.tobytes(),
        frame_rate=8000,
        sample_width=2,
        channels=1,
    )

    result = audio_segment_to_float_array(segment)

    assert result.shape == (3,)
    assert np.allclose(result, np.array([0.0, 0.5, -0.5], dtype=np.float32), atol=0.0001)


def test_audio_segment_to_float_array_mixes_stereo_to_mono():
    samples = np.array([32767, -32767, 16384, 16384], dtype=np.int16)
    segment = AudioSegment(
        samples.tobytes(),
        frame_rate=8000,
        sample_width=2,
        channels=2,
    )

    result = audio_segment_to_float_array(segment)

    assert result.shape == (2,)
    assert np.allclose(result, np.array([0.0, 0.5], dtype=np.float32), atol=0.0001)
