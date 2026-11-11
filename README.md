# sovereign-critters

Small, careful mods for Claude Code from Sovereign Matrix: pixel characters that live in Claude's own interface and react to what it is doing.

## Install

```
/plugin marketplace add christiaan839-beep/sovereign-critters
/plugin install critter-buddy@sovereign-critters
```

Start a new session afterwards: plugins load at start-up.

In the desktop app you can do the same from the interface: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `christiaan839-beep/sovereign-critters`, then **Add plugin**.

> **Early access.** Mods run on Claude Code's mod engine (`$`, `register(on)`, `claude plugin test`), which is early access and can change without notice. Mods are on by default from Claude Code 2.1.286; an organization can keep installed mods from running, and `claude --safe-mode` starts without them. Each mod here is pinned by tests and checked in `QUALITY.md`; when the engine moves, expect a patch release that follows it.

## What is here

| Plugin | What it is |
| --- | --- |
| [`critter-buddy`](plugins/critter-buddy) | The wizard Pip, the tabby Biscuit, faces on every tool row, a prompt box that colours `/critter` as you type, a stage, a diary the model can read, and a Day and Night sky. |
| [`critter-mods`](plugins/critter-mods) | `/mods`: the control room. One pane on the right lists every mod, switches each on or off, installs the missing ones and opens each mod's own panes. |
| [`critter-bell`](plugins/critter-bell) | A counter-bell strike and a toast when a long command or turn finishes, and a soft tick for a short turn. |
| [`critter-diary`](plugins/critter-diary) | /diary: every tool call with its time, a line for each turn, and a copy-as-markdown button. Names and times only. |
| [`critter-measure`](plugins/critter-measure) | A tool that counts text exactly: characters, words, lines and UTF-8 bytes. |
| [`critter-stunt`](plugins/critter-stunt) | /stunt: the critter painted in a pane, with a card for each of the last 40 tool calls. |
| [`critter-crab`](plugins/critter-crab) | `/crab hold <text>`: a small crab carries one note for this folder and has it for you when you come back. |
| [`critter-ward`](plugins/critter-ward) | Stops a git push that forces or writes main or master, before Bash runs it. Best effort. |
| [`critter-tally`](plugins/critter-tally) | /everywhere: a pane of your three most-used tools, drawn by each app its own way. |
| [`critter-clock`](plugins/critter-clock) | `/clock`: how long the session has run and how much of it Claude spent working. Times only. |
| [`critter-ledger`](plugins/critter-ledger) | `/ledger`: tokens used this session, with a limit of your own. Silent until you ask. |
| [`critter-latch`](plugins/critter-latch) | Opt-in. Stops a recursive delete outside your folder, `git reset --hard`, `git clean -f` and checkout over the whole tree. Best effort. |
| [`critter-seal`](plugins/critter-seal) | Opt-in. Holds back a command that sends a secret file or key to a host you have not listed. Best effort. |

The critter and the cat are our own drawing. Nothing here copies Anthropic's art. Not affiliated with Anthropic.

## Principles

- A decorative mod never blocks a tool: every hook on the tool path catches its own errors, and `tools/preflight.sh` checks it. The one exception is `critter-ward`, which fails closed on purpose: when it cannot tell where a push goes, the push waits.
- Everything the characters say is a pure function of the session, never of chance, so a replay is identical and a test can pin it.
- No network, no telemetry, nothing read outside the session. State stays in the plugin's own store. The one thing that spends anything is opt-in: `/critter talk on` asks the model for one short line after a turn and sends only numbers (the seconds the turn took, how many tools it used, how many errors and commits there were). It is off until you turn it on.
- Apache-2.0.

## Develop

```
cd plugins/critter-buddy
claude plugin validate . --strict
claude plugin test .
claude --plugin-dir .          # try it in a real session
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Not affiliated with Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic.
