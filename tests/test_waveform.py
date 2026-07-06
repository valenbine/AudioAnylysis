import numpy as np

from waveform import build_waveform_points


def test_build_waveform_points_returns_min_max_buckets():
    samples = np.array([0.0, 0.5, -0.5, 1.0, -1.0, 0.25], dtype=np.float32)

    points = build_waveform_points(samples, target_points=3)

    assert points == [
        {"min": 0.0, "max": 0.5},
        {"min": -0.5, "max": 1.0},
        {"min": -1.0, "max": 0.25},
    ]


def test_build_waveform_points_handles_empty_samples():
    assert build_waveform_points(np.array([], dtype=np.float32)) == []


def test_build_waveform_points_limits_output_count():
    samples = np.linspace(-1.0, 1.0, 1000, dtype=np.float32)

    points = build_waveform_points(samples, target_points=100)

    assert len(points) == 100
