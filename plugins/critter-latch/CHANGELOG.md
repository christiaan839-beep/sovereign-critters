# Changelog

## 0.1.0

First release.

- Stops a recursive rm outside the folder you opened, git reset --hard, git clean -f, and git checkout or restore over the whole tree.
- Hardened after an independent review before release: a cd in a subshell or after `||`, pushd/popd, a leading redirect, find -exec, git clean -e, other spellings of the whole tree, line continuations, $'...' quoting, xargs long options and a command named by a variable no longer get past it; redirects and heredoc bodies no longer cause false stops.
- A second review pass added: heredocs that a shell reads, `find` with several `-exec`, `..` and `**` as the whole tree, `git submodule foreach`, `rebase -x` and `bisect run`, a same-line git alias that runs a shell, `eval` and `source`, and more wrappers (`noglob`, `repeat`, `flock`, `arch`, `parallel`, `env -S`). An assignment with an expansion in front of a command (`PORT=$PORT rm -rf dist`) is no longer a false stop.
