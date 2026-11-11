# Changelog

## 0.2.4

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.2.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.2.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.2.1

- **Fixed:** the call is counted after the tool runs and is not waited for; a state that hangs can no longer hold up a tool.
- Tests: a hung state and a refused write. The test file is now `tests/tally.test.tsx`.

## 0.2.0

- **Renamed from `everywhere` to `critter-tally`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-tally`, and remove the old plugin. It keeps nothing between sessions, so nothing is lost.
- **Fixed:** a tool named like an object property (`constructor`, `toString`, `__proto__`) is now counted as itself; before, the tally turned into text such as `function Object() { [native code] }1`.

## 0.1.2

- The listing card now carries a homepage, a repository link and keywords, and a description short enough to read in full. No behaviour change.

## 0.1.1

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.1.0

First release.
