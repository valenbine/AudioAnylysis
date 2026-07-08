import numpy as np


def parse_time_range(values):
    start = parse_float(values.get("startTime"))
    end = parse_float(values.get("endTime"))
    return start, end


def parse_float(value):
    if value in (None, ""):
        return None
    return float(value)


def slice_audio_segment(samples, sample_rate, start_time=None, end_time=None):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    start = 0 if start_time is None else max(0, int(round(start_time * sample_rate)))
    end = samples.size if end_time is None else min(samples.size, int(round(end_time * sample_rate)))
    if end <= start:
        return samples[:0]
    return samples[start:end]


def selection_metadata(original_duration, start_time=None, end_time=None):
    start = 0 if start_time is None else max(0, float(start_time))
    end = original_duration if end_time is None else min(original_duration, float(end_time))
    if end < start:
        end = start
    return {"startTime": round(start, 4), "endTime": round(end, 4), "duration": round(end - start, 4)}
