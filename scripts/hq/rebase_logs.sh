#!/usr/bin/env bash
# Rebuild the four append-only logs on a branch that has merged main:
# main's file first, then only what this branch added. Use after `git merge origin/main`
# (resolve log conflicts any way, then run this). See F-007, F-008.
# Usage: rebase_logs.sh <branch-tip-before-merge> [<main-ref>]
set -euo pipefail
tip="${1:?branch tip before the merge (for example origin/my-branch)}"; main="${2:-origin/main}"
base="$(git merge-base "$tip" "$main")"
for f in docs/hq/DECISIONS.md docs/hq/DEVLOG.md docs/hq/FINDINGS.md docs/hq/OPEN-QUESTIONS.md; do
  git cat-file -e "$tip:$f" 2>/dev/null || continue
  n=0; git cat-file -e "$base:$f" 2>/dev/null && n="$(git show "$base:$f" | wc -l | tr -d ' ')"
  { git show "$main:$f"; git show "$tip:$f" | tail -n +"$((n + 1))"; } > "$f"
  git add "$f"
done
echo "logs rebuilt: main first, then this branch's additions"
