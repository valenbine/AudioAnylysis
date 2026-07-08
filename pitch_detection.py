import math

import numpy as np


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def detect_pitch(samples, sample_rate, min_frequency=60, max_frequency=2000):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size < 8 or float(np.max(np.abs(samples))) < 1e-4:
        return {"frequency": 0, "note": "--", "confidence": 0}

    windowed = samples[: min(samples.size, sample_rate * 2)]
    windowed = windowed - np.mean(windowed)
    max_lag = min(windowed.size - 1, int(sample_rate / min_frequency))
    min_lag = max(1, int(sample_rate / max_frequency))
    if max_lag <= min_lag:
        return {"frequency": 0, "note": "--", "confidence": 0}

    correlation = np.correlate(windowed, windowed, mode="full")[windowed.size - 1:]
    correlation = correlation[:max_lag + 1]
    if correlation[0] <= 1e-8:
        return {"frequency": 0, "note": "--", "confidence": 0}

    correlation = correlation / correlation[0]
    search = correlation[min_lag:max_lag + 1]
    peak_offset = first_prominent_peak(search)
    peak_lag = min_lag + peak_offset
    frequency = sample_rate / peak_lag
    frequency = adjust_for_subharmonic(windowed, sample_rate, frequency, min_frequency)
    confidence = float(correlation[peak_lag])

    result = {
        "frequency": round(frequency, 2),
        "note": frequency_to_note(frequency),
        "confidence": round(min(1, max(0, confidence)), 3),
    }
    result.update(pitch_calibration(frequency))
    return result


def first_prominent_peak(values, threshold=0.28):
    if values.size == 0:
        return 0

    max_value = float(np.max(values))
    minimum = max(threshold, max_value * 0.42)
    for index in range(1, values.size - 1):
        if values[index] >= minimum and values[index] >= values[index - 1] and values[index] >= values[index + 1]:
            return index

    return int(np.argmax(values))


def adjust_for_subharmonic(samples, sample_rate, frequency, min_frequency):
    windowed = samples * np.hanning(samples.size)
    spectrum = np.abs(np.fft.rfft(windowed))
    frequencies = np.fft.rfftfreq(windowed.size, d=1 / sample_rate)
    current_strength = frequency_strength(spectrum, frequencies, frequency)

    for divisor in (2, 3):
        candidate = frequency / divisor
        if candidate < min_frequency:
            continue
        candidate_strength = frequency_strength(spectrum, frequencies, candidate)
        if current_strength > 0 and candidate_strength >= current_strength * 0.28:
            return candidate

    return frequency


def frequency_strength(spectrum, frequencies, target):
    if spectrum.size == 0:
        return 0
    index = int(np.argmin(np.abs(frequencies - target)))
    start = max(0, index - 1)
    end = min(spectrum.size, index + 2)
    return float(np.max(spectrum[start:end]))


def build_pitch_curve(samples, sample_rate, frame_size=4096, hop_size=1024):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        summary = {"frequency": 0, "note": "--", "confidence": 0}
        return {**summary, "summary": summary, "frameCount": 0, "maxFrequency": 0, "frames": []}

    frames = []
    for start in range(0, samples.size, hop_size):
        frame = samples[start:start + frame_size]
        if frame.size < frame_size // 2:
            break
        pitch = detect_pitch(frame, sample_rate)
        frames.append({
            "time": round(start / sample_rate, 4),
            "frequency": pitch["frequency"],
            "note": pitch["note"],
            "confidence": pitch["confidence"],
            "nearestNote": pitch["nearestNote"],
            "cents": pitch["cents"],
            "tuningLabel": pitch["tuningLabel"],
        })

    voiced_frames = [frame for frame in frames if frame["frequency"] > 0]
    if voiced_frames:
        summary = max(voiced_frames, key=lambda frame: frame["confidence"])
        summary = {
            "frequency": summary["frequency"],
            "note": summary["note"],
            "confidence": summary["confidence"],
            "nearestNote": summary["nearestNote"],
            "cents": summary["cents"],
            "tuningLabel": summary["tuningLabel"],
        }
    else:
        summary = {"frequency": 0, "note": "--", "confidence": 0}

    max_frequency = max((frame["frequency"] for frame in voiced_frames), default=0)
    return {
        **summary,
        "summary": summary,
        "frameCount": len(frames),
        "maxFrequency": round(max_frequency, 2),
        "frames": frames,
    }


def frequency_to_note(frequency):
    if frequency <= 0:
        return "--"

    midi = int(round(69 + 12 * math.log2(frequency / 440)))
    octave = midi // 12 - 1
    return f"{NOTE_NAMES[midi % 12]}{octave}"


def pitch_calibration(frequency):
    if frequency <= 0:
        return {"nearestNote": "--", "cents": 0, "tuningLabel": "--"}

    midi_float = 69 + 12 * math.log2(frequency / 440)
    midi = int(round(midi_float))
    cents = round((midi_float - midi) * 100)
    note = f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"
    sign = "+" if cents >= 0 else "-"
    return {"nearestNote": note, "cents": cents, "tuningLabel": f"{note} {sign}{abs(cents)} cents"}
