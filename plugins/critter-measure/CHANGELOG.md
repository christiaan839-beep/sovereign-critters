# Changelog

## 0.2.1

- The README's title now carries the new name (`critter-measure`); it still said `forge`. No behaviour change.

## 0.2.0

- **Renamed from `forge` to `critter-measure`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-measure`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.

## 0.1.3

- **Fixed: `measure` now answers a clear message when the model hands it something that is not a string** (a number, an object, nothing) instead of a confident count of zero or of "[object Object]".
- **Fixed: a very long text no longer risks overflowing the stack** when it finds the longest line (reproduced at 130,000 lines in Node). The README now mentions the longest line and the lone-surrogate byte count.

## 0.1.2

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.1.1

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.1.0

First release.
