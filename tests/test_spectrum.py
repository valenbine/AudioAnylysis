import numpy as np

from spectrum import build_spectrogram


def test_build_spectrogram_returns_normalized_frequency_frames():
    sample_rate = 8_000
    time = np.linspace(0, 0.25, sample_rate // 4, endpoint=False)
    samples = np.sin(2 * np.pi * 440 * time).astype(np.float32)

    spectrogram = build_spectrogram(samples, sample_rate, fft_size=256, hop_size=128, max_bins=32)

    assert spectrogram["sampleRate"] == sample_rate
    assert spectrogram["fftSize"] == 256
    assert spectrogram["hopSize"] == 128
    assert spectrogram["binCount"] == 32
    assert len(spectrogram["frequencies"]) == 32
    assert len(spectrogram["frames"]) > 0
    assert len(spectrogram["frames"][0]) == 32
    assert max(max(frame) for frame in spectrogram["frames"]) <= 1
    assert min(min(frame) for frame in spectrogram["frames"]) >= 0


def test_build_spectrogram_handles_short_audio():
    samples = np.array([0.0, 0.25, -0.25], dtype=np.float32)

    spectrogram = build_spectrogram(samples, 44_100, fft_size=64, hop_size=32, max_bins=16)

    assert spectrogram["binCount"] == 16
    assert len(spectrogram["frames"]) == 1
    assert len(spectrogram["frames"][0]) == 16


def test_build_spectrogram_limits_max_frequency():
    samples = np.ones(4096, dtype=np.float32)

    spectrogram = build_spectrogram(samples, 44_100, fft_size=1024, hop_size=512, max_frequency=4000)

    assert spectrogram["maxFrequency"] == 4000
    assert max(spectrogram["frequencies"]) <= 4000
    assert max(spectrogram["frequencies"]) > 3500
    assert spectrogram["binCount"] == len(spectrogram["frequencies"])
