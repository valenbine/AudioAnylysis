import numpy as np

from quality_metrics import build_quality_metrics


def detect_quality_issues(samples, sample_rate, frame_size=2048, hop_size=1024):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        result = {
            "maxPeak": 0,
            "isClipped": False,
            "clippedSampleCount": 0,
            "silenceFrameCount": 0,
            "silenceSegments": [],
        }
        result.update(build_quality_metrics(samples))
        return result

    abs_samples = np.abs(samples)
    clipped = abs_samples >= 0.999
    silence_segments = []
    silence_count = 0
    active_segment = None

    for start in range(0, samples.size, hop_size):
        frame = samples[start:start + frame_size]
        if frame.size == 0:
            continue
        rms = float(np.sqrt(np.mean(np.square(frame))))
        is_silent = rms < 0.005
        if is_silent:
            silence_count += 1
            if active_segment is None:
                active_segment = {"start": start / sample_rate, "end": min(samples.size, start + frame_size) / sample_rate}
            else:
                active_segment["end"] = min(samples.size, start + frame_size) / sample_rate
        elif active_segment is not None:
            silence_segments.append(round_segment(active_segment))
            active_segment = None

    if active_segment is not None:
        silence_segments.append(round_segment(active_segment))

    result = {
        "maxPeak": round(float(np.max(abs_samples)), 4),
        "isClipped": bool(np.any(clipped)),
        "clippedSampleCount": int(np.count_nonzero(clipped)),
        "silenceFrameCount": silence_count,
        "silenceSegments": silence_segments[:20],
    }
    result.update(build_quality_metrics(samples))
    return result


def round_segment(segment):
    return {"start": round(segment["start"], 4), "end": round(segment["end"], 4)}
