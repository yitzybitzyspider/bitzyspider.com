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

## 2026-11-09 Swipe details  (author: Claude Code on Fable 5.2, refs: #71)

D-031 A swipe is one database call (`hq_swipe`), not a status update plus an action insert from the browser. Context: two requests can half-fail and leave an approved card with no action, or a retried request with two. Consequence: the action count per approved card is exactly one, enforced in the database.

D-032 Undo exists for dismiss, snooze and done, and not for an approval that filed an action. Context: an executor may already hold the action. Consequence: the approve toast offers no Undo; stopping a sent action is a later, explicit feature.

D-033 Snooze means tomorrow 06:00 in the phone's time zone, computed on the device and validated as a future time by the database.

## 2026-11-09 Yitzy's feedback after trying the demo deck  (author: Yitzy + Claude Code on Fable 5.2, refs: #71)

D-034 Every card arrives with the work already done. A card is the finished artifact shown as it will go out (the email with recipient, subject and body; the reply; the event), and approving means "send it as is". A collector may not file a bare reminder to do something an agent could have done. Supersedes the looser reading of D-004. Contract in docs/hq/CARD-CONTRACT.md.

D-035 When an agent cannot do the work, the card is a to-do (`kind = 'todo'`) that says what was tried and why it stopped. Swiping right on a to-do means Yitzy did it himself.

D-036 Third path besides approve and dismiss: revise. Yitzy types or dictates a note, the card leaves the deck (`status = 'revising'`), a reviser agent rewrites the draft from the note plus all earlier versions, and the card returns marked Revised. Repeat until approved. Works on to-dos too ("try again, here is what you were missing"). Every note and every draft version is kept in `revisions`.

D-037 Small fixes skip the agent: Yitzy can edit the draft text on the card and approve his edited version. The edit is recorded as a revision and travels in the action payload. Chosen by default when Yitzy said go without picking; reversible by removing the Edit control.

D-038 The 80/20 ranking is known-weak and parked at lower priority. Current scoring (D-007) stays until the rework issue is picked up. OQ-007 and OQ-008 move there.

## 2026-11-09 Revise loop details  (author: Claude Code on Fable 5.2, refs: #101, #102)

D-039 Cards with no draft (a plan, a to-do) are revised through their body: the reviser rewrites `body_md` and the card keeps its kind. A to-do stays a to-do with its reason unless an agent returns a real action.

D-040 If Yitzy takes a card back while the reviser is working, his action wins: `hq_return_revised` only accepts a card still in `revising`, and the reviser treats the refusal as nothing to do.

D-041 The reviser treats only Yitzy's notes as instructions. Card content (other people's messages, scraped pages) goes to the model as data in its own block, and routing fields such as thread ids are never shown to it. An in-place edit by Yitzy can change only string fields the draft already has.

D-042 The reviser uses `claude-opus-5-5` at medium effort with a strict JSON schema built from the card's own draft fields, and the API's default refusal fallback. A refusal, a missing fact, or two broken answers in a row turn the card into a to-do with the reason; rate limits and server errors leave it waiting.

## 2026-11-09 Offline behavior  (author: Claude Code on Fable 5.2, refs: #70)

D-043 Offline, HQ is read-only: it shows the last synced deck under a banner and refuses swipes with a message, rather than queueing them. Context: a queued approval could send an email hours later against a card that has since changed. Consequence: no background sync; the service worker caches only the app's own files and the last deck lives in localStorage for at most a week, cleared on sign-out.

## 2026-11-09 Testing  (author: Yitzy + Claude Code on Fable 5.2)

D-044 Tests default to what code can check; visual inspection is Yitzy's for now. Every behavior that a script can assert gets a script, every suite must be shown able to fail by breaking the code once on purpose, and one command (`scripts/hq/test.sh`) gives one verdict locally and in CI. `docs/hq/TESTING.md` lists what is deliberately left for eyes.

## 2026-11-09 Wake trigger and working agreement  (author: Yitzy + Claude Code on Fable 5.2, refs: #87)

D-045 The database wakes the agents itself: triggers call `hq_wake`, which posts a `repository_dispatch` through pg_net using a GitHub token kept in Supabase Vault. A wake is best effort and can never block or fail the write that caused it; every attempt is recorded in `wakes` for the warden. The token is fine-grained, scoped to the agents repo only.

D-046 Working agreement: Claude builds without asking for go-aheads, merges its own pull requests once CI is green (schema and executors included; this replaces the human-merge rule in D-016 for work Claude does in session), and picks the next issue itself. Yitzy is brought in only to look at or feel something on a device, and for steps needing a secret or login only he has, which are batched into the setup wizard.

## 2026-11-09 Where the warden runs  (author: Claude Code on Fable 5.2, refs: #74, F-009)

D-047 The warden is a Postgres function on pg_cron inside the Supabase project, not a GitHub Actions job. Context: every check is a query over tables already in the database; a 30-minute hosted cron on the private repo would spend most of the free Actions minutes (F-009); and D-015 wants the warden independent of the box. In the database it needs no runner, no secret and no network, and a dead box or a GitHub outage shows up as stale sources. Supersedes the "GitHub Actions cron" wording in D-015. It also answers OQ-009: a card stuck in revising for 15 minutes raises an alert.

D-048 Agent capabilities and routing. Yitzy confirmed (2026-11-09) that Grok, Instinct and Muse can each browse the web, act in his logged-in browser sessions, run on the box and open PRs. Closes OQ-001. Routing: Grok takes research and web-heavy work (#84 Beeper research, #89 email triage). Instinct takes anything needing his live Google or Supabase session or hands on the box (#69 Google sign-in runbook, #76 box setup, the executor workflow half of #87). Muse keeps Facebook (#91). Claude Code keeps schema, UI and the agents repo code. Labels `agent:grok` and `agent:instinct` added beside `agent:claude-code`, `agent:muse` and `agent:any`. Still only Yitzy: running `scripts/hq/setup-wizard.sh`, because it takes his secrets from hidden input.

D-049 Beeper chats reach HQ through a scheduled command, `collectors.beeper_dump`, not through a chat-side connector. Context: Beeper Desktop is live and serves the Beeper Client API on the machine it runs on; the same data is reachable from a Claude chat through its connector, but nothing in a chat runs every 30 minutes unattended. Choice: a command in bitzy-hq-agents that reads an allowlist of Haas chats and appends new messages to one Markdown file per chat, plus an index, in the data store, mirrored into the vault at `Sync/HQ/Beeper/`. Read only: the client can only issue GET requests. Host: it runs wherever Beeper Desktop runs. That is the Mac today (launchd, every 30 minutes); it moves to the box when Beeper Desktop is installed and logged in there, and only one host runs it at a time. Consequences: the collector in #85 reads this Markdown instead of calling the API again; everything machine-specific (token, mirror folder, data folder, timezone) is a setting, never code; chat ids are not portable (F-014), so the allowlist and the saved position also match on network plus exact title. Refs #113, #84, #85, D-005, D-025.

D-050 Yitzy accepts a Beeper token that carries write scope for `beeper_dump` on the Mac (2026-11-09). Context: F-014, Beeper grants `read write` when only `read` is asked for, and no read-only choice was found. Options: wait for a read-only path, or keep the token and rely on the code. Choice: keep it. The client still has no method other than GET and a test asserts that; `run` refuses a writing token unless `BEEPER_ALLOW_WRITE_TOKEN=1` is set in that machine's `.env`, which it now is on the Mac. Consequence: a token that could send sits in a gitignored, owner-only `.env`; anything that later needs to send (#86) gets its own token and its own decision, not this one. The token lasts 30 days, so the login repeats about monthly until Beeper offers something longer. Refs #113, D-049, D-019.

## 2026-11-10 Agents view  (author: Yitzy + Claude Code on Fable 5.2, refs: #115)

D-051 Every agent has one of four kinds, and its state is derived in one place. Context: Yitzy asked (2026-11-09) for a view of every agent that is supposed to be running, whether it is doing its thing right now, and what waits on him; he grouped agents as the ones that collect, the ones that draft or do the work, the ones that execute, and the auditors. Choice: (1) `sources.kind` is `collector`, `worker`, `executor` or `auditor`, with a `title` for people; an agent that registers without a kind gets one from its name, so nothing already written has to change. (2) The state is computed in the database by `hq_agent_status(now)`, exposed as the view `agent_status`, first match wins: `off` (switched off), `hung` (latest run started and never finished, past the warden's hung limit), `running` (the same, inside the limit), `failed` (latest run has an error), `never` (no run and no success on record), `late` (last success older than the interval times the warden's stale factor), `ok`. The thresholds are read from `hq_settings.warden`, the same row the warden reads, so the page and the warden cannot disagree. (3) An expected interval of a year or more means "runs on demand": such an agent is never late and the warden never calls it stale. This avoids a new column and a warden change; `hq agent-ping` uses `100 years` when no interval is given. (4) Agents that are planned but not built are a static list in `hq/agents.js` with their issue numbers, shown greyed; an agent must register under the name on that list. A table was rejected: the list changes with the code, in a pull request. (5) Outside agents (Grok, Instinct, Muse, a Claude Code session) report through `hq agent-ping`, which writes the same `sources` and `runs` rows as `hq_heartbeat` and always exits 0. (6) Live updates come from Supabase Realtime on `runs` and `sources`; the view also polls (every 30 seconds when open without Realtime, every 2 minutes otherwise), so Realtime is a speed-up and never a dependency. (7) "Waiting on you" is computed in the page from the deck it already loads plus pending `actions`: every deck card lands in exactly one of alerts, to decide, to do, to read. (8) Sign out moved from the deck bar to the foot of the Agents view to make room for the Agents button on a phone. Consequence: the browser gained no write of any kind; it reads one more view.

## 2026-11-10 Resume applier  (author: Claude Code on Fable 5.2, refs: #90, #94, D-013, D-019)

D-052 A prepared job application is one card whose packet sits in `proposed_action.draft` with no `proposed_action.type`. Context: the card contract wants the finished artifact in the draft, but `hq_swipe` queues an action for any card that has a type, no executor for job submission exists or may exist before #94, and the warden would then report that action as approved and never carried out. Options: a typed action that nobody drains, a plain to-do with the packet in the body, or a draft without a type. Choice: the draft without a type. Approving means "this packet is good" and marks the card done; the deck shows the draft, sending it back with a note still reaches the reviser, and nothing is queued. The stage is `raw.stage = 'drafted'` (D-013). Submitting stays with Yitzy by hand until #94 gives it a second confirmation. Consequence: once approved, the card leaves the deck and nothing reminds him to submit; #94 or the `job_pipeline` view has to close that gap.

D-053 What the applier may claim is decided by a mechanical guard, not by the model. Context: the Resume System's rule is never to invent, and a model told that rule still reaches for the posting's vocabulary. Choice: the profile and the story bank are the only facts; every bullet and the cover note are checked against their text, and a number, a spelled-out quantity, a capitalised name or an acronym that is not there is refused, along with the two wordings the story bank itself rules out for its headline numbers. A model draft that fails gets one retry with the reasons, then each failing bullet is replaced by one Yitzy already approved and the card says so. The guard is strict on purpose: a false alarm costs a rewrite, a miss costs an interview answer he cannot give. It cannot see a false claim written entirely in ordinary lowercase words; the drafting rules and his read of the card cover that.

## 2026-11-10 CMG Bears read path  (author: Yitzy + Claude Code on Fable 5.2, refs: #88, F-017, D-014, D-019)

D-054 CMG Bears is read on request, through Yitzy's regular Chrome, and there is no scheduled scan. Context: the scout's script-driven browser was stopped by Cloudflare in every form tried on 2026-11-10 (F-017). Yitzy, watching: "you have to use regular chrome", then, after signing in and still being stopped, "maybe just use my regular Claude for Chrome". Reading the two list pages in his own Chrome at his request worked at once. Options for making that recur: (a) keep working on the script-driven browser, which means defeating the check; (b) a scheduled Claude task that drives his Chrome four times a day; (c) scans only when he asks a session for one; (d) discovery from CMG email only. Choice: (c). Both (a) and (b) are ways around a bot check: (b) is still an unattended robot, it just borrows a browser the check trusts. Claude Code does not build that, and an earlier session on 2026-11-03 had drawn the same line. (b) was drafted during this work and not created. (d) stays available as the no-portal fallback and is not built. What a scan is: Yitzy asks; the session runs `collectors.cmg begin`, opens the events and postings pages once each in his Chrome, runs the read-only page script the scout prints, and `collectors.cmg finish` files the checksummed lines through the scout's `cmg ingest`, writes cards and records the run as agent `cmg` (on demand, so never "late"). If a check or a sign-in page appears, the session stops and hands it to him. Consequences: #88's "4x daily on the box" is not met and will not be met this way; freshness depends on him asking (a line in the morning routine is the natural place); D-014's persistent 12twenty profile is dropped for CMG. Events he could sign up for are to-do cards with the reason (D-019), postings are fyi cards in inputs. The page script makes no request and clicks nothing, and the bridge can start only the scout's `snippet` and `ingest` commands; tests hold both.

## 2026-11-10 Live checks  (author: Yitzy + Claude Code on Fable 5.2, refs: F-018)

D-055 The live system is proven by a command, `hq doctor`, and building its checks is part of building the feature. Context: Yitzy, 2026-11-10: "You need to build all the tests as part of the development process to prove that things work. And the tests need to be intelligent and comprehensive." The suites so far prove the code against stand-ins; nothing walked the real chain (F-018). Choice: `hq doctor` in the agents repo checks what is only true live: the settings saved on the machine, the service key against the database, every agent's state and the warden, Google sign-in, the deployed page and that it points at the same project. `hq doctor --full` also sends a test card through the revise loop (the database wake, GitHub, the reviser, Claude) and requires it back rewritten, then removes the card and its history even when a step fails. The run reports itself as the auditor `selftest`, so the Agents view shows the last result. Rules that follow: a feature that adds a live dependency (a secret, a login, a trigger, a deploy, a new agent) adds its check to `hq doctor` in the same pull request, with tests that make that check fail; the wizard tests a secret before saving it; nobody is asked to verify by hand what the doctor can verify. Not chosen: a scheduled full run. It spends one Claude call and GitHub minutes each time, so for now it runs on demand and after any change to secrets, sign-in, the wake path or the reviser.
