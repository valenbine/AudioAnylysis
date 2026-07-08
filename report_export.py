import json


def export_report(analysis, report_format="markdown"):
    if report_format == "json":
        return json.dumps(analysis, ensure_ascii=False, indent=2)
    return export_markdown_report(analysis)


def export_markdown_report(analysis):
    metadata = analysis.get("metadata", {})
    features = analysis.get("features", {})
    tempo = features.get("tempo", {})
    pitch = features.get("pitch", {})
    quality = features.get("quality", {})

    lines = ["# AudioAnylysis Report", ""]
    if metadata:
        lines.extend(["## Metadata", ""])
        for key, value in metadata.items():
            lines.append(f"- {key}: {value}")
        lines.append("")

    lines.extend([
        "## Feature Summary",
        "",
        f"- Pitch: {pitch.get('tuningLabel', pitch.get('note', '--'))}",
        f"- Tempo: {tempo.get('bpm', 0)} BPM",
        f"- LUFS Approx: {quality.get('lufsApprox', '--')}",
        "",
        "## Quality Recommendations",
        "",
    ])
    for item in quality.get("recommendations", []):
        lines.append(f"- {item}")
    return "\n".join(lines).strip() + "\n"
