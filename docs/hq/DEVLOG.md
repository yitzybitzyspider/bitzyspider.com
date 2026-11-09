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
