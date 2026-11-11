# Security

These plugins draw characters and keep a small diary in the plugin's own store. They make no network requests of their own and read nothing outside the session, apart from what is disclosed here: `critter-mods` runs the local `claude plugin` command (its `install` downloads a mod through it) and reads the changelogs of installed mods, and `critter-ward` runs `git` locally to ask where a push goes. The one exception is opt-in and off by default: `/critter talk on` asks the model for one short line after a turn, carrying only numbers (see the critter-buddy README).

The latest release of each plugin is supported. A bypass of one of the three guards counts as a vulnerability: a line that pushes to `main` or force-pushes that `critter-ward` lets through, a delete or reset outside the opened folder that `critter-latch` lets through, or a secret sent to an unlisted host that `critter-seal` lets through. The guards read how a command is spelled; they stop accidents, are best effort, and are no substitute for branch protection, backups or a real secret store.

## Where the guards do not run

Read from Claude Code's documentation (Manage mods for your organization, 2026-11-11):

- **An organization can turn them off.** With `allowManagedModsOnly` set in managed settings, no mod a person installs runs its hooks, these three included, and a setting in your own files cannot undo it. Do not count on a guard on a managed machine until `/plugin` shows it loaded.
- **`claude --safe-mode`** starts a session with every installed mod off.
- **Their stops only add.** Where Claude Code's built-in guard loads, an installed mod cannot approve a call that a `deny` rule refuses or an `ask` rule prompts for. Ours never approve a call: they refuse, or put it to you as a question.
- **They see Claude's tool calls, not other mods.** Another installed mod reaching files or the network through its own `$.fs`, `$.process` or `$.http` calls does not pass through `tool.call`.

To report a problem, use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Please do not open a public issue for a vulnerability. We aim to reply within a week.
