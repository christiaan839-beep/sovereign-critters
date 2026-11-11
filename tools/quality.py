#!/usr/bin/env python3
"""QUALITY.md: what has been checked for each mod, against a release bar, as facts and never as adjectives.

Two kinds of fact, kept apart so neither can be inflated:
  measured   the version, the tests passing, strict validation, whether every tool-path hook fails open. Read from the plugins
             themselves by this script, so they cannot drift.
  witnessed  independent reviews, a docs audit, sightings in the real app, a cold install by someone else, a new test watched
             failing first. Written by people in tools/quality-facts.json, each with the date and the commit it was about.

A witnessed fact is fresh only while the part of the plugin it is about has not changed since the commit it was about (a review and
a sighting: the hooks, tests and sounds; the docs audit: the README and the hooks; a cold install: the whole plugin). A change there
means look again, so a green mark can never describe code nobody looked at.

The bar, eight gates per mod: tests pass; strict validation; hooks fail open (guard: closed on purpose); new tests watched failing
first; an independent code review with no open high finding; seen working in the desktop app; docs audited against the code; a cold
install by someone who is not the founder. The lead mods must meet all eight before release. The others must meet the first six
(everything but the desktop sighting and the cold install) to be on the shelf of extras, and all eight to be released.

  python3 tools/quality.py --write          measure everything (runs the plugin tests) and write QUALITY.md
  python3 tools/quality.py --check          say whether QUALITY.md is current (exit 1 if it is not)
  python3 tools/quality.py --check --counts FILE
                                            the same, reading 'name<TAB>passing<TAB>validated' lines (preflight passes these in
                                            so the tests are not run twice)
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FACTS = json.load(open(os.path.join(ROOT, 'tools', 'quality-facts.json'), encoding='utf-8'))
LEAD = FACTS['order'][:3]

GATES = [
    ('tests', 'Tests pass'),
    ('valid', 'Strict validation'),
    ('failopen', 'Hooks fail open'),
    ('failfirst', 'New tests failed first'),
    ('review', 'Independent code review'),
    ('seen', 'Seen in the desktop app'),
    ('docs', 'Docs audited'),
    ('cold', 'Cold install by someone else'),
]
EXTRAS_BAR = ['tests', 'valid', 'failopen', 'failfirst', 'review', 'docs']


def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


# What a fact is about, so only a change to that makes it stale: a review of the code and a sighting are about the hooks, the tests and
# the sounds (a README fix or a version bump does not touch them); the docs audit is about the README and the code it describes; a
# cold install is about the whole plugin.
CODE = ('hooks', 'tests', 'sounds')
DOCS = ('README.md', 'hooks')
WHOLE = ('.',)


def commits_since(sha, name, paths=WHOLE):
    """How many commits touched these parts of this plugin after the one a fact was about; None if that commit is unknown."""
    r = run('git', 'rev-list', '--count', f'{sha}..HEAD', '--', *[os.path.join('plugins', name, p) for p in paths])
    return int(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip().isdigit() else None


def measure(counts_file=None):
    seen = {}
    if counts_file:
        for line in open(counts_file, encoding='utf-8'):
            name, passing, validated = line.rstrip('\n').split('\t')
            seen[name] = (int(passing), validated == 'ok')
    out = {}
    for name in FACTS['order']:
        plugin = os.path.join('plugins', name)
        version = json.load(open(os.path.join(ROOT, plugin, '.claude-plugin', 'plugin.json'), encoding='utf-8'))['version']
        if name in seen:
            passing, validated = seen[name]
        else:
            t = run('claude', 'plugin', 'test', plugin)
            m = re.findall(r'(\d+) pass', t.stdout + t.stderr)
            passing = int(m[-1]) if m and t.returncode == 0 else 0
            validated = run('claude', 'plugin', 'validate', plugin, '--strict').returncode == 0
        out[name] = {'version': version, 'passing': passing, 'validated': validated}
    out['_hooks_fail_open'] = run(sys.executable, os.path.join('tools', 'check-hooks.py')).returncode == 0
    return out


def fresh(entries, name, since, paths=WHOLE):
    """Of these witnessed facts, 'met' if one is fresh, 'stale' if some exist but every one is out of date, else 'open'."""
    if not entries:
        return 'open'
    for e in entries:
        n = since(e.get('at', ''), name, paths) if e.get('at') else None
        if n == 0:
            return 'met'
    return 'stale'


def gates(name, measured, facts, since=commits_since):
    """Each gate as 'met', 'stale' or 'open', for one mod."""
    f = facts
    m = measured[name]
    reviews = f.get('reviews', [])
    code = [r for r in reviews if r.get('kind') in ('code', 'security') and r.get('openHigh', 0) == 0]
    docs = [r for r in reviews if r.get('kind') == 'docs']
    desk = [s for s in f.get('seen', []) if 'desktop' in s.get('surface', '').lower()]
    ff = [f['failFirst']] if f.get('failFirst') else []
    g = {
        'tests': 'met' if m['passing'] > 0 else 'open',
        'valid': 'met' if m['validated'] else 'open',
        'failopen': 'met' if (name == 'critter-ward' or measured['_hooks_fail_open']) else 'open',
        'failfirst': fresh(ff, name, since, CODE),
        'review': fresh(code, name, since, CODE),
        'seen': fresh(desk, name, since, CODE),
        'docs': fresh(docs, name, since, DOCS),
        'cold': fresh(f.get('coldInstall', []), name, since, WHOLE),
    }
    return g


def verdict(name, g):
    if all(v == 'met' for v in g.values()):
        return 'Ready to release'
    if name not in LEAD and all(g[k] == 'met' for k in EXTRAS_BAR):
        return 'Ready for the shelf of extras'
    need = [k for k, _ in GATES if g[k] != 'met']
    return f'Not ready: {len(need)} of 8 open'


def render(measured, since=commits_since):
    G = {n: gates(n, measured, FACTS['plugins'][n], since) for n in FACTS['order']}
    lines = [
        '# Quality',
        '',
        'What has been checked for each mod, against a release bar, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.',
        '',
        '- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.',
        '- **Witnessed** (reviews, sightings in the real app, a cold install, new tests watched failing first): written by people in `tools/quality-facts.json`, each with the date and the commit it was about. A witnessed fact is **fresh** only while the part of the plugin it is about has not changed since that commit (a review or a sighting: the hooks, tests and sounds; the docs audit: the README and the hooks; a cold install: the whole plugin). After such a change it shows **stale** until someone looks again.',
        '',
        '## The release bar',
        '',
        'Eight gates. The lead mods (the first three) must meet all eight before release. The others must meet the first six (all but the desktop sighting and the cold install) to be on the shelf of extras, and all eight to be released.',
        '',
        '| Mod | ' + ' | '.join(label for _, label in GATES) + ' | Verdict |',
        '| --- | ' + ' | '.join('---' for _ in GATES) + ' | --- |',
    ]
    word = {'met': 'met', 'stale': 'stale', 'open': 'open'}
    for n in FACTS['order']:
        lines.append(f'| {n} | ' + ' | '.join(word[G[n][k]] for k, _ in GATES) + f' | {verdict(n, G[n])} |')
    lines += ['', 'met: done, and nothing has changed since. stale: done, but the plugin has changed since, so it needs another look. open: not done yet.', '']
    if FACTS.get('repo'):
        lines += ['## The whole repository', '']
        lines += [f'- {r["date"]} (at {r["at"]}): {r["what"]}. Found: {r["found"]}.' for r in FACTS['repo']] + ['']
    for i, name in enumerate(FACTS['order']):
        m, f = measured[name], FACTS['plugins'][name]
        if i == 3:
            lines += ['## The others', '']
        elif i == 0:
            lines += ['## The lead mods', '']
        lines += [f'### {name} {m["version"]}', '']
        lines += ['| | |', '| --- | --- |']
        lines += [f'| Tests passing | {m["passing"]} |', f'| Strict validation | {"passes" if m["validated"] else "FAILS"} |']
        if name == 'critter-ward':
            lines += ['| Tool-path hooks | fails closed on purpose: when it cannot tell where a push goes, the push waits |']
        else:
            lines += [f'| Tool-path hooks fail open | {"yes, checked by preflight" if measured["_hooks_fail_open"] else "NO: see tools/check-hooks.py"} |']
        lines += [f'| Surfaces | {f["surfaces"]} |', f'| Verdict | {verdict(name, G[name])} |', '']
        lines += ['**Independent reviews**', '']
        lines += [f'- {r["date"]} (at {r["at"]}): {r["what"]}. Found: {r["found"]}.' for r in f['reviews']] or ['- none yet']
        lines += ['', '**New tests watched failing first**', '']
        ff = f.get('failFirst')
        lines += [f'- {ff["date"]} (at {ff["at"]}): {ff["what"]}.'] if ff else ['- not recorded yet']
        lines += ['', '**Seen working in the real app**', '']
        lines += [f'- {s["date"]} (at {s["at"]}), {s["surface"]}: {s["what"]}.' for s in f['seen']] or ['- not yet']
        lines += ['', '**Cold install by someone who is not the founder**', '']
        lines += [f'- {c["date"]} (at {c["at"]}), {c["by"]}: {c["what"]}.' for c in f.get('coldInstall', [])] or ['- not yet']
        lines += ['', '**Known gaps**', '']
        lines += [f'- {g}' for g in f['gaps']] or ['- none known']
        lines += ['']
    return '\n'.join(lines).rstrip('\n') + '\n'


def main(argv):
    path = os.path.join(ROOT, 'QUALITY.md')
    counts = argv[argv.index('--counts') + 1] if '--counts' in argv else None
    text = render(measure(counts))
    if '--write' in argv:
        open(path, 'w', encoding='utf-8').write(text)
        print('wrote QUALITY.md')
        return 0
    if '--check' in argv:
        have = open(path, encoding='utf-8').read() if os.path.exists(path) else ''
        if have == text:
            print('QUALITY.md is current')
            return 0
        print('QUALITY.md is out of date: run python3 tools/quality.py --write')
        return 1
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
