import { expect, test } from 'claude-code/testing'
import { judge } from '../hooks/register'

// What the second review found, on the code that fixed the first.

const stop = (c: string) => judge(c, '/work/app', '/srv/me')
const stopped = (c: string) => expect(stop(c), c).toBeDefined()
const through = (c: string) => expect(stop(c), c).toBeUndefined()

test('a heredoc that a shell reads is a script, and an unquoted one runs its substitutions', () => {
  for (const c of ["bash <<'EOF'\nrm -rf ../x\nEOF", 'sh <<EOF\nrm -rf ../x\nEOF', 'cat <<EOF | sh\nrm -rf ../x\nEOF', "cat <<'EOF' | bash\ngit reset --hard\nEOF", 'cat <<EOF\n$(rm -rf ../x)\nEOF', 'cat <<EOF\n`rm -rf ../x`\nEOF']) stopped(c)
  through("cat <<'EOF'\n$(rm -rf ../x)\nEOF")
  through("cat > notes.md <<'EOF'\nrm -rf ../old\nEOF")
  through('cat <<EOF\nnothing to see: $(date)\nEOF')
})

test('a heredoc marker inside a quote or a comment starts nothing', () => {
  stopped('echo "<<EOF"\nrm -rf ../x\nEOF')
  stopped('echo hi # <<EOF\nrm -rf ../x\nEOF')
  stopped("echo '<<EOF'\nrm -rf ../x")
})

test('git commands that name the whole tree with .. or **', () => {
  for (const c of ['git checkout sub/..', 'git restore ./sub/..', 'git checkout ..', "git checkout '**'", 'git restore **', 'git restore sub/../.']) stopped(c)
  through('git checkout sub/../other')
  through('git restore sub/a.ts')
})

test('every -exec of a find is read, not only the first', () => {
  for (const c of ['find . -exec echo {} \\; -exec rm -rf .. \\;', 'find . -name x -exec ls {} \\; -execdir git clean -fd {} \\;']) stopped(c)
  through('find . -name x -exec ls {} \\; -exec wc -l {} \\;')
})

test('an option made of an expansion could be -r', () => {
  stopped('rm -$(echo rf) ../x')
  stopped('rm -${F} ../x')
  through('rm "$file"')
  through('rm -f "$file"')
})

test('eval and source may move the shell, so later relative targets are not trusted', () => {
  for (const c of ["eval 'cd ..'; rm -rf x", 'source ./setup.sh; rm -rf x', '. ./setup.sh; rm -rf x', 'source <(echo rm -rf ..)']) stopped(c)
  through('source ./setup.sh; ls')
})

test('git commands that run another command are read', () => {
  for (const c of ['git submodule foreach --recursive git reset --hard', "git submodule foreach 'git clean -fdx'", "git rebase -x 'rm -rf ..'", "git rebase --exec 'git reset --hard' main", 'git bisect run rm -rf ..']) stopped(c)
  through('git submodule foreach git status')
  through("git rebase -x 'npm test' main")
})

test('printf with a format word, piped into a shell', () => {
  for (const c of ["printf '%s\\n' 'rm -rf ../x' | sh", "printf %s 'rm -rf ..' | sh", "printf 'rm -rf ../x\\n' | bash"]) stopped(c)
  through("printf '%s\\n' 'rm -rf dist' | sh")
})

test('a git alias that runs a shell, or a config that drops the safety, made on the same line', () => {
  for (const c of ["git config alias.x '!rm -rf ..'; git x", "git -c alias.x='!rm -rf ..' x", 'git config clean.requireForce false; git clean -d', "git config --global alias.nuke '!git reset --hard'"]) stopped(c)
  through('git config user.name x; git commit -m wip')
  through('git config alias.st status; git st')
})

test('more wrappers are unwrapped', () => {
  for (const c of ['repeat 1 rm -rf ..', 'noglob rm -rf ..', 'nocorrect rm -rf ..', 'coproc rm -rf ..', "env -S 'rm -rf ..'", 'exec -a x rm -rf ..', 'arch -arm64 rm -rf ..', 'flock f rm -rf ..', 'parallel rm -rf ::: ..']) stopped(c)
})

test('an assignment with an expansion is not a command named by a variable', () => {
  for (const c of ['NODE_ENV=$X npm run build -r', 'PORT=$PORT rm -rf dist', 'X=$HOME rm -rf dist', 'X=$(pwd) git status']) through(c)
  stopped('X=$HOME rm --rec ../x')
  stopped('X=$HOME rm -rf ../x')
})

test('a pathspec after -- is not a flag, and wildcard directories empty the folder', () => {
  stopped('git clean -f -- -n')
  for (const c of ['rm -rf **', 'rm -rf */', 'rm -rf ./*/', 'rm -rf ./**']) stopped(c)
  through('rm -rf dist/*/')
})
