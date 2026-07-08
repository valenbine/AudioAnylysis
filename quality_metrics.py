import math

import numpy as np


def build_quality_metrics(samples):
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        return {"noiseFloorDb": -120, "dynamicRangeDb": 0, "lufsApprox": -120, "recommendations": ["未检测到有效音频。"]}

    abs_samples = np.abs(samples)
    frame_rms = build_frame_rms(samples)
    noise_floor = percentile_db(frame_rms, 10)
    loud_level = percentile_db(frame_rms, 95)
    rms = float(np.sqrt(np.mean(np.square(samples))))
    lufs = amplitude_to_db(rms) - 0.7
    dynamic_range = max(0, loud_level - noise_floor)
    recommendations = build_recommendations(abs_samples, noise_floor, dynamic_range, lufs)

    return {
        "noiseFloorDb": round(noise_floor, 2),
        "dynamicRangeDb": round(dynamic_range, 2),
        "lufsApprox": round(lufs, 2),
        "recommendations": recommendations,
    }


def build_frame_rms(samples, frame_size=2048, hop_size=1024):
    values = []
    for start in range(0, samples.size, hop_size):
        frame = samples[start:start + frame_size]
        if frame.size:
            values.append(float(np.sqrt(np.mean(np.square(frame)))))
    return np.asarray(values or [0], dtype=np.float32)


def amplitude_to_db(value):
    return 20 * math.log10(max(float(value), 1e-6))


def percentile_db(values, percentile):
    return amplitude_to_db(float(np.percentile(values, percentile)))


def build_recommendations(abs_samples, noise_floor, dynamic_range, lufs):
    recommendations = []
    if np.max(abs_samples) >= 0.999:
        recommendations.append("检测到削波，建议降低录音或导出增益。")
    if lufs < -25:
        recommendations.append("音量偏低，建议提高输入增益或做响度归一化。")
    if noise_floor > -45:
        recommendations.append("噪声底偏高，建议检查环境噪声和麦克风底噪。")
    if dynamic_range < 8:
        recommendations.append("动态范围偏窄，可能存在过度压缩。")
    if not recommendations:
        recommendations.append("未发现明显录音质量风险。")
    return recommendations
