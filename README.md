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

Thirteen mods in four pillars. Take one, take a pillar, or take them all; each installs on its own. [`VOICE.md`](VOICE.md) says how each pillar speaks.

### Companion: something alive beside the work

| Mod | What it is |
| --- | --- |
| [`critter-buddy`](plugins/critter-buddy) | The wizard Pip, the tabby Biscuit, faces on every tool row, a prompt box that colours `/critter` as you type, a stage, a diary the model can read, and a Day and Night sky. |
| [`critter-crab`](plugins/critter-crab) | `/crab hold <text>`: a small crab carries one note for this folder and has it for you when you come back. |
| [`critter-stunt`](plugins/critter-stunt) | `/stunt`: the critter painted in a pane, with a card for each of the last 40 tool calls. |

### Guard: stops the one thing you cannot take back

Each guard fails closed for its one promise, says what it stopped and why, and is best effort: it reads how a command is spelled. [`SECURITY.md`](SECURITY.md) says where they do not run and how to report a way past one.

| Mod | What it stops |
| --- | --- |
| [`critter-ward`](plugins/critter-ward) | A git push that forces, or writes main or master, before Bash runs it. |
| [`critter-latch`](plugins/critter-latch) | Opt-in. A recursive delete outside your folder, `git reset --hard`, `git clean -f` and checkout over the whole tree. |
| [`critter-seal`](plugins/critter-seal) | Opt-in. A command that sends a secret file or key to a host you have not listed. |

### Witness: says what happened, honestly

Names, times and counts, never content. Each speaks when asked.

| Mod | What it is |
| --- | --- |
| [`critter-diary`](plugins/critter-diary) | `/diary`: every tool call with its time, a line for each turn, a week of counts, and a copy-as-markdown button. |
| [`critter-ledger`](plugins/critter-ledger) | `/ledger`: tokens used this session, with a limit of your own. |
| [`critter-clock`](plugins/critter-clock) | `/clock`: how long the session has run and how much of it Claude spent working. |
| [`critter-tally`](plugins/critter-tally) | `/everywhere`: a pane of your three most-used tools, drawn by each app its own way. |
| [`critter-measure`](plugins/critter-measure) | A tool that counts text exactly: characters, words, lines and UTF-8 bytes. |
| [`critter-bell`](plugins/critter-bell) | A counter-bell strike and a toast when a long command or turn finishes, and a soft tick for a short turn. |

### Workshop: how a mod is made

| Piece | What it teaches |
| --- | --- |
| [`critter-mods`](plugins/critter-mods) | `/mods`: the control room. One pane lists every mod, switches each on or off, installs the missing ones and opens each mod's own panes. |
| [`examples/hot-reload-demo`](examples/hot-reload-demo) | What a hot reload keeps and what it starts over. |
| [`review-a-guard`](.claude/skills/review-a-guard) | The routine every guard here went through: the failing test first, the sabotaged fix, the independent review. |

The critter, the cat and the crab are our own drawing. Nothing here copies Anthropic's art. Not affiliated with Anthropic.

## Principles

- A Companion, Witness or Workshop mod never blocks a tool: every hook on the tool path catches its own errors, and `tools/preflight.sh` checks it. The three guards are the exception, on purpose: each fails closed for its one promise. Ward holds a push when it cannot tell where it goes; latch and seal put a line they cannot read to you as a question instead of letting it run.
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
