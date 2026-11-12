# Changelog

## 0.6.7

- **Changed: the manifest names its privacy policy, support, documentation and terms pages** (`privacyPolicyUrl`, `supportUrl`, `documentationUrl`, `termsOfServiceUrl`), as the plugin directory's listing step asks. No behaviour changed.

## 0.6.6

- Docs: the README has a "What it does and sends" section, written from the code: what the mod reads, keeps, sends and runs, and whether it plays sound files. It has an install line and a licence line. No behaviour change.

## 0.6.5

- Docs: the README names the mod's pillar (Witness) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.6.4

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.6.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.6.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.6.1

- Docs: the README title and the rename note below used the old name or listed things the bell never stored.

## 0.6.0

- **Renamed from `build-bell` to `critter-bell`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-bell`, and remove the old plugin. It stored nothing, so nothing is lost.

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
