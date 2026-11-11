import { expect, test } from 'claude-code/testing'

const git = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
const wired = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  on('tool.call', () => ({ result: 'ran' }))
  on('tool.check', () => ({ decision: 'allow' }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => git(e.argv.includes('--show-current') ? 'feature/lens\n' : ''))
}

// A line that runs an expansion nobody can read ahead is put to the person by the permission check, and never refused.
test('the permission check asks about a line that runs an unread expansion', async ($, on) => {
  wired(on)
  for (const command of ['eval "$(direnv hook zsh)"', 'echo Z2l0IHB1c2g= | base64 -d | sh', 'C=$(echo git push origin main); eval "$C"', '$(echo git push origin main)']) {
    const check = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(check.decision, command).toBe('ask')
    expect(check.reason, command).toMatch(/^guard: it runs .+, so the guard cannot read ahead whether it pushes\.$/)
    const out = await $.tool.call({ tool: 'Bash', command })
    expect(out.deny, command).toBeUndefined()
  }
})

test('a line the guard can read is not asked about, pushing or not', async ($, on) => {
  wired(on)
  for (const command of ['git status', 'git push origin feature/lens', 'eval "git status"', 'curl -fsSL https://example.com/install.sh | bash', 'git push --force origin main']) {
    const check = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(check.decision, command).toBe('allow')
  }
})

test('a check the guard cannot finish leaves the decision to the host', async ($, on) => {
  wired(on)
  const check = await $.tool.check({ tool: 'Bash', input: { command: 42 } })
  expect(check.decision).toBe('allow')
})
