# HQ decisions log (append only)

See LOGS.md for the rules. Each decision: context, options, choice, consequences.

## 2026-11-09 Planning session  (author: Yitzy + Claude Code, refs: docs/hq/PLAN.md)

D-001 Dashboard lives at bitzyspider.com/hq as a static page in the public repo, gated by Supabase Auth. Options: separate subdomain and private repo, or hosted app. Chosen for zero build step and the existing locked-section pattern in /learn. Consequence: no secrets in this repo, ever; browser holds only the anon key and a session.

D-002 New dedicated Supabase project on the personal account. Rejected reusing Haas Builds to keep keys and auth separate.

D-003 One `cards` table for every item (homework, chat threads, birthdays, jobs, CMG, alerts, plans). Rejected per-source tables. Consequence: every collector learns one shape.

D-004 Swipe right approves and writes an `actions` row an agent executes; left dismisses; up snoozes; tap expands. Sources without an executor fall back to "mark done".

D-005 Collector runtime is the Windows laptop ("the box") as a self-hosted GitHub Actions runner labeled `box` under WSL2 + Docker. Login-free work runs on GitHub-hosted runners. Rejected Mac launchd (ties up the MacBook), Supabase edge functions (no sessions).

D-006 Source order: M1 homework + calendar + birthdays; M2 Beeper (WhatsApp, Slack) + CMG repair + email; M3 jobs, Facebook enrichment, deeper executors.

D-007 Ranking: score = bucket weight x urgency, inputs capped per day, plus a morning plan card the agent proposes and Yitzy accepts by swipe.

D-008 Phone-first installable PWA. Desktop is the same column, wider.

D-009 UI, schema, docs, logs and all issues in bitzyspider.com (public). Collectors and executors in private repo `bitzy-hq-agents`.

D-010 Supabase is the truth for "today". haas-sync keeps mirroring to Obsidian during transition. Every routine registers in Sync/Ops/Registry.md.

D-011 Birthdays from every source; the byproduct is enriching Google Contacts (birthday, relationship, how met). Facebook is read through Muse.

D-012 General tasks: Supabase is the one inbox. Obsidian `manual:` cards migrate; `hq add` CLI and a Claude skill file cards from any chat.

D-013 Jobs: `job_pipeline` view over cards with stages found / drafted / applied / interview / closed. Approve = agent drafts materials from the Resume System profile. Agents never submit applications in v1.

D-014 Box access via Tailscale + Chrome Remote Desktop; one persistent browser profile per service. CMG Bears re-login is a remote-desktop runbook.

D-015 Warden: deterministic checks on GitHub Actions every 30 min, independent of the box; Healthchecks.io dead-man pings per job; a daily Claude reasoning pass files repair issues. Every alert is also a card.

D-016 Agent protocol: issues carry milestone, `area:` label, `ready`, acceptance criteria, test command. Agent self-assigns, swaps `ready` for `in-progress`, branches, opens a PR, closes on merge. Human merge for schema, auth, executors (`needs-human-merge`). Reviewer agent + auto-merge for UI and collectors.

D-017 Auth: Google sign-in allowlisted to one email, long session; RLS keyed to that user id.

D-018 Notifications: only "morning plan ready" and "warden red". Web push, ntfy fallback.

D-019 Action boundary v1: allowed after approval are Slack, WhatsApp and email replies and calendar events. Deferred behind a second confirmation: CMG registration, job submission. Never: payments.

D-020 Issues are one agent-sitting each, one milestone per wave.

D-021 Beeper (Matrix bridges) is the single read/write path for WhatsApp and all Slack workspaces, pending the research issue. Fallback: Slack user tokens + whatsapp-web.js.

D-022 Enrichment proposals are batched cards per source per run with per-row veto.

D-023 Executor trigger: Supabase database webhook -> GitHub repository_dispatch -> workflow on the box; polling backstop every 15 min.

D-024 Card identity: stable key per source, upsert, dismissed stays dismissed until the source item changes materially, then resurfaces once with a "changed" badge.

D-025 Markdown everywhere: card bodies, raw pulls in the agents repo, nightly export of the day and these logs into the Obsidian vault.

D-026 Four append-only logs (decisions, devlog, findings, open questions) are the first deliverable; every PR appends to DEVLOG and the reviewer enforces it.

## 2026-11-09 Schema details  (author: Claude Code on Fable 5.2, refs: #68)

D-027 The owner email is stored as a row in `hq_settings`, not hardcoded in a policy. Context: the repo is public and policies are in migrations. Options: literal email in the policy, or a lookup. Chosen: lookup through a definer function `hq_is_owner()`. Consequence: one accepted advisor notice; changing the owner is a service-role operation only.

D-028 The browser gets column-level update on cards (`status`, `snoozed_until`, `changed`) and nothing else. Context: D-004 says a swipe changes state; it never needs to edit content. Consequence: a stolen session cannot rewrite card bodies or forge executed actions; all content comes from collectors using the service role.

## 2026-11-09 Sign-in details  (author: Claude Code on Fable 5.2, refs: #69)

D-029 `supabase-js` is vendored at a pinned version under `hq/vendor/` instead of loaded from a CDN. Context: the rest of the site has no dependencies and uses plain fetch, but OAuth with PKCE and token refresh is not worth hand-rolling. Consequence: /hq loads no third-party script; upgrades are a deliberate file swap.

D-030 Three independent gates on /hq: Google consent screen kept in Testing with one test user, the page signing out non-owners, and RLS. Any one failing alone leaks nothing.
