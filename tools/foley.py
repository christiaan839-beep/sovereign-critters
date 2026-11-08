#!/usr/bin/env python3
"""Foley for critter-buddy: three small physical sounds, built from models and not from samples.

    paw    two soft taps, a pitch-dropped thump on a pillow of low noise
    paper  a page turned: filtered noise in three swells, a few crackles
    chime  a small brass bell: inharmonic partials that each fade at their own rate

Standard library only. The same run writes the same bytes: every random is seeded.
    python3 tools/foley.py <dir to write the wav files into>
"""
import math
import random
import struct
import sys
import wave

RATE = 44100
PEAK = 0.6  # of full scale; the mod plays them at half gain on top


def ramp_in(x, ms=1.5):
    n = int(RATE * ms / 1000)
    return [v * min(1.0, i / n) if i < n else v for i, v in enumerate(x)]


def fade_out(x, ms):
    n = int(RATE * ms / 1000)
    return [v * (1.0 - (i - (len(x) - n)) / n) if i >= len(x) - n else v for i, v in enumerate(x)]


def one_pole_lowpass(x, k):
    y, s = [], 0.0
    for v in x:
        s += k * (v - s)
        y.append(s)
    return y


def normalise(x):
    peak = max(abs(v) for v in x) or 1.0
    return [v * PEAK / peak for v in x]


def paw():
    rng = random.Random(7)
    out = [0.0] * int(RATE * 0.3)
    for start, gain in ((0.0, 1.0), (0.09, 0.7)):
        n = int(RATE * 0.16)
        noise = one_pole_lowpass([rng.uniform(-1, 1) for _ in range(n)], 0.12)
        phase = 0.0
        for i in range(n):
            t = i / RATE
            freq = 70 + 55 * math.exp(-t / 0.02)  # the thump falls as the paw settles
            phase += 2 * math.pi * freq / RATE
            tap = math.sin(phase) * math.exp(-t / 0.028) + noise[i] * 0.9 * math.exp(-t / 0.012)
            out[int(RATE * start) + i] += gain * tap
    return fade_out(ramp_in(normalise(out)), 30)


def paper():
    rng = random.Random(11)
    n = int(RATE * 0.4)
    white = [rng.uniform(-1, 1) for _ in range(n)]
    low = one_pole_lowpass(white, 0.3)
    rustle = [w - l for w, l in zip(white, low)]  # the highs only: a page is all edge
    env = [0.0] * n
    for centre, width, amp in ((0.07, 0.07, 1.0), (0.18, 0.08, 0.7), (0.29, 0.07, 0.45)):
        for i in range(n):
            d = (i / RATE - centre) / width
            if abs(d) < 1:
                env[i] += amp * math.cos(d * math.pi / 2) ** 2
    out = [r * e for r, e in zip(rustle, env)]
    for _ in range(14):  # the crackle of fibres letting go
        at = int(rng.uniform(0.03, 0.34) * RATE)
        amp = rng.uniform(0.4, 1.0)
        for j in range(int(RATE * 0.004)):
            if at + j < n:
                out[at + j] += amp * rng.uniform(-1, 1) * math.exp(-j / (RATE * 0.0012))
    return fade_out(ramp_in(normalise(out), 4), 40)


def chime():
    rng = random.Random(3)
    f0 = 988.0
    partials = ((1.0, 1.0, 0.9), (2.0, 0.6, 0.7), (2.76, 0.45, 0.5), (4.07, 0.25, 0.35), (5.4, 0.12, 0.2))
    n = int(RATE * 1.3)
    out = [0.0] * n
    for ratio, amp, tau in partials:
        for i in range(n):
            t = i / RATE
            out[i] += amp * math.sin(2 * math.pi * f0 * ratio * t) * math.exp(-t / tau)
    strike = one_pole_lowpass([rng.uniform(-1, 1) for _ in range(int(RATE * 0.002))], 0.4)
    for i, v in enumerate(strike):
        out[i] += 0.5 * v
    return fade_out(ramp_in(normalise(out), 1.0), 150)


def write(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", max(-32768, min(32767, int(v * 32767)))) for v in samples))


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    for name, make in (("paw", paw), ("paper", paper), ("chime", chime)):
        write(f"{out_dir}/{name}.wav", make())
        print(name)
