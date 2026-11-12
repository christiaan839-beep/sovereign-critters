# Changelog

## 0.3.6

- Docs: a threat model in the README: who it protects against and who not, where it looks, how it fails, where it does not run, its review record, and how to report a way past it. No behaviour change.

## 0.3.5

- Docs: the README names the mod's pillar (Guard) in the sovereign-critters family, and the marketplace lists it under that tag. No behaviour change.

## 0.3.4

- Types: the plugin typechecks with no errors against Claude Code's own mod types (`tsconfig.json` now extends the ones Claude Code writes into `.claude-plugin/types`, leaving out the MCP list), and its tests follow the current test kit. No behaviour change.

## 0.3.3

- Docs: the early-access note is corrected from Claude Code's own documentation: mods are on by default from 2.1.286 (not only where function hooks are enabled), an organization can keep installed mods from running, and `--safe-mode` starts without them. No behaviour change.

## 0.3.2

- Docs: the README says that mods are early access: they load only where function hooks are enabled, and the engine may change without notice. No behaviour change.

## 0.3.1

- Docs: the README says that in auto mode a question from the guard may be answered without reaching you, and why it stays a question and not a refusal. No behaviour change.

## 0.3.0

Round two of the independent review ran 641 lines against real git and a bare remote: 50 moved main past the guard. The ones the header promised to read are fixed, each with a test that failed first and that a sabotaged copy of the fix fails again.

- **Fixed: a branch checked out in a spelling the guard did not read.** `git checkout main -- && git push`, `git rebase --root main`, and `git bisect reset main` all left main checked out for the push. `git checkout main -- file` still stays where it is, as git does.
- **Fixed: a branch made a name for another with `git update-ref --stdin`** (`symref-update`, `symref-create`) now keeps a push that names no destination from being read ahead.
- **Fixed: writes into git's own files.** `echo ... > .git/HEAD`, `>> .git/config`, `sed -i` on them, `>> ~/.gitconfig`, `GIT_CONFIG_GLOBAL=` or `git -c include.path=` pointing at a file the line has just written, now keep a push from being read ahead. A write into `.git/hooks` is refused outright.
- **Fixed: programs a git command starts.** `git rebase -x"cmd"`, `-ix cmd`, `--ex cmd`, `git filter-branch --msg-filter`, `git fetch --upload-pack=`, `git difftool -x` and `git -c core.sshCommand=` are read as scripts, as `rebase --exec` already was.
- **Fixed: `echo push | xargs git`** (a bare `git` under xargs) and **a shell behind a wrapper the guard does not list**, such as `arch -arm64 bash -c "git push origin main"`, are refused.
- **Added: lines that run an expansion are marked to ask the person** (`eval "$(…)"`, `sh -c "$(…)"`, `… | base64 -d | sh`, `C=$(…); eval "$C"`, `read c; $c`). They are never refused, so `eval "$(direnv hook zsh)"` is not stranded. The permission check puts such a line to you with the reason; a push the guard can read on the same line is still refused.
- **Changed: the README now says plainly** that the guard stops accidental pushes to main and is not a security boundary against a determined script.

## 0.2.3

- The README's title now carries the new name (`critter-ward`); it still said `guard`.
- **Fixed: a repeated branch flag hid the last one.** `git switch -cf -c main && git push origin HEAD` made main the branch checked out, but the guard read the first `-c`. Git keeps the last of a repeated option and so does the guard now. Found by running about 1,600 generated forms of the create and move flags through real git and the guard; the rows that matter are now tests.

## 0.2.2

- **Fixed: `git branch -mf main && git push origin HEAD` still got past the guard.** The move and copy flags were read as taking a value, so in a bundle like `-mf`, `-Mf`, `-cf` or `-Cf` the `f` was taken for the branch name and `main` was missed. They are now read as the flags they are, with the names after them (`-fm`, `-m -f`, `--move --force`, `--mo` too). Found by an independent review; the test failed first.

## 0.2.1

- **Fixed: a push to main got past the guard when the branch name was stuck to the flag.** `git checkout -Bmain origin/x && git push origin HEAD`, `git switch -Cmain && git push`, `git checkout -bmain`, `--orphan=main`, `--create=main`, `--force-create=main` (and shortened or bundled forms like `-fbmain`) made main the branch checked out without the guard noticing. It now reads the name wherever git does. A branch move or copy with an attached name (`git branch -Mmain`, which git itself rejects) is read the same way. Found by an independent review; each case has a test that failed first.

## 0.2.0

- **Renamed from `guard` to `critter-ward`**, so the whole family shares one name and none is a bare common word. The slash commands are unchanged. To move over: update the marketplace, install `critter-ward`, and remove the old plugin; anything it stored (a crab note, the diary's week) starts fresh under the new name.

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
