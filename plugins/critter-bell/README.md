# critter-bell

![critter-bell: A bell for the long ones](preview.png)

**Witness** pillar: says what happened, honestly. One of thirteen [sovereign-critters](../../README.md#what-is-here) mods.

A soft bell and a toast when a long command finishes, so you can look away while a build, an install or a test run goes.

- It rings and shows a toast for a Bash command that ran **20 seconds or more**, and for a **turn** that ran that long: "Claude finished after 1 min 30 s". Change it in the plugin's settings (`minSeconds`).
- A **short turn** (5 seconds to just under the threshold) gets a soft tick, no toast; under 5 seconds, nothing. Set `shortTurns` to `false` to drop the tick.
- A command's toast says how long it took and whether it failed; a turn's toast says how long it took. A command you or a hook refused never rings.
- The bell is a service-desk strike, synthesised for this plugin (`sounds/bell.wav`): a hammer on brass with an inharmonic ring, and a lighter second tap. It plays through the app's own audio, and not at all where there is no player. Set `sound` to `false` for the toast alone.
- It reads nothing from the command and sends nothing anywhere.

## What it does and sends

- **Plays a sound and shows a toast** when a Bash command, or a turn, runs `minSeconds` or longer (20 by default), and a soft tick after a turn of 5 seconds or more that stays under it. A command you or a hook refused never rings.
- **Sound files:** two, both bundled with the mod and made for it: `sounds/bell.wav` and `sounds/tick.wav`. They are played through the app's own audio; nothing is fetched or recorded. Set `sound` to `false` for the toast alone.
- **Reads** only how long a call or turn took and whether it failed. Not the command, the file, the prompt or the output.
- **Keeps** nothing: no store, no log. Its three settings (`minSeconds`, `sound`, `shortTurns`) are yours.
- **Sends** nothing: no network request, no telemetry. It runs no program and asks for no credential.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-bell@sovereign-critters
```

## Check

```
claude plugin validate . --strict
claude plugin test .
```

## Early access

Mods are on by default from Claude Code 2.1.286. An organization can keep installed mods from running (`allowManagedModsOnly` in managed settings), and `claude --safe-mode` starts a session without them. The mod engine may change between releases without notice: tests pin this mod's behaviour, and when the engine moves, expect a patch release that follows it.

Apache-2.0. Not affiliated with Anthropic.
