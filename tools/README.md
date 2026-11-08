# tools

Both scripts run outside the Claude sandbox (headless Chrome needs a socket directory).

- `review.sh [frames]` renders what the mod really draws (its `ui.render` trees, via a test that mounts them) to PNGs in `out/`.
  Frames: 0 day band, 1 day corner, 2 day stage, 3-5 night, 6-8 storm. It approximates the terminal layout in HTML: it is not the app's own window.
- `media.sh` draws `demo.gif` and `preview.png` from `scene.ts` and `world.ts` themselves.

`out/` is scratch: do not commit it.
