# Changelog

## 0.1.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.1.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.1.1

- The icon is the critter with a bookkeeper's eyeshade and an open ledger, in place of the placeholder, and the README opens with a poster. No behaviour change.

## 0.1.0

First release.

- `/ledger`: tokens used this session, split into out, in and cache.
- `/ledger limit 500k`: a limit of your own, announced once when passed.
