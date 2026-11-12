# Changelog

## 0.2.7

- **Changed: the manifest names its privacy policy, support, documentation and terms pages** (`privacyPolicyUrl`, `supportUrl`, `documentationUrl`, `termsOfServiceUrl`), as the plugin directory's listing step asks. No behaviour changed.

## 0.2.6

- Docs: the README has a "What it does and sends" section, written from the code: what the mod reads, keeps, sends and runs, and whether it plays sound files. It has an install line and a licence line. No behaviour change.

## 0.2.5

- Docs: the README names the mod's pillar (Witness) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.2.4

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.2.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.2.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.2.1

- Docs: the README title used the old name, and the rename note listed things it never stored.

## 0.2.0

- **Renamed from `forge` to `critter-measure`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-measure`, and remove the old plugin. It stored nothing, so nothing is lost.

## 0.1.3

- **Fixed: `measure` now answers a clear message when the model hands it something that is not a string** (a number, an object, nothing) instead of a confident count of zero or of "[object Object]".
- **Fixed: a very long text no longer risks overflowing the stack** when it finds the longest line (reproduced at 130,000 lines in Node). The README now mentions the longest line and the lone-surrogate byte count.

## 0.1.2

- The listing card now carries a homepage, a repository link and keywords. No behaviour change.

## 0.1.1

- Every hook on the tool path now fails open: if it throws, the tool or prompt goes on as if the mod were not there.

## 0.1.0

First release.
