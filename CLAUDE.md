# sovereign-critters

Thirteen Claude Code mods in `plugins/`, one folder each (`critter-*`). `QUALITY.md` is the honest state of each; `TASKS.md` is where the work stands.

## How to work here

- When a step does not need the person, keep going. Put status notes in the same message as the next action.
- Stop and ask only when you cannot continue without them, or before anything destructive or outward-facing: deleting data, pushing, opening a PR, publishing, force-pushing, or changing anything outside this repository. Never push (the guard blocks pushes to main anyway); the founder decides on PRs.
- Test first. Write the failing test, watch it fail, fix, then break the fix in a temp copy to prove the test notices. Never trust a test that has not failed.
- A decorative mod never blocks a tool: every tool-path hook ends in `.catch(($, e, next) => next(e))`. Only `critter-ward`, `critter-latch` and `critter-seal` fail closed, and only for the one thing each promises.
- Never hard-delete: move to the Trash. No model IDs, personal paths or email addresses in files (`tools/preflight.sh` checks).
- Before calling a change done: `claude plugin validate . --strict` and `claude plugin test .` in each touched plugin, then `./tools/preflight.sh`. Bump `plugin.json` and add a `CHANGELOG.md` line in the same commit.
- A protector (ward, latch, seal) reads how a command is spelled. Have it independently reviewed before saying it is ready; each round has found real bypasses. Check flag behaviour against git's own option tables, not memory.

## What is documented elsewhere

Layout, tests and the engine API: `CONTRIBUTING.md`, `TESTING.md`. Release steps: `RELEASE.md`. Security reporting: `SECURITY.md`.
