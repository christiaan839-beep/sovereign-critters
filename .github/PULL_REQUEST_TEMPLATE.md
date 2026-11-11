## What changed and why

<!-- One or two sentences, in the words a user of the plugin would use. -->

## Checked

- [ ] New logic has a test in `plugins/<name>/tests`, and I watched it fail before it passed.
- [ ] `bash tools/preflight.sh` exits clean.
- [ ] The plugin's `CHANGELOG.md` has an entry, and its `.claude-plugin/plugin.json` version is bumped.
- [ ] Docs that the change makes stale are updated in the same pull request.
- [ ] A change to what a mod draws comes with a still of the result (the whole window, not a crop).
- [ ] Any hook that can throw ends in `.catch(($, e, next) => next(e))`.
