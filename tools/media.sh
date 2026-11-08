#!/bin/zsh
# Draws demo.gif and preview.png from the mod's own scene and sky code. needs: node 22+, ffmpeg, Google Chrome (outside the sandbox)
T=${0:A:h}; ROOT=${T:h}; M=$T/out/media; mkdir -p $M/png && cd $M
W=${CRITTER_WORK:-$HOME/.claude/dev-mods/5175b3c3-33ac-486c-bf45-14b5cfd07dfd/critter-buddy}; [ -d $W ] || W=$ROOT/plugins/critter-buddy
cp $W/hooks/scene.ts $W/hooks/world.ts . && sed -i '' -E "s#from '\./(world|scene)'#from './\1.ts'#" scene.ts world.ts
cp $T/gen-media.mjs gen.mjs && node gen.mjs
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for f in frames/f*.html; do b=$(basename $f .html); "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=$M/chrome-profile --window-size=640,340 --screenshot=$M/png/$b.png file://$M/$f >/dev/null 2>&1; done
"$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=$M/chrome-profile --window-size=1080,1350 --screenshot=$M/preview.png file://$M/poster.html >/dev/null 2>&1
ffmpeg -y -loglevel error -framerate 8 -i png/f%03d.png -vf "palettegen=max_colors=96:stats_mode=diff" pal.png
ffmpeg -y -loglevel error -framerate 8 -i png/f%03d.png -i pal.png -lavfi "paletteuse=dither=none" -loop 0 demo.gif
echo "wrote $M/demo.gif and $M/preview.png (copy them to plugins/critter-buddy/demo.gif and ./preview.png)"
