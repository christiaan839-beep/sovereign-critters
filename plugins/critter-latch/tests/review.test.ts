import { expect, test } from 'claude-code/testing'
import { judge } from '../hooks/register'

// What the independent review found. Every command here got past the first version, or was stopped when it should not have been.

const stop = (c: string) => judge(c, '/work/app', '/srv/me')
const stopped = (c: string) => expect(stop(c), c).toBeDefined()
const through = (c: string) => expect(stop(c), c).toBeUndefined()

test('pushd and popd, a cd in a subshell, a pipeline or a condition do not fix where later commands run', () => {
  for (const c of ['pushd dist; popd; rm -rf ../x', '(cd dist && make); rm -rf ../x', 'cd dist | cat; rm -rf ../x', '[ -d dist ] && cd dist; rm -rf ../x', 'cd dist || true; rm -rf ../x', 'cd nope && make; rm -rf ../x', 'cd dist; popd; rm -rf ../x']) stopped(c)
  through('cd build && rm -rf cache')
  through('(cd build && rm -rf cache)')
  through('cd build; rm -rf cache')
  through('pushd build && rm -rf cache && popd')
})

test('a redirect before the command, or among its words, hides nothing and is no target', () => {
  for (const c of ['>/dev/null rm -rf ../x', '2>/dev/null rm -rf ../x', '</dev/null rm -rf ../x', '> /dev/null rm -rf ../x', '&>/dev/null rm -rf ../x']) stopped(c)
  for (const c of ['rm -rf dist > /dev/null', 'rm -rf dist 2> /dev/null || true', 'rm -rf dist < /dev/null', 'rm -rf dist >> /tmp/log', 'rm -rf dist 2>&1', 'rm -rf dist &> /dev/null']) through(c)
})

test('a heredoc body is text, not commands', () => {
  through("cat > notes.md <<'EOF'\nrm -rf ../old\nEOF")
  through('git commit -m "$(cat <<\'EOF\'\nsay git reset --hard in the docs\nEOF\n)"')
  through('cat <<-END\n\trm -rf /\n\tEND')
  stopped("cat <<'EOF' > a\nhi\nEOF\nrm -rf ../x")
})

test('find -exec and its kin run what follows as a command on files the guard cannot name', () => {
  for (const c of ['find ~ -name x -exec rm -rf {} +', 'find . -name x -execdir rm -rf {} +', 'find . -ok rm -rf {} ;', 'find . -exec git clean -fd {} \\;', 'find / -exec rm -r {} \\;']) stopped(c)
  through('find . -name x -exec ls {} \\;')
  through('find . -name "*.tmp" -exec rm {} +')
})

test('git clean reads -e as taking a value, and a pattern with an n in it is not a dry run', () => {
  for (const c of ['git clean -fd -elint', 'git clean -fdx -eenv', 'git clean -en -f', 'git clean -f -e n']) stopped(c)
  through('git clean -fn')
  through('git clean -nf')
  through('git clean -fi')
  through('git clean --interactive -f')
})

test('every spelling of the whole tree is the whole tree', () => {
  for (const c of ['git restore ./.', 'git checkout ./.', "git restore ':(top)'", 'git checkout -- .//', 'git restore ./*', 'git checkout -- $PWD', 'git restore -- ././', 'git checkout -- "."', 'git restore *']) stopped(c)
  through('git checkout -p .')
  through('git restore -p .')
  through('git restore src/.')
  through('git checkout -- src/./a.ts')
})

test('a line continuation joins the words around it', () => {
  for (const c of ['rm -rf \\\n../x', 'rm -rf ..\\\n/x', 'git clean \\\n-fd', 'git reset \\\n--hard']) stopped(c)
})

test('quotes the guard must read to the end', () => {
  for (const c of ["echo $'it\\'s'; rm -rf ../x", "echo $(printf ')'); rm -rf ../x", 'echo "it\'s"; rm -rf ../x', "echo 'a;b'; rm -rf ../x"]) stopped(c)
  through("echo $'it\\'s'; rm -rf dist")
})

test('xargs options that take a value are skipped, long forms too', () => {
  for (const c of ['xargs -J % rm -rf %', 'xargs --max-args 1 rm -rf', 'xargs --max-procs 4 rm -rf', 'xargs --delimiter , rm -rf', 'xargs -0 -n1 rm -rf']) stopped(c)
})

test('a command named by a variable, with options that delete, or an eval of something unread, is stopped', () => {
  for (const c of ['$RM -rf ../x', '"$RM" -rf ../x', 'eval $CMD', 'eval "$(echo hi)"', '${RM:-rm} -rf x']) stopped(c)
  through('$EDITOR notes.md')
  through('eval "ls -la"')
})

test('git options that take a value, and a config that drops the safety, are read', () => {
  for (const c of ['git -c clean.requireForce=false clean -d', 'git --attr-source HEAD reset --hard', 'git -c clean.requireForce=no clean -dx']) stopped(c)
  through('git -c user.name=x commit -m wip')
})

test('more shells, abbreviations and pipes into a shell are read', () => {
  for (const c of ['su -c "rm -rf ../x" me', 'fish -c "rm -rf ../x"', 'busybox rm -rf ../x', 'rm --rec ../x', 'echo "rm -rf ../x" | sh', 'printf "rm -rf ../x" | bash', 'bash <<< "rm -rf ../x"', 'sh <<< "git reset --hard"']) stopped(c)
  through('echo "rm -rf dist" | sh')
  through('echo hello | sh')
})
