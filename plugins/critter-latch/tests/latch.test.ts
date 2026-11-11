import { expect, test } from 'claude-code/testing'
import { judge } from '../hooks/register'

const ROOT = '/work/app'
const HOME = '/srv/me'
const stop = (command: string) => judge(command, ROOT, HOME)

// ---- rm -----------------------------------------------------------------------------------------------------------

test('a recursive delete inside the folder goes through', () => {
  for (const c of ['rm -rf dist', 'rm -rf ./dist/cache', 'rm -r build node_modules', 'rm -rf /work/app/tmp', 'rm -Rf dist', 'rm --recursive --force dist', 'rm -rf dist/*', 'rm -rf "my dir"', 'rm file.txt', 'rm -f ../outside.txt', 'rm -rf dist && npm ci'])
    expect(stop(c), c).toBeUndefined()
})

test('a recursive delete that reaches outside the folder is stopped', () => {
  for (const c of ['rm -rf ../client-site/build', 'rm -rf ..', 'rm -rf /', 'rm -rf /*', 'rm -rf ~', 'rm -rf ~/projects', 'rm -rf /srv/me/other', 'rm -rf /tmp/x', 'rm -rf dist ../other', 'rm -rf dist/../..', 'rm -rf /work', 'rm -rf /work/app', 'rm -rf .', 'rm -rf ./', 'rm -rf *', 'rm -fr /etc', 'rm -r -f /var', 'rm -rfv ../x', 'rm --recursive /tmp/a', 'rm -dr ../x']) {
    const why = stop(c)
    expect(why, c).toMatch(/^rm -r reaches outside|^rm -r would delete the folder/)
  }
})

test('a target the guard cannot read is stopped, not guessed', () => {
  for (const c of ['rm -rf $DIR', 'rm -rf "$HOME/x"', 'rm -rf `pwd`/x', 'rm -rf $(cat list)', 'rm -rf {a,b}', 'rm -rf dist/$X']) expect(stop(c), c).toMatch(/^rm -r has a target the guard cannot read/)
})

test('the no-preserve-root option is always stopped', () => {
  expect(stop('rm -rf --no-preserve-root dist')).toMatch(/no-preserve-root/)
})

test('rm behind sudo, env, command, time, nice, xargs or a shell is still read', () => {
  for (const c of ['sudo rm -rf /tmp/x', 'env A=1 rm -rf ../x', 'command rm -rf ../x', 'time rm -rf ../x', 'nice -n 5 rm -rf ../x', 'A=1 rm -rf ../x', 'bash -c "rm -rf ../x"', "sh -c 'rm -rf /tmp/x'", 'bash -lc "echo hi; rm -rf ../x"', '/bin/rm -rf ../x', 'xargs rm -rf', 'ls | xargs rm -r', 'find . -name x | xargs -I{} rm -rf {}'])
    expect(stop(c), c).toBeDefined()
})

test('rm anywhere on a longer line is found', () => {
  for (const c of ['echo hi; rm -rf ../x', 'make && rm -rf /tmp/x || true', 'a | b\nrm -rf ../x', '(rm -rf ../x)', '{ rm -rf ../x; }'])
    expect(stop(c), c).toBeDefined()
})

test('a cd inside the folder moves where relative targets are judged, and a cd outside makes them unreadable', () => {
  expect(stop('cd build && rm -rf cache')).toBeUndefined()
  expect(stop('cd build && rm -rf ..')).toMatch(/^rm -r would delete the folder|^rm -r reaches outside/)
  expect(stop('cd build && rm -rf ../../x')).toMatch(/reaches outside/)
  expect(stop('cd .. && rm -rf x')).toMatch(/cd/)
  expect(stop('cd /tmp && rm -rf x')).toMatch(/cd/)
  expect(stop('cd $D && rm -rf x')).toMatch(/cd/)
  expect(stop('cd .. && ls')).toBeUndefined()
})

test('words that only look like rm are left alone', () => {
  for (const c of ['echo "rm -rf /"', "grep 'rm -rf' notes.md", 'git rm -r --cached dist', 'npm run rm -rf', 'cat rm -rf', 'ls -r ..']) expect(stop(c), c).toBeUndefined()
})

test('a command inside $( ) or backticks, a shell keyword, or eval is read too', () => {
  for (const c of ['echo $(rm -rf ../x)', 'echo `rm -rf ../x`', 'if true; then rm -rf ../x; fi', 'for d in a b; do rm -rf ../$d; done', 'while false; do rm -rf ../x; done', 'eval "rm -rf ../x"', 'eval rm -rf ../x', 'x=$(git reset --hard)', '\\rm -rf ../x', 'r""m -rf ../x', 'rm -rf -- ../x'])
    expect(stop(c), c).toBeDefined()
  for (const c of ['echo $(ls)', 'echo `date`', 'if true; then rm -rf dist; fi', 'eval "ls -la"']) expect(stop(c), c).toBeUndefined()
})

// ---- git ----------------------------------------------------------------------------------------------------------

test('git reset --hard is stopped in every spelling', () => {
  for (const c of ['git reset --hard', 'git reset --hard HEAD~3', 'git reset HEAD~1 --hard', 'git -C other reset --hard', 'git -c core.x=1 reset --hard', 'git reset --h', 'git reset --ha origin/main'])
    expect(stop(c), c).toMatch(/^git reset --hard drops/)
  for (const c of ['git reset', 'git reset --soft HEAD~1', 'git reset --mixed', 'git reset HEAD file', 'git reset --keep HEAD~1']) expect(stop(c), c).toBeUndefined()
})

test('git clean that forces is stopped, and a dry run is not', () => {
  for (const c of ['git clean -f', 'git clean -fd', 'git clean -fdx', 'git clean -xdf', 'git clean -d -f', 'git clean --force', 'git clean --f', 'git clean -ffd']) expect(stop(c), c).toMatch(/^git clean -f removes/)
  for (const c of ['git clean -n', 'git clean -nd', 'git clean --dry-run', 'git clean -fn', 'git clean -nf', 'git clean -fdn', 'git clean']) expect(stop(c), c).toBeUndefined()
})

test('checkout or restore over the whole tree is stopped, and a named file is not', () => {
  for (const c of ['git checkout .', 'git checkout -- .', 'git checkout -f', 'git checkout --force', 'git restore .', 'git restore -- .', 'git restore --worktree .', 'git checkout HEAD -- .', 'git checkout :/', 'git restore :/', 'git checkout -- ./'])
    expect(stop(c), c).toMatch(/^git (checkout|restore) throws away/)
  for (const c of ['git checkout main', 'git checkout -b topic', 'git checkout -- src/a.ts', 'git restore src/a.ts', 'git restore --staged .', 'git checkout feature', 'git switch main'])
    expect(stop(c), c).toBeUndefined()
})

test('git behind a wrapper or a shell is still read', () => {
  for (const c of ['sudo git reset --hard', 'env X=1 git clean -fd', 'bash -c "git reset --hard"', 'echo ok && git reset --hard', 'git stash && git reset --hard']) expect(stop(c), c).toBeDefined()
})

// ---- the hook -----------------------------------------------------------------------------------------------------

const wired = (on: (event: any, hook: any) => unknown) => {
  on('session.cwd', () => ({ value: ROOT }))
  on('env.get', () => ({ value: HOME }))
  on('tool.call', () => ({ result: 'ran' }))
}

test('the hook stops a delete and says why, and lets an ordinary command run', async ($, on) => {
  wired(on)
  const stopped = await $.tool.call({ tool: 'Bash', command: 'rm -rf ../client-site/build' })
  expect(stopped.text ?? stopped.deny).toBe('latch: rm -r reaches outside the folder you opened (/work/app). Ask the person to run it themselves if they meant it.')
  const ran = await $.tool.call({ tool: 'Bash', command: 'rm -rf dist' })
  expect(ran.deny).toBeUndefined()
  expect(ran.result).toBe('ran')
})

test('the hook never reads a tool other than Bash', async ($, on) => {
  wired(on)
  const ran = await $.tool.call({ tool: 'Read', file_path: '/etc/passwd' })
  expect(ran.deny).toBeUndefined()
})

test('when the folder cannot be found, a delete waits and an ordinary command runs', async ($, on) => {
  on('session.cwd', () => {
    throw new Error('no cwd')
  })
  on('env.get', () => ({ value: HOME }))
  on('tool.call', () => ({ result: 'ran' }))
  const waits = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf dist' } })
  expect(waits.decision).toBe('ask')
  expect(waits.reason).toMatch(/^latch: could not tell which folder this is/)
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  expect(ran.deny).toBeUndefined()
})
