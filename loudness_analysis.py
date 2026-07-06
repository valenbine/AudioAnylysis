import numpy as np


def build_loudness_curve(samples, sample_rate, frame_size=2048, hop_size=1024):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        samples = np.zeros(1, dtype=np.float32)

    frames = []
    for start in range(0, max(1, samples.size), hop_size):
        frame = samples[start:start + frame_size]
        if frame.size == 0:
            continue
        rms = float(np.sqrt(np.mean(np.square(frame))))
        peak = float(np.max(np.abs(frame)))
        frames.append({
            "time": round(start / sample_rate, 4),
            "rms": round(rms, 4),
            "peak": round(peak, 4),
        })
        if start + frame_size >= samples.size:
            break

    max_rms = max((frame["rms"] for frame in frames), default=0)
    max_peak = max((frame["peak"] for frame in frames), default=0)
    return {
        "frameCount": len(frames),
        "maxRms": max_rms,
        "maxPeak": max_peak,
        "frames": frames,
    }
