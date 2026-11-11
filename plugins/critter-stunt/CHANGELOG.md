# Changelog

## 0.2.0

- **Renamed from `stunt` to `critter-stunt`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-stunt`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.

## 0.1.5

- **Fixed:** a pane lookup that fails can no longer raise out of the blink, and once the stand is gone nothing is armed again.

## 0.1.4

- **Fixed:** closing the stand in the middle of a blink no longer leaves a flip waiting to paint into a pane that is gone; the blink stops with the pane.

## 0.1.3

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.1.2

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.1.1

- Each tool call's two counters are written together.

## 0.1.0

First release.
