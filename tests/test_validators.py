from io import BytesIO

from werkzeug.datastructures import FileStorage

from validators import is_allowed_audio, is_allowed_wav, validate_wav_upload


def make_file(filename):
    return FileStorage(stream=BytesIO(b"data"), filename=filename)


def test_is_allowed_audio_accepts_common_extensions_case_insensitive():
    for filename in ["sample.WAV", "beat.mp3", "mix.FLAC", "loop.ogg", "song.m4a", "clip.aac"]:
        assert is_allowed_audio(filename) is True


def test_is_allowed_wav_keeps_backward_compatible_alias():
    assert is_allowed_wav("sample.WAV") is True


def test_is_allowed_audio_rejects_other_extensions():
    assert is_allowed_audio("sample.txt") is False


def test_validate_audio_upload_rejects_missing_file():
    valid, message = validate_wav_upload(None)
    assert valid is False
    assert message == "请选择一个音频文件。"


def test_validate_audio_upload_rejects_empty_filename():
    valid, message = validate_wav_upload(make_file(""))
    assert valid is False
    assert message == "请选择一个音频文件。"


def test_validate_audio_upload_accepts_common_audio():
    valid, message = validate_wav_upload(make_file("voice.mp3"))
    assert valid is True
    assert message is None
