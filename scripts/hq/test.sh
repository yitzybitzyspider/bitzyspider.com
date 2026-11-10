#!/usr/bin/env bash
# Run every HQ test that code can run. One command, one verdict:  scripts/hq/test.sh
# A suite passes only if it exits 0 AND prints its own final "all pass" line (see F-011:
# a suite that dies quietly must not count as green).
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0; ran=0; checks=0
suite() { # name, command...
  local name="$1"; shift
  local out; out="$("$@" 2>&1)"; local code=$?
  local n; n="$(printf '%s\n' "$out" | grep -c '^pass ')"
  if [ "$code" -eq 0 ] && printf '%s\n' "$out" | tail -n 1 | grep -q 'all pass'; then
    printf 'pass  %-22s %s checks%s\n' "$name" "$n" "$(printf '%s\n' "$out" | tail -n 1 | grep -o '([0-9]* skipped)' || true)"
  else
    printf 'FAIL  %-22s exit %s\n' "$name" "$code"; printf '%s\n' "$out" | grep -v '^pass ' | tail -n 15 | sed 's/^/      /'; fail=1
  fi
  ran=$((ran + 1)); checks=$((checks + n))
}
suite "sign-in gate"        node tests/hq-auth.js
suite "deck logic"          node tests/hq-deck.js
suite "deck UI behavior"    node tests/hq-ui.js
suite "agents view"         node tests/hq-agents.js
suite "wiring and contract" node tests/hq-wiring.js
suite "log rules checker"   scripts/hq/test_check_logs.sh
suite "pasted secret checks" scripts/hq/test_secret_checks.sh
if bash -n scripts/hq/setup-wizard.sh 2>/dev/null; then echo "pass  setup wizard parses"; else echo "FAIL  setup wizard has a syntax error"; fail=1; fi

if [ -n "${PGHOST:-}" ]; then
  out="$(scripts/hq/test-db.sh 2>&1)"; code=$?
  if [ "$code" -eq 0 ] && printf '%s\n' "$out" | tail -n 1 | grep -q 'db all pass'; then
    printf 'pass  %-22s %s checks\n' "clean database" "$(printf '%s\n' "$out" | grep -c '^pass ')"
  else echo "FAIL  clean database"; printf '%s\n' "$out" | tail -n 25 | sed 's/^/      /'; fail=1; fi
else
  echo "skip  clean database       (no PGHOST; CI runs it on every pull request)"
fi

echo
if [ "$fail" -eq 0 ]; then echo "HQ TESTS PASS: $ran suites, $checks checks"; else echo "HQ TESTS FAIL"; fi
exit "$fail"
