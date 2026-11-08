# Changelog

## 0.4.1

- The bell and the tick now open with a fade-in (3 ms for the bell, 1 ms for the tick so it keeps its snap), so neither starts with a pop. Found by `tools/check-sounds.py`, which now checks every sound of every plugin.

## 0.4.0

- A short turn (5 seconds up to the threshold) ends with a soft tick. `shortTurns: false` turns it off.

## 0.3.0

- A turn that runs 20 seconds or more rings the bell and shows a toast when it ends, not only a single command.

## 0.2.0

- The bell is now a counter-bell strike with a second tap, not a soft chime.
- An icon.

## 0.1.0

First release.
