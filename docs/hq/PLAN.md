# HQ: the 80/20 command center

Status: planning draft, 2026-11-09. Not yet approved for build. Issues are not created until Yitzy says go.

## Goal

One phone-first page, bitzyspider.com/hq, that shows what Yitzy should do today and lets him clear it by swiping. Agents collect, draft, and execute. Yitzy only approves. The dashboard keeps him on the 20% of work (startup, learning via hackathons, community) and processes the 80% of inputs (Slack, WhatsApp, CMG Bears, job applications, homework, birthdays) fast.

## Decisions (settled in the grilling session)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Where it lives | Static page in this repo at /hq, Supabase Auth gated. Public code, private data. |
| 2 | Database | New dedicated Supabase project on the personal account, free tier. |
| 3 | Data model | One `cards` table for everything. Plus `actions` (outbox), `runs` (heartbeats), `sources`. |
| 4 | Swipe semantics | Right approve, left dismiss, up snooze to tomorrow, tap expand. Approve writes an action an agent executes; sources without an executor fall back to "mark done". |
| 5 | Collector runtime | Windows laptop ("the box") running WSL2 + Docker + a self-hosted GitHub Actions runner labeled `box`. Login-bound work runs there. Login-free work (scoring, warden, migrations, morning plan) runs on GitHub-hosted runners. |
| 6 | Source order | Wave 1 homework + calendar (haas-sync sink) + birthdays. Wave 2 Slack + WhatsApp via Beeper, CMG repair. Wave 3 jobs, Facebook enrichment, executors. |
| 7 | 80/20 ranking | score = bucket weight x urgency, inputs capped per day, plus a morning "today's plan" card the agent proposes and Yitzy swipes to accept. |
| 8 | Form factor | Installable PWA, phone first. Desktop is the same column, wider. |
| 9 | Repos | UI, schema, docs, and all issues in bitzyspider.com (public). Collectors, executors, and secrets handling in a new private repo `bitzy-hq-agents`. |
| 10 | Obsidian | Supabase is the truth for "today". haas-sync keeps mirroring to Obsidian during transition. Every routine registers in Sync/Ops/Registry.md. |
| 11 | Birthdays | All sources (Google Contacts, phone, calendar, Facebook via Muse, WhatsApp). Byproduct: enrich Google Contacts (birthday, relationship, how met). |
| 12 | General tasks | Supabase is the one inbox. Obsidian `manual:` cards migrate. `hq add` CLI and a Claude skill file cards from any chat. |
| 13 | Jobs | `job_pipeline` view over cards with stages found / drafted / applied / interview / closed. Approve = agent drafts materials from the Resume System profile. Agents never submit in v1. |
| 14 | Box access | Tailscale + Chrome Remote Desktop for one-time logins. One persistent browser profile per service. CMG Bears will need remote-desktop sessions through Cloudflare. |
| 15 | Warden | Deterministic checks on GitHub Actions every 30 min, independent of the box. Healthchecks.io dead-man pings per job. A daily Claude reasoning pass reads findings and files repair issues. Every alert is also a card. |
| 16 | Agent protocol | Issues carry milestone, `area:` label, `ready` label, acceptance criteria, test command. Agent self-assigns, swaps `ready` for `in-progress`, branches, opens PR, closes on merge. Human merge for schema, auth, executors. Reviewer agent + auto-merge for UI and collectors. |
| 17 | Auth | Google sign-in, allowlisted to one email, long session. RLS keys off that user id. |
| 18 | Notifications | Two pushes only: morning plan ready, warden red. Web push, ntfy fallback. |
| 19 | Action boundary v1 | Allowed after approval: Slack, WhatsApp, email replies, calendar events. Deferred behind second confirmation: CMG registration, job submission. Never: payments. |
| 20 | Issue size | One agent-sitting each. Milestone per wave. |
| 21 | Chat sources | Beeper (Matrix bridges) as the single read/write path for WhatsApp and all Slack workspaces. Research issue first; fall back to Slack user tokens + whatsapp-web.js if Beeper's API does not cover it. |
| 22 | Enrichment UX | Batched cards per source per run with per-row veto. |
| 23 | Executor trigger | Supabase database webhook -> GitHub repository_dispatch -> executor workflow on the box. Polling backstop every 15 min. |
| 24 | Card identity | Stable key per source (`canvas:123`, `beeper:room/event`, `fb-birthday:name`). Upsert. Dismissed stays dismissed until the source item changes materially, then resurfaces once with a "changed" badge. |
| 25 | Markdown everywhere | Card bodies are Markdown. Nightly export of the day (cards, decisions, warden findings) to the Obsidian vault as Markdown so any later AI layer has clean context. Collectors store raw pulls as Markdown in the agents repo's data store, not as opaque JSON. |

## Schema sketch

```sql
cards(id, key unique, source, bucket, kind, title, body_md, proposed_action jsonb,
      score numeric, due_at, snoozed_until, status, changed_at, created_at, updated_at, raw jsonb)
  bucket: startup | hackathon | community | inputs | other
  kind:   approve | do | fyi | birthday | plan | alert | batch
  status: new | approved | dismissed | snoozed | done | expired
actions(id, card_id, type, payload jsonb, status, executor, claimed_at, finished_at, result_md, error)
runs(id, source, started_at, finished_at, cards_upserted, error, host)
sources(name, expected_interval, runs_on, enabled, last_ok_at)
```

RLS: one authenticated user may select/update cards and insert actions. Collectors use the service key from the runner, never from the browser.

## Milestones and issues

### M0 Foundation
1. Create Supabase project `bitzy-hq` and commit `supabase/migrations/0001_core.sql` (tables above, RLS, indexes).
2. Google sign-in with single-email allowlist; `/hq` shell redirects unauthenticated visitors.
3. PWA shell: manifest, service worker, installable, offline reads last-synced deck.
4. Swipe deck component: card stack, right/left/up gestures, tap-to-expand, Markdown body rendering, optimistic status writes.
5. Scoring function in SQL (`score = bucket_weight * urgency`) with a per-day inputs cap and a `today_deck` view.
6. `runs` heartbeat helper library (Python) every collector imports; writes run row and pings Healthchecks.io.
7. Warden v1: GitHub Actions cron every 30 min; checks stale sources, zero-card streaks, unexecuted approvals, volume spikes; writes `alert` cards.
8. Private repo `bitzy-hq-agents` scaffold: shared heartbeat lib, Markdown data store layout, workflow templates for `box` and hosted runners, secrets doc.
9. Box setup wizard: WSL2, Docker, self-hosted runner labeled `box`, Tailscale, Chrome Remote Desktop, per-service browser profiles. Register in Ops Registry.
10. `hq` CLI: `hq add`, `hq list`, `hq approve`, `hq export-md`. Plus a Claude skill wrapping `hq add`.
11. Agent protocol doc + labels + issue template (acceptance criteria, test command, `agent:` hint) + reviewer-agent workflow with auto-merge rules.
12. Nightly Markdown export of the day to the Obsidian vault.

### M1 First sources
13. haas-sync Supabase sink: upsert Canvas and calendar cards alongside the Obsidian write; migrate `manual:` cards.
14. Birthdays from Google Contacts + calendar feeds; draft message per person; batch card.
15. Morning plan card: agent reads the deck, proposes today's top 3 outcomes, Yitzy swipes to accept.
16. Web push for the two events; ntfy fallback.

### M2 Conversations and CMG
17. Research: Beeper API coverage for WhatsApp and Slack read + send; decide and document; fallback plan.
18. Beeper collector: unread threads needing a reply become `approve` cards with a drafted reply.
19. Beeper executor: approved replies sent; result card written.
20. CMG Bears repair: run the scout on the box behind a persistent 12twenty profile; remote-desktop re-login runbook; cards via the shared schema.
21. Email triage revival as a collector writing cards (replaces the switched-off Claude task).

### M3 Jobs, enrichment, deeper executors
22. `job_pipeline` view and stage transitions; drafts from Resume System profile and stories.
23. Facebook birthdays and relationship data via Muse; batched enrichment cards.
24. Google Contacts write-back executor for approved enrichment rows.
25. Daily Claude reasoning pass over warden findings and open issues; files repair issues.
26. Second-confirmation flow for CMG registration and job submission (deferred executors).

## Open items carried into issues
- Instinct and Grokbot capabilities: unknown; `agent:` hints left blank until Yitzy describes them.
- Which Slack workspace first: all of them via Beeper, so moot if Beeper covers it.
