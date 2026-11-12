import { expect, mock, test } from 'claude-code/testing'
import type { ProcessRunInit } from 'claude-code'
import { pushes } from '../hooks/register'

const ran = { result: 'pushed' }
const git = (stdout: string, exitCode = 0, isStdoutTruncated = false) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated, isStderrTruncated: false } })
// git in a repository on `branch` with default settings: `branch --show-current` names it, `config --list -z` and
// `for-each-ref` print nothing the guard reads.
const onBranch = (branch: string) => (_: unknown, e: { argv: readonly string[] }) => git(e.argv.includes('--show-current') ? `${branch}\n` : '')
const WAITS = 'guard: the check could not finish, so the push waits. Ask the person to run it if they meant it.'

test('a push to a feature branch goes through', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', onBranch('feature/lens'))
  const out = await $.tool.call({ tool: 'Bash', command: 'git add -A && git commit -m wip && git push origin feature/lens' })
  expect(out.deny).toBeUndefined()
  expect(out.result).toBe('pushed')
})

test('a force push is stopped', async ($, on) => {
  on('tool.call', () => ran)
  for (const command of ['git push --force origin feature/lens', 'git push -f', 'git push origin +feature/lens', 'git push --force-with-lease']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.text ?? out.deny).toMatch(/force push/)
  }
})

test('a push to main is stopped, named or not', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', onBranch('main'))
  for (const command of ['git push origin main', 'git push origin HEAD:refs/heads/master', 'git push']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.text ?? out.deny).toMatch(/pull request/)
  }
})

test('when the guard cannot tell the branch, the push waits', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', () => git('', 128))
  const out = await $.tool.call({ tool: 'Bash', command: 'git push' })
  expect(out.text ?? out.deny).toBe(WAITS)
})

// The film's log, as it plays: a push of feature/lens goes, a force push is refused, a bare push asks git and
// waits when git fails, and once git answers again the push of feature/lens goes.
test("the film's story holds", async ($, on) => {
  on('tool.call', () => ran)
  let broken = false
  on('process.run', (_, e) => (broken ? git('', 128) : onBranch('feature/lens')(_, e)))
  const log: string[] = []
  for (const command of ['npm test', "git commit -m 'lens'", 'git push origin feature/lens', 'git push --force', 'jolt', 'git push', 'mend', 'git push origin feature/lens']) {
    if (command === 'jolt' || command === 'mend') {
      broken = command === 'jolt'
      continue
    }
    const out = await $.tool.call({ tool: 'Bash', command })
    log.push(out.result === 'pushed' ? 'ran' : String(out.deny))
  }
  expect(log).toEqual([
    'ran',
    'ran',
    'ran',
    'guard: a force push rewrites history other people may already have.',
    WAITS,
    'ran',
  ])
})

test('everything that is not a push passes untouched', async ($, on) => {
  on('tool.call', () => ran)
  const out = await $.tool.call({ tool: 'Bash', command: 'git status && npm test' })
  expect(out.result).toBe('pushed')
})

// The git the guard asks runs before the person has approved the line, so the line's own variables reach it only
// when they say which repository and which settings git reads, and trace2 is off (a settings file the line names
// could otherwise send git's trace to a file): each of its three calls gets exactly these.
const UNTRACED = { GIT_TRACE2: '0', GIT_TRACE2_EVENT: '0', GIT_TRACE2_PERF: '0' }
test('the git the guard asks is handed only the variables that locate the repository and its settings', async ($, on) => {
  on('tool.call', () => ran)
  const handed: Record<string, string>[] = []
  on('process.run', (_, e) => {
    handed.push({ ...e.init?.env })
    return onBranch('feature')(_, e)
  })
  const cases: [string, Record<string, string>][] = [
    ['GIT_TRACE=/home/user/.bashrc GIT_SSH_COMMAND="ssh -i k" GIT_ASKPASS=./x EDITOR=vi git push origin feature', {}],
    ['GIT_DIR=.git GIT_WORK_TREE=. GIT_COMMON_DIR=.git GIT_TRACE=1 git push origin feature', { GIT_DIR: '.git', GIT_WORK_TREE: '.', GIT_COMMON_DIR: '.git' }],
    [
      'env HOME=/h XDG_CONFIG_HOME=/h/c GIT_CONFIG_GLOBAL=/h/g GIT_CONFIG_SYSTEM=/s GIT_CONFIG_NOSYSTEM=1 GIT_PAGER=less git push origin feature',
      { HOME: '/h', XDG_CONFIG_HOME: '/h/c', GIT_CONFIG_GLOBAL: '/h/g', GIT_CONFIG_SYSTEM: '/s', GIT_CONFIG_NOSYSTEM: '1' },
    ],
    [
      'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=push.default GIT_CONFIG_VALUE_0=current GIT_TRACE_PACKET=1 git push origin feature',
      { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'push.default', GIT_CONFIG_VALUE_0: 'current' },
    ],
    ['GIT_DIR=.git bash -c "GIT_TRACE=1 git push origin feature"', { GIT_DIR: '.git' }],
    ['HOME=/h eval git push origin feature', { HOME: '/h' }],
  ]
  for (const [command, env] of cases) {
    handed.length = 0
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.result, command).toBe('pushed')
    const runs = { ...env, ...UNTRACED }
    expect(handed, command).toEqual([runs, runs, runs])
  }
})

// PATH, GIT_EXEC_PATH and the LD_ and DYLD_ variables change the program that runs or what it loads, so the guard
// cannot read ahead what such a push does: it refuses it, wherever the line sets one for it, and asks git nothing.
test('a push run with PATH, GIT_EXEC_PATH or an LD_ or DYLD_ variable set is refused, and git is not asked', async ($, on) => {
  on('tool.call', () => ran)
  const asked: string[] = []
  on('process.run', (_, e) => {
    asked.push(e.argv.join(' '))
    return onBranch('feature')(_, e)
  })
  const rows: [string, string][] = [
    ['LD_PRELOAD=./x.so git push origin feature', 'LD_PRELOAD'],
    ['PATH=./bin git push origin feature:feature', 'PATH'],
    ['PATH="$HOME/bin:$PATH" git push origin feature', 'PATH'],
    ['PATH+=:./bin git push origin feature', 'PATH'],
    ['env - PATH=/usr/bin git push origin feature', 'PATH'],
    ['GIT_EXEC_PATH=./libexec git push origin feature', 'GIT_EXEC_PATH'],
    ['DYLD_INSERT_LIBRARIES=./x.dylib git push origin feature', 'DYLD_INSERT_LIBRARIES'],
    ['timeout 60 env LD_LIBRARY_PATH=. git push origin feature', 'LD_LIBRARY_PATH'],
    ['PATH=./bin bash -c "git push origin feature"', 'PATH'],
    ['export PATH=./bin; git push origin feature', 'PATH'],
    ['LD_PRELOAD=./x.so; git status && git push origin feature', 'LD_PRELOAD'],
  ]
  for (const [command, name] of rows) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(String(out.text ?? out.deny), command).toBe(`guard: it sets ${name}, which changes the program that runs or what it loads, so the guard cannot tell where it goes.`)
  }
  expect(asked).toEqual([])
  // Set for another command, or after the push, it changes nothing the push runs with.
  for (const command of ['PATH=./bin npm test && git push origin feature', 'LD_PRELOAD=./x.so git status && git push origin feature', 'git push origin feature; export PATH=./bin'])
    expect((await $.tool.call({ tool: 'Bash', command })).result, command).toBe('pushed')
})

// $.process.run reads a git ended by a signal as exit 1, so an answer counts only when git exited 0 with its whole
// output; anything else leaves the push waiting.
test('a git ended by a signal (read as exit 1), or an answer cut short, leaves the push waiting', async ($, on) => {
  on('tool.call', () => ran)
  let reply = git('', 1)
  on('process.run', () => reply)
  for (const command of ['git push', 'git push origin HEAD', 'git push origin feature']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.text ?? out.deny, command).toBe(WAITS)
  }
  reply = git('feature\n', 0, true)
  const out = await $.tool.call({ tool: 'Bash', command: 'git push' })
  expect(out.text ?? out.deny).toBe(WAITS)
})

// The other half of failing closed: a git still running at $.process.run's timeout (30 s unless the call says
// otherwise) is killed and the call rejects; the push waits.
test('when git runs past its timeout, the push waits', async ($, on) => {
  on('tool.call', () => ran)
  const clock = mock.clock(on)
  on('process.run', async () => {
    await clock.sleep(30_000)
    throw new Error('git was still running after 30 s, so it was killed')
  })
  const call = $.tool.call({ tool: 'Bash', command: 'git push' })
  await clock.advance(30_000)
  const out = await call
  expect(out.text ?? out.deny).toBe(WAITS)
})

// A line the guard cannot read at all (here, command substitutions nested deeper than its reader follows) fails the
// hook itself. It holds no push the guard found, so the refusal says the command waits.
test('a line the guard cannot read waits whole, and its refusal names no push', async ($, on) => {
  on('tool.call', () => ran)
  const out = await $.tool.call({ tool: 'Bash', command: `echo ${'$('.repeat(20_000)}` })
  expect(out.text ?? out.deny).toBe('guard: the check could not finish, so this command waits. Ask the person to run it if they meant it.')
})

// Every form below runs against a mock git that answers for each repository by where it is asked (GIT_DIR,
// -C or the directory): the branch checked out (none when detached), its push settings (`key value` lines, or a
// key alone for a boolean written with no value), and its branches that are symbolic refs (`refname target` lines).
type Repo = { branch?: string; config?: string; symrefs?: string }
// `git config --list -z` prints each setting as its key, a newline and its value, ended by a NUL; a key alone when
// it has no value.
const listed = (config: string) => config.split('\n').filter(Boolean).map(l => (l.includes(' ') ? l.replace(' ', '\n') : l) + '\0').join('')
const answer = (repos: Record<string, Repo>, argv: readonly string[], init?: ProcessRunInit) => {
  const C = argv.indexOf('-C')
  const repo = repos[init?.env?.GIT_DIR ?? (C > 0 ? argv[C + 1] : undefined) ?? init?.cwd ?? '.']
  if (!repo) return git('', 128)
  if (argv.includes('--show-current')) return git(repo.branch ? `${repo.branch}\n` : '')
  if (argv.includes('for-each-ref')) return git(repo.symrefs ?? '')
  return git(listed(repo.config ?? ''))
}

// The variables the guard may hand to the git it asks: those that locate the repository and its settings.
const HANDED = /^(GIT_DIR|GIT_WORK_TREE|GIT_COMMON_DIR|GIT_CONFIG_(GLOBAL|SYSTEM|NOSYSTEM|COUNT|KEY_\d+|VALUE_\d+)|HOME|XDG_CONFIG_HOME)$/

// Runs each command through the guard: 'ran' when it should go through, or what its refusal should say. Every
// variable git is handed is checked against the ones the guard may hand it.
const forms = (name: string, repos: Record<string, Repo>, rows: [string, 'ran' | RegExp][]) =>
  test(name, async ($, on) => {
    on('tool.call', () => ran)
    const handed = new Set<string>()
    on('process.run', (_, e) => {
      for (const [key, value] of Object.entries(e.init?.env ?? {})) handed.add(`${key}=${value}`)
      return answer(repos, e.argv, e.init)
    })
    for (const [command, expected] of rows) {
      const out = await $.tool.call({ tool: 'Bash', command })
      const got = out.result === 'pushed' ? 'ran' : String(out.text ?? out.deny)
      if (expected === 'ran') expect(got, command).toBe('ran')
      else expect(got, command).toMatch(expected)
    }
    expect([...handed].filter(v => !(HANDED.test(v.slice(0, v.indexOf('='))) || /^GIT_TRACE2(_EVENT|_PERF)?=0$/.test(v)) || v.includes('$'))).toEqual([])
  })

const MAIN = /main takes changes through a pull request/
const MASTER = /master takes changes through a pull request/
const FORCE = /a force push rewrites history/
const EVERY = /pushes every branch, main included/
const UNREAD = /expansion/
const ON_MAIN = { '.': { branch: 'main' } }
const ON_FEATURE = { '.': { branch: 'feature' } }

forms('HEAD or @ is the branch checked out: main here', ON_MAIN, [
  ['git push origin HEAD', MAIN],
  ['git push -u origin HEAD', MAIN],
  ['git push origin @', MAIN],
])

forms('HEAD or @ is the branch checked out: a feature branch here', ON_FEATURE, [
  ['git push origin HEAD', 'ran'],
  ['git push -u origin HEAD', 'ran'],
  ['git push origin @', 'ran'],
])

forms('a redirection or an option value is no refspec', ON_MAIN, [
  ['git push origin 2>&1', MAIN],
  ['git push -u origin 2>&1 | tail -5', MAIN],
  ['git push origin > /tmp/push.log', MAIN],
  ['git push origin &> push.log', MAIN],
  ['git push -o ci.skip origin', MAIN],
  ['git push --push-option ci.skip origin', MAIN],
  ['git push --repo origin', MAIN],
  ['git push origin feature 2>&1 | tail -3', 'ran'],
  ['git push origin feature > /tmp/push.log 2>&1', 'ran'],
  ['git push -o ci.skip origin feature', 'ran'],
])

const ELSEWHERE_ON_MAIN = { ...ON_FEATURE, '../work2': { branch: 'main' }, '../work2/.git': { branch: 'main' }, x: { branch: 'main' }, '/abs/repo': { branch: 'feature' } }

forms('a cd, -C, GIT_DIR or GIT_WORK_TREE moves the push to another repository', ELSEWHERE_ON_MAIN, [
  ['cd ../work2 && git push', MAIN],
  ['cd x; git push origin HEAD', MAIN],
  ['git -C ../work2 push', MAIN],
  ['GIT_DIR=../work2/.git GIT_WORK_TREE=../work2 git push', MAIN],
  ['GIT_DIR=../work2/.git bash -c "git push"', MAIN],
  ['GIT_DIR=../work2/.git eval git push', MAIN],
  ["env GIT_DIR=../work2/.git sh -c 'echo $(git status) && git push origin HEAD'", MAIN],
  ['(cd x && git push origin feature); git push', 'ran'],
  ['cd /abs/repo && git push origin feature', 'ran'],
  ['git -C x status && git push', 'ran'],
])

// Where a named branch goes depends on its repository's settings too, so a named push after such a cd waits as well.
forms('a cd the guard cannot follow, before a push that depends on its settings, stops it', ON_FEATURE, [
  ['cd ~/repo && git push', /cannot locate/],
  ['cd "$REPO" && git push origin HEAD', /cannot locate/],
  ['cd - && git push', /cannot locate/],
  ['GIT_DIR=$DIR git push', /cannot locate/],
  ['export GIT_DIR=../work2/.git; git push', /cannot locate/],
  ['GIT_WORK_TREE=../work2\ngit push origin HEAD', /cannot locate/],
  ['cd ~/repo && git push origin feature', /cannot locate/],
  ['cd ~/repo && git push origin feature:feature', 'ran'],
])

forms('a cd inside ( ) ends with it', { ...ON_MAIN, feat: { branch: 'feature' } }, [
  ['cd feat && git push', 'ran'],
  ['(cd feat && git push); git push', MAIN],
])

forms('a prefix or a wrapper does not hide a push', { ...ON_FEATURE, x: { branch: 'main' } }, [
  ['GIT_SSH_COMMAND="ssh -i k" git push origin main', MAIN],
  ['GIT_TRACE=1 git push origin main', MAIN],
  ['env git push -f', FORCE],
  ['env -u CI GIT_TRACE=1 git push origin main', MAIN],
  ['command git push origin main', MAIN],
  ['timeout 60 git push origin main', MAIN],
  ['nice -n 10 git push origin main', MAIN],
  ['sudo -u deploy git push origin master', MASTER],
  ['/usr/bin/git push origin main', MAIN],
  ['nohup git push --force origin x &', FORCE],
  ['bash -c "git push --force"', FORCE],
  ["sh -c 'git push origin main'", MAIN],
  ["bash -lc 'cd x && git push'", MAIN],
  ['eval git push origin main', MAIN],
  ['if true; then git push --force; fi', FORCE],
  ['echo main | xargs git push origin', /xargs/],
  ['$GIT push origin feature', /named by an expansion/],
  ['timeout 60 git push origin feature', 'ran'],
  ['bash -c "git status && npm test"', 'ran'],
  ['env CI=1 npm test', 'ran'],
  ['sudo apt-get install -y git', 'ran'],
])

forms('quotes are read as the shell reads them', ON_FEATURE, [
  ['git push origin "main"', MAIN],
  ["git push origin 'main'", MAIN],
  ['git push origin ma"in"', MAIN],
  ['git push "--force" origin x', FORCE],
  ['git push origin "+feature"', FORCE],
  ['git commit -m "a; b > c" && git push origin main', MAIN],
  ['git commit -m "a; b > c" && git push origin feature', 'ran'],
  ['git commit -m "never git push --force"', 'ran'],
  ['grep -rn "git push --force" .', 'ran'],
  ["echo 'git push origin main'", 'ran'],
])

forms('force, in every spelling', ON_FEATURE, [
  ['git push -uf origin feature', FORCE],
  ['git push -fu origin feature', FORCE],
  ['git push --forc origin feature', FORCE],
  ['git push --force-w origin feature', FORCE],
  ['git push --force-with-lease origin feature', FORCE],
  ['git push --force-with-lease=feature:abc123 origin feature', FORCE],
  ['git push --force-with-lease --force-if-includes origin feature', FORCE],
  ['git push --force-if-includes --force origin feature', FORCE],
  ['git push origin +HEAD:feature', FORCE],
  ['git push --force-if-includes origin feature', 'ran'],
  ['git push -o fix origin feature', 'ran'],
  ['git push -ofix origin feature', 'ran'],
])

forms('every branch, a delete, a pattern', ON_FEATURE, [
  ['git push --mirror', EVERY],
  ['git push --mirror origin', EVERY],
  ['git push --mir origin', EVERY],
  ['git push --all', EVERY],
  ['git push --all origin', EVERY],
  ['git push --branches origin', EVERY],
  ['git push origin --delete main', MAIN],
  ['git push -d origin master', MASTER],
  ['git push origin :main', MAIN],
  ['git push origin :refs/heads/main', MAIN],
  ['git push origin heads/main', MAIN],
  ["git push origin 'refs/heads/*:refs/heads/*'", /pattern refspec/],
  ['git push --tags origin main', MAIN],
  ['git push origin --delete feature', 'ran'],
  ['git push -d origin feature', 'ran'],
  ['git push origin :feature', 'ran'],
  ["git push origin 'refs/tags/*'", 'ran'],
])

forms('tags alone leave main alone', ON_MAIN, [
  ['git push --tags', 'ran'],
  ['git push origin --tags', 'ran'],
  ['git push origin v1.0', 'ran'],
  ['git push --follow-tags', MAIN],
])

forms('a single & and a newline end a command', ON_FEATURE, [
  ['echo ok & git push --force origin x', FORCE],
  ['git status & git push origin main', MAIN],
  ['git status\ngit push --force', FORCE],
  ['git push \\\n  origin main', MAIN],
  ['git push \\\n  --force origin x', FORCE],
  ['npm test &> log.txt && git push origin main', MAIN],
  ['npm test &> log.txt && git push origin feature', 'ran'],
  ['git status\ngit push origin feature', 'ran'],
])

forms('only git push is a push, whatever git options come first', ON_MAIN, [
  ['git stash push -m wip', 'ran'],
  ['git log --grep push', 'ran'],
  ['git -C ../repo status', 'ran'],
  ['git -c core.editor=true commit -m wip', 'ran'],
  ['git --git-dir=.git log --oneline', 'ran'],
  ['git help push', 'ran'],
  ['git -c push.default=current push', MAIN],
  ['git --git-dir .git push origin main', MAIN],
  ['git --no-pager push', MAIN],
  ['git -c alias.p=push p origin main', /git alias/],
  ['git $SUB origin main', UNREAD],
])

forms('a heredoc body is text, unless a shell reads it or its tag is unquoted and it holds $( ) or ` `', ON_FEATURE, [
  ['cat <<EOF > n.md\ngit push --force\nEOF', 'ran'],
  ["cat > t.sh <<'EOF'\n  git push origin main\nEOF\necho ok", 'ran'],
  ['cat <<-EOF\n\tgit push --force\n\tEOF\necho done', 'ran'],
  ["git commit -m \"$(cat <<'EOF'\nRefuse git push --force (and pushes to main\nEOF\n)\" && git push origin feature", 'ran'],
  ['bash <<EOF\ngit push --force origin x\nEOF', FORCE],
  ["sh -s <<'EOF'\ngit push origin main\nEOF", MAIN],
  ['bash <<< "git push origin main"', MAIN],
  ['cat <<EOF\nNever run `git push --force` here.\nEOF', FORCE],
  ['cat <<EOF > notes.md\n$(git push origin main)\nEOF', MAIN],
])

forms('an expansion the guard cannot read ahead stops a push', ON_FEATURE, [
  ['git push origin $BRANCH', UNREAD],
  ['git push origin "$(git branch --show-current)"', UNREAD],
  ['for b in a b; do git push origin $b; done', UNREAD],
  ['echo $(git push origin main)', MAIN],
  ['echo `git push --force`', FORCE],
  ['echo $HOME && git push origin feature', 'ran'],
  ['git push origin feature # not main', 'ran'],
])

// A push that names no branch goes where git's settings send it.
const configured = (branch: string, config: string) => ({ '.': { branch, config } })
const UPSTREAM_MAIN = 'push.default upstream\nbranch.topic.merge refs/heads/main\n'
const PUSH_MAIN = 'remote.origin.push refs/heads/main:refs/heads/main\n'
forms('a push that names no branch follows its upstream', configured('topic', UPSTREAM_MAIN), [['git push', MAIN]])
forms('push.default=matching pushes main too', configured('feature', 'push.default matching\n'), [['git push', /matching/]])
forms('a remote push setting decides', configured('feature', PUSH_MAIN), [['git push origin', /remote.origin.push decides/]])
forms('a remote mirror setting decides', configured('feature', 'remote.origin.mirror true\n'), [['git push origin', /mirror decides/]])
forms('a remote mirror written with no value is on, as git reads it', configured('feature', 'remote.origin.mirror\n'), [['git push origin', /mirror decides/]])
forms('a remote mirror set false, or empty, is off', { '.': { branch: 'feature', config: 'remote.origin.mirror false\n' }, e: { branch: 'feature', config: 'remote.origin.mirror \n' } }, [
  ['git push origin', 'ran'],
  ['git -C e push origin', 'ran'],
])
forms('an upstream of the same name goes through', configured('feature', 'branch.feature.merge refs/heads/feature\n'), [['git push', 'ran']])
const ALIASES = 'alias.pf push --force\nalias.pm push origin main\nalias.st status -s\nalias.sh !git push -f\nalias.pff pf\nalias.loop loop\n'
forms('a git alias in a config file is judged as the command it stands for', configured('feature', ALIASES), [
  ['git pf', /force push/],
  ['git pf origin feature', /force push/],
  ['git pm', /pull request/],
  ['git sh', /force push/],
  ['git pff', /force push/], // an alias of an alias
  ['git loop', /too deep/], // an alias that names itself never ends
  ['git st', 'ran'], // an alias for a command that pushes nothing
  ['git flow init', 'ran'], // not an alias at all: some other program called by git
  ['cd . && git pf', /force push/],
])

forms('a detached HEAD writes no branch', { '.': {} }, [['git push origin HEAD', 'ran']])

// The forms below are the ones an independent check got past an earlier guard (each one confirmed against real
// git or bash where it pushes), beside the ordinary commands that must still run.
const LOCATE = /cannot locate/
const NAMED = /named by an expansion/
const through = (name: string) => new RegExp(`runs git push through ${name}`)

forms('1. a brace or a glob the shell expands is not read ahead, so the push waits', ON_FEATURE, [
  ['git push origin {main,}', UNREAD],
  ['git push origin ma{i,}n', UNREAD],
  ['git push origin {feature,main}', UNREAD],
  ['git push {--force,} origin feature', UNREAD],
  ['git push origin {+,}feature', UNREAD],
  ['git push origin ma?n', UNREAD],
  ['git push origin mai[n]', UNREAD],
  ['shopt -s extglob\ngit push origin @(main)', UNREAD],
  ['{git,} push origin main', NAMED],
  ['/usr/bin/gi? push origin main', NAMED],
  ["git push origin 'ma{i,}n'", 'ran'],
  ['mkdir -p src/{a,b} && git push origin feature', 'ran'],
  ['ls *.ts; git push origin feature', 'ran'],
  ["find . -name '*push*' && git push origin feature", 'ran'],
])

forms('2-4. a matching push, a pattern under refs/, and the last colon', ON_FEATURE, [
  ['git push origin :', /the refspec : pushes every branch that matches/],
  ["git push origin 'refs/*:refs/*'", /pattern refspec/],
  ["git push origin 'refs/h*:refs/h*'", /pattern refspec/],
  ["git push origin '*:*'", /pattern refspec/],
  ['git push origin ":/fix it:main"', MAIN],
  ['git push origin HEAD~1:refs/heads/master', MASTER],
  ["git push origin 'refs/tags/*:refs/tags/*'", 'ran'],
  ['git push origin ":/fix it:feature"', 'ran'],
])

forms('5. push.default=upstream sends a named branch to its upstream', configured('feature', 'push.default upstream\nbranch.fix.merge refs/heads/main\n'), [
  ['git push origin fix', MAIN],
  ['git push -u origin fix', MAIN],
  ['git push origin refs/heads/fix', MAIN],
  ['git push origin heads/fix', MAIN],
  ['git push origin HEAD', 'ran'],
  ['git push origin feature', 'ran'],
  ['git push origin fix:fix', 'ran'],
])
forms('5. push.default=tracking is upstream by its old name', configured('feature', 'push.default tracking\nbranch.fix.merge refs/heads/main\n'), [['git push origin fix', MAIN]])
forms('5. under push.default=simple a named branch keeps its name', configured('feature', 'branch.fix.merge refs/heads/main\n'), [['git push origin fix', 'ran']])
forms('5. remote.<name>.push maps a named branch', configured('feature', 'remote.origin.push refs/heads/feature:refs/heads/main\n'), [
  ['git push origin feature', MAIN],
  ['git push origin refs/heads/feature', MAIN],
  ['git push origin HEAD', 'ran'],
  ['git push origin other', 'ran'],
  ['git push origin feature:feature', 'ran'],
])
forms('5. a short remote.<name>.push maps nothing, as git reads it', configured('feature', 'remote.origin.push feature:main\n'), [['git push origin feature', 'ran']])
forms('5. a remote.<name>.push pattern maps as well', configured('feature', 'remote.origin.push refs/heads/release/*:refs/heads/*\n'), [
  ['git push origin release/main', MAIN],
  ['git push origin release/next', 'ran'],
])
forms('5. a remote.<name>.push that starts with + forces', configured('feature', 'remote.origin.push +refs/heads/*:refs/heads/*\n'), [['git push origin feature', FORCE]])
forms('5. a branch that is a symbolic ref to main goes to main', { '.': { branch: 'feature', symrefs: 'refs/heads/m refs/heads/main\nrefs/heads/feature \n' } }, [
  ['git push origin m', MAIN],
  ['git push origin feature', 'ran'],
])
forms('5. what a git command earlier on the line changes is read from the line', ON_FEATURE, [
  ['git checkout main && git push', MAIN],
  ['git switch main; git push origin HEAD', MAIN],
  ['git checkout -B master origin/master && git push', MASTER],
  ['git config push.default upstream && git push origin fix', /git config on this line/],
  ['git config remote.origin.push refs/heads/feature:refs/heads/main && git push origin feature', /git config on this line/],
  ['git symbolic-ref refs/heads/m refs/heads/main && git push origin m', /symbolic-ref on this line/],
  ['git remote add --mirror=push backup ../b.git && git push backup', /git remote on this line/],
  ['git checkout - && git push', /checks out a branch the guard cannot read/],
  ['git co main && git push', /not a git command the guard knows/],
  ['git checkout -b fix origin/main && git push origin fix', 'ran'],
  ['git checkout -b topic && git push -u origin topic', 'ran'],
  ['git checkout main && git pull && git checkout -b topic && git push -u origin topic', 'ran'],
  ['git config user.email x@y && git commit -m x && git push origin feature', 'ran'],
  ['git remote add origin https://example.com/r.git && git push -u origin feature', 'ran'],
])
forms('5. a loop runs its body again, so a push in it takes what later commands in the loop change', ON_FEATURE, [
  ['for i in 1 2; do git push; git checkout main; done', /checks out main/],
  ['for i in 1 2; do git push origin HEAD; git switch main; done', /checks out main/],
  ['while true; do git push origin HEAD; git checkout main; done', /checks out main/],
  ['for i in 1 2; do bash -c "git push"; git checkout main; done', /checks out main/],
  ['for i in 1 2; do git push origin fix; git config push.default upstream; done', /git config on this line/],
  ['for i in 1 2; do git push origin feature; export PATH=./bin; done', /it sets PATH/],
  ['{ git push; git checkout main; }', 'ran'],
  ['git push; for i in 1 2; do git checkout main; done', 'ran'],
  ['for i in 1 2; do git checkout main; done; git push origin feature', 'ran'],
])
forms('5. under push.default=upstream, an upstream the line sets is not read ahead', configured('feature', 'push.default upstream\n'), [
  ['git checkout -b fix origin/main; git push origin fix', /upstream this line sets/],
  ['git checkout -Bfix origin/main; git push origin fix', /upstream this line sets/],
  ['git switch --create=fix origin/main; git push origin fix', /upstream this line sets/],
  ['git branch -u origin/main && git push', /upstream this line sets/],
  ['git checkout -b fix origin/main; git push origin fix:fix', 'ran'],
])

forms('5. a branch made with its name attached to the flag (or after =) is the branch checked out', ON_FEATURE, [
  ['git checkout -Bmain origin/x && git push origin HEAD', MAIN],
  ['git switch -Cmain && git push', MAIN],
  ['git checkout -bmain && git push', MAIN],
  ['git switch -cmain && git push', MAIN],
  ['git checkout --orphan=main && git push origin HEAD', MAIN],
  ['git checkout --orphan main && git push origin HEAD', MAIN],
  ['git checkout --orph=main && git push origin HEAD', MAIN],
  ['git switch --create=master && git push', /master takes changes through a pull request/],
  ['git switch --force-create=main && git push', MAIN],
  ['git switch --force-c=main && git push', MAIN],
  ['git checkout -fbmain && git push', MAIN],
  ['git switch -fC main && git push', MAIN],
  ['git switch -qc main && git push', MAIN],
  ['git checkout -qfB main origin/x && git push origin HEAD', MAIN],
  ['git checkout -fqBmain && git push origin HEAD', MAIN],
  ['git switch --force-create main origin/x && git push', MAIN],
  ['git switch --orphan main && git push origin HEAD', MAIN],
  ['git checkout -ft origin/main && git push', MAIN],
  ['git switch --track origin/main && git push', MAIN],
  ['git switch -fc main --track origin/main && git push', MAIN],
  ['git checkout --track -b main origin/main && git push', MAIN],
  ['git checkout -f -- main && git push origin feature', 'ran'],
  ['git checkout -fb main && git push', MAIN],
  ['git checkout -bfix && git push origin fix', 'ran'],
  ['git switch --create=fix && git push -u origin fix', 'ran'],
])
forms('5. a branch moved or copied with its name attached is the branch checked out', ON_FEATURE, [
  ['git branch -Mmain && git push', MAIN],
  ['git branch -mmain && git push origin HEAD', MAIN],
  ['git branch -Cmain && git push', MAIN],
  ['git branch -M main && git push', MAIN],
  ['git branch -Mfix && git push origin fix', 'ran'],
  ['git branch -mf main && git push origin HEAD', MAIN],
  ['git branch -Mf main && git push origin HEAD', MAIN],
  ['git branch -cf main && git push origin HEAD', MAIN],
  ['git branch -Cf main && git push origin HEAD', MAIN],
  ['git branch -fm main && git push origin HEAD', MAIN],
  ['git branch -fM main && git push', MAIN],
  ['git branch -m -f main && git push', MAIN],
  ['git branch -m old main && git push', MAIN],
  ['git branch -mf old main && git push', MAIN],
  ['git branch --move --force main && git push', MAIN],
  ['git branch --mo main && git push', MAIN],
  ['git branch --copy -f main && git push', MAIN],
  ['git branch -mf fix && git push origin fix', 'ran'],
  ['git branch -mf old fix && git push origin fix', 'ran'],
])

// Every row below was run in a real repository on a feature branch with git itself and left main checked out (the full
// run was 1,600 generated forms of the create and move flags; this is a spread of it, and every repeated-flag form).
forms('5. forms that git itself accepts and that leave main checked out are all seen', ON_FEATURE, [
  ['git checkout -b main && git push origin HEAD', MAIN],
  ['git checkout -b main -f x && git push origin HEAD', MAIN],
  ['git checkout -q -b main x && git push origin HEAD', MAIN],
  ['git checkout -bmain -fq && git push origin HEAD', MAIN],
  ['git checkout -qf -bmain && git push origin HEAD', MAIN],
  ['git checkout -bmain -t && git push origin HEAD', MAIN],
  ['git checkout -ft -bmain x && git push origin HEAD', MAIN],
  ['git checkout -mbmain x && git push origin HEAD', MAIN],
  ['git checkout -f -Bmain && git push origin HEAD', MAIN],
  ['git checkout -qBmain && git push origin HEAD', MAIN],
  ['git checkout -fqB main && git push origin HEAD', MAIN],
  ['git checkout -B main -qf && git push origin HEAD', MAIN],
  ['git checkout -t -B main && git push origin HEAD', MAIN],
  ['git checkout -Bmain -ft && git push origin HEAD', MAIN],
  ['git checkout -m -B main x && git push origin HEAD', MAIN],
  ['git checkout --orphan main -f && git push origin HEAD', MAIN],
  ['git checkout -q --orphan main x && git push origin HEAD', MAIN],
  ['git checkout --orphan=main -fq x && git push origin HEAD', MAIN],
  ['git checkout -m --orphan=main && git push origin HEAD', MAIN],
  ['git checkout --orph main -f && git push origin HEAD', MAIN],
  ['git checkout -q --orph main x && git push origin HEAD', MAIN],
  ['git checkout --orph=main -fq x && git push origin HEAD', MAIN],
  ['git checkout -m --orph=main && git push origin HEAD', MAIN],
  ['git switch -c main -f && git push origin HEAD', MAIN],
  ['git switch -q -c main && git push origin HEAD', MAIN],
  ['git switch -cmain -q x && git push origin HEAD', MAIN],
  ['git switch -fq -cmain x && git push origin HEAD', MAIN],
  ['git switch -qfcmain x && git push origin HEAD', MAIN],
  ['git switch -ft -c main && git push origin HEAD', MAIN],
  ['git switch -mcmain && git push origin HEAD', MAIN],
  ['git switch -cf -c main x && git push origin HEAD', MAIN],
  ['git switch -Cmain -f && git push origin HEAD', MAIN],
  ['git switch -q -Cmain && git push origin HEAD', MAIN],
  ['git switch -fqCmain && git push origin HEAD', MAIN],
  ['git switch -qfC main && git push origin HEAD', MAIN],
  ['git switch -C main -t && git push origin HEAD', MAIN],
  ['git switch -ft -C main x && git push origin HEAD', MAIN],
  ['git switch -C main -m x && git push origin HEAD', MAIN],
  ['git switch -f --orphan main && git push origin HEAD', MAIN],
  ['git switch --orphan=main -fq && git push origin HEAD', MAIN],
  ['git switch --create main x && git push origin HEAD', MAIN],
  ['git switch --create main -q && git push origin HEAD', MAIN],
  ['git switch -fq --create main x && git push origin HEAD', MAIN],
  ['git switch --create=main -qf x && git push origin HEAD', MAIN],
  ['git switch -ft --create=main && git push origin HEAD', MAIN],
  ['git switch --create main -m x && git push origin HEAD', MAIN],
  ['git switch -f --force-create main && git push origin HEAD', MAIN],
  ['git switch --force-create=main -q && git push origin HEAD', MAIN],
  ['git switch -fq --force-create=main x && git push origin HEAD', MAIN],
  ['git switch --force-create main -t && git push origin HEAD', MAIN],
  ['git switch -ft --force-create main x && git push origin HEAD', MAIN],
  ['git switch --force-create=main -m x && git push origin HEAD', MAIN],
  ['git switch -q --orph main && git push origin HEAD', MAIN],
  ['git switch --orph=main -qf && git push origin HEAD', MAIN],
  ['git switch -f --force-c=main && git push origin HEAD', MAIN],
  ['git switch --force-c main -q x && git push origin HEAD', MAIN],
  ['git switch -qf --force-c main && git push origin HEAD', MAIN],
  ['git switch --force-c=main -t && git push origin HEAD', MAIN],
  ['git switch -ft --force-c=main x && git push origin HEAD', MAIN],
  ['git switch -Cf --force-c=main && git push origin HEAD', MAIN],
  ['git switch -f --cre main x && git push origin HEAD', MAIN],
  ['git switch --cre=main -q x && git push origin HEAD', MAIN],
  ['git switch -qf --cre=main && git push origin HEAD', MAIN],
  ['git switch --cre main -t x && git push origin HEAD', MAIN],
  ['git switch -m --cre main && git push origin HEAD', MAIN],
  ['git switch -cf --cre=main x && git push origin HEAD', MAIN],
  ['git switch -f --crea=main x && git push origin HEAD', MAIN],
  ['git switch --crea main -fq && git push origin HEAD', MAIN],
  ['git switch -qf --crea main x && git push origin HEAD', MAIN],
  ['git switch --crea=main -t x && git push origin HEAD', MAIN],
  ['git switch -m --crea=main && git push origin HEAD', MAIN],
  ['git branch -m feature main && git push origin HEAD', MAIN],
  ['git branch -qm main && git push origin HEAD', MAIN],
  ['git branch -m -fq feature main && git push origin HEAD', MAIN],
  ['git branch -t -m main && git push origin HEAD', MAIN],
  ['git branch -mft feature main && git push origin HEAD', MAIN],
  ['git branch -fmm feature main && git push origin HEAD', MAIN],
  ['git branch -mMf main && git push origin HEAD', MAIN],
  ['git branch -fMm feature main && git push origin HEAD', MAIN],
  ['git branch -Mf feature main && git push origin HEAD', MAIN],
  ['git branch -fqM main && git push origin HEAD', MAIN],
  ['git branch -M -qf feature main && git push origin HEAD', MAIN],
  ['git branch -Mft main && git push origin HEAD', MAIN],
  ['git branch -Mm feature main && git push origin HEAD', MAIN],
  ['git branch -M -mf feature main && git push origin HEAD', MAIN],
  ['git branch -M -fM main && git push origin HEAD', MAIN],
  ['git branch -q --move main && git push origin HEAD', MAIN],
  ['git branch --move -qf feature main && git push origin HEAD', MAIN],
  ['git branch -m --move feature main && git push origin HEAD', MAIN],
  ['git branch --move -Mf main && git push origin HEAD', MAIN],
  ['git branch -f --mo feature main && git push origin HEAD', MAIN],
  ['git branch --mo -qf main && git push origin HEAD', MAIN],
  ['git branch -m --mo main && git push origin HEAD', MAIN],
  ['git branch --mo -mf feature main && git push origin HEAD', MAIN],
  ['git branch -f --mov main && git push origin HEAD', MAIN],
  ['git branch --mov -fq feature main && git push origin HEAD', MAIN],
  ['git branch -ft --mov feature main && git push origin HEAD', MAIN],
  ['git branch --mov -mf main && git push origin HEAD', MAIN],
  ['git checkout -b x2 -b main && git push origin HEAD', MAIN],
  ['git checkout -b x2 -bmain && git push origin HEAD', MAIN],
  ['git checkout -B x2 -B main && git push origin HEAD', MAIN],
  ['git checkout -B x2 -Bmain && git push origin HEAD', MAIN],
  ['git checkout --orphan x2 --orphan main && git push origin HEAD', MAIN],
  ['git checkout --orphan x2 --orphan=main && git push origin HEAD', MAIN],
  ['git switch -c x2 -c main && git push origin HEAD', MAIN],
  ['git switch -c x2 -cmain && git push origin HEAD', MAIN],
  ['git switch -c x2 --create main && git push origin HEAD', MAIN],
  ['git switch -c x2 --create=main && git push origin HEAD', MAIN],
  ['git switch -C x2 -C main && git push origin HEAD', MAIN],
  ['git switch -C x2 -Cmain && git push origin HEAD', MAIN],
  ['git switch -C x2 --force-create main && git push origin HEAD', MAIN],
  ['git switch -C x2 --force-create=main && git push origin HEAD', MAIN],
  ['git switch --orphan x2 --orphan main && git push origin HEAD', MAIN],
  ['git switch --orphan x2 --orphan=main && git push origin HEAD', MAIN],
  ['git switch --create x2 -c main && git push origin HEAD', MAIN],
  ['git switch --create x2 -cmain && git push origin HEAD', MAIN],
  ['git switch --create x2 --create main && git push origin HEAD', MAIN],
  ['git switch --create x2 --create=main && git push origin HEAD', MAIN],
  ['git switch --force-create x2 -C main && git push origin HEAD', MAIN],
  ['git switch --force-create x2 -Cmain && git push origin HEAD', MAIN],
  ['git switch --force-create x2 --force-create main && git push origin HEAD', MAIN],
  ['git switch --force-create x2 --force-create=main && git push origin HEAD', MAIN],
  ['git branch -m -m main && git push origin HEAD', MAIN],
  ['git branch -m -M main && git push origin HEAD', MAIN],
  ['git branch -m --move main && git push origin HEAD', MAIN],
  ['git branch -M -m main && git push origin HEAD', MAIN],
  ['git branch -M -M main && git push origin HEAD', MAIN],
  ['git branch -M --move main && git push origin HEAD', MAIN],
  ['git branch --move -m main && git push origin HEAD', MAIN],
  ['git branch --move -M main && git push origin HEAD', MAIN],
  ['git branch --move --move main && git push origin HEAD', MAIN],
  ['git switch -cf -c main && git push origin HEAD', MAIN],
  ['git switch -fc x2 -c main && git push origin HEAD', MAIN],
])

forms('6. bash -c reads its script past --, other options and their values', ON_FEATURE, [
  ['bash -c -- "git push origin main"', MAIN],
  ['bash -c -e "git push origin main"', MAIN],
  ['bash -o pipefail -c "git push origin main"', MAIN],
  ['bash --norc -ec "git push --force"', FORCE],
  ['bash -c -- "git push origin feature"', 'ran'],
])

forms('7. git settings in the environment can make an alias', ON_FEATURE, [
  ['GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0="push origin main" git p', /GIT_CONFIG/],
  [`GIT_CONFIG_PARAMETERS="'alias.p'='push origin main'" git p`, /GIT_CONFIG/],
  ['export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0="push origin main"; git p', /GIT_CONFIG/],
  ['env GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.p GIT_CONFIG_VALUE_0="push origin main" git p', /GIT_CONFIG/],
  ['GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=$K GIT_CONFIG_VALUE_0=x git p', /GIT_CONFIG/],
  ['GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=user.name GIT_CONFIG_VALUE_0=x git commit -m wip && git push origin feature', 'ran'],
])

forms('8. a wrapper option takes its value, and env -C or sudo -D moves the push', { ...ON_FEATURE, x: { branch: 'main' } }, [
  ['sudo -u git git push origin main', MAIN],
  ['env -u git git push origin main', MAIN],
  ['env -C x git push', MAIN],
  ['env --chdir=x git push', MAIN],
  ['env -Cx git push origin HEAD', MAIN],
  ['sudo -D x git push', MAIN],
  ['timeout -s KILL 60 git push origin main', MAIN],
  ['nice -n 5 git push --force', FORCE],
  ['env -S "git push origin main"', MAIN],
  ['sudo -s git push origin main', MAIN],
  ['env -C "$D" git push', LOCATE],
  ['env -C x git push origin feature', 'ran'],
  ['sudo -u deploy git push origin feature', 'ran'],
  ['env - PATH=/usr/bin git push origin feature', /it sets PATH/],
  ['PATH="$HOME/bin:$PATH" git push origin feature', /it sets PATH/],
  ['env - CI=1 git push origin feature', 'ran'],
  ['NODE_ENV="$MODE" git push origin feature', 'ran'],
  ['HOME="$H" git push origin feature', LOCATE],
])

forms('9. a cd the shell may not keep leaves the guard unable to tell where a push runs', { '.': { branch: 'main' }, feat: { branch: 'feature' } }, [
  ['cd feat & git push', MAIN],
  ['cd feat | cat; git push', LOCATE],
  ['cd feat | true\ngit push origin HEAD', LOCATE],
  ['false && cd feat; git push', LOCATE],
  ['true || cd feat; git push', LOCATE],
  ['cd feat || echo no; git push', LOCATE],
  ['if false; then cd feat; fi; git push', LOCATE],
  ['for d in feat; do cd $d; done; git push', LOCATE],
  ['for i in 1 2; do git push; cd feat; done', LOCATE],
  ['{ cd feat; } & git push', LOCATE],
  ['g() { cd feat; }; git push', LOCATE],
  ['f() { git push; }; cd feat; f', LOCATE],
  ['sudo cd feat; git push', LOCATE],
  ['source env.sh && git push origin feature', LOCATE],
  ['cd feat && git push', 'ran'],
  ['cd feat; git push', 'ran'],
  ['cd feat || exit 1; git push', 'ran'],
  ['cd feat && npm test && git push', 'ran'],
  ['npm test && cd feat && git push', 'ran'],
  ['(cd feat && git push) & wait', 'ran'],
])
forms('9. eval cd moves the shell; declare -x and typeset -x export', { ...ON_FEATURE, x: { branch: 'main' } }, [
  ['eval cd x; git push', MAIN],
  ['eval "cd x"; git push origin HEAD', MAIN],
  ['declare -x GIT_DIR=x; git push', LOCATE],
  ['typeset -x GIT_DIR=x; git push', LOCATE],
  ['readonly GIT_WORK_TREE=x; git push', LOCATE],
  ['CDPATH=/elsewhere cd x && git push', LOCATE],
])

forms('10. what used to hide the rest of a line', ON_FEATURE, [
  ['(( y = 1 << 2 ))\ngit push origin main', MAIN],
  ['(( y = 1 << 2 ))\ngit push origin main\n2', MAIN],
  ['let x=1<<2\ngit push origin main', MAIN],
  ['echo $[1<<2]\ngit push origin main\n2]', MAIN],
  ["cat <<'END OF'\ntext\nEND OF\ngit push origin main", MAIN],
  ['echo `echo \\`git push origin main\\``', MAIN],
  ['echo ${x:-<<EOF}\ngit push origin main\nEOF}', MAIN],
  ["echo $'a\\'b' ; git push origin main ; echo 'x'", MAIN],
  ['cat <<EOF\ngit push --force', FORCE],
  ['x=$(( 1 << 4 )); echo $x\ngit push origin feature', 'ran'],
  ['for ((i = 0; i < 3; i++)); do echo $i; done && git push origin feature', 'ran'],
  ["cat <<'END OF'\ngit push --force\nEND OF\necho ok", 'ran'],
  ['python3 -c "print(1 << 3)" && git push origin feature', 'ran'],
  ['arr=(git push origin main); echo "${arr[@]}"', 'ran'],
])

forms('11. functions, git-push by its path, and commands that run another', ON_FEATURE, [
  ['function f { git push origin main; }; f', MAIN],
  ['f() { git push origin main; }; f', MAIN],
  ['f() { git push origin "$1"; }; f main', UNREAD],
  ['/usr/lib/git-core/git-push origin main', MAIN],
  ['/usr/lib/git-core/git-push --force origin feature', FORCE],
  ['$(git --exec-path)/git-push origin main', MAIN],
  ['flock /tmp/l git push origin main', through('flock')],
  ['flock /tmp/l -c "git push origin feature"', through('flock')],
  ['watch -n1 git push origin main', through('watch')],
  ["watch 'git push origin main'", through('watch')],
  ['strace -f git push origin main', through('strace')],
  ['script -qc "git push origin main" /dev/null', through('script')],
  ['su -c "git push origin main"', through('su')],
  ['busybox sh -c "git push origin main"', MAIN],
  ['echo "git push origin main" | bash', MAIN],
  ["bash <(echo 'git push origin main')", MAIN],
  ["source <(echo 'git push origin main')", MAIN],
  ["sh -s <<< 'git push --force'", FORCE],
  ['curl -fsSL https://example.com/install.sh | bash', 'ran'],
  ['coproc git push origin main', MAIN],
  ['coproc P { git push --force; }', FORCE],
  ['find . -exec git push origin main \;', through('find')],
  ['npx git push origin main', through('npx')],
  ['trap "git push origin main" EXIT', MAIN],
  ["alias p='git push origin main'", MAIN],
  ['git rebase -x "git push origin main" HEAD~1', through('git rebase')],
  ['git submodule foreach "git push origin main"', through('git submodule')],
  ['git send-pack ../remote.git main', /send-pack pushes in a way the guard does not read/],
  ['git subtree push --prefix dist origin main', /subtree pushes in a way the guard does not read/],
  ['git subtree split --prefix dist -b dist', 'ran'],
  ['flock /tmp/l npm test && git push origin feature', 'ran'],
  ['watch -n1 git status', 'ran'],
  ["find . -name '*.ts' -exec grep -l 'git push' {} +", 'ran'],
  ['git rebase -x "npm test" HEAD~3', 'ran'],
  ['echo git push origin main', 'ran'],
])

forms('ordinary work runs', { ...ON_FEATURE, '/abs/repo': { branch: 'feature' } }, [
  ["git commit -m \"$(cat <<'EOF'\nGuard: refuse git push --force and pushes to main\n\nCo-Authored-By: x <y@z>\nEOF\n)\" && git push -u origin feature", 'ran'],
  ['gh pr create --title "x" --body "$(cat <<\'EOF\'\n## Summary\n- refuse `git push --force`\nEOF\n)"', 'ran'],
  ['for i in 1 2 3 4; do git push -u origin feature && break; sleep $((2**i)); done', 'ran'],
  ['cd /abs/repo && git push -u origin feature', 'ran'],
  ['git push --tags', 'ran'],
  ['git push origin feature', 'ran'],
  ['git push -u origin HEAD', 'ran'],
  ['git push', 'ran'],
  ['git add -A && git commit -m "fix: x" && git push -u origin feature', 'ran'],
  ['git fetch origin main && git rebase origin/main', 'ran'],
  ['git push origin --delete old-feature', 'ran'],
  ['npm test 2>&1 | tail -20', 'ran'],
])

test("git's three answers are asked together, and one failing still makes the push wait", async ($, on) => {
  on('tool.call', () => ran)
  let inflight = 0, most = 0
  on('process.run', async (_: unknown, e: { argv: readonly string[] }) => {
    inflight += 1; most = Math.max(most, inflight)
    await new Promise(done => setTimeout(done, 5))
    inflight -= 1
    return onBranch('feature/lens')(_, e)
  })
  const out = await $.tool.call({ tool: 'Bash', command: 'git push' })
  expect(out.deny).toBeUndefined()
  expect(most).toBe(3)
})

test('when only one of git’s three answers fails, the push waits', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => (e.argv.includes('for-each-ref') ? git('', 128) : onBranch('feature/lens')(_, e)))
  const out = await $.tool.call({ tool: 'Bash', command: 'git push' })
  expect(out.text ?? out.deny).toBe(WAITS)
})

// Found by an independent red-team of the guard: lines that push to main or force with no `push` the guard could read.
const REFUSED = [
  'echo git push -f origin main | bash',
  'echo git push --force | sh -s',
  'bash <(echo git push -f origin main)',
  'git config alias.p "push --force origin main"; git p',
  'git config alias.p "push -f" && git p origin main',
  'echo push | xargs -I% git % origin main',
  'G=git; P=push; $G $P -f origin main',
  'git${IFS}pu${x}sh -f origin main',
  'caffeinate $GIT push -f',
]
for (const command of REFUSED)
  test(`a push the line hides is refused: ${command}`, async ($, on) => {
    on('tool.call', () => ran)
    on('process.run', onBranch('feature/lens'))
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny).toMatch(/^guard: /)
  })

test('the same shapes that are not pushes still go through, so the guard does not strand ordinary lines', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', onBranch('feature/lens'))
  for (const command of ['echo hello | bash', 'echo git status | bash', 'git config alias.st status; git st', 'git status', '$EDITOR README.md', 'echo $HOME']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeUndefined()
  }
})

// Round two of the independent review: 50 lines out of 641, run for real against a bare remote, moved main past the
// guard. Each row below is one of those spellings (and, after them, the benign lines that sit next to it).
const CHECKS_OUT_MAIN = /checks out main before this push/
const STALE = /so the guard cannot read ahead where this push goes/
forms('round two: a branch checked out, or a repository changed, by a spelling the guard did not read', ON_FEATURE, [
  ['git checkout main -- && git push', CHECKS_OUT_MAIN],
  ['git rebase --root main && git push', CHECKS_OUT_MAIN],
  ['git rebase -i --root main && git push', CHECKS_OUT_MAIN],
  ['git bisect start && git bisect reset main && git push', CHECKS_OUT_MAIN],
  ["printf 'symref-update HEAD refs/heads/main\\n' | git update-ref --stdin && git push", /update-ref/],
  ["printf 'symref-create refs/heads/foo refs/heads/main\\n' | git update-ref --stdin && git push origin foo", /update-ref/],
  ["echo 'ref: refs/heads/main' > .git/HEAD && git push", STALE],
  ["echo '[push]' >> .git/config && git push", STALE],
  ['sed -i s/feature/main/ .git/HEAD && git push', STALE],
  ["echo '[push]' >> ~/.gitconfig && git push", STALE],
  ["echo '[alias]' > cfg && GIT_CONFIG_GLOBAL=cfg git push", STALE],
  ["echo '[alias]' > cfg && git -c include.path=cfg push", STALE],
  ['echo push | xargs git', /xargs/],
  ['arch -arm64 bash -c "git push origin main"', through('arch')],
  ['arch -arm64 sh -c "git push --force"', through('arch')],
  ['git filter-branch --msg-filter "git push origin main" HEAD', through('git filter-branch')],
  ["git fetch --upload-pack='sh -c \"git push origin main\"' origin", through('git fetch')],
  ['git rebase -x"git push origin main" HEAD~1', through('git rebase')],
  ['git rebase -ix "git push origin main" HEAD~1', through('git rebase')],
  ['git rebase --ex "git push origin main" HEAD~1', through('git rebase')],
  ['git -c core.sshCommand="git push origin main" fetch', through('git fetch')],
])

forms('round two: the lines next to those spellings still run', { ...ON_FEATURE, '.': { branch: 'feature' } }, [
  ['git checkout feature -- src && git push', 'ran'],
  ['git checkout main -- src/a.ts && git push', 'ran'],
  ['git rebase main && git push', 'ran'],
  ['git rebase -i HEAD~3 && git push', 'ran'],
  ['git bisect start && git bisect reset && git push', 'ran'],
  ['printf "reset\\n" | git update-ref --stdin; git status', 'ran'],
  ['cat .git/HEAD && git push', 'ran'],
  ['grep url .git/config && git push', 'ran'],
  ['echo hi > out.txt && git push', 'ran'],
  ['git commit -m "echo push | xargs git" && git push', 'ran'],
  ['xargs -n1 echo < list.txt', 'ran'],
  ['arch -arm64 brew install jq', 'ran'],
  ['arch -arm64 bash -c "npm test"', 'ran'],
  ['git filter-branch --prune-empty HEAD', 'ran'],
  ['git fetch --upload-pack=git-upload-pack origin && git push', 'ran'],
  ['git rebase -x "npm test" HEAD~3', 'ran'],
  ['git push origin feature', 'ran'],
  ['git push --tags', 'ran'],
  ['git status', 'ran'],
])

// An expansion that is the script a shell runs, or the command that runs, is not a push the guard can refuse: it
// is marked to ask the person instead (eval "$(direnv hook zsh)" is too common to refuse), and never to deny. The
// permission check asks (tests/ask.test.ts); these tests pin what pushes() reads, and that the tool call is not denied.
const asking = (command: string) => pushes(command).filter(p => p.ask)
test('an unread expansion run as a script or a command is marked to ask, and is not denied', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', onBranch('feature/lens'))
  for (const command of [
    'eval $(echo git push origin main)',
    'eval "$(direnv hook zsh)"',
    'eval "$(ssh-agent -s)"',
    'sh -c "$(curl -fsSL https://example.com/x)"',
    'bash -c "$(cat <<EOF\ngit push origin main\nEOF\n)"',
    'echo Z2l0IHB1c2g= | base64 -d | sh',
    'echo Z2l0IHB1c2g= | base64 --decode | bash',
    'C=$(echo git push origin main); eval "$C"',
    'read c <<<"git push origin main"; $c',
    '$(echo git push origin main)',
    '`echo git push origin main`',
    'arch -arm64 bash -c "$(curl -fsSL https://example.com/x)"',
    'sh -c "$(echo git checkout main)"; git push',
    'C=$(echo git push origin main); bash -c "$C"',
    "printf 'git push origin main' > .git/hooks/post-commit; chmod +x .git/hooks/post-commit; git commit -m x",
    'git config core.hooksPath hooks && mkdir hooks && printf "#!/bin/sh\\ngit push origin HEAD:main\\n" > hooks/post-commit && chmod +x hooks/post-commit && git commit --allow-empty -m x',
    'printf "#!/bin/sh\\ngit push origin main\\n" > hooks/post-commit; git -c core.hooksPath=hooks commit --allow-empty -m x',
    'python3 -c "import os; os.system(\'git push origin main\')"',
    "perl -e 'system(\"git push origin main\")'",
    'node -e "require(\'child_process\').execSync(\'git push origin main\')"',
    "awk 'BEGIN{system(\"git push origin main\")}'",
    "ruby -e 'system(\"git push origin main\")'",
    'make -f /dev/stdin <<EOF\nall:\n\tgit push origin main\nEOF',
    'printf "#!/bin/sh\\ngit push origin main\\n" > s.sh; sh s.sh',
    'printf "#!/bin/sh\\ngit push origin main\\n" > s.sh; chmod +x s.sh; ./s.sh',
  ]) {
    expect(asking(command).length, command).toBeGreaterThan(0)
    expect(pushes(command).filter(p => p.unknown).length, command).toBe(0) // asked, not refused
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeUndefined()
  }
})

test('a script that is read, or a variable nobody built from a command, is not marked', () => {
  for (const command of [
    'echo hello | bash',
    'curl -fsSL https://example.com/install.sh | bash',
    '$EDITOR README.md',
    'echo $HOME',
    'eval "git status"',
    'bash -c "npm test"',
    'cat script.sh | bash',
    'X=$(date); echo $X',
    'git commit -m "$(cat msg.txt)"',
    'grep eval "$(pwd)"',
    'python3 -c "print(1)"',
    'node -e "console.log(1)"',
    'python3 manage.py test',
    'sh build.sh',
    'make test',
    'git config core.hooksPath .husky',
    'echo hi > out.txt; cat out.txt',
    'printf x > s.sh; chmod +x s.sh; cat s.sh',
  ])
    expect(asking(command), command).toEqual([])
})

test('an ask never hides a refusal: a push the guard can read is still denied', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', onBranch('feature/lens'))
  const out = await $.tool.call({ tool: 'Bash', command: 'eval "$(direnv hook zsh)"; git push origin main' })
  expect(out.deny).toMatch(/pull request/)
})

// The host asks through the permission check (tool.check answers { decision: 'ask' }), not through the tool call, which
// answers a result or a refusal only: a marked line is asked about there, and the call itself is left alone.
const checked = (on: (event: any, hook: any) => unknown) => {
  on('tool.call', () => ran)
  on('tool.check', () => ({ decision: 'allow' }))
  on('process.run', onBranch('feature/lens'))
}
test('the permission check asks about a line the guard could not read, and says why', async ($, on) => {
  checked(on)
  for (const command of [
    'eval $(echo git push origin main)',
    'eval "$(direnv hook zsh)"',
    'sh -c "$(echo git push origin main)"',
    'echo Z2l0IHB1c2g= | base64 -d | sh',
    'C=$(echo git push origin main); eval "$C"',
    'git config core.hooksPath hooks && printf "git push origin main" > hooks/post-commit && git commit --allow-empty -m x',
    'python3 -c "import os; os.system(\'git push origin main\')"',
    'printf "git push origin main" > s.sh; sh s.sh',
  ]) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeUndefined()
    const check = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(check.decision, command).toBe('ask')
    expect(check.reason, command).toMatch(/^guard: .*cannot read/)
  }
})

test('the permission check lets ordinary lines through', async ($, on) => {
  checked(on)
  for (const command of ['git status', 'git push origin feature', 'echo hello | bash', 'python3 -c "print(1)"', 'git config core.hooksPath .husky', 'npm test']) {
    const check = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(check.decision, command).toBe('allow')
  }
})

test('a push the guard can read is refused by the call, and an ask beside it does not hide that', async ($, on) => {
  checked(on)
  const command = 'eval "$(direnv hook zsh)"; git push origin main'
  const out = await $.tool.call({ tool: 'Bash', command })
  expect(out.deny).toMatch(/pull request/)
})

// ---- smoothness: the guard's cost grows in step with the line, never faster ----
// The bounds are loose on purpose (a slow machine must not fail them) and far under what a quadratic reader costs.
const ms = (f: () => unknown) => { const t = performance.now(); f(); return performance.now() - t }

test('a very long benign command is read fast, finds no push and goes through', async ($, on) => {
  on('tool.call', () => ran)
  const line = [
    `echo ${'word '.repeat(4000)}`,
    Array.from({ length: 1500 }, (_, i) => `cat file${i}.txt`).join(' | '),
    Array.from({ length: 1500 }, (_, i) => `ls dir${i}`).join(' && '),
    `printf '%s' "${'a b c '.repeat(3000)}"`,
    `FOO=${'x'.repeat(5000)} env | grep -c y`,
  ].join('; ')
  expect(line.length).toBeGreaterThan(60_000)
  expect(ms(() => pushes(line))).toBeLessThan(600)
  expect(pushes(line)).toEqual([])
  const began = performance.now()
  const out = await $.tool.call({ tool: 'Bash', command: line })
  expect(performance.now() - began).toBeLessThan(1000)
  expect(out.deny).toBeUndefined()
  expect(out).toEqual(ran)
})

test('a push at the end of a very long line is still found, and found fast', () => {
  const line = `${'echo word; '.repeat(6000)}git push origin main`
  let found: ReturnType<typeof pushes> = []
  expect(ms(() => { found = pushes(line) })).toBeLessThan(600)
  expect(found).toHaveLength(1)
})

test('a line of unclosed ${ is read in step with its length, not by its square', () => {
  for (const n of [8000, 16000]) expect(ms(() => pushes('echo ${x '.repeat(n)))).toBeLessThan(400)
  for (const n of [8000, 16000]) expect(ms(() => pushes('echo $[x '.repeat(n)))).toBeLessThan(400)
})
