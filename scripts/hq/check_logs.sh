#!/usr/bin/env bash
# HQ log rules (docs/hq/LOGS.md):
#  1. The four logs are append only: a change may add lines, never remove or edit.
#  2. Any change to HQ code or docs must append to docs/hq/DEVLOG.md.
# Usage: check_logs.sh <base-ref> [<head-ref>]
set -euo pipefail
base="${1:?base ref required}"; head="${2:-HEAD}"
mb="$(git merge-base "$base" "$head")"
logs=(docs/hq/DECISIONS.md docs/hq/DEVLOG.md docs/hq/FINDINGS.md docs/hq/OPEN-QUESTIONS.md)
fail=0

for f in "${logs[@]}"; do
  git cat-file -e "$mb:$f" 2>/dev/null || continue   # new file: nothing to protect yet
  if ! git cat-file -e "$head:$f" 2>/dev/null; then
    echo "FAIL $f was deleted. Logs are append only."; fail=1; continue
  fi
  old_lines="$(git show "$mb:$f" | wc -l | tr -d ' ')"
  # The old file must be an exact prefix of the new one.
  if ! diff -q <(git show "$mb:$f") <(git show "$head:$f" | head -n "$old_lines") >/dev/null; then
    echo "FAIL $f: existing lines were changed or removed. Append at the end only."; fail=1
  fi
done

changed="$(git diff --name-only "$mb" "$head")"
if echo "$changed" | grep -Eq '^(hq/|supabase/|scripts/hq/|docs/hq/)' ; then
  if ! echo "$changed" | grep -qx 'docs/hq/DEVLOG.md'; then
    echo "FAIL HQ files changed without a docs/hq/DEVLOG.md entry."; fail=1
  fi
fi

[ "$fail" -eq 0 ] && echo "OK HQ log rules hold."
exit "$fail"
