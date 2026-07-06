import numpy as np


def detect_tempo(samples, sample_rate, frame_size=1024, hop_size=512, min_bpm=60, max_bpm=200):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size < frame_size:
        return {"bpm": 0, "confidence": 0, "beatTimes": []}

    envelope = build_energy_envelope(samples, frame_size, hop_size)
    onset = np.diff(envelope, prepend=envelope[0])
    onset = np.maximum(onset, 0)
    if float(np.max(onset)) <= 1e-8:
        return {"bpm": 0, "confidence": 0, "beatTimes": []}

    onset = onset - np.mean(onset)
    autocorr = np.correlate(onset, onset, mode="full")[onset.size - 1:]
    frame_rate = sample_rate / hop_size
    min_lag = max(1, int(round(frame_rate * 60 / max_bpm)))
    max_lag = min(autocorr.size - 1, int(round(frame_rate * 60 / min_bpm)))
    if max_lag <= min_lag:
        return {"bpm": 0, "confidence": 0, "beatTimes": []}

    search = autocorr[min_lag:max_lag + 1]
    best_lag = min_lag + int(np.argmax(search))
    bpm = 60 * frame_rate / best_lag
    confidence = float(autocorr[best_lag] / (autocorr[0] + 1e-8)) if autocorr[0] > 0 else 0
    beat_times = estimate_beat_times(onset, sample_rate, hop_size, best_lag)

    return {
        "bpm": round(float(bpm), 2),
        "confidence": round(min(1, max(0, confidence)), 3),
        "beatTimes": beat_times,
    }


def build_energy_envelope(samples, frame_size, hop_size):
    values = []
    for start in range(0, samples.size - frame_size + 1, hop_size):
        frame = samples[start:start + frame_size]
        values.append(float(np.sqrt(np.mean(np.square(frame)))))
    return np.asarray(values, dtype=np.float32)


def estimate_beat_times(onset, sample_rate, hop_size, lag):
    if onset.size == 0:
        return []

    first = int(np.argmax(onset[:max(lag, 1)]))
    times = []
    for frame_index in range(first, onset.size, max(1, lag)):
        times.append(round(frame_index * hop_size / sample_rate, 4))
    return times[:128]
