#!/usr/bin/env python3
"""QUALITY.md: what has been checked for each mod, as facts with dates, never as adjectives.

Two kinds of fact, kept apart so neither can be inflated:
  measured   the version, the tests passing, strict validation, whether every tool-path hook fails open. Read from the plugins
             themselves by this script, so they cannot drift.
  witnessed  independent reviews and sightings in the real app, with dates. Written by people in tools/quality-facts.json.

  python3 tools/quality.py --write          measure everything (runs the plugin tests) and write QUALITY.md
  python3 tools/quality.py --check          say whether QUALITY.md is current (exit 1 if it is not)
  python3 tools/quality.py --check --counts FILE
                                            the same, reading 'name<TAB>passing<TAB>validated' lines (preflight passes these in
                                            so the tests are not run twice)
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FACTS = json.load(open(os.path.join(ROOT, 'tools', 'quality-facts.json'), encoding='utf-8'))


def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


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


def render(measured):
    lines = [
        '# Quality',
        '',
        'What has been checked for each mod, as facts with dates. A row says what was checked and when, never how good the mod is, and it never claims more than its evidence.',
        '',
        '- **Measured** (the version, tests passing, strict validation, hooks that fail open): read from the plugins by `tools/quality.py`, so they cannot drift. `bash tools/preflight.sh` tells you when this file is out of date; `python3 tools/quality.py --write` brings it up to date.',
        '- **Witnessed** (independent reviews, sightings in the real app): written by people in `tools/quality-facts.json`, each with a date. An empty row means it has not happened yet.',
        '',
        'The first three are the lead of the release; the other six are held to the same promise.',
        '',
    ]
    for i, name in enumerate(FACTS['order']):
        m, f = measured[name], FACTS['plugins'][name]
        if i == 3:
            lines += ['## The others', '']
        elif i == 0:
            lines += ['## The lead mods', '']
        lines += [f'### {name} {m["version"]}', '']
        lines += ['| | |', '| --- | --- |']
        lines += [f'| Tests passing | {m["passing"]} |', f'| Strict validation | {"passes" if m["validated"] else "FAILS"} |']
        if name == 'guard':
            lines += ['| Tool-path hooks | fails closed on purpose: when it cannot tell where a push goes, the push waits |']
        else:
            lines += [f'| Tool-path hooks fail open | {"yes, checked by preflight" if measured["_hooks_fail_open"] else "NO: see tools/check-hooks.py"} |']
        lines += [f'| Surfaces | {f["surfaces"]} |', '']
        lines += ['**Independent reviews**', '']
        lines += [f'- {r["date"]}: {r["what"]}. Found: {r["found"]}.' for r in f['reviews']] or ['- none yet']
        lines += ['', '**Seen working in the real app**', '']
        lines += [f'- {s["date"]}, {s["surface"]}: {s["what"]}.' for s in f['seen']] or ['- not yet']
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
