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

## 2026-11-09 Private agents repo scaffolded  (author: Claude Code, refs: #75, D-005, D-009, D-025)

Created the private repo https://github.com/yitzybitzyspider/bitzy-hq-agents on the personal account and scaffolded it: README with the layout (hq_heartbeat/, collectors/, executors/, warden/, data/ as the gitignored Markdown store), the two workflow templates (`collector-on-box.yml` on `[self-hosted, box]`, `hosted-cron.yml` on ubuntu-latest), `docs/SECRETS.md` naming `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `HEALTHCHECKS_PING_URL` by name only, `.env.example`, a `docs/DEVLOG.md` that points back here as the primary log, a `pyproject.toml` with an empty `hq_heartbeat` package (implementation is #73), and a pytest smoke test.

Verified: `gh repo view --json visibility` shows PRIVATE; `gh workflow list` shows both templates; `pytest` passes 3 tests. Not verified: no workflow has run, no runner labeled `box` is registered yet.

Left for next session: #73 (heartbeat implementation) and registering the box runner.
