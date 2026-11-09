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
