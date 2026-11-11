# Changelog

## 0.1.4

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.1.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.1.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.1.1

- The icon is the critter with a conductor's cap and a pocket watch, in place of the placeholder, and the README opens with a poster. No behaviour change.

## 0.1.0

First release.

- `/clock`: time here, time Claude worked, the longest turn.
- An optional toast on each full hour.
