# Tasks

Kept so a long run survives a context summary. Newest state first. Update it in the same commit as the work.

## Done on this branch (`claude/fix-ward-bypass-mods-rename-b23643`, nothing pushed)

- [x] critter-ward 0.2.3: attached, `=`, bundled and repeated branch flags; fuzzed against real git.
- [x] critter-mods 0.6.1: the five renamed mods show their own start-up steps.
- [x] README titles of bell, diary, measure and ward carry the new names.
- [x] New mods, 0.1.0: critter-clock, critter-ledger, critter-latch, critter-seal.
- [x] Two independent review rounds on latch and seal; every finding fixed with a test that failed first.
- [x] latch: `git switch -f`, `--discard-changes` and `--pathspec-from-file`, from git's option tables.

## In flight

- [ ] Third independent review round on latch and seal (two reviewers running when this was written). Fix what they confirm, test first.
- [ ] Regenerate `QUALITY.md` after the last commit (`python3 tools/quality.py --write`).

## Needs the founder

- [ ] Look at the four new mods in the real app (none has been seen live; icons are placeholders, no poster art).
- [ ] Add the four to the `/mods` control room catalog (`plugins/critter-mods/hooks/catalog.ts`); this changes its card tests.
- [ ] Decide on the PR. The guard blocks pushes to main, so nothing here is pushed.
- [ ] Marketplace: the Claude Marketplace article lists partner agents bought with committed spend; it says nothing about free open-source mods. Ask how a free mod gets listed before planning for it.

## To verify (read from Anthropic's `mods/` README in `anthropics/claude-code`, summarised, not tested here)

- [ ] That repo calls its mods early access: the API "may change between releases without notice", and hooks modules load only where function hooks are enabled. Say so in our READMEs, and re-run validate on each engine update.
- [ ] On a machine with `allowManagedModsOnly`, user-installed hooks modules are refused at load; with `sec-default` seated, user plugins cannot lift an organization's deny rules (ours only add stops). Confirm with the real docs before writing it into `SECURITY.md`.
- [ ] That repo names tests `register.test.ts` with a `tier(...)` call and typechecks with `scripts/ci/typecheck-mods.sh`. We name tests by topic and skip the typecheck when `tsc` is missing; decide whether to match.
