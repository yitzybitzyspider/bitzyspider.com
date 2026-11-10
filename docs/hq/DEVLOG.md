# HQ dev log (append only)

See LOGS.md for the rules. One entry per session or PR.

## 2026-11-09 Planning session and issue creation  (author: Claude Code with Yitzy, refs: docs/hq/PLAN.md, D-001..D-026)

Ran a grilling session over three rounds to settle the design of the /hq dashboard. Wrote PLAN.md (25 decisions, schema sketch, four milestones). Created the labels (`area:*`, `ready`, `in-progress`, `blocked`, `needs-human-merge`, `agent:*`), four milestones, and the issue set on GitHub. Seeded these logs. Nothing built yet; no Supabase project exists yet.

Verified: labels and milestones visible with `gh label list` and the milestones API. Not verified: nothing runs.

Left for next session: the first M0 issues (schema, auth, PWA shell) are `ready`.

## 2026-11-09 Issues created  (author: Claude Code, refs: #67 to #94)

Created 28 issues: 13 in M0 Foundation, 4 in M1, 6 in M2, 5 in M3. Index in docs/hq/ISSUES.md. The logs issue (#67) is first on purpose: Yitzy asked for the decisions, dev, and findings logs to be the first deliverable, and for everything created to be recorded in them. Dependency links resolved after creation because issue numbers were unknown beforehand (see F-004). Committed PLAN.md, the four logs, LOGS.md and ISSUES.md to main.

## 2026-11-09 M0 started: Supabase project created  (author: Claude Code, refs: #67, #68, D-002)

Claimed #67 and #68. Created the Supabase project `bitzy-hq` (ref `rdtvwvylmkxpdbbnsmuu`, region us-west-1, personal org, quoted cost $0 per month) through the Supabase MCP. No schema applied yet. Paused before writing any code (PR template, devlog CI check, migration) because Yitzy wants to switch models for hand-written code. Proposed #75 (private agents repo scaffold) as its own session.

## 2026-11-09 #67 logs enforcement  (author: Claude Code on Fable 5.2, refs: #67, D-026)

Added `scripts/hq/check_logs.sh` (old log content must be an exact prefix of the new; HQ paths `hq/`, `supabase/`, `scripts/hq/`, `docs/hq/` require a DEVLOG append), `scripts/hq/test_check_logs.sh` (seven fault-injection cases in a throwaway repo), the `HQ logs` workflow that runs both on every PR to main, and a PR template with the HQ checklist. Added `merge=union` for `docs/hq/*.md` in `.gitattributes`.

Verified: self-test passes locally, all seven cases. Left: branch protection requiring this check is part of #78. The CLAUDE.md pointer was already committed with the planning docs.

## 2026-11-09 Private agents repo scaffolded  (author: Claude Code, refs: #75, D-005, D-009, D-025)

Created the private repo https://github.com/yitzybitzyspider/bitzy-hq-agents on the personal account and scaffolded it: README with the layout (hq_heartbeat/, collectors/, executors/, warden/, data/ as the gitignored Markdown store), the two workflow templates (`collector-on-box.yml` on `[self-hosted, box]`, `hosted-cron.yml` on ubuntu-latest), `docs/SECRETS.md` naming `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `HEALTHCHECKS_PING_URL` by name only, `.env.example`, a `docs/DEVLOG.md` that points back here as the primary log, a `pyproject.toml` with an empty `hq_heartbeat` package (implementation is #73), and a pytest smoke test.

Verified: `gh repo view --json visibility` shows PRIVATE; `gh workflow list` shows both templates; `pytest` passes 3 tests. Not verified: no workflow has run, no runner labeled `box` is registered yet.

Left for next session: #73 (heartbeat implementation) and registering the box runner.

## 2026-11-09 #68 core schema applied  (author: Claude Code on Fable 5.2, refs: #68, D-002, D-003, D-004, D-017, D-024)

Wrote and applied `supabase/migrations/0001_core.sql` to `bitzy-hq`: `cards`, `actions`, `runs`, `sources`, `hq_settings`, the `hq_is_owner()` check, RLS on every table, column-level grants so the browser can only change a card's status, snooze and changed flag, and a stub `today_deck` view (security invoker). The owner email is a settings row set with the service role, so it is neither in this public repo nor changeable from the browser. Added `supabase/tests/rls_core.sql` and `docs/hq/RUNBOOKS/supabase.md`.

Verified: `rls_core.sql` returned `rls_core ok` against the live project (anon denied, a signed-in stranger sees zero rows and cannot write, the owner can swipe and file a pending action but cannot retitle a card, insert a card, forge a finished action, or change the owner). Six REST probes with only the publishable key all returned 401. Security advisor shows one notice, the intended `hq_is_owner` definer function. Tables are empty.

Left: Google sign-in is not configured (#69), so nobody can sign in yet. Scoring weights and the inputs cap are #72. The service key has not been copied into `bitzy-hq-agents` secrets; that is a manual step for Yitzy or the box wizard (#76).

## 2026-11-09 #72 scoring, inputs cap, collector upsert  (author: Claude Code on Fable 5.2, refs: #72, D-007, D-024)

Wrote and applied `supabase/migrations/0002_scoring.sql`: `hq_urgency` (overdue 3, within a day 2.5, three days 2, a week 1.5, otherwise 1), `hq_score` (bucket weight x urgency + the card's boost), default weights 5/4/3/2/1 and an inputs cap of 5 as rows in `hq_settings`, and the real `today_deck` view (alerts and plan pinned, then live score, inputs limited to the cap). Added `cards.fingerprint` and `hq_upsert_card(jsonb)`, the single write path for collectors: same fingerprint is a quiet refresh, a new fingerprint bumps `changed_at` and brings a cleared card back once with `changed = true`; snoozed cards stay snoozed. The upsert is executable by the service role only.

Verified: `supabase/tests/scoring.sql` returned `scoring ok` on the live project (pinning, order, cap of 5 keeping the urgent inputs, cap and weights read from settings, resurfacing rules, no duplicates, browser cannot call the upsert). It ran inside a rolled-back transaction.

Left: the cap is "visible at once", not "per calendar day"; see OQ-007. The test deletes cards inside its transaction, so run it only where a brief lock on `cards` is fine.

## 2026-11-09 #69 sign-in gate for /hq  (author: Claude Code on Fable 5.2, refs: #69, D-001, D-017, D-027)

Added `hq/index.html` (one Google button when signed out; checking, denied, error and a placeholder deck view that shows the count from `today_deck`), `hq/auth.js` (the decision logic as a pure `route()` plus a thin `boot()`), `hq/config.js` (project URL and publishable key), a vendored pinned `supabase-js` 2.45.4 so the page loads no third-party script, `tests/hq-auth.js`, a `Disallow: /hq/` line in robots.txt, and `docs/hq/RUNBOOKS/google-signin.md`. The page carries no Clarity tag and is noindex.

Verified: `node tests/hq-auth.js` passes 22 checks (signed out never touches the database, stranger is denied and signed out even if a late sign-out event arrives, a truthy non-boolean owner answer is denied, owner check failure shows an error and never the deck, redirect target ignores the query string). `node tests/clarity.js` still passes. Loaded http://localhost:4319/hq/ in the preview: only the sign-in section is visible, button is 52px tall, no console errors.

Not verified: a real Google sign-in. The provider is not enabled on the project yet (the authorize endpoint answers "provider is not enabled"); enabling it needs Yitzy's Google OAuth client, steps in the runbook. The 30-day session criterion rests on Supabase defaults and is unchecked until then.

## 2026-11-09 #71 swipe deck  (author: Claude Code on Fable 5.2, refs: #71, D-004, D-022, D-025, D-028)

Database: `supabase/migrations/0003_swipe.sql`, applied to `bitzy-hq`. `hq_swipe(card, dir, snooze_until, veto)` does a whole gesture in one transaction as the caller (security invoker): status change plus, when the card carries a proposed action, exactly one `actions` row with the batch veto list in its payload. A second swipe on the same card is refused, so a double tap or a retry can never file two actions. `hq_unswipe` puts back a dismissed, snoozed or done card, and refuses once an action exists.

Front end: `hq/md.js` (escape-first Markdown; links limited to http, https, mailto), `hq/deck.js` (pure logic and an optimistic controller with rollback and undo), `hq/deck-ui.js` (card stack, pointer drag with approve, dismiss and snooze stamps, three buttons, arrow keys, Enter to expand, z to undo, batch rows with per-row veto, toast, empty state with cleared count and next expected collector run, reload on return to the tab), and `hq/demo.js` (fixture cards and an in-memory API that can only switch on from a local host with `?demo=1`).

Verified: `supabase/tests/swipe.sql` returned `swipe ok` on the live project. `node tests/hq-deck.js` passes 57 checks, including 14 hostile Markdown inputs and the demo host gate. `tests/hq-auth.js`, `tests/clarity.js` and `tests/smoke.js` still pass. In the preview at 375x812 with the demo deck: drag right approved, drag up snoozed to 06:00 local next day, undo restored the card, the Dismiss and Approve buttons and the left arrow key worked, an action card showed no Undo, the batch card expanded on tap and carried the unchecked row as veto, the hostile card rendered as text with nothing executed, the empty state appeared with the cleared count, a failed write put the card back with an error toast, no console errors, no horizontal scroll, all tap targets 44px or taller.

Not verified: the deck against real signed-in data, which waits on Google sign-in (#69), and real touch on a phone (the preview drives pointer events with a mouse).

## 2026-11-09 Revise loop: send back with notes, edit in place, to-do cards, reviser agent  (author: Claude Code on Fable 5.2, refs: #101, #102, #103, D-034 to D-042)

Yitzy tried the demo deck and changed the card model: cards arrive with the work done, a card an agent could not do is a to-do with the reason, and he can send any card back with a note for an agent to rewrite. 80/20 ranking parked (#103).

Database, applied to `bitzy-hq`: `0004_revise.sql` (status `revising`, kind `todo`, append-only `revisions` table, `hq_revise`, `hq_swipe` with draft edits, `hq_unswipe` for a revising card, `hq_return_revised` and `hq_to_todo` for the service role, `hq_upsert_card` leaves a revising draft alone) and `0005_return_body.sql` (body-only returns for cards with no draft).

Deck: the draft is shown as the artifact (To, Subject, body) with context below; Edit in place; a fourth action Revise (button, down-swipe, R key) opening a notes sheet; Revised badge with the note and what changed; to-do cards with the reason and a Done button; refresh when idle so returned cards appear. Demo mode simulates the reviser. Contract for collectors in `docs/hq/CARD-CONTRACT.md`, linked from seven collector issues.

Reviser agent in `bitzy-hq-agents` (PR 1 there): one Claude call per revising card, strict JSON, returns the card or makes it a to-do.

Verified: `supabase/tests/revise.sql` returned `revise ok` on the live project and the body-only cases returned ok; `swipe.sql` behavior is covered again inside it. `node tests/hq-deck.js` passes 72 checks. Preview at 375x812 with the demo deck: Revise button and down-drag open the sheet, Send is disabled until there is text, the card leaves and returns on top marked Revised with the note, Undo pulls it back, Edit changes the draft and the approval carries only the changed field, a to-do shows its reason and a Done button, a retried to-do returns as an approvable draft, hostile strings in draft fields and notes render as text, no console errors, no horizontal scroll. Reviser: 35 pytest cases with the real Anthropic SDK pointed at a local stand-in server, covering the request shape, refusal, cut-off answers, retries, rate limits, undo during a rewrite, and a card with no note.

Not verified: a real Claude call and a real service-role write (no API key or service key exists in the agents repo yet), the database webhook that should wake the reviser (#87), and anything signed in (#69). Until the secrets and webhook exist, a card sent back in production waits in `revising`; Undo brings it back.

## 2026-11-09 #70 installable PWA with offline deck, and the setup wizard  (author: Claude Code on Fable 5.2, refs: #70, #69, #102, D-008, D-043)

PWA: `hq/manifest.webmanifest` (standalone, scope /hq/), four generated icons (red ring, white core, on black; one maskable), `hq/sw.js` (network first for same-origin files under /hq/, cache as the offline fallback, never touches other origins), `hq/offline.js` (last synced deck in localStorage, dropped after a week, wiped on sign-out and on denial), a stale banner on the deck, and the Apple home-screen meta tags. The deck controller falls back to the stored deck when a load fails and marks it stale.

Wizard: `scripts/hq/setup-wizard.sh`, built from the wizard template, walks the steps only Yitzy can do: Google OAuth client, Supabase provider and redirect URLs, a real sign-in check, then the Supabase service key and an Anthropic key typed with hidden input straight into GitHub Actions secrets on the private agents repo, then one manual reviser run. It writes nothing secret to this repo.

Verified: `node tests/hq-deck.js` passes 82 checks (offline fallback, stale mark cleared on reconnect, week-old deck dropped, corrupt or refused storage tolerated). `node tests/hq-auth.js` passes, including that every file the service worker pre-caches exists, every script the page loads is pre-cached, and the manifest's icons exist. In the preview: the service worker activated with scope /hq/, cached all 14 shell files, and with the demo's load failing the deck showed the stored cards under the offline banner with no console errors. The demo keeps its stored deck in memory, so real storage stayed empty. The wizard passes `bash -n`, and the three secret names it sets match the three the reviser workflow reads. https://bitzyspider.com/hq/ answers 200 with the sign-in page.

Not verified: Add to Home Screen on a real iPhone or Android phone, a Lighthouse run, and the wizard end to end (it opens browsers and waits for a person, so it was traced, not run).

## 2026-11-09 Code-first test layers and CI  (author: Claude Code on Fable 5.2, refs: D-044, F-011, F-012)

Yitzy asked for tests that default to what code can check, leaving visual inspection to him. Added: `tests/hq-ui.js` (the real deck UI driven in a fake DOM, `tests/lib/fakedom.js`), `tests/hq-wiring.js` with `tests/lib/schema.js` (page, migrations, card contract and agents repo checked against each other by reading the sources), `scripts/hq/test-db.sh` with `supabase/tests/bootstrap.sql` (empty Postgres, all migrations, all SQL suites, privilege audits), `scripts/hq/test.sh` (one command, one verdict), the `HQ tests` workflow (code job and clean-database job on every pull request), and `docs/hq/TESTING.md` (what each layer proves, how to add to it, and the list left for eyes).

Verified: `scripts/hq/test.sh` passes locally, 5 suites and 226 checks. Mutation checks: five deliberate breaks of `deck-ui.js` and six of the wiring were each caught, then restored. The clean-database job cannot run on this Mac (no Postgres or Docker); its result is whatever CI reports on this pull request.

Not covered by code, by design: looks, feel, real devices, real accounts, live services. Listed in TESTING.md.

## 2026-11-09 Clean-database job result and live fingerprint match  (author: Claude Code on Fable 5.2, refs: F-012)

The `HQ tests` workflow ran on the tests pull request. Clean database: all five migrations applied to an empty Postgres 17, `rls_core`, `scoring`, `swipe` and `revise` passed, no rows left behind, every table has row security, anon holds nothing, agent-only functions closed to the browser. Code job: 5 suites pass (the agents cross-check is skipped in CI because that private repo is not checked out there; it runs locally).

Compared the md5 of every function body from the clean build with the live `bitzy-hq` project: all ten match (`hq_is_owner`, `hq_return_revised`, `hq_revise`, `hq_score`, `hq_swipe`, `hq_to_todo`, `hq_touch`, `hq_unswipe`, `hq_upsert_card`, `hq_urgency`). The hand-applied migrations are the committed files.

## 2026-11-09 Reviser agent merged  (author: Claude Code on Fable 5.2, refs: #102)

Yitzy approved and the reviser pull request in `bitzy-hq-agents` was merged with its pytest check green. The `reviser` workflow is now on the default branch: it runs on `hq-revise` dispatch, by hand, and every six hours, and exits quietly until the three secrets exist. Issue #102 stays open until a live rewrite is seen after the setup wizard and the webhook (#87).

## 2026-11-09 #87 wake trigger (database side)  (author: Claude Code on Fable 5.2, refs: #87, #102, D-023, D-045)

Added `supabase/migrations/0006_wake.sql`: a `wakes` log table, `hq_wake(event)`, and triggers on `revisions` (owner notes only) and `actions` (pending only) that send a GitHub `repository_dispatch` to the agents repo through pg_net, with the token read from Supabase Vault. A wake can never fail a swipe: missing extension, missing token and network errors are recorded in `wakes` and swallowed. Bursts inside 20 seconds are one wake. Added `supabase/tests/wake.sql`, which stands in for pg_net and the vault, and extended the wiring suite (wake functions callable by no role, the event name matches the reviser workflow, the token is never logged).

Working agreement from Yitzy, same day: stop asking for go-aheads; build, merge on green, and bring him in only for visual checks and for secrets only he holds.

## 2026-11-09 #87 applied live, wizard stage added  (author: Claude Code on Fable 5.2, refs: #87, D-045)

Applied `0006_wake.sql` to `bitzy-hq`. Clean-database CI on the pull request: all five SQL suites pass including `wake` (no pg_net, no token, a correct dispatch, debounce, network down, visibility). Live check inside a rolled-back transaction: pg_net 0.20.4 and the vault are present, a note and a pending action each recorded `no_token` and sent nothing, and the browser role cannot call `hq_wake`. The three wake function fingerprints on the live project match the clean build.

Added a wake stage to `scripts/hq/setup-wizard.sh` (create a one-repo token, the script tests it against GitHub and expects 204, then Yitzy stores it in Vault) and `docs/hq/RUNBOOKS/wake.md`.

Not verified: a real dispatch from the live database, which needs the token in Vault. #87 stays open for that and for the executor workflow that will listen for `hq-action`.

## 2026-11-09 #74 warden as a scheduled database function  (author: Claude Code on Fable 5.2, refs: #74, D-015, D-047, OQ-009)

Added `supabase/migrations/0007_warden.sql`: `hq_warden()` runs eight deterministic checks (stale source, registered but never reported, last run failed, run never finished, three runs with zero cards, a card flood, approved actions not carried out, cards stuck in revising, wake signals failing) and writes each finding as a pinned alert card. A dismissed alert stays quiet for the day and returns the next day if still true; an alert whose problem went away expires; one that recurs the same day comes back. Thresholds are a settings row. It is scheduled on pg_cron every 30 minutes and records its own runs. Added `supabase/tests/warden.sql` with a fixed clock.

The check for stalled in-progress issues is not here: it needs the GitHub API and belongs to the daily reasoning pass (#93).

## 2026-11-09 Warden applied live, then fixed forward  (author: Claude Code on Fable 5.2, refs: #74, #87, F-013)

Applied `0007_warden.sql` to `bitzy-hq`; `hq_warden()` ran and found nothing, and its fingerprint matches the clean build. The post-apply check showed no job in `cron.job`: the pg_cron guard used `to_regproc`, which is null for overloaded names. Added `0008_guards.sql`: `hq_has_function` (catalog lookup), `hq_wake` re-created to use it, and `hq_schedule_warden()` so scheduling is a function that can be tested and re-run. The wake and warden suites now include overloaded stand-ins, and the wiring suite rejects `to_regproc` in any live function.

## 2026-11-09 Guards fix applied live; warden scheduled  (author: Claude Code on Fable 5.2, refs: #74, F-013)

Applied `0008_guards.sql` to `bitzy-hq`. Verified on the live project: `cron.job` holds `hq-warden` on `*/30 * * * *`, active; the guard now sees both pg_net and pg_cron; the warden has one run on record with zero findings; `hq_wake`, `hq_has_function` and `hq_schedule_warden` fingerprints match the clean build. CI: `wake` and `warden` suites pass with overloaded stand-ins.

Not verified: a scheduled (not hand-run) warden tick. The first one lands at the next half hour and will show as a second `warden` row in `runs`.

## 2026-11-09 #73 heartbeat library  (author: Claude Code on Fable 5.2, refs: #73, #74, D-015, D-025)

In `bitzy-hq-agents`: `hq_heartbeat.run(source, expected_interval, runs_on)` and the shared `Supabase` client. A job wrapped in it registers its source, opens a `runs` row before doing any work, closes it with the card count or the error, moves `last_ok_at` only on success, pings Healthchecks.io when a URL is set, and skips itself when the source is disabled in the database. These are exactly the rows the warden reads. The reviser now runs inside it. `r.upsert_card` is the one write path for cards; `r.save_md` keeps raw pulls as Markdown inside the data folder.

Verified: 47 pytest cases in the agents repo, including that the run row exists before work starts, a job's own error is never replaced by a bookkeeping failure, a success that cannot be recorded turns the job red, Ctrl-C is recorded, and a hostile file name cannot escape the data folder. The site's wiring suite now reads the shared client and checks every column it writes and every agent function it calls against the migrations.

Not verified: a real run against the live project (no service key in the agents repo yet).

## 2026-11-09 #77 hq command line and #78 protocol  (author: Claude Code on Fable 5.2, refs: #77, #78, D-012, D-016, D-046)

In `bitzy-hq-agents`: the `hq` command (`add`, `list`, `approve`, `dismiss`, `export-md`) on the shared Supabase client, and the `hq-add` Claude skill that wraps `hq add`, linked into `~/.claude/skills`. Filing the same words twice updates one card (the key is a slug plus a short hash of the text). Due dates accept today, tomorrow, +Nd and ISO forms, and anything else is refused, not guessed.

Here: `docs/hq/PROTOCOL.md` (claim, build, test, log, merge on green; when to bring Yitzy in; hard rules), an HQ issue template with a "For Yitzy's eyes" section, and a wizard step that writes the two Supabase values to the agents repo's gitignored `.env` so the command works on this Mac. The wiring suite now reads `cli/hq.py`: every function it calls, column it selects, bucket it offers and kind it files is checked against the migrations.

Not done from #78's original list, on purpose: branch protection and a reviewer-agent workflow. D-046 replaced the human-merge rule with "merge on green", and requiring checks on main would block the direct pushes other sessions make to the public site. CI on every pull request is the gate.

Verified: 71 pytest cases in the agents repo (24 for the command line); `scripts/hq/test.sh` passes with 248 checks. Not verified: the command against the live project, which needs the service key from the wizard.

## 2026-11-09 Warden's first scheduled tick confirmed  (author: Claude Code on Fable 5.2, refs: #74, D-047)

At 23:30:00 UTC pg_cron ran `hq-warden` on its own: `cron.job_run_details` shows `succeeded`, and `runs` has a second `warden` row (host `database`, zero findings) after the hand-run one at 23:11. The supervisor is live and independent of the box, GitHub and any secret. Appended a status snapshot to `ISSUES.md`: 11 issues done, 1 in progress, 5 blocked, 14 ready.

What is left before real cards flow is on Yitzy's side and is one script: `scripts/hq/setup-wizard.sh` (Google sign-in, service key, Anthropic key, wake token). After it, the collectors in M1 can be built and verified against the live project.

## 2026-11-09 Blocked issues routed to Grok, Instinct and Muse  (author: Claude Code, refs: D-048, OQ-001, #69, #76, #84, #87, #89, #91)

Surfaced why each blocked issue is blocked and who can clear it. Yitzy confirmed the three agents' capabilities, recorded as D-048, closing OQ-001. Created labels `agent:grok` and `agent:instinct`, relabeled #84 and #89 to Grok (#84 moved to in-progress), added Instinct to #69, #76 and #87, and left a routing comment on each plus #91 for Muse. #94 and #103 stay blocked by design (dependency chain, and parked by D-038).

Verified: labels and comments visible on GitHub. Not verified: no agent has picked anything up yet.

Left: Yitzy runs the setup wizard; Grok's #84 unblocks #85 and #86; Instinct's #76 unblocks the executor listener in #87.

## 2026-11-09 Beeper live; #113 Beeper chat dump CLI filed  (author: Claude Code, refs: #113, #84, #85, D-025)

Yitzy reports Beeper Desktop is set up and working. Filed #113: a read-only CLI in bitzy-hq-agents that every 30 minutes pulls every message from an allowlisted set of Haas chats through the Beeper Desktop API and writes append-only, deduped Markdown per chat plus an index, into data/ and a copy into the Obsidian vault. It is the raw input for the #85 collector and feeds findings back to #84; comments left on both. Host (Mac via launchd-runner, or the box) is left for a decision entry when the work starts. Added #113 to ISSUES.md.

## 2026-11-09 #113 beeper_dump built; live run waits on a token decision  (author: Claude Code, refs: #113, D-049, F-014, bitzy-hq-agents PR 4)

Built `collectors.beeper_dump` in bitzy-hq-agents (PR 4 there): a client that can only GET, the allowlist `chats.md` seeded from Beeper Desktop with 45 Haas groups ticked and 23 likely ones listed but off, append-only Markdown per chat with a heading per day, dedupe by sort key and message id, `INDEX.md`, a mirror folder for the vault, a read-scope login, a launchd template for the Mac and a workflow for the box with its cron commented out.

Yitzy said mid-build that this is being built on the Mac and will move to the other computer later, and to keep code, decisions, findings and dev logs stored. So: no machine paths in code, every machine-specific value is a setting, and because chat ids belong to one Beeper installation (F-014) the allowlist and the saved position also match by network plus exact title. The move itself is written up in `RUNBOOKS/beeper-dump.md`. D-049 records the shape and the host.

Verified: 18 new tests, 87 passing in the agents repo, covering dedupe across runs, overlapping pages, day headings in local time, same-title chats, one broken chat not stopping the rest, every request being a GET, refusal of a writing token, and a simulated move to another computer. The API shape was read from the spec Beeper serves locally.

Not verified: no live run. Yitzy approved the login, Beeper granted `read write` on a `read` request, and the tool refused to save the token. So nothing has been dumped, nothing is scheduled, and the Ops Registry row is not written yet. Real message text has not been seen by the renderer, so rich-text formatting may need a pass after the first run.

Left: Yitzy decides the write-scope question (runbook), then first live run, launchd load, Registry row, and a check of the vault copy. This PR also carries the two earlier log PRs (D-048 routing, #113 index) merged together so the logs do not conflict.

## 2026-11-09 #113 beeper_dump live on the Mac; #115 agents view filed  (author: Claude Code on Fable 5.2, refs: #113, #115, D-050, F-015, bitzy-hq-agents PR 4)

Yitzy accepted the write-capable Beeper token (D-050) and approved the login. A three-day trial run into a scratch folder showed message text arrives as HTML, so the renderer gained a rich-text to Markdown pass and system notices (joins, leaves) stopped being attributed to a person (F-015). Then the full first run: 13,129 messages across all 45 ticked chats in about two minutes, written to `data/beeper/` and mirrored to the vault at `Sync/HQ/Beeper/` (46 notes, state file not mirrored).

Scheduled: `com.yitzy.hq-beeper-dump` loaded in launchd, every 30 minutes, through launchd-runner. Row added to the vault's `Ops/Registry.md` and a title in `~/Sites/ops-dashboard/refresh.py`.

Verified: a second run by hand added 0 messages and the Markdown line count was identical before and after (21,470). The launchd-started run exited 0 with an empty error log and wrote to the vault. 89 tests pass in the agents repo, CI green on PR 4. No HTML tags, entities or raw mention links remain in the trial output.

Not verified: the run is not recorded in HQ `runs` and the warden cannot see it, because Supabase settings are not on the Mac yet (setup wizard). So #113 stays open on that one criterion. The move to the other computer is tested only in simulation. Token renewal in 30 days has not happened yet.

Also filed #115 from Yitzy's request during this session: an Agents view on /hq showing every collector, worker, executor and auditor with live state, plus what waits on him. Not started.

## 2026-11-10 #115 Agents view  (author: Claude Code on Fable 5.2, refs: #115, D-051, D-015, D-047)

What changed. Migration `0009_agents.sql`: `kind` and `title` on `sources` (backfilled; defaulted from the name by a trigger when an agent does not say), the function `hq_agent_status(now)` and the view `agent_status` with the seven derived states, and `runs` and `sources` added to the Realtime publication where one exists. Page: an Agents view on /hq (`hq/agents.js` for logic, `hq/agents-ui.js` for rendering) reached from a new Agents button on the deck bar, whose dot is red when an agent needs a look and pulses when one is running. The view shows warden alerts on top, four "waiting on you" counts with the first five items, then every agent under Collectors, Workers, Executors and Auditors, with planned agents greyed and linked to their issues. Sign out moved to the foot of this view. Demo mode (`/hq/?demo=1` on localhost) has sample agents of every kind and a fake run that starts and finishes every 7 seconds; `&nolive=1` shows the polling fallback. Version label 0.2.0 at the foot of the view; service worker cache is now `hq-shell-v2`. In `bitzy-hq-agents`: `hq agent-ping`, and `kind` and `title` on `hq_heartbeat.run` (beeper and the reviser send theirs). `PROTOCOL.md` tells outside agents to ping.

Verified. `scripts/hq/test.sh` passes with 6 suites and 333 checks, including the new `tests/hq-agents.js` (67 checks: wording, grouping, counts, the controller dropping a stale answer, the real UI on the real markup, the live path, the polling fallback, failure and empty states, demo data). The wiring suite gained checks that the page's kinds, states and columns are exactly the database's, that planned agents point at indexed issues, and that agent-ping writes only columns that exist. Eleven deliberate breaks were each caught: done actions counted as pending, to-dos dropped, a stale answer kept, a failed refresh blanking the rows, a title written as HTML, no debounce, polling ignoring Realtime, a renamed state, kind and column in the SQL, a hook removed from the page. In the agents repo, 115 pytest cases pass (26 new) and four breaks of the ping were caught. In a browser at phone width in demo mode: the view renders, a run starting and finishing changes the row without a reload, hostile text shows as text, the Deck button returns to the deck, no console errors.

Not verified here. The SQL suite `supabase/tests/agents.sql` (each state from seeded runs with a fixed clock, thresholds read from settings, anon and stranger see nothing, the browser cannot write) runs only in CI: this Mac has no Postgres. Realtime against the live project, the look on a real phone, and the view with a real signed-in session (sign-in is still blocked on #69) are untested. While this pull request was being built, the wiring suite turned out to read the agents repo from a stale local branch named `cli` before `HEAD`; it now reads `HEAD` first.

## 2026-11-10 #90 resume applier, first half  (author: Claude Code on Fable 5.2, refs: #90, #94, D-013, D-019, D-052, D-053, F-016)

What changed. In `bitzy-hq-agents` (pull request 7 there): a new `applier` package. `python -m applier prepare --url <posting>` fetches the posting (Ashby, Greenhouse and Lever public APIs, then the page's own job data, then page text; GET only), loads the Resume System folder, drafts bullets and a cover note, runs the fact guard (D-053), renders the one-page Word file with a renderer that no longer depends on the folder it is started from, runs the Resume System's own `validate.py`, trims bullets until the page estimate fits, and files one card inside `hq_heartbeat` as the worker `applier` (D-052). Three drafters: the `claude` command line with tools off, the approved bullet pool with no model, and a draft file written by a Claude Code session from `python -m applier brief`. Without Supabase settings the card is saved next to the resume and `python -m applier push` sends it later. Here: this entry, D-052, D-053, F-016 and `RUNBOOKS/applier.md`.

What was broken before. Nothing on the Mac could produce a resume: the `docx` package was not installed, the one-page renderer looked for the profile in the wrong folder and wrote to a folder that did not exist, and there was no command at all, only instructions for a chat to follow (F-016).

Verified. 32 new pytest cases in the agents repo (147 in the suite) against a made-up person; the guard's number check and the card's missing action type were each broken on purpose and caught. One real public posting (a product manager MBA internship) was run end to end on the Mac: the Word file was written, `validate.py` passed with one bullet trimmed, and on the live project the card is `new` with kind `approve`, a draft and no action type, and `sources` has `applier` as kind `worker` with one finished run of one card.

Not verified, not done. The `claude` drafter with a working login (its login on the Mac had expired; only the fallback and a stand-in were exercised). Page fit is an arithmetic estimate, not a render: the card tells Yitzy to open the file before submitting. No PDF. No title overrides. A note on the deck rewrites the card text through the reviser but does not rebuild the Word file. Still open on #90: the `job_pipeline` view, stage changes after `drafted`, and the collectors that find openings.

## 2026-11-10 #90 applier merged and running from main  (author: Claude Code on Fable 5.2, refs: #90, #118, D-046, bitzy-hq-agents PR 7)

Yitzy said to merge without asking (D-046 stands for this work too). Merged bitzy-hq-agents pull request 7 and #118 here, both squash, both green. The main agents checkout on the Mac was fast-forwarded, the Word renderer package installed there (`npm install --prefix applier`), and verified from it: 147 pytest cases pass, a dry run of a real posting with the pool drafter wrote its files with no card, and `python -m applier push` reports nothing waiting. The session's worktrees and branches were removed. The applier has a row in the vault's Ops Registry.

Still true from the earlier entry: the `claude` drafter has not run with a working login, page fit is an estimate, and the rest of #90 (pipeline view, stages after `drafted`, the collectors that find openings) is not built. #90 stays open and `ready` for that half.

## 2026-11-10 #88 CMG Bears scout reading again, on request through regular Chrome, cards in HQ  (author: Claude Code on Fable 5.2, refs: #88, D-054, F-017, D-014, D-019, bitzy-hq-agents PR 6)

What broke. The scout's 12twenty session expired on 2026-09-26 and every later sign-in attempt died on Cloudflare. Today that was pinned down: no browser driven by a script gets through, signed in or not (F-017). Yitzy pointed at his own Chrome with the Claude extension, and a read there, at his request, worked.

What changed. In the scout folder (not in git): `cmg snippet events|postings` prints a read-only script that takes the list the page already holds in memory, keeps what the filter config asks for and logs one checksummed line per item; `cmg ingest` checks and files those lines with the same schema guard, calendar check and state as the old scan, or takes `--needs-login`; every item gets a `last_seen` stamp; the Playwright commands refuse to start unless asked by name; the overnight check only notifies; no machine paths, and the lock and notifications no longer assume a Mac. In `bitzy-hq-agents` (PR 6): `collectors/cmg` with `begin` (GO or STOP plus the page scripts), `finish` (files the lines, writes cards, wraps it in `hq_heartbeat.run("cmg", ..., kind="collector", title="CMG Bears scout")`), `refresh` and `cards`; cards per the contract (an event still open for sign-up is a to-do with `raw.todo_reason`, a posting is an fyi in inputs, an expired sign-in is the to-do `cmg:login`, long dashes in employer titles are stripped, items the portal stopped listing make no card); the on-request procedure in `collectors/cmg/TASK.md`. Here: runbooks `RUNBOOKS/cmg.md` and `RUNBOOKS/cmg-relogin.md`.

What was built and taken out again. First a launchd schedule through launchd-runner around the Playwright scan: loaded for an hour, retired when Playwright turned out to be blocked. Then a scheduled Claude task driving Yitzy's Chrome four times a day, with a random skip and wait: drafted, its creation refused by the permission classifier, and on reflection the refusal was right (D-054), so the scheduled mode, the waits and the skips were removed from the code and a test now asserts they are gone. Two single page loads with a Playwright-driven regular Chrome were also made early on to see where the check bites; that line of work is closed.

Verified. Live on the Mac at 11:00 PT, by this session at Yitzy's request: both pages opened in regular Chrome, the scripts read 50 events and 60 postings, 3 events and 22 postings were kept and filed, and one posting line was dropped by its checksum (the backslash case, since fixed). `collectors.cmg refresh` wrote 25 cards to the live project: `sources` has `cmg` as collector "CMG Bears scout" on mac, a `runs` row finished with `cards_upserted` 25 and no error, `agent_status` says ok and on demand, and the three events show as to-do cards in community with their reason. Tests: 151 pass in the agents repo (36 for the bridge) and 26 in the scout, where the real page script is run by node against a stand-in page and its output fed to `ingest`, including the real September fixtures giving the same result as the old scan. Deliberate breaks, each caught: in the bridge, a scout command outside the two allowed, a failure swallowed, an empty events page accepted, stale items carded; in the scout, checksum ignored, schema guard off, sign-in flag not cleared, quotes not swapped.

Not done, and why. There is no schedule, by decision (D-054), so two things the task asked for are not met: "runs on a schedule" and the launchd and ops-dashboard registration (the Registry row now says scans are on request). #88's "runs on the box 4x daily" is not met either. Not verified: a scan requested in a fresh session following `TASK.md`; the backslash fix on a live page (proven in the node test only); the sign-in card on a phone; anything on the box.

Open in the scout's own findings: the events list shows only its first 50 entries and the script never pages (about five weeks ahead today). The scout folder is still not under version control.

## 2026-11-10 Live end-to-end check and secret vetting  (author: Claude Code on Fable 5.2, refs: F-018, D-055, #69)

What happened first. Yitzy ran the setup wizard. Google sign-in came on, but the service key had been pasted three times and was saved that way to the Mac and to GitHub; every agent call failed with "Invalid API key". The copy on the Mac was trimmed by hand and Yitzy replaced the GitHub secrets. He then pointed out that proving this by asking him to swipe a card was the wrong way round: the tests are part of the build.

What changed. In `bitzy-hq-agents`: `hq doctor` and `hq doctor --full` (D-055). Here: `scripts/hq/secret-checks.sh`, used by the wizard for the service key and the Anthropic key. A paste is cleaned, a repeated paste is reduced to one copy and announced, the shape is checked, and the key is tried against the real service (a read on the project; listing models at Anthropic, which costs nothing) before anything is saved. A key that fails is not saved and the wizard asks again, up to three times. The wake token is cleaned the same way before its existing live test. `PROTOCOL.md` and `TESTING.md` now say that a live dependency ships with its doctor check.

Verified. `scripts/hq/test.sh`: 7 suites, with the new `test_secret_checks.sh` (41 checks) driving the real wizard prompt with pasted input against a stand-in for both services: a tripled paste is repaired and accepted, a wrong key then a right one is accepted on the second try, three wrong pastes save nothing, and no message contains the secret. Seven deliberate breaks were each caught (repeat detection off, live test skipped, shape unchecked, raw paste saved, Anthropic key not vetted, secret in a message, the prompt accepting without vetting). The wiring suite gained seven checks on the doctor: its columns, its states, and that it deletes only rows of its own test card, filtered by id. In the agents repo, 52 new tests run the doctor against an in-memory HQ with a scripted reviser, and 13 deliberate breaks of the doctor were each caught.

Verified live, 2026-11-10: `hq doctor --full` passed all 13 checks. The test card left the deck, the database recorded a sent wake, the reviser on GitHub called Claude, and the card came back reading "The HQ self test passed." after about 30 seconds; the card and its history were then removed. That is the first proof that the Anthropic key, the wake token and the whole revise loop work on the live system. With the service key tripled again in the environment, the doctor fails at its first check with "the same key pasted 3 times in a row".

Not verified: the wizard's new prompts in a real terminal run (the function is tested with piped input, the full wizard is not re-run), and the Agents view as it looks under Yitzy's sign-in.
