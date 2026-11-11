#!/usr/bin/env bash
# One command before a commit or a release: validate and test the root and all nine plugins, check every sound,
# and scan the files for what must never be published. Exits non-zero on any real failure; runs every step first.
# Needs: the claude CLI, python3, git, grep. Run from anywhere: bash tools/preflight.sh
set -u
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT" || exit 2
TMP=$(mktemp -d "${TMPDIR:-/tmp}/preflight.XXXXXX") || exit 2
trap 'rm -rf "$TMP"' EXIT
fails=0
note() { printf '%s\n' "$*"; }
bad() { fails=$((fails + 1)); printf 'FAIL  %s\n' "$*"; }
ok() { printf 'ok    %s\n' "$*"; }

command -v claude >/dev/null 2>&1 || { note 'FAIL  the claude CLI is not on PATH'; exit 2; }
command -v python3 >/dev/null 2>&1 || { note 'FAIL  python3 is not on PATH'; exit 2; }

# 1. validate and test: every plugin and every example must pass both, exactly
for dir in plugins/*/ examples/*/; do
  p=${dir%/}
  if claude plugin validate "$p" --strict >"$TMP/v.log" 2>&1; then ok "$p validate --strict"; else bad "$p validate --strict"; sed 's/^/      /' "$TMP/v.log"; fi
  if claude plugin test "$p" >"$TMP/t.log" 2>&1; then ok "$p test ($(grep -Eo '[0-9]+ pass' "$TMP/t.log" | tail -1))"; else bad "$p test"; sed 's/^/      /' "$TMP/t.log" | tail -40; fi
done

# 2. the root is a marketplace with no hooks of its own: it must validate, and its test must fail for exactly that one reason
if claude plugin validate . --strict >"$TMP/v.log" 2>&1; then ok 'root validate --strict'; else bad 'root validate --strict'; sed 's/^/      /' "$TMP/v.log"; fi
claude plugin test . >"$TMP/t.log" 2>&1; rc=$?
if [ "$rc" -eq 0 ]; then ok 'root test (passed)'
elif [ "$rc" -eq 1 ] && grep -q 'no hooks module to load' "$TMP/t.log" && [ "$(wc -l <"$TMP/t.log")" -le 2 ]; then ok 'root test (exit 1, "no hooks module": expected)'
else bad "root test exited $rc for a reason other than the expected one"; sed 's/^/      /' "$TMP/t.log" | tail -20; fi

# 2b. every hook on the tool path fails open (the guard fails closed on purpose and is left out)
if python3 tools/check-hooks.py >"$TMP/h.log" 2>&1; then ok 'every tool-path hook ends in .catch'; else bad 'a tool-path hook has no .catch'; sed 's/^/      /' "$TMP/h.log"; fi

# 3. every sound
for s in plugins/*/sounds; do
  [ -d "$s" ] || continue
  if python3 tools/check-sounds.py "$s" >"$TMP/s.log" 2>&1; then ok "$s sounds"; else bad "$s sounds"; sed 's/^/      /' "$TMP/s.log"; fi
done

# 4. hygiene: the files a commit would carry (tracked, plus new and not ignored), text only
if git rev-parse --git-dir >/dev/null 2>&1; then
  git ls-files -co --exclude-standard -z | tr '\0' '\n' | grep -v -e '^\.clawness/' -e '^tools/out/' -e '^tools/preflight\.sh$' >"$TMP/files"
else
  find . -type f -not -path './.git/*' -not -path './tools/out/*' -not -path './.clawness/*' | sed 's#^\./##' | grep -v '^tools/preflight\.sh$' >"$TMP/files"
fi
scan() { # name, extended regex, optional allowed-match regex
  local name=$1 re=$2 allow=${3:-'^$'} hits
  hits=$(tr '\n' '\0' <"$TMP/files" | xargs -0 grep -InEH -e "$re" 2>/dev/null | grep -Ev -e "$allow" || true)
  if [ -n "$hits" ]; then bad "hygiene: $name"; printf '%s\n' "$hits" | sed 's/^/      /' | head -20; else ok "hygiene: no $name"; fi
}
scan 'absolute home paths' '(/Users/[A-Za-z0-9._-]+|/home/[a-z][a-z0-9._-]+|C:\\Users\\)' '/home/(me|user)/'
scan 'model ids' 'claude-(opus|sonnet|haiku|fable)-[0-9]'
scan 'secret-shaped strings' '(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
scan 'email addresses' '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' 'a@b\.com|noreply@anthropic\.com|git@github\.com:'
scan 'event text in a workflow expression' '\$\{\{[^}]*(github\.event|github\.head_ref|github\.actor)' 
scan 'merge markers' '^(<<<<<<< |>>>>>>> |=======$)'
scan 'personal names in code' '(Christiaan|Tiaan)([^a-z]|$)' 'christiaan839-beep'

# 5. secrets in the whole git history, when gitleaks is installed (settings in .gitleaks.toml)
if command -v gitleaks >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  if gitleaks git . --no-banner -l error >"$TMP/leaks" 2>&1; then ok 'gitleaks: no secrets in history'; else bad 'gitleaks found something'; sed 's/^/      /' "$TMP/leaks" | head -20; fi
else
  note 'skip  gitleaks (not installed, or not a git checkout)'
fi

# 6. every plugin card has what a directory listing shows: a short description, a homepage, a repository, keywords
listing=$(python3 - <<'PY'
import glob, json
for f in sorted(glob.glob('plugins/*/.claude-plugin/plugin.json')):
    j = json.load(open(f))
    miss = [k for k in ('homepage', 'repository') if not j.get(k)]
    if len(j.get('keywords', [])) < 3: miss.append('keywords (3 or more)')
    if len(j.get('description', '')) > 300: miss.append('description over 300 characters')
    if miss: print(f"{j.get('name', f)}: {', '.join(miss)}")
PY
)
if [ -n "$listing" ]; then bad 'listing: plugin.json is thin'; printf '%s\n' "$listing" | sed 's/^/      /'; else ok 'listing: every plugin.json has homepage, repository, keywords, a short description'; fi

note
if [ "$fails" -eq 0 ]; then note 'preflight: all clear'; exit 0; else note "preflight: $fails failure(s)"; exit 1; fi
