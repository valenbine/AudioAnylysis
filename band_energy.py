import numpy as np


def analyze_band_energy(samples, sample_rate):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        return {"low": 0, "mid": 0, "high": 0}

    windowed = samples * np.hanning(samples.size)
    spectrum = np.square(np.abs(np.fft.rfft(windowed)))
    frequencies = np.fft.rfftfreq(samples.size, d=1 / sample_rate)

    low = band_sum(spectrum, frequencies, 20, 250)
    mid = band_sum(spectrum, frequencies, 250, 4000)
    high = band_sum(spectrum, frequencies, 4000, sample_rate / 2)
    total = low + mid + high
    if total <= 0:
        return {"low": 0, "mid": 0, "high": 0}

    return {
        "low": round(low / total, 4),
        "mid": round(mid / total, 4),
        "high": round(high / total, 4),
    }


def band_sum(spectrum, frequencies, start, end):
    mask = (frequencies >= start) & (frequencies < end)
    return float(np.sum(spectrum[mask]))
