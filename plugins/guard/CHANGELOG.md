# Changelog

## 0.1.4

- **Fixed: a git alias in a config file got past the guard.** With `alias.pf = push --force` in your git config, `git pf` was treated as an unknown command and ran. The guard now asks git for your aliases and judges `git pf` as the push it stands for (aliases of aliases and `!` shell aliases too; one that never ends is refused). A git command that is not an alias is still left alone.

## 0.1.3

- The listing card now carries a homepage, a repository link and keywords, and a description short enough to read in full. No behaviour change.

## 0.1.2

- **Fixed: five ways a push could slip past the guard.** `echo git push -f origin main | bash` (and `| sh -s`, `bash <(echo ...)`, a heredoc into a shell) was read as three separate scripts; an alias the line made itself (`git config alias.p "push -f"; git p`) was never judged; `xargs -I% git % ...` slid a push past; and `G=git; P=push; $G $P -f`, `git${IFS}pu${x}sh` and `caffeinate $GIT push -f` hid it behind an expansion. All are now stopped or read as the command they are. Found by an independent review; each has a test that failed first.
- Documented the gaps that remain (a program that changes `main` or `.git/HEAD` earlier on the line; a shell whose directory an earlier call changed).

## 0.1.1

- A push now asks git its three questions (branch, settings, branch names) together, so it waits for the slowest answer and not for all three. If any one fails the push still waits, as before.

## 0.1.0

First release.
