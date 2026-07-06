import os
from tempfile import NamedTemporaryFile

from flask import Flask, jsonify, render_template, request

from audio_reader import read_wav_file
from feature_analysis import analyze_audio_features
from spectrum import build_spectrogram
from spectrum_options import parse_spectrogram_options
from validators import validate_wav_upload
from waveform import build_waveform_points


app = Flask(__name__)


def get_upload_suffix(filename):
    return os.path.splitext(filename or "")[1].lower() or ".audio"


def read_uploaded_audio(upload):
    temp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=get_upload_suffix(upload.filename)) as temp_file:
            upload.save(temp_file.name)
            temp_path = temp_file.name

        return read_wav_file(temp_path)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/analyze")
def analyze_audio():
    upload = request.files.get("file")
    valid, message = validate_wav_upload(upload)
    if not valid:
        return jsonify({"error": message}), 400

    try:
        audio = read_uploaded_audio(upload)
        points = build_waveform_points(audio["samples"])

        return jsonify({
            "metadata": {
                "sampleRate": audio["sample_rate"],
                "channels": audio["channels"],
                "duration": audio["duration"],
                "peakAmplitude": audio["peak_amplitude"],
                "sampleCount": audio["sample_count"],
                "pointCount": len(points),
            },
            "waveform": points,
        })
    except Exception:
        return jsonify({"error": "音频解析失败，请确认文件是有效的音频。"}), 400


@app.post("/api/spectrogram")
def analyze_spectrogram():
    upload = request.files.get("file")
    valid, message = validate_wav_upload(upload)
    if not valid:
        return jsonify({"error": message}), 400

    try:
        audio = read_uploaded_audio(upload)
        options = parse_spectrogram_options(request.args)
        spectrogram = build_spectrogram(audio["samples"], audio["sample_rate"], **options)

        return jsonify({"spectrogram": spectrogram})
    except Exception:
        return jsonify({"error": "频谱解析失败，请确认文件是有效的音频。"}), 400


@app.post("/api/features")
def analyze_features():
    upload = request.files.get("file")
    valid, message = validate_wav_upload(upload)
    if not valid:
        return jsonify({"error": message}), 400

    try:
        audio = read_uploaded_audio(upload)
        features = analyze_audio_features(audio["samples"], audio["sample_rate"])

        return jsonify({"features": features})
    except Exception:
        return jsonify({"error": "特征分析失败，请确认文件是有效的音频。"}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
