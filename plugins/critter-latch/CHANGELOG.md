# Changelog

## 0.1.0

First release.

- Stops a recursive rm outside the folder you opened, git reset --hard, git clean -f, and git checkout or restore over the whole tree.
- Hardened after an independent review before release: a cd in a subshell or after `||`, pushd/popd, a leading redirect, find -exec, git clean -e, other spellings of the whole tree, line continuations, $'...' quoting, xargs long options and a command named by a variable no longer get past it; redirects and heredoc bodies no longer cause false stops.
- A second review pass added: heredocs that a shell reads, `find` with several `-exec`, `..` and `**` as the whole tree, `git submodule foreach`, `rebase -x` and `bisect run`, a same-line git alias that runs a shell, `eval` and `source`, and more wrappers (`noglob`, `repeat`, `flock`, `arch`, `parallel`, `env -S`). An assignment with an expansion in front of a command (`PORT=$PORT rm -rf dist`) is no longer a false stop.
- Checked against git's own option tables (`builtin/clean.c`, `reset.c`, `checkout.c`): `git switch -f` and `--discard-changes` are now stopped like `git checkout -f`, and a `--pathspec-from-file` on checkout or restore waits.
- A third review pass added: a long run of `cd` no longer makes it slow (it gives up following folders past a dozen), heredoc delimiters are read as whole shell words and a heredoc that never ends hides nothing, arithmetic shifts and `sh<<EOF` without spaces, `echo`/`printf` piped into a shell (through `tee` or `cat` too), `function f { }`, `trap`, long options and more wrappers (`sudo --user`, `env -S`, `flock -c`, `parallel`, `fakeroot`, `unshare`, `uv run`), `:/*` and the folder's own path as the whole tree, git aliases made on the line, wildcards that can expand to `..`, and shell aliases. `eval "$(ssh-agent -s)"` and the like, and a recursive delete of what `find` or `git ls-files` names inside the folder, are no longer false stops.
- A line it could not read is now put to you as a question (the permission check asks) instead of refused; a line it read and stopped is still refused. A false alarm costs one click.
