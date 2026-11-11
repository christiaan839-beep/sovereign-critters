import { expect, test } from 'claude-code/testing'
import { judge } from '../hooks/register'

// From reading git's own option tables (builtin/clean.c, reset.c, checkout.c): what each command declares, as git parses it.

const stop = (c: string) => judge(c, '/work/app', '/srv/me')

test('git switch discards local changes with -f, --force and --discard-changes, as git checkout -f does', () => {
  for (const c of ['git switch -f main', 'git switch --force main', 'git switch --discard-changes main', 'git switch --discard main', 'git switch -fc topic', 'git switch --for main'])
    expect(stop(c), c).toMatch(/^git switch throws away/)
  for (const c of ['git switch main', 'git switch -c topic', 'git switch -m main', 'git switch --detach HEAD', 'git switch --merge main', 'git switch -']) expect(stop(c), c).toBeUndefined()
})

test('checkout and restore with --ours or --theirs over the whole tree replace what is there', () => {
  for (const c of ['git checkout --ours .', 'git checkout --theirs -- .', 'git restore --ours .', 'git restore --theirs :/']) expect(stop(c), c).toMatch(/throws away/)
  expect(stop('git checkout --ours src/a.ts')).toBeUndefined()
})

test('a pathspec read from a file cannot be read ahead, so a checkout or restore that uses one waits', () => {
  for (const c of ['git restore --pathspec-from-file=list.txt', 'git checkout --pathspec-from-file list.txt', 'git restore --pathspec-from-file=- < list']) expect(stop(c), c).toMatch(/pathspec-from-file/)
  expect(stop('git restore --staged --pathspec-from-file=list.txt')).toBeUndefined()
})

test('git clean and git reset are read as their option tables say', () => {
  // clean: -n and -i stop it deleting; --no-force undoes -f; -e takes a pattern; long names -f/--force, -n/--dry-run, -i/--interactive
  for (const c of ['git clean -f', 'git clean --force', 'git clean -ff', 'git clean -fdx', 'git clean -fX']) expect(stop(c), c).toMatch(/^git clean -f removes/)
  for (const c of ['git clean -n', 'git clean --dry-run', 'git clean -i', 'git clean -fn', 'git clean -ni', 'git clean -fq -n']) expect(stop(c), c).toBeUndefined()
  // reset: --hard has no negated form; --merge and --keep keep local changes
  for (const c of ['git reset --hard', 'git reset --ha HEAD~1']) expect(stop(c), c).toMatch(/^git reset --hard/)
  for (const c of ['git reset --keep HEAD~1', 'git reset --merge', 'git reset --soft', 'git reset --mixed', 'git reset -p', 'git reset --no-refresh']) expect(stop(c), c).toBeUndefined()
})
