ALLOWED_FFT_SIZES = {512, 1024, 2048, 4096}
ALLOWED_HOP_SIZES = {128, 256, 512, 1024}
ALLOWED_MAX_FREQUENCIES = {2000, 4000, 8000, 12000, 20000}


def parse_spectrogram_options(values):
    return {
        "fft_size": parse_allowed_int(values.get("fftSize"), ALLOWED_FFT_SIZES, 1024),
        "hop_size": parse_allowed_int(values.get("hopSize"), ALLOWED_HOP_SIZES, 512),
        "max_frequency": parse_allowed_int(values.get("maxFrequency"), ALLOWED_MAX_FREQUENCIES, 12000),
    }


def parse_allowed_int(value, allowed_values, default):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    return parsed if parsed in allowed_values else default
