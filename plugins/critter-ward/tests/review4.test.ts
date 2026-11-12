import { expect, test } from 'claude-code/testing'
import { pushes } from '../hooks/register'

// What the fourth review found (2026-11-12). Each spelling was run for real against a throwaway bare remote (git 2.54, bash 3.2,
// zsh, tcsh) and moved main there before it went in here.

const git = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
// The session's folder is on `feature`; any other folder is on main.
const where = (_: unknown, e: { argv: readonly string[]; init?: { cwd?: string } }) =>
  git(e.argv.includes('--show-current') ? ((e.init?.cwd ?? '.') === '.' ? 'feature\n' : 'main\n') : '')
const ran = { result: 'pushed' }

test('more shells that run a script with -c', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', where)
  for (const s of ['tcsh', 'csh', 'oksh', 'posh', 'nu', 'xonsh', 'elvish', 'pwsh', 'powershell']) {
    for (const command of [`${s} -c 'git push -f'`, `${s} -c 'git push origin main'`]) {
      const out = await $.tool.call({ tool: 'Bash', command })
      expect(out.deny, command).toBeDefined()
    }
  }
  const out = await $.tool.call({ tool: 'Bash', command: "pwsh -Command 'git push -f'" })
  expect(out.deny).toBeDefined()
  for (const command of ["tcsh -c 'echo hi'", "pwsh -c 'Get-ChildItem'"]) expect((await $.tool.call({ tool: 'Bash', command })).deny, command).toBeUndefined()
})

test("zsh's chdir moves the shell as cd does", async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', where)
  for (const command of ['chdir /srv/other && git push', 'chdir /srv/other; git push']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeDefined()
  }
  expect(pushes('chdir /srv/other && git push')[0]?.cwd).toBe('/srv/other')
})

test('a zsh =name is the program it names', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', where)
  for (const command of ['=git push -f', '=git push origin main', 'sudo =git push -f']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeDefined()
  }
})

test('main and master in any case (a remote on a case-insensitive disk reads MAIN as main)', async ($, on) => {
  on('tool.call', () => ran)
  on('process.run', where)
  for (const command of ['git push origin feature:MAIN', 'git push origin feature:Master', 'git push origin feature:refs/heads/MAIN', 'git push origin :Main']) {
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toMatch(/pull request/)
  }
  expect((await $.tool.call({ tool: 'Bash', command: 'git push origin feature:maintenance' })).deny).toBeUndefined()
})
