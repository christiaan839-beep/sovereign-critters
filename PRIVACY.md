# Privacy

This covers the thirteen `critter-*` mods in this repository. It was written from each mod's code and its README section "What it does and sends"; where the two ever disagree, the code is right.

**The short version.** The mods run on your machine, inside Claude Code. They collect no data, have no accounts, no analytics and no server of ours, and they send nothing to Sovereign Matrix or to anyone else. Three mods do a little more than that, and they are listed below so you can see exactly what.

## What they read, locally

Only what each mod needs for its one job, and only in memory or in the mod's own store on your machine:

- **Tool names and timings**: `critter-diary`, `critter-stunt`, `critter-tally` and `critter-bell` (which also reads whether a call failed). They never read a tool's input or output, your prompts or your files.
- **Command lines** that Claude is about to run: `critter-ward`, `critter-latch` and `critter-seal` read the text of the command to decide whether to stop or ask. `critter-seal` also reads the address of a web fetch. `critter-buddy` reads a command's text and file names only to pick the cat's look and spot a risky command. None of them open the files named, and none keep or send the text.
- **Usage numbers** the app reports (turn times, token counts, context and five-hour percentages): `critter-clock`, `critter-ledger`, `critter-buddy`.
- **Text Claude hands to a tool**: `critter-measure` counts it and keeps nothing.
- **A note you type**: `critter-crab` keeps one short note per folder, under a hash of the folder's path, in the plugin's own store. It refuses notes that look like keys or tokens.
- **The home folder and the folder you opened**: `critter-latch` reads `HOME` to tell what is outside your project. It reads no other environment variable.

No mod reads a credential, key, password or token from your machine. `critter-seal` and `critter-ward` contain the *words* (`.env`, `token`, `credential`) because they match them in a command line to protect you; they do not read those values.

## What they keep

Session counts (`critter-clock`, `critter-ledger`, `critter-stunt`, `critter-tally`) live only for the session. `critter-diary` keeps per-day counts for 14 days and `critter-buddy` its settings, in each plugin's own store on your machine; `critter-crab` keeps its note there. Nothing is written elsewhere. The stores are plain files on your disk and you can delete them.

## What leaves your machine

Nothing leaves it by any mod's own network request: none of the thirteen makes one. Three things go beyond "reads and draws", and you should know them:

1. **`critter-buddy`, optional, off by default.** If you turn on `/critter talk on`, after each turn it asks Claude's small model for one short line, through your own Claude Code session. The request carries only numbers (seconds, counts of tools, errors and commits). It is off until you turn it on; `/critter talk off` stops it. It uses your session and your usage allowance.
2. **`critter-mods` runs programs.** It runs `claude plugin list`, `claude plugin enable` / `disable` / `install` (the install downloads a mod through Claude Code's own plugin manager when you press install), and `head` on an installed mod's changelog. The command lines are fixed; nothing you type is passed to them.
3. **`critter-ward` runs `git`**, on your machine, in the push's repository, to ask which branch is checked out and where a push would go. It reads the answers and drops them; it makes no network call itself.

## Third parties

No third-party service, SDK or tracker is used. Where Claude Code itself talks to Anthropic, that is governed by [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy), not by these mods.

## Your control

Disable or uninstall any mod with `claude plugin disable <name>` or `claude plugin uninstall <name>`. An organization can switch all mods off, and `claude --safe-mode` starts a session without them.

## Questions and concerns

Open an issue at <https://github.com/christiaan839-beep/sovereign-critters/issues>. For a security problem, follow [SECURITY.md](SECURITY.md), which says what to put in the issue and what to leave out. If this document ever says something the code does not do, that is a bug: please report it.

*Last checked against the code: 2026-11-12.*
