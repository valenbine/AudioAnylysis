import numpy as np


def build_spectrogram(samples, sample_rate, fft_size=1024, hop_size=512, max_bins=96, max_frequency=None):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    fft_size = int(fft_size)
    hop_size = int(hop_size)
    max_bins = int(max_bins)
    max_frequency = float(max_frequency or sample_rate / 2)

    if samples.size == 0:
      samples = np.zeros(1, dtype=np.float32)

    if samples.size < fft_size:
        padded = np.zeros(fft_size, dtype=np.float32)
        padded[:samples.size] = samples
        frames = [padded]
    else:
        frames = [samples[index:index + fft_size] for index in range(0, samples.size - fft_size + 1, hop_size)]

    frequencies = np.fft.rfftfreq(fft_size, d=1 / sample_rate)
    frequency_count = int(np.searchsorted(frequencies, max_frequency, side="right"))
    frequency_count = max(1, min(frequency_count, frequencies.size))
    if frequency_count > max_bins:
        frequency_indexes = np.linspace(0, frequency_count - 1, max_bins).round().astype(int)
    else:
        frequency_indexes = np.arange(frequency_count)

    window = np.hanning(fft_size).astype(np.float32)
    magnitudes = []
    for frame in frames:
        spectrum = np.abs(np.fft.rfft(frame * window))
        magnitudes.append(spectrum[frequency_indexes])

    matrix = np.vstack(magnitudes).astype(np.float32)
    matrix = 20 * np.log10(matrix + 1e-8)
    floor = float(matrix.max() - 72)
    matrix = np.clip((matrix - floor) / 72, 0, 1)

    bin_count = int(matrix.shape[1])
    frequencies = frequencies[frequency_indexes[:bin_count]]

    return {
        "sampleRate": sample_rate,
        "fftSize": fft_size,
        "hopSize": hop_size,
        "maxFrequency": int(max_frequency),
        "binCount": bin_count,
        "frequencies": [round(float(frequency), 2) for frequency in frequencies],
        "frames": matrix.round(4).tolist(),
    }
