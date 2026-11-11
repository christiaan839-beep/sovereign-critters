# tools

`preflight.sh` is the one to run before every commit: `bash tools/preflight.sh` validates and tests the root and all nine plugins, checks every sound, and scans the files for home paths, model ids, secret-shaped strings, emails and merge markers. It exits non-zero on any real failure. (The root's `claude plugin test` exits 1 with "no hooks module"; that one reason is expected and passes.)

`review.sh` and `media.sh` run outside the Claude sandbox (headless Chrome needs a socket directory).

- `review.sh [frames]` renders what the mod really draws (its `ui.render` trees, via a test that mounts them) to PNGs in `out/`.
  Frames: 0 day band, 1 day corner, 2 day stage, 3-5 night, 6-8 storm. It approximates the terminal layout in HTML: it is not the app's own window.
- `check-sounds.py <dir>` checks every .wav in a folder: 16-bit mono 44.1 kHz, audible, never clipped, no click at either end, a sensible length.
- `media.sh` draws `demo.gif` and `preview.png` from `scene.ts` and `world.ts` themselves.

`out/` is scratch: do not commit it.

- `quality.py` writes `QUALITY.md` from what the plugins measure (version, tests, validation, hooks) and what people witnessed (`quality-facts.json`: reviews and sightings with dates). `python3 tools/quality.py --write` after a change; preflight warns when the file is out of date. `test_quality.py` tests it.
