# Contributing

1. Open an issue before a large change.
2. Keep to the rules in the README's Principles. A hook that can throw must end in `.catch(($, e, next) => next(e))`; preflight fails if a hook on the tool path does not. `guard` is the one exception: it fails closed on purpose.
3. Every new function with logic gets a test in `plugins/<name>/tests`. A change to a sprite gets a still in the pull request.
4. Turn on the pre-commit check once per clone: `git config core.hooksPath tools/githooks`. It runs `bash tools/preflight.sh`, which validates and tests every plugin and scans for keys, home paths and model ids; CI runs the same. `tools/VERIFY.md` says what "done" means for a change, including the parts only a real window can confirm.
5. Commit messages say what changed and why, in the imperative. A user-visible change adds a line to the plugin's `CHANGELOG.md` and bumps its `.claude-plugin/plugin.json` version in the same commit.

By contributing you agree your work is released under the Apache-2.0 licence of this repository.
