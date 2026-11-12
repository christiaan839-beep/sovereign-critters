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

## What you get, in the desktop app

Everything below shows up in the Code tab with no setup beyond the install.

- **`/mods`** opens a pane on the right with every mod, a switch for each, and a button for each mod's own panes. Start here.
- **The pair** (critter-buddy): Pip the wizard beside the thinking orb, Biscuit the cat on the bar above the prompt, and a small face on each tool row. `/critter` holds the dials (feel, reach, sound).
- **Witness commands** answer in one line, or open a pane: `/diary`, `/ledger`, `/clock`, `/everywhere`, `/stunt`.
- **A bell** rings and shows a toast when a command or a turn runs past 20 seconds, so you can look away.
- **Guards** you do not see until they matter: critter-ward is on once installed; latch and seal wait for you to ask for them. When one stops a command, it says what it stopped, why, and what to do instead.

Mods draw their panes in the terminal and the desktop app. The VS Code panel and `claude -p` run the hooks and draw nothing; the commands answer in words there.

## What is here

Thirteen mods in four pillars. Take one, take a pillar, or take them all; each installs on its own. [`VOICE.md`](VOICE.md) says how each pillar speaks.

### Companion: something alive beside the work

| Mod | What it is |
| --- | --- |
| [`critter-buddy`](plugins/critter-buddy) `0.30.10` | The wizard Pip, the tabby Biscuit, faces on every tool row, a prompt box that colours `/critter` as you type, a stage, a diary the model can read, and a Day and Night sky. |
| [`critter-crab`](plugins/critter-crab) `0.4.4` | `/crab hold <text>`: a small crab carries one note for this folder and has it for you when you come back. |
| [`critter-stunt`](plugins/critter-stunt) `0.2.6` | `/stunt`: the critter painted in a pane, with a card for each of the last 40 tool calls. |

### Guard: stops the one thing you cannot take back

Each guard fails closed for its one promise, says what it stopped and why, and is best effort: it reads how a command is spelled. [`SECURITY.md`](SECURITY.md) says where they do not run and how to report a way past one.

| Mod | What it stops |
| --- | --- |
| [`critter-ward`](plugins/critter-ward) `0.3.9` | A git push that forces, or writes main or master, before Bash runs it. |
| [`critter-latch`](plugins/critter-latch) `0.1.8` | Opt-in. A recursive delete outside your folder, `git reset --hard`, `git clean -f` and checkout over the whole tree. |
| [`critter-seal`](plugins/critter-seal) `0.1.8` | Opt-in. A command that sends a secret file or key to a host you have not listed. |

### Witness: says what happened, honestly

Names, times and counts, never content. Each speaks when asked.

| Mod | What it is |
| --- | --- |
| [`critter-diary`](plugins/critter-diary) `0.6.6` | `/diary`: every tool call with its time, a line for each turn, a week of counts, and a copy-as-markdown button. |
| [`critter-ledger`](plugins/critter-ledger) `0.1.6` | `/ledger`: tokens used this session, with a limit of your own. |
| [`critter-clock`](plugins/critter-clock) `0.1.6` | `/clock`: how long the session has run and how much of it Claude spent working. |
| [`critter-tally`](plugins/critter-tally) `0.2.6` | `/everywhere`: a pane of your three most-used tools, drawn by each app its own way. |
| [`critter-measure`](plugins/critter-measure) `0.2.6` | A tool that counts text exactly: characters, words, lines and UTF-8 bytes. |
| [`critter-bell`](plugins/critter-bell) `0.6.6` | A counter-bell strike and a toast when a long command or turn finishes, and a soft tick for a short turn. |

### Workshop: how a mod is made

| Piece | What it teaches |
| --- | --- |
| [`critter-mods`](plugins/critter-mods) `0.7.6` | `/mods`: the control room. One pane lists every mod, switches each on or off, installs the missing ones and opens each mod's own panes. |
| [`examples/hot-reload-demo`](examples/hot-reload-demo) | What a hot reload keeps and what it starts over. |
| [`review-a-guard`](.claude/skills/review-a-guard) | The routine every guard here went through: the failing test first, the sabotaged fix, the independent review. |

The critter, the cat and the crab are our own drawing. Nothing here copies Anthropic's art. Not affiliated with Anthropic.

## What each mod sends

Short version: nothing leaves your machine, with one opt-in exception and one honest footnote. Each README has a **What it does and sends** section, written from the code, that says what the mod reads, keeps, sends and runs.

| Mod | Reads | Keeps | Sends or runs |
| --- | --- | --- | --- |
| `critter-buddy` | Tool names, timings and the hour; its own settings | Its settings and a short diary in its own store | Nothing, unless you turn on `/critter talk on` (see below). Plays its bundled sounds. |
| `critter-crab` | The note you give it | One note per folder, under a hash of the path | Nothing |
| `critter-stunt`, `critter-tally` | Tool names | Counts, for the session | Nothing |
| `critter-ward` | The `git push` line; runs local `git` to ask where it goes | Nothing | Nothing leaves; runs `git` locally |
| `critter-latch`, `critter-seal` | The Bash command line (seal also a `WebFetch` address) | Nothing | Nothing. Seal keeps the host list you type. |
| `critter-diary` | Tool names, times, counts | Names and times in its own store; never commands or files | Nothing |
| `critter-ledger`, `critter-clock` | Token usage, turn times | Sums, for the session | Nothing |
| `critter-measure` | The text Claude hands its tool | Nothing | Nothing |
| `critter-bell` | How long a call ran and whether it failed | Nothing | Plays two bundled sounds |
| `critter-mods` | The plugin manager's list; the top of each mod's changelog | Nothing | Runs `claude plugin list/enable/disable/install` with fixed arguments; an install downloads the mod through Claude Code |

None of them asks for a credential, and none declares one in its `plugin.json`.

## Principles

- A Companion, Witness or Workshop mod never blocks a tool: every hook on the tool path catches its own errors, and `tools/preflight.sh` checks it. The three guards are the exception, on purpose: each fails closed for its one promise. Ward holds a push when it cannot tell where it goes; latch and seal put a line they cannot read to you as a question instead of letting it run.
- Everything the characters say is a pure function of the session, never of chance, so a replay is identical and a test can pin it.
- No network, no telemetry, nothing read outside the session. State stays in the plugin's own store. The one thing that spends anything is opt-in: `/critter talk on` asks the model for one short line after a turn and sends only numbers (the seconds the turn took, how many tools it used, how many errors and commits there were). It is off until you turn it on.
- Apache-2.0.

## Troubleshooting

- **Nothing appeared after installing.** Mods load when a session starts: open a new session. Then check `/mods list`.
- **`/mods` or `/critter` is not a command.** The mod is not installed or is switched off. Run `/plugin` and look for it, or `/mods install all`.
- **Mods do nothing at all.** Claude Code must be 2.1.286 or newer. Your organization may have turned mods off (`allowManagedModsOnly`), or the session was started with `claude --safe-mode`. [`SECURITY.md`](SECURITY.md) lists where mods do not run.
- **A guard did not stop something.** They read how a command is spelled and are best effort. If a line got past one, please report it (see [`SECURITY.md`](SECURITY.md)).
- **No sound.** Sound plays through the app's own audio. Check the mod's sound setting, and that your system volume is up.
- **A pane is blank in the VS Code panel or `claude -p`.** Only the terminal and the desktop app draw panes; there the command answers in words.
- **Something else.** Open an issue and say which mod, its version (`/mods` shows it) and where you ran it.

## Uninstall

```
/plugin uninstall critter-buddy@sovereign-critters
/plugin marketplace remove sovereign-critters
```

Do that for each mod you installed. To keep a mod but quiet it, use `/mods off <mod>`. The crab's notes and the diary's records sit in each plugin's own store and go with the plugin.

## Changelogs

Each mod keeps its own `CHANGELOG.md` in its folder (for example [`plugins/critter-ward/CHANGELOG.md`](plugins/critter-ward/CHANGELOG.md)), and every release changes its version in `.claude-plugin/plugin.json` in the same commit. `/mods` shows the newest entry on each card. [`QUALITY.md`](QUALITY.md) is the honest state of each mod; [`RELEASE.md`](RELEASE.md) says how a release is made.

## Develop

```
cd plugins/critter-buddy
claude plugin validate . --strict
claude plugin test .
claude --plugin-dir .          # try it in a real session
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md) and [RELEASE.md](RELEASE.md).

## Licence

Apache-2.0 ([`LICENSE`](LICENSE)). Each plugin folder carries a copy.

Not affiliated with Anthropic. "Claude" and "Claude Code" are trademarks of Anthropic.
