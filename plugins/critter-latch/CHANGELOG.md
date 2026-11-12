# Changelog

## 0.1.8

- Security: the fourth independent review (2026-11-12, about 350 commands, each spelling run for real against git 2.54, bash 3.2 and zsh) found 8 high and 8 medium ways past it. Fixed, each with a test that failed first: `env -C`, `sudo -D` and `chroot` moving the delete; zsh's `chdir`, two-word `cd` and `cd +1`; `--no-dry-run`, `--no-interactive` and `--no-patch` turning an option back off; a letter inside an option's value (`restore -sprod .`) read as a flag; `~+`, `"$PWD/"`, `$(pwd)`, `?*` and exclude-only pathspecs (`':!x'`) as the whole tree; `source /dev/stdin` and `bash <(…)`; find's options before its folders (`-H`, `-L`, `-x`, `-f`) and a folder it cannot read (`find "$HOME"`); a `<<` inside `"\"…"`, `$[ ]` or `${ }` read as a heredoc that hid the next line; more shells (`tcsh`, `csh`, `mksh`, `ash`, `yash`, `oksh`); `watch`'s command (and `watch -d`, which takes no value); `git-reset` and its kin by path; `clean.requireForce` turned off by an empty value or `GIT_CONFIG_*`; `git ls-files --format`; `$IFS` and zsh's `=rm`; bracket wildcards (`.[!a]`) that bash 3.2 lets match `..`.

## 0.1.7

- Docs: a threat model in the README: who it protects against and who not, where it looks, how it fails, where it does not run, its review record, and how to report a way past it. No behaviour change.

## 0.1.6

- Docs: the README names the mod's pillar (Guard) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.1.5

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.1.4

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.1.3

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.1.2

- **Fixed: a delete after a `cd` to a folder outside the one you opened is refused, not asked about.** `cd /tmp/x && rm -rf dist` and `cd .. && rm -rf x` were read as "a target the guard cannot read", which is put to you as a question, and where the question did not reach you the delete ran. The guard had read the `cd` all along; it now says the delete reaches outside the folder you opened. Found the first time the mod was seen in the real app. A `cd` nobody can read (`cd $DIR`) is still a question.
- A `cd` out and back in (`cd /tmp && cd /work/app && rm -rf dist`) is followed, where it used to be held.

## 0.1.1

- The icon is the critter with a hard hat and a shut padlock, in place of the placeholder, and the README opens with a poster. No behaviour change.

## 0.1.0

First release.

- Stops a recursive rm outside the folder you opened, git reset --hard, git clean -f, and git checkout or restore over the whole tree.
- Hardened after an independent review before release: a cd in a subshell or after `||`, pushd/popd, a leading redirect, find -exec, git clean -e, other spellings of the whole tree, line continuations, $'...' quoting, xargs long options and a command named by a variable no longer get past it; redirects and heredoc bodies no longer cause false stops.
- A second review pass added: heredocs that a shell reads, `find` with several `-exec`, `..` and `**` as the whole tree, `git submodule foreach`, `rebase -x` and `bisect run`, a same-line git alias that runs a shell, `eval` and `source`, and more wrappers (`noglob`, `repeat`, `flock`, `arch`, `parallel`, `env -S`). An assignment with an expansion in front of a command (`PORT=$PORT rm -rf dist`) is no longer a false stop.
- Checked against git's own option tables (`builtin/clean.c`, `reset.c`, `checkout.c`): `git switch -f` and `--discard-changes` are now stopped like `git checkout -f`, and a `--pathspec-from-file` on checkout or restore waits.
- A third review pass added: a long run of `cd` no longer makes it slow (it gives up following folders past a dozen), heredoc delimiters are read as whole shell words and a heredoc that never ends hides nothing, arithmetic shifts and `sh<<EOF` without spaces, `echo`/`printf` piped into a shell (through `tee` or `cat` too), `function f { }`, `trap`, long options and more wrappers (`sudo --user`, `env -S`, `flock -c`, `parallel`, `fakeroot`, `unshare`, `uv run`), `:/*` and the folder's own path as the whole tree, git aliases made on the line, wildcards that can expand to `..`, and shell aliases. `eval "$(ssh-agent -s)"` and the like, and a recursive delete of what `find` or `git ls-files` names inside the folder, are no longer false stops.
- A line it could not read is now put to you as a question (the permission check asks) instead of refused; a line it read and stopped is still refused. A false alarm costs one click.
