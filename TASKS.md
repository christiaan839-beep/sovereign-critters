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

- [x] Third independent review round on latch and seal: findings fixed (latch 58 tests, seal 55).
- [ ] A fourth round only if the founder wants one: each round found fewer and smaller holes, but spelling-based guards will keep missing things (scripts, aliases, multi-step encoding). Say so in the release notes instead of promising a clean bill.

## Needs the founder

- [ ] Look at the four new mods in the real app (none has been seen live; icons are placeholders, no poster art).
- [ ] Add the four to the `/mods` control room catalog (`plugins/critter-mods/hooks/catalog.ts`); this changes its card tests.
- [ ] Decide on the PR. The guard blocks pushes to main, so nothing here is pushed.
- [ ] Marketplace: the Claude Marketplace article lists partner agents bought with committed spend; it says nothing about free open-source mods. Ask how a free mod gets listed before planning for it.

## To verify (read from Anthropic's `mods/` README in `anthropics/claude-code`, summarised, not tested here)

- [ ] That repo calls its mods early access: the API "may change between releases without notice", and hooks modules load only where function hooks are enabled. Say so in our READMEs, and re-run validate on each engine update.
- [ ] On a machine with `allowManagedModsOnly`, user-installed hooks modules are refused at load; with `sec-default` seated, user plugins cannot lift an organization's deny rules (ours only add stops). Confirm with the real docs before writing it into `SECURITY.md`.
- [ ] That repo names tests `register.test.ts` with a `tier(...)` call and typechecks with `scripts/ci/typecheck-mods.sh`. We name tests by topic and skip the typecheck when `tsc` is missing; decide whether to match.

## Value extracted from the links (read 2026-11-11; summaries of pages, not tested here)

Applied already: stop rules in `CLAUDE.md`, this file as the compaction-safe task list, a reviewer pass before reporting. Still to do:

- [x] (done, as a project skill in `.claude/skills/review-a-guard`) **A skill that carries our method.** Agent Skills are a folder with `SKILL.md` (name, description, optional scripts/references) loaded on demand. Ship one with the family: "review a guard" (write the failing test, fix, sabotage in a temp copy, independent review, check flag behaviour against the tool's own option tables). That routine is the real asset of this session. Check the plugin docs for how a plugin ships skills before building.
- [ ] **Memory design for critter-crab and critter-diary** (Anthropic's "components of agent memory"): store only what the folder cannot show you; record how and when a fact was confirmed; keep the always-loaded part short and let it point to files; one note per source so writes do not collide; re-check notes against the raw log. Crab already keeps one note per folder (keyed by a hash, so no path to traverse); add a "last confirmed" date and a size cap. Diary: persist the week's counts only, as decided earlier.
- [x] (crab now refuses key-shaped notes; it already caps a note at 120 characters and keys by hash; no expiry, by design) **Memory tool guidance** (platform docs): cap file sizes, expire old notes, never write secrets (reuse seal's shapes to refuse them), validate every path. Crab uses `$.store`, not files, so only the cap, the expiry and the secret check apply.
- [x] (done for latch and seal: a line they cannot read now asks via `tool.check`; ward still refuses) **Hook decisions: prefer ask to deny** for the uncertain cases (latch "cannot read", seal "host the guard cannot read"). `tool.call` here returns only a deny; look at the `tool.check` event for an ask before changing anything, and keep deny for the clear cases.
- [ ] **Models**: Fable 5.2 and Mythos 5.2 launched 2026-11-09 (medium effort is the default in Claude Code); Opus 5.5 at medium effort is the recommended start, Sonnet 5.5 for well-scoped work, Haiku 5.5 for cheap classification. Do not put prices or model ids in the repo (preflight forbids ids); ledger counts tokens and does not price them, which stays right. Fable blocks most high-risk cyber work: a red-team review of a guard on Fable may be refused, so keep reviews on Opus.
- [ ] **MCP-UI** (sandboxed `ui://` HTML resources returned by tools, always with a plain-text fallback): not needed for our native panes; note for later if a mod's result should show in hosts that have no mod panes.
- [ ] **Compaction**: server-side summaries replace older turns; files outside the context survive. `critter-ledger` and `critter-clock` reset on a reload, not on compaction; confirm that against a real compaction before claiming it.

Not read (no instruction on what to take from them): transformer-circuits.pub and the induction-heads paper, the YouTube video, harvey-labs, managed-agents memory and the dreaming cookbook, the knowledge-wiki quickstart, interactive connectors, sheets and whiteboards, the recursive-self-improvement page, and the garbled text pasted with them.
