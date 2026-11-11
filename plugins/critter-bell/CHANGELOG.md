# Changelog

## 0.6.1

- The README's title now carries the new name (`critter-bell`); it still said `build-bell`. No behaviour change.

## 0.6.0

- **Renamed from `build-bell` to `critter-bell`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-bell`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.

## 0.5.1

- **Fixed:** a toast that fails can no longer disturb the command or the turn.

## 0.5.0

- **Fixed:** the three settings (how many seconds before it rings, sound, the tick after short turns) can now actually be set; they were read but never declared, so there was nowhere to change them. They are in the plugin's settings.
- **Fixed:** a long command and the turn it ends no longer ring twice; the turn stays quiet when the command's bell has just rung.
- **Fixed:** the bell is started and left, so a slow or stuck sound player can no longer hold up a command's result.

## 0.4.5

- **Fixed:** the bell no longer rings, and the turn clock no longer stops, when a subagent finishes: only the end of your own turn counts.

## 0.4.4

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.4.3

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.4.2

- Timing a command no longer waits on the clock before the command starts.

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
