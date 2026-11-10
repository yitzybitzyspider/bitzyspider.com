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

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #101, #102)

F-009 `bitzy-hq-agents` is private, so GitHub-hosted workflow runs spend billed minutes. A five-minute cron alone would use about four times the free monthly allowance. Rule: hosted workflows are event-driven with a sparse backstop; anything frequent runs on the box's self-hosted runner.

F-010 The first deck treated a card as a reminder plus an optional action. Yitzy's first real use showed the unit is the finished artifact and the three verbs are approve, send back with a note, dismiss. Rule: show the thing that will be sent, not a description of it, and always give a way to answer back.

F-011 A test suite with a held promise that is never released makes node exit silently with no failure line. Rule: every test run must end by printing its own "all pass" line, and the runner checks for that line, not for the absence of FAIL.

## 2026-11-09  (author: Claude Code on Fable 5.2)

F-012 Migrations were applied to the live project by pasting SQL into a tool call, so nothing proved the committed files matched what ran. Rule: the clean-database CI job builds from the files alone and prints a fingerprint of every function body; after any hand-applied migration, compare it with the live project.

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #74, #87)

F-013 `to_regproc('schema.name')` returns null when the name has more than one overload. The guard "is pg_cron here?" used it, `cron.schedule` has two overloads, and so the warden applied cleanly on the live project and was never scheduled. Nothing failed; a check after applying ("is the job in cron.job?") is what caught it. Rules: guard on the catalog (`hq_has_function`), never on `to_regproc`; the wiring suite now rejects `to_regproc` in any live function; test stand-ins for extensions carry a second overload; and after applying any migration, verify its effect on the live project, not just that it ran.

## 2026-11-09  (author: Claude Code, refs: #113, #84, D-049)

F-014 Beeper Desktop, three things that bit or will bite. (1) Its local API publishes its own spec without a token at `http://localhost:23373/v1/spec`; read that before guessing endpoints. (2) Asking for the `read` scope does not get a read-only token: the consent page forwards `read`, Yitzy approved in the app, and the token came back with `read write`. Rule: never trust the requested scope, read the granted one; `beeper_dump` checks it at login and at every run and refuses a writing token unless `BEEPER_ALLOW_WRITE_TOKEN=1` is set on purpose. Whether the in-app approval offers a read-only choice is not known yet. (3) Chat ids belong to one installation: the short numeric ids and the `!room:beeper.local` ids come from this Mac's local bridges, so an allowlist or a saved position keyed only by id breaks on another computer. Rule: keep the id for speed, fall back to network plus exact title, and refuse when a title matches more than one chat. Tokens are per machine too: log in again on the new host.
