# How work gets done on HQ

For any agent (Claude Code, Muse, Instinct, Grokbot, or a person) picking up an HQ issue. Decisions D-016, D-044, D-046.

## Before you start

1. Read `docs/hq/LOGS.md`, then skim `DECISIONS.md`, the last few `DEVLOG.md` entries, `FINDINGS.md` and `OPEN-QUESTIONS.md`. They are short and they are the memory of this project.
2. If your work writes cards, read `docs/hq/CARD-CONTRACT.md`. If it adds tests, read `docs/hq/TESTING.md`.
3. Pick an issue labeled `ready` whose "Depends on" issues are closed. Issues are indexed in `docs/hq/ISSUES.md`.

## Claim, build, land

1. **Claim:** assign yourself, replace `ready` with `in-progress`. One agent per issue.
2. **Branch:** `hq/<issue-number>-<short-name>` in bitzyspider.com, any short name in bitzy-hq-agents.
3. **Build with tests first in mind.** Logic in files with no DOM or network. Anything code can assert gets a case in the matching suite. Break the code once on purpose to see the suite fail, then restore it.
4. **Run `scripts/hq/test.sh`** (and `pytest` in the agents repo). It must end with `HQ TESTS PASS`.
   **Then prove it live, by code (D-055).** If your change adds or touches anything that is only true on the live system (a secret, a login, a trigger, a deploy, a new agent), add its check to `hq doctor` in `bitzy-hq-agents` in the same pull request, with tests that make that check fail, and run `hq doctor --full` after it lands. It must end with `all pass`. Asking Yitzy to try something is not a verification step for anything code can drive.
5. **Write the logs as part of the change:** append to `DEVLOG.md` what changed, what was verified and how, and what was not verified. A new design choice goes in `DECISIONS.md` first. Anything that surprised you goes in `FINDINGS.md` with the rule that follows. CI rejects a pull request that edits or deletes old log lines, or that touches HQ files without a dev log entry.
6. **Open a pull request** with `Closes #n`. When CI is green, merge it (squash). No waiting for a go-ahead (D-046).
7. **If two branches both appended to a log,** merge main into yours and run `scripts/hq/rebase_logs.sh <your-branch-tip>`; it rebuilds each log as main's version plus your additions.
8. **Database changes:** a numbered migration in `supabase/migrations/` plus a suite in `supabase/tests/` listed in `scripts/hq/test-db.sh`. Apply it to the live project only after the clean-database CI job passes, then verify its effect on the live project (not just that it ran) and compare the function fingerprints CI prints with the live ones. Never edit an applied migration: fix forward with a new one.

## Report in while you work (D-051)

Yitzy watches the Agents view on /hq to see who is doing what. If your work runs inside `hq_heartbeat.run(...)`, pass `kind` and `title` and you are done. If it does not (Grok, Instinct, Muse, a Claude Code session, anything by hand), ping from the `bitzy-hq-agents` checkout:

```bash
hq agent-ping grok --kind worker --title "Grok research" --status start
```

```bash
hq agent-ping grok --status ok --cards 3
```

```bash
hq agent-ping grok --status fail --error "12twenty login expired"
```

- `--kind` is `collector` (gathers information), `worker` (drafts or does the work), `executor` (carries out what Yitzy approved) or `auditor` (checks the others). Send it on the first ping; it is kept afterwards.
- Use the name the agent has in the planned list in `hq/agents.js` if it is there, so it does not show twice.
- Add `--every "30 minutes"` only if you run on a schedule. Without it you are "on demand" and never count as late.
- A `start` with no `ok` or `fail` after it shows as hung after 30 minutes and the warden raises an alert. Always close what you open.
- The ping always exits 0 and prints what happened. If it prints `off:`, Yitzy switched you off in HQ: stop.

## When to bring Yitzy in

Only two cases (D-046):

- **Something to look at or feel.** Looks, drag feel, a real phone, a real account. Say exactly what to open and what to look for, in the pull request's "For Yitzy's eyes" section and in the final message.
- **A secret or login only he has.** Add a stage to `scripts/hq/setup-wizard.sh` instead of asking in chat. Secrets go from his hidden input straight into GitHub Actions secrets, Supabase Vault, or the gitignored `.env` in the private repo. Never into this public repo, a log, a card, or a chat.

Everything else, decide and write the decision down.

## Hard rules

- No secrets in bitzyspider.com, ever. It is public. CI scans for secret-shaped strings.
- The browser role may change a card's state and nothing else. Content comes from agents through `hq_upsert_card`.
- An agent never sends, registers, submits or pays on its own: it prepares, Yitzy approves, an executor carries out exactly what was approved. Payments have no executor at all.
- A wake, a ping or a log write must never be able to fail the thing it is watching.
- Personal accounts only. Nothing here touches Gearsupply or any work credential.
- No em or en dashes in anything Yitzy reads.
- When the plan and reality disagree, reality wins and the logs get an entry saying so.

## If you are stuck

Label the issue `blocked`, comment with what you tried and exactly what is missing, append an open question (`OQ-nnn`), and take another `ready` issue. If the blocker is a card that an agent could not complete, that is what a to-do card is for.
