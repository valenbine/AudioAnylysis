from spectrum_options import parse_spectrogram_options


def test_parse_spectrogram_options_accepts_allowed_values():
    options = parse_spectrogram_options({
        "fftSize": "2048",
        "hopSize": "256",
        "maxFrequency": "8000",
    })

    assert options == {"fft_size": 2048, "hop_size": 256, "max_frequency": 8000}


def test_parse_spectrogram_options_uses_defaults_for_unknown_values():
    options = parse_spectrogram_options({
        "fftSize": "999",
        "hopSize": "7",
        "maxFrequency": "abc",
    })

    assert options == {"fft_size": 1024, "hop_size": 512, "max_frequency": 12000}
