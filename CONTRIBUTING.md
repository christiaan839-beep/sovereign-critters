# Contributing

1. Open an issue before a large change.
2. Keep to the rules in the README's Principles. A hook that can throw must end in `.catch(($, e, next) => next(e))`.
3. Every new function with logic gets a test in `plugins/<name>/tests`. A change to a sprite gets a still in the pull request.
4. Run `claude plugin validate . --strict` and `claude plugin test .` in the plugin folder; CI runs the same.
5. Commit messages say what changed and why, in the imperative.

By contributing you agree your work is released under the Apache-2.0 licence of this repository.
