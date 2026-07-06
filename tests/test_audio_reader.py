import numpy as np
import soundfile as sf

from audio_reader import read_wav_file


def test_read_wav_file_returns_metadata_for_mono_file(tmp_path):
    path = tmp_path / "tone.wav"
    samples = np.array([0.0, 0.5, -0.5, 1.0], dtype=np.float32)
    sf.write(path, samples, 8000, subtype="FLOAT")

    result = read_wav_file(str(path))

    assert result["sample_rate"] == 8000
    assert result["channels"] == 1
    assert result["sample_count"] == 4
    assert result["duration"] == 0.0005
    assert result["peak_amplitude"] == 1.0
    assert result["samples"].shape == (4,)


def test_read_wav_file_mixes_stereo_to_mono_samples(tmp_path):
    path = tmp_path / "stereo.wav"
    samples = np.array([[1.0, -1.0], [0.5, 0.5]], dtype=np.float32)
    sf.write(path, samples, 8000, subtype="FLOAT")

    result = read_wav_file(str(path))

    assert result["channels"] == 2
    assert result["samples"].shape == (2,)
