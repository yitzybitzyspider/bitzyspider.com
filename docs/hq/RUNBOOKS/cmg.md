# Runbook: CMG Bears scout (`collectors.cmg`)

What it is: four times a day an agent opens the CMG Bears events and postings lists (Haas 12twenty) in Yitzy's regular Chrome, a read-only script on each page hands over what matches his filters, and that becomes HQ cards under the agent `cmg`. It never registers, applies, clicks or types. Issue #88, decisions D-014, D-019, D-054, finding F-017.

## Why an agent in Chrome and not a script

Cloudflare stops every browser a script drives on this site: Playwright's own Chrome, regular Chrome run hidden, and regular Chrome run visibly once signed in (F-017). Yitzy's everyday Chrome is not stopped. The only thing that can use that browser unattended is a Claude session with the Claude in Chrome extension, so a scan is a scheduled Claude task. Everything that can be plain code still is: deciding whether to run, the page script, checking and filing what came back, the cards.

## The parts

| Part | Where | What it does |
|------|-------|--------------|
| The scheduled task | Claude desktop app, task id `cmg-bears-scan`; its prompt is kept in `bitzy-hq-agents/collectors/cmg/TASK.md` | Runs `begin`, opens the two pages, runs the page script on each, reads back the lines, runs `finish`. |
| The bridge | `bitzy-hq-agents/collectors/cmg/`, tests in `tests/test_cmg.py` | `begin` says GO, SKIP or STOP and prints the page scripts. `finish` files the lines through the scout, writes cards, and wraps that in `hq_heartbeat.run("cmg", ...)`. |
| The scout | its own folder, named by the setting `CMG_HOME` (on the Mac: `Sites/cmg-bears` under the home folder). Not in git yet. | `cmg snippet` prints the page script from the filter config. `cmg ingest` checks and files the lines into `data/state.json`. Also the local review page and its own findings log. |

## What a run does

1. `begin --scheduled`. Paused in the scout: STOP. Scout backing off: STOP, recorded as a failed run. Signed out and already checked in the last 20 hours: STOP, failed run, sign-in card. About one run in eight: SKIP (cards are rebuilt from the last scan, recorded ok). Otherwise a random wait of up to 8 minutes, then GO with the two scripts.
2. The agent opens `/events`, then `/jobPostings`, in one tab. On each it runs the script. The script makes no request and clicks nothing: it reads the list the page already holds in memory, keeps the items the filters ask for, and logs one line per item, each with a checksum.
3. `finish` pipes those lines to `cmg ingest`. A line that does not match its checksum is dropped and counted; the rest are filed. A missing field on the page stops the scout for 24 hours (its schema guard).
4. Cards: an event Yitzy could still sign up for is a to-do (`cmg:event:<id>`, bucket community) saying why it was not done for him; a posting is an fyi (`cmg:posting:<id>`, bucket inputs). Registered, declined, past, closed and no-longer-listed items make no card.
5. The run is open in HQ only for the few seconds of step 3 and 4, so waits and page loads never show as a hung agent. A run that brought no fresh data is recorded as failed with the reason.

If the agent lands on the CalNet page it runs `finish --needs-login` (sign-in card, failed run). Any other trouble: `finish --error "what it saw"`.

## Where things live

| Thing | Where |
|-------|-------|
| 12twenty session | Yitzy's everyday Chrome profile. Nothing is stored by the scout. |
| What the scout found | `<CMG_HOME>/data/state.json` |
| The cards as last written | `<data folder>/cmg/cards.json` in the agents checkout, with `sent_to_hq` true or false |
| Scout problems and lessons | `<CMG_HOME>/FINDINGS.md` |
| Run history | HQ Agents view (`cmg`), the task's run list in the Claude app, the scout's `data/run.log` |

## Settings

From the environment or the agents checkout's `.env`. None is a secret.

| Setting | Meaning | Default |
|---------|---------|---------|
| `CMG_HOME` | the scout's folder | none, required |
| `CMG_PYTHON` | Python that runs the scout | the scout folder's own `.venv` |
| `HQ_RUNS_ON` | `mac` or `box`, shown in HQ | `mac` |
| `HQ_DATA_DIR`, `HQ_TZ` | as for every collector | `data/`, Pacific |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | written by the setup wizard. Without them everything still runs and cards stay in `cards.json`; the next run after they arrive sends every current card. | none |

## By hand

```bash
python -m collectors.cmg refresh
```

```bash
python -m collectors.cmg cards
```

The first rebuilds cards from the last scan and records a run; the second only prints them. A full scan by hand is "Run now" on the task in the Claude app, or pasting `TASK.md` into a Claude Code session that has the Chrome extension.

## Setting up the schedule

1. Agents checkout: `python -m venv .venv`, `pip install -e ".[dev]"`, `CMG_HOME=<scout folder>` in `.env`.
2. Scout folder: `python -m venv .venv`. It needs no packages for scans (`icalendar` and `recurring-ical-events` only for the calendar conflict check).
3. Regular Chrome with the Claude in Chrome extension, signed in to Claude, and signed in to CMG Bears once (`RUNBOOKS/cmg-relogin.md`).
4. In the Claude desktop app create a scheduled task from `collectors/cmg/TASK.md` with the checkout path filled in, cron `5 7,12,17,21 * * *`, **Auto mode** (otherwise a run stops at the first approval prompt). The app must be open for runs to happen.
5. Add the row to the vault's `Sync/Ops/Registry.md` and a title in the ops dashboard's `refresh.py`.

Only one machine runs it at a time. Two would double the traffic on one account.

## Moving it to the box (Windows)

1. On the Mac: disable the task `cmg-bears-scan`, `launchctl unload` the `com.yitzy.cmg-night` and `com.yitzy.cmg-hub` plists, mark the Registry rows as moved.
2. Copy the scout folder to the box without `.venv/`, `profile/`, `profile-chrome/` and `retired/`. `data/` travels, so decisions and history carry over.
3. On the box do "Setting up the schedule" with `HQ_RUNS_ON=box` in `.env`. That means the box needs the Claude desktop app, regular Chrome with the extension, and Yitzy's CalNet sign-in in that Chrome (over remote desktop, D-014).
4. First run by hand ("Run now"). Expect "N events and M postings on the pages" and a `runs` row for `cmg` with `cards_upserted` above zero.

Known gaps for the box, not handled in code:

- The scout's desktop notifications and its task-board step are Mac only. Notifications are skipped elsewhere; the task-board step records a low finding per new item until it is switched off or ported. HQ cards replace both.
- The calendar conflict check reads the calendar feed list from the `haas-sync` folder on the Mac. Without it, cards say "no overlap found" without having checked. Copy `calendars.env` or port the path to a setting before trusting that line on the box.
- The lock that stops two runs overlapping has a Windows fallback that has never run on Windows.
- Whether a scheduled Claude task with the Chrome extension runs unattended on the box at all is untested.

None of the move has been done on real hardware.

## Limits to know about

- Each run costs a Claude session (two page loads, two scripts of about 3,000 characters, one filing command).
- The agent copies the lines by hand from the console into the filing command. The checksum makes a miscopy cost one item for one run, never wrong data.
- The events list shows the first 50 events (about five weeks ahead in November 2026) and the script never pages. Later events are seen once they enter that window.
- The page script depends on how 12twenty's page keeps its lists (AngularJS scope). If the page is rebuilt, the script returns `ERROR list-not-found`, the run fails with that text, and nothing wrong is filed.
