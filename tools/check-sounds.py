#!/usr/bin/env python3
"""Check every sound of critter-buddy: 16-bit mono 44.1 kHz, audible, never clipped, no click at either end, a sensible length.
    python3 tools/check-sounds.py plugins/critter-buddy/sounds
Exits 1 on the first sound that fails."""
import struct
import sys
import wave

LENGTHS = {"cast": (0.8, 2.0), "purr": (0.8, 2.0), "paw": (0.15, 0.5), "paper": (0.25, 0.7), "chime": (0.8, 2.0)}
bad = []
for name, (lo, hi) in LENGTHS.items():
    try:
        w = wave.open(f"{sys.argv[1]}/{name}.wav")
    except Exception as e:
        bad.append(f"{name}: {e}")
        continue
    ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    s = [v / 32768 for v in struct.unpack(f"<{n}h", w.readframes(n))] if width == 2 else []
    peak = max((abs(v) for v in s), default=0)
    secs = n / rate if rate else 0
    problems = []
    if (ch, width, rate) != (1, 2, 44100): problems.append(f"format {ch}ch {width * 8}bit {rate}Hz")
    if not peak > 0.2: problems.append(f"too quiet (peak {peak:.2f})")
    if not peak < 0.95: problems.append(f"clipping (peak {peak:.2f})")
    if s and abs(s[0]) >= 0.02: problems.append("click at the start")
    if s and abs(s[-1]) >= 0.005: problems.append("click at the end")
    if not lo <= secs <= hi: problems.append(f"length {secs:.2f}s outside {lo}-{hi}s")
    print(f"{name}: {secs:.2f}s peak {peak:.2f} " + ("FAIL " + "; ".join(problems) if problems else "ok"))
    if problems: bad.append(name)
sys.exit(1 if bad else 0)
