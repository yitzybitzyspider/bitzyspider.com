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

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #113, D-050)

F-015 Two more from the first live Beeper run. (1) Message text is a small subset of HTML, not plain text: `<br>`, `<a>` for links and for mentions (a `matrix.to` link whose label is the person's name), lists, bold. Fixture tests written from the spec alone missed this; the fix was a trial run into a scratch folder before the real one. Rule: for any collector, do a small live trial and read the output before the first full pull. (2) A Beeper token expires after 30 days and there is no refresh grant. Rule: the Ops Registry row and the runbook name the renewal date and the one command; a 401 is the signal.

## 2026-11-10  (author: Claude Code on Fable 5.2, refs: #90, D-052)

F-016 Three things from getting the resume applier to run on the Mac. (1) The Resume System was never a program: it is a rules document, two data files and renderers that a Claude chat drove by hand, and the copy on the Mac could not render at all (no `docx` package, renderers that only worked from one working folder, no LibreOffice). Rule: "get X running" starts with running X, not reading it. (2) The copy on the Mac is older than the one the last two real builds used: a profile under `builds/` carries corrections Yitzy made in October that the top-level `profile.js` does not, and the page calibration the last build settled on was never copied back. Rule: when two copies of a source of truth disagree, use the one the last finished build used, say so on the card, and make the choice a setting. (3) The `claude` command line cannot be assumed to be logged in: on this Mac its login had expired, and started from inside another Claude session it inherits that session's variables and fails the same way. Rule: any agent that shells out to a model strips the parent session's variables, treats "cannot authenticate" as "not reachable" and has a path that works without a model.

## 2026-11-10  (author: Claude Code on Fable 5.2, refs: #88, D-054)

F-017 Four things from getting CMG Bears read again. (1) Cloudflare stops every script-driven browser on 12twenty, not only headless ones. Measured: Playwright's "Chrome for Testing" never got past "Just a moment..." (2026-11-03); regular Chrome driven by Playwright with no window got a 403 on the first page; the same with a window reached CalNet, and after a correct sign-in was still stopped. Yitzy's everyday Chrome loaded both lists at once. Rule: when a site sits behind a bot check, do not iterate on browser flags; the choices are the person's own browser or no page at all. (2) Getting data out of a page in the Chrome extension has hard limits: the JavaScript tool cuts a return value at about 1,000 characters, the console tool carries about 17 KB, a download started by the script never reached disk, a request from the page to a local server hung, and URLs with query strings come back with the query blanked. Rule: log to the console, send `?`, `=` and `&` as tokens. (3) An agent copying text from one tool result into another command is a lossy channel. A whole page as one 6 KB line failed its checksum; one line per item worked except the one line that carried a backslash escape. Rule: anything an agent must copy travels as short lines, each with its own checksum, plain ASCII, no backslashes, and the receiver drops a bad line instead of trusting it. (4) A single-page app often already holds the data the script wants: 12twenty keeps each list in its AngularJS scope, so reading it costs no request and no click. Rule: before intercepting or replaying requests, look at what the page has in memory.
