import math

import numpy as np


def build_waveform_points(samples, target_points: int = 1200) -> list[dict[str, float]]:
    sample_array = np.asarray(samples, dtype=np.float32)
    if sample_array.size == 0:
        return []

    target_points = max(1, int(target_points))
    bucket_size = max(1, math.ceil(sample_array.size / target_points))
    points = []

    for start in range(0, sample_array.size, bucket_size):
        bucket = sample_array[start:start + bucket_size]
        points.append({
            "min": round(float(np.min(bucket)), 6),
            "max": round(float(np.max(bucket)), 6),
        })

    return points[:target_points]
