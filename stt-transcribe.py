#!/usr/bin/env python3
"""Speech-to-text transcription using Hermes venv's faster-whisper.

Usage: python3 stt-transcribe.py <audio_file_path>

Reads an audio file and outputs the transcription to stdout.
Used by the PR Reviewer's voice mode to transcribe recorded audio.
"""
import sys
import os

def transcribe(audio_path):
    from faster_whisper import WhisperModel

    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, language="en")
    text = " ".join(seg.text.strip() for seg in segments)
    return text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: stt-transcribe.py <audio_file>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"Error: File not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        text = transcribe(audio_path)
        print(text)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
