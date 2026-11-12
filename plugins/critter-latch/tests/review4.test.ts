import { expect, test } from 'claude-code/testing'
import { judge } from '../hooks/register'

// What the fourth review found (2026-11-12), on the code that fixed the third. Each spelling was run for real (git 2.54,
// bash 3.2, zsh) in a throwaway folder before it went in here.

const stop = (c: string) => judge(c, '/work/app', '/srv/me')
const held = (c: string) => expect(stop(c), c).toBeDefined()
const through = (c: string) => expect(stop(c), c).toBeUndefined()

test('a wrapper that moves the folder moves the delete too', () => {
  for (const c of ['env -C /tmp rm -rf x', 'env --chdir /tmp rm -rf x', 'env --chdir=/tmp rm -rf x', 'env -C/tmp rm -rf x', 'sudo -D /tmp rm -rf x', 'sudo --chdir=/tmp rm -rf x', 'chroot / rm -rf etc', 'chroot /tmp rm -rf x']) held(c)
  through('env -C sub rm -rf x')
  through('env -C /work/app/sub rm -rf x')
})

test("zsh's chdir, two-word cd and stack cd are followed", () => {
  for (const c of ['chdir /tmp && rm -rf x', 'chdir /tmp; rm -rf x', 'cd app other && rm -rf x', 'cd +1 && rm -rf x', 'pushd +1 && rm -rf x']) held(c)
  through('chdir sub && rm -rf x')
})

test('a git command run by its program name is that git command', () => {
  for (const c of ['/usr/libexec/git-core/git-reset --hard', 'git-reset --hard', 'git-clean -fdx', 'git-checkout .', 'git-restore .', 'git-switch -f main']) held(c)
  through('git-reset --soft HEAD~1')
})

test('an option turned off later on the line is off', () => {
  for (const c of ['git clean -fn --no-dry-run', 'git clean -f -n --no-dry-run', 'git clean -fn --no-d', 'git clean -fi --no-interactive', 'git clean --dry-run --no-dry-run -f', 'git checkout -p --no-patch .', 'git restore -p --no-patch .', 'git checkout --patch --no-patch -- .']) held(c)
  for (const c of ['git clean -f --no-dry-run -n', 'git clean --no-dry-run -n -f', 'git checkout --no-patch -p .']) through(c)
})

test('a letter inside an option value is no flag', () => {
  for (const c of ['git restore -sprod .', 'git restore -s@{push} .', 'git restore -sHEAD~1 -- .']) held(c)
  through('git restore -s HEAD -p .')
})

test('clean.requireForce turned off any way git reads it', () => {
  for (const c of ['git -c clean.requireForce= clean -d', 'git config clean.requireForce ""; git clean -d', 'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=clean.requireForce GIT_CONFIG_VALUE_0=false git clean -d', 'GIT_CONFIG_PARAMETERS="\'clean.requireforce\'=\'false\'" git clean -d']) held(c)
  through('git clean -d -n')
})

test('more spellings of the whole tree', () => {
  for (const c of ['git checkout ~+', 'git restore ~+', 'git checkout "$PWD/"', 'git checkout $PWD/.', 'git checkout -- "$(pwd)"', 'git restore `pwd`', 'git restore "$(git rev-parse --show-toplevel)"', "git restore '?*'"]) held(c)
  for (const c of ["git restore ':!foo'", "git restore ':^foo'", "git restore ':(exclude)foo'", "git checkout -- ':!*.md'", "git checkout HEAD -- ':(exclude)x'"]) held(c)
  for (const c of ["git restore src ':!src/a.ts'", 'git checkout "$BRANCH"', 'git checkout $B', 'git restore "$FILE"']) through(c)
})

test('more shells, and the ones that read a script from stdin or a file the line makes', () => {
  for (const c of ["tcsh -c 'rm -rf ../x'", "csh -c 'rm -rf ../x'", "mksh -c 'rm -rf ../x'", "ash -c 'rm -rf ../x'", "yash -c 'rm -rf ../x'", "oksh -c 'rm -rf ../x'"]) held(c)
  for (const c of ["watch 'rm -rf ../x'", "watch -n1 'rm -rf ../x'", "watch -n 1 'git reset --hard'", 'watch rm -rf ../x', "watch -d 'rm -rf ../x'"]) held(c)
  for (const c of ["source /dev/stdin <<< 'rm -rf ../x'", "echo 'rm -rf ../x' | source /dev/stdin", '. /dev/stdin <<EOF\nrm -rf ../x\nEOF', "bash <(echo 'rm -rf ../x')", "sh <(printf 'rm -rf ../x')", 'bash <(echo git reset --hard)']) held(c)
  for (const c of ['watch -n 5 git status', "watch 'ls -la'", "bash <(echo 'rm -rf dist')", 'source /dev/stdin <<< "echo hi"', 'source .venv/bin/activate']) through(c)
})

test("find's options before its folders, and a folder it cannot read", () => {
  for (const c of ['find -H /tmp -name x -exec rm -rf {} +', 'find -L /tmp -exec rm -rf {} +', 'find -P / -exec rm -rf {} \\;', 'find -x /tmp -exec rm -rf {} +', 'find -E /tmp -exec rm -rf {} +', 'find -f /tmp -exec rm -rf {} +', 'find -O3 /tmp -exec rm -rf {} +', 'find -D tree /tmp -exec rm -rf {} +', 'find -- /tmp -exec rm -rf {} +', 'find -H /tmp | xargs rm -rf']) held(c)
  for (const c of ['find $D -exec rm -rf {} +', 'find "$HOME" -name x -exec rm -rf {} +', 'find $(dirname $PWD) -exec rm -rf {} +', 'find "$HOME" | xargs rm -rf']) held(c)
  for (const c of ['find -L . -name x -exec rm -rf {} +', 'find -H src -name "*.map" -exec rm -rf {} +']) through(c)
})

test('git ls-files that prints other paths feeds nothing it can read', () => {
  held("git ls-files --format='../%(path)' | xargs rm -rf")
  through('git ls-files -z --others --exclude-standard | xargs -0 rm -rf')
})

test('a word split by $IFS, and a command named by zsh = expansion', () => {
  for (const c of ['rm -rf${IFS}../x', 'rm -rf$IFS../x', 'rm${IFS}-rf${IFS}../x', '=rm -rf ../x', '=git reset --hard']) held(c)
})

test('a << that the shell does not read as a heredoc hides nothing', () => {
  for (const c of ['echo "a\\"b <<EOF"\nrm -rf ../x\nEOF', 'echo $[1<<X]\nrm -rf ../x\nX]', 'echo ${x:-<<E}\nrm -rf ../x\nE}']) held(c)
  through('cat <<EOF\nrm -rf ../x\nEOF')
})

test('a bracket that can match a dot can stand for ..', () => {
  for (const c of ['rm -rf .[!a]/x', 'rm -rf .[^a]/x', 'rm -rf .[[:punct:]]/x', 'rm -rf .[.a]/x']) held(c)
  for (const c of ['rm -rf dist/[a-z]*', 'rm -rf .[a-z]*/cache']) through(c)
})
