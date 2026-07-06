ALLOWED_EXTENSIONS = {"wav", "mp3", "flac", "ogg", "m4a", "aac"}


def is_allowed_audio(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def is_allowed_wav(filename: str) -> bool:
    return is_allowed_audio(filename)


def validate_wav_upload(file_storage):
    if file_storage is None or not file_storage.filename:
        return False, "请选择一个音频文件。"

    if not is_allowed_audio(file_storage.filename):
        return False, "当前版本支持 WAV、MP3、FLAC、OGG、M4A、AAC。"

    return True, None
