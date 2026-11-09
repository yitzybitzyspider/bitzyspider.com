# HQ findings and lessons learned (append only)

See LOGS.md for the rules. One entry per finding, with the rule that follows.

## 2026-11-09 Planning session  (author: Claude Code, refs: PLAN.md)

F-001 The CMG Bears scout has not run since 2026-09-26: the 12twenty session expired and re-login is blocked by Cloudflare on the Mac. Rule: login-bound scrapers need a persistent browser profile on an always-on box, and a re-login runbook, not a Mac launchd job.

F-002 The `haas-email-triage` Claude task is switched off and last wrote state on 2026-09-03. Rule: a scheduled task's "last run" field is not proof it works; the warden must check output, not schedules.

F-003 haas-sync already has the right pattern for card identity: stable keys like `canvas:<id>`, `cmg:<id>`, `manual:<slug>` on every Kanban line. Rule: HQ card keys extend this pattern rather than invent a new one.

F-004 bitzyspider.com has 66 merged PRs, so GitHub issue numbers do not start at 1. Rule: never hardcode issue numbers in docs before creation; create, then link.

F-005 Nothing anywhere reads Slack or WhatsApp today, and Ed Discussion threads are pasted by hand. Rule: treat chat sources as greenfield and put the Beeper research issue before any collector.

F-006 A naive "unresolved placeholder" check that looks for any "(" fails on ordinary prose. Rule: match the exact placeholder pattern, never a bare delimiter.

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #67)

F-007 Parallel agents all append to the end of the same DEVLOG.md, so their PRs conflict with each other at the tail. `merge=union` in `.gitattributes` resolves this for local merges, but GitHub's merge button does not honor it. Rule for now: rebase onto main right before merge. If this bites more than twice, switch to one file per entry under `docs/hq/devlog/` (needs a decision; see OQ-006).

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #69, #99, F-007)

F-008 `merge=union` on the logs is worse than a conflict: it merges silently and can place the branch's entry before main's newer entry, which breaks the append-only rule and was caught only by the CI check. Rule: no union driver. After merging main into a branch, run `scripts/hq/rebase_logs.sh <branch-tip>`, which rebuilds each log as main's file plus this branch's additions.
