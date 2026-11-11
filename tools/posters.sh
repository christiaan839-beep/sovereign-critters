#!/usr/bin/env bash
# Photographs the four posters tools/posters.py writes into each plugin's preview.png (1080 by 1080).
# needs: python3 and Google Chrome, outside the Claude sandbox (headless Chrome needs a socket directory)
set -eu
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 "$ROOT/tools/posters.py"
for p in critter-clock critter-ledger critter-latch critter-seal; do
  "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir="$ROOT/tools/out/chrome-profile" \
    --window-size=1080,1080 --screenshot="$ROOT/plugins/$p/preview.png" "file://$ROOT/tools/out/poster-$p.html" >/dev/null 2>&1
  echo "wrote plugins/$p/preview.png"
done
