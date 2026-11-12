# Changelog

## 0.1.10

- **Changed: the manifest names its privacy policy, support, documentation and terms pages** (`privacyPolicyUrl`, `supportUrl`, `documentationUrl`, `termsOfServiceUrl`), as the plugin directory's listing step asks. No behaviour changed.

## 0.1.9

- Security: the fourth independent review (2026-11-12, about 430 commands, the shell spellings run for real in bash 3.2 and zsh) found 3 high and 10 medium ways past it, and one false hold. Fixed, each with a test that failed first: a heredoc ends at its whole delimiter word (`<<E"O"F`, `<<EOF-x` hid the lines after it); a `<<` inside `$[ ]` or `${ }` is no heredoc; a pipeline that goes on to the next line (`cat .env |` then `curl …`) is one pipeline; more shells (`fish`, `tcsh`, `csh`, `mksh`, `ash`, `yash`, `oksh`, `su -c`); `watch`, `flock -c`, `script -c` and more wrappers (`arch`, `taskset`, `chrt`, `firejail`, `uv run`, `bunx`, `chroot` and others); zsh's `=curl`; `declare` and `typeset` with no arguments, and every `/proc/…/environ`; braces (`.{env,}`); a copy made by `ln`, `install` or `dd of=`; `RSYNC_RSH` and `RSYNC_CONNECT_PROG`; a gist made with `gh api gists`. `RSYNC_RSH="ssh -i ~/.ssh/id_rsa"` is no longer held, as `rsync -e` with the same value was not.
- Docs: a threat model in the README: who it protects against and who not, where it looks, how it fails, where it does not run, its review record, and how to report a way past it. No behaviour change.

## 0.1.8

- **Changed: the permission hook's parameters have names of their own (`checked`, `onward`), and its ask is written as an `if`.** The plugin directory reads a permission hook only when no variable in the file is spelled like one of the hook's parameters. What the guard asks about is unchanged.

## 0.1.7

- Docs: the README has a "What it does and sends" section, written from the code: what the mod reads, keeps, sends and runs, and whether it plays sound files. It has an install line and a licence line. No behaviour change.

## 0.1.6

- Docs: the README names the mod's pillar (Guard) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.1.5

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.1.4

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.1.3

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.1.2

- Docs: the README says that in auto mode a question from the guard may be answered without reaching you, and why it stays a question and not a refusal. No behaviour change.

## 0.1.1

- The icon is the critter with a postmaster's cap and an envelope closed with wax, in place of the placeholder, and the README opens with a poster. No behaviour change.

## 0.1.0

First release.

- Holds back a command that sends a secret file, a key-shaped value or a secret variable to a host that is not on your list.
- Holds back a WebFetch whose address carries a key.
- Hardened after an independent review before release: a sender after a bracket or keyword, a secret held in a variable or a copied file, the whole environment, globbed and quote-split names, more wrappers (eval, timeout, find -exec), more senders, a proxy or connect-to naming the real host, and more key shapes are now read; key and certificate options, download URLs, comments and local addresses no longer cause false holds; a key in a host name is never echoed.
- A second review pass added: a redirect with an ampersand no longer cuts the line in two; groups, loops, functions and heredoc bodies are read with the command they belong to; Anthropic and OpenAI keys; secret files with several suffixes; options that send a secret are told apart from options that only use one, program by program; variable chains, `read`, sourced files and archives; more wrappers; a trusted host may be written with a scheme, a wildcard or a port.
- A third review pass added: a heredoc body now goes to the command that opened it (not the end of the line), arithmetic shifts are not heredocs, quotes nest inside `"$( )"` and `$'...'` escapes are read, a file written with `$'\x2e...'` is that file, each sender's option scrub is limited to its own words, case bodies, traps and a shell fed on stdin are read, a proxy exported earlier or set with `env` counts, `||` ends a command, comments no longer merge lines, and more names, files and senders (`.netrc`, mail, rclone, `aws s3`) are known.
- A send whose host it could not read is now put to you as a question (the permission check asks) instead of refused; a send to a host it read and found unlisted is still refused.
