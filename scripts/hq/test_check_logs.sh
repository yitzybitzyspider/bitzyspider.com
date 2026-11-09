#!/usr/bin/env bash
# Fault-injection test for check_logs.sh. Builds a throwaway repo and asserts each rule.
set -euo pipefail
chk="$(cd "$(dirname "$0")" && pwd)/check_logs.sh"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
cd "$t"; git init -q -b main; git config user.email t@t; git config user.name t
mkdir -p docs/hq hq; printf 'a\nb\n' > docs/hq/DEVLOG.md; printf 'd1\n' > docs/hq/DECISIONS.md
git add -A; git commit -qm base
expect() { # name want-exit
  local got=0; "$chk" main HEAD >/dev/null 2>&1 || got=$?
  if [ "$got" -eq "$2" ]; then echo "pass $1"; else echo "FAIL $1 (exit $got, want $2)"; exit 1; fi
  git checkout -q main; }
git checkout -q -b t1; echo c >> docs/hq/DEVLOG.md; mkdir -p hq; echo x > hq/a.js; git add -A; git commit -qm x; expect "append + code passes" 0
git checkout -q -b t2; mkdir -p hq; echo x > hq/a.js; git add -A; git commit -qm x; expect "code without devlog fails" 1
git checkout -q -b t3; printf 'a\nB\nc\n' > docs/hq/DEVLOG.md; git add -A; git commit -qm x; expect "edited old line fails" 1
git checkout -q -b t4; printf 'a\n' > docs/hq/DEVLOG.md; git add -A; git commit -qm x; expect "removed line fails" 1
git checkout -q -b t5; printf 'z\nd1\n' > docs/hq/DECISIONS.md; echo c >> docs/hq/DEVLOG.md; git add -A; git commit -qm x; expect "prepend to decisions fails" 1
git checkout -q -b t6; git rm -q docs/hq/DECISIONS.md; echo c >> docs/hq/DEVLOG.md; git add -A; git commit -qm x; expect "deleted log fails" 1
git checkout -q -b t7; echo y > README.md; git add -A; git commit -qm x; expect "non-HQ change passes" 0
echo "all pass"
