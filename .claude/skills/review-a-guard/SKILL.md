---
name: review-a-guard
description: Harden a protector mod (critter-ward, critter-latch, critter-seal, or a new one) that stops a command by reading how it is spelled. Use when asked to fix a bypass, review a guard, add a rule to one, or call one ready.
---

# Review a guard

A guard reads a command line and stops one thing. Every round of independent review has found real holes, so never call one clean.

1. **Read the promise.** Take the plugin's README: what it stops, what it says it cannot see. Anything outside that is out of scope, and the README must say so.
2. **Get ground truth, not memory.** Find how the real tool parses the flag: its own option table (for git, `builtin/*.c` in git/git), and the real tool run in a throwaway folder under `$TMPDIR`. Bundled flags, attached values, `=` forms, abbreviations and repeated flags are where guards fail.
3. **Write the failing test first** in `tests/`, as a table of commands with the expected verdict, plus safe commands that must still pass. Run `claude plugin test .` and watch it fail. Write test files with the Write tool, and split key-shaped and address-shaped strings (`'ghp_' + …`, an `<at>` placeholder) so preflight's hygiene check and the repo's own guard do not trip.
4. **Fix, then break the fix.** In a temp copy, undo each load-bearing line one at a time and confirm a test goes red. Report how many tests noticed, not how many passed.
5. **Ask before spawning reviewers.** Independent review is expensive: confirm with the person. Give each reviewer a self-contained brief: the promise, what to try (quoting, wrappers, subshells, heredocs, variables, redirects, other senders or commands), how to test on a temp copy without editing the worktree, and the report format (exact command, expected vs actual, severity, one-line fix, confirmed vs suspected). Run the fixes, then a further round on the fixes themselves.
6. **Judge what comes back.** Fix the high ones test-first. Document the rest in the README's limits. Stop when a round finds only low items, and say plainly that spelling-based guards will still miss scripts, aliases and multi-step tricks.
7. **Record it.** Bump `plugin.json`, add a `CHANGELOG.md` line, add the review and the failed-first fact to `tools/quality-facts.json`, run `python3 tools/quality.py --write` and `./tools/preflight.sh`. Commit locally. Never push.

Engine notes learned the hard way: `$` cannot be passed to a helper function (spell `$.session.cwd()` in the hook itself); a hook that cannot read a line should ask (`tool.check` returns `{ decision: 'ask' }`) while a clear stop is a deny; guards fail closed only for their own promise and every other hook ends in `.catch(($, e, next) => next(e))`.
