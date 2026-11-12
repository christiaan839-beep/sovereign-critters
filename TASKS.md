# Tasks

Kept so a long run survives a context summary. Newest state first. Update it in the same commit as the work.

## The plan (agreed 2026-11-12): polish, then launch, then grow

Four pillars in one repo (`VOICE.md`), and the Guard pillar also shipped on its own as **sovereign-guard** (name to confirm). Business: free core (Apache-2.0), a paid team edition, services, sponsors.

**Phase 1, polish**
- [x] The ontology: `VOICE.md`, the root README by pillar, each README and marketplace entry tagged with its pillar.
- [ ] A threat model in each guard's README (what it stops, what it cannot read, where it does not run, how it fails, its review record).
- [ ] A fourth independent review round on latch and seal (ward too); every finding fixed with a test that failed first.
- [ ] `examples/hot-reload-demo` as a "write your first mod" guide, the code annotated.
- [ ] High-contrast palette, from the founder's screenshots of the real window. Needs the founder.
- [ ] The stage, the corner and the sky seen in the desktop app. Needs the founder.

**Phase 2, launch**
- [ ] A demo GIF or short video: the script and stills here, the recording by the founder.
- [ ] Two or more outside testers through RELEASE.md 4b; fix what they hit.
- [ ] The listing texts for Anthropic's plugin directory; the founder submits.
- [ ] Tag v1.0.0 and write the launch post.

**Phase 3, grow**
- [ ] sovereign-guard and the team edition. A mod counts as an organization's only when installed from a folder on the machine (Claude Code's docs, Manage mods for your organization), so the product is an installer that places the guards' folder and writes the managed settings, plus support.
- [ ] Services page (custom mods and guardrails for teams) and `FUNDING.yml`.
- [ ] New mods, picked by pillar from what testers and directory users ask for.

## Done and on main

- [x] critter-ward 0.3.0: round two of the independent review (641 lines against real git, 50 past the guard); the spellings the header promised to read are fixed, each with a test that failed first. The README says plainly that it stops accidents and is not a security boundary.
- [x] critter-ward 0.2.3, critter-mods 0.7.0, critter-crab 0.3.2, and the four new mods (clock, ledger, latch, seal), landed in pull request 4.
- [x] Three independent review rounds on latch and seal; every finding fixed with a test that failed first.
- [x] Icons for the four new mods, drawn by `tools/icons.py` and held to it by preflight; a poster each, from `tools/posters.sh` (0.1.1).
- [x] All thirteen installed and switched on from the local marketplace.

## Open

- [x] In auto mode a guard's question was answered without reaching the person (seen with latch, 2026-11-11). Decided by the founder the same day: seal and ward keep asking about what they cannot read, and all three READMEs say what auto mode does with the question (seal 0.1.2, ward 0.3.1).
- [ ] A fourth review round on latch and seal only if the founder wants one: each round found fewer and smaller holes, but spelling-based guards will keep missing things (scripts, aliases, multi-step encoding). The READMEs say so instead of promising a clean bill.
- [x] critter-ward puts a line that runs an expansion (`eval "$(…)"`) to the person through `tool.check`, the way latch and seal ask (in 0.3.0, three tests, the first watched failing).

## Needs the founder

- [x] Latch, seal and ward seen stopping a command in the desktop app, in an agent session (2026-11-11, recorded in `tools/quality-facts.json`). The sighting found latch 0.1.1 asking about `cd /outside && rm -rf dist` where it should refuse; fixed in 0.1.2 with a test that failed first.
- [x] `/clock` and `/ledger` typed by the founder in the desktop app and answered as the READMEs say (2026-11-11, recorded). The `/clock` line went unnoticed when it appeared: look at where a command's answer shows in the desktop app, and whether one quiet line is enough.
- [x] The latch fix (0.1.2) seen live on 2026-11-11: `cd /tmp && rm -rf x` was refused in an agent session in the desktop app (recorded in `tools/quality-facts.json`).
- [ ] The release bar: the reviews and the docs audit went stale with these changes, and the cold install by someone else is still open for every mod. (2026-11-11: all thirteen installed cleanly from GitHub into an empty config folder, at the merged versions; that is an install check, not a person's first minute. Bell, clock and seal print an "options not yet set" notice on install; RELEASE.md now tells the tester it is harmless.)
- [ ] Marketplace: the Claude Marketplace article lists partner agents bought with committed spend; it says nothing about free open-source mods. Ask how a free mod gets listed before planning for it.

## To verify (read from Anthropic's `mods/` README in `anthropics/claude-code`, summarised, not tested here)

- [x] That repo calls its mods early access: the API "may change between releases without notice". Its line that hooks modules load only where function hooks are enabled is out of date: Claude Code's own docs (Manage mods for your organization) say mods are on by default from 2.1.286 and the switch is ignored from 2.1.287. The READMEs were corrected the same day. Still re-run validate on each engine update.
- [x] `allowManagedModsOnly` and the built-in guard, confirmed in Claude Code's docs (Manage mods for your organization, 2026-11-11): with the option in managed settings no installed mod runs its hooks (ours included), and where the built-in guard loads an installed mod cannot approve past a `deny` or `ask` rule. Written into `SECURITY.md`, with `--safe-mode`.
- [x] Test names: ours stay by topic. **Typecheck: every plugin and the example typecheck with no errors (2026-11-11, TypeScript 5.9.3 and 7.0.2), and preflight runs it when the engine's types are on the machine.** Most of the ~150 errors came from the generated MCP list (every connector of the session that wrote the types, about 1,100 tools): it bloated the tool-call union until tsc gave up, so each tsconfig now extends the generated one without it. The rest: one real stale type (buddy's saved feel lacked `still`), `Svg` read where the terminal's kit has none, and tests behind the current test kit. No behaviour changed; every test passes. CI cannot run it: only an interactive `--plugin-dir` session writes the types.

## Value extracted from the links (read 2026-11-11; summaries of pages, not tested here)

Applied already: stop rules in `CLAUDE.md`, this file as the compaction-safe task list, a reviewer pass before reporting. Still to do:

- [x] (done, as a project skill in `.claude/skills/review-a-guard`) **A skill that carries our method.** Agent Skills are a folder with `SKILL.md` (name, description, optional scripts/references) loaded on demand. Ship one with the family: "review a guard" (write the failing test, fix, sabotage in a temp copy, independent review, check flag behaviour against the tool's own option tables). That routine is the real asset of this session. Check the plugin docs for how a plugin ships skills before building.
- [x] (crab 0.4.0: a note from an earlier session says its age, "you left this 3 days ago:", from the time it was held, with no new field stored; the diary already persists only the week's counts, 14 days) **Memory design for critter-crab and critter-diary** (Anthropic's "components of agent memory"): store only what the folder cannot show you; record how and when a fact was confirmed; keep the always-loaded part short and let it point to files; one note per source so writes do not collide; re-check notes against the raw log. Crab already keeps one note per folder (keyed by a hash, so no path to traverse); add a "last confirmed" date and a size cap. Diary: persist the week's counts only, as decided earlier.
- [x] (crab now refuses key-shaped notes; it already caps a note at 120 characters and keys by hash; no expiry, by design) **Memory tool guidance** (platform docs): cap file sizes, expire old notes, never write secrets (reuse seal's shapes to refuse them), validate every path. Crab uses `$.store`, not files, so only the cap, the expiry and the secret check apply.
- [x] (done for latch and seal: a line they cannot read now asks via `tool.check`; ward still refuses) **Hook decisions: prefer ask to deny** for the uncertain cases (latch "cannot read", seal "host the guard cannot read"). `tool.call` here returns only a deny; look at the `tool.check` event for an ask before changing anything, and keep deny for the clear cases.
- [ ] **Models**: Fable 5.2 and Mythos 5.2 launched 2026-11-09 (medium effort is the default in Claude Code); Opus 5.5 at medium effort is the recommended start, Sonnet 5.5 for well-scoped work, Haiku 5.5 for cheap classification. Do not put prices or model ids in the repo (preflight forbids ids); ledger counts tokens and does not price them, which stays right. Fable blocks most high-risk cyber work: a red-team review of a guard on Fable may be refused, so keep reviews on Opus.
- [ ] **MCP-UI** (sandboxed `ui://` HTML resources returned by tools, always with a plain-text fallback): not needed for our native panes; note for later if a mod's result should show in hosts that have no mod panes.
- [ ] **Compaction**: server-side summaries replace older turns; files outside the context survive. `critter-ledger` and `critter-clock` reset on a reload, not on compaction; confirm that against a real compaction before claiming it.

Not read (no instruction on what to take from them): transformer-circuits.pub and the induction-heads paper, the YouTube video, harvey-labs, managed-agents memory and the dreaming cookbook, the knowledge-wiki quickstart, interactive connectors, sheets and whiteboards, the recursive-self-improvement page, and the garbled text pasted with them.
