# Changelog

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
