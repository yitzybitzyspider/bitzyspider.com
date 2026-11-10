# Runbook: CMG Bears scout (`collectors.cmg`)

What it is: when Yitzy asks for a CMG scan, a Claude session opens the CMG Bears events and postings lists (Haas 12twenty) in his regular Chrome, a read-only script on each page hands over what matches his filters, and that becomes HQ cards under the agent `cmg`. It never registers, applies, clicks or types. Issue #88, decisions D-014, D-019, D-054, finding F-017.

## There is no schedule, on purpose

Cloudflare stops every browser a script drives on this site (F-017). Yitzy's everyday Chrome is not stopped, and reading there when he asks is ordinary use of his own browser. Putting that on a timer would be an unattended robot getting past the bot check on a borrowed browser, so it is not built and should not be added (D-054). The same goes for another attempt at a script-driven browser. If a check or captcha shows up during a requested read, the session stops and hands it to him.

How to keep it fresh without a schedule: ask for a scan when it matters ("scan CMG"), for example as part of the morning routine.

## The parts

| Part | Where | What it does |
|------|-------|--------------|
| The procedure | `bitzy-hq-agents/collectors/cmg/TASK.md` | What the session does, step by step: `begin`, open the two pages, run the page script on each, read back the lines, `finish`. |
| The bridge | `bitzy-hq-agents/collectors/cmg/`, tests in `tests/test_cmg.py` | `begin` says GO or STOP and prints the page scripts. `finish` files the lines through the scout, writes cards, and wraps that in `hq_heartbeat.run("cmg", ...)`. |
| The scout | its own folder, named by the setting `CMG_HOME` (on the Mac: `Sites/cmg-bears` under the home folder). Not in git yet. | `cmg snippet` prints the page script from the filter config. `cmg ingest` checks and files the lines into `data/state.json`. Also the local review page and its own findings log. |

## What a scan does

1. `begin`. Paused in the scout: STOP. Scout backing off: STOP, recorded as a failed run. Otherwise GO with the two scripts.
2. The session opens `/events`, then `/jobPostings`, once each, in one tab. On each it runs the script. The script makes no request and clicks nothing: it reads the list the page already holds in memory, keeps the items the filters ask for, and logs one line per item, each with a checksum.
3. `finish` pipes those lines to `cmg ingest`. A line that does not match its checksum is dropped and counted; the rest are filed. A missing field on the page stops the scout for 24 hours (its schema guard).
4. Cards: an event Yitzy could still sign up for is a to-do (`cmg:event:<id>`, bucket community) saying why it was not done for him; a posting is an fyi (`cmg:posting:<id>`, bucket inputs). Registered, declined, past, closed and no-longer-listed items make no card.
5. The run is open in HQ only for the few seconds of steps 3 and 4. A scan that brought no fresh data is recorded as failed with the reason. The agent is registered as on demand, so it never shows as late.

If the session lands on the CalNet page it runs `finish --needs-login` (sign-in card, failed run). Any other trouble: `finish --error "what it saw"`.

## Where things live

| Thing | Where |
|-------|-------|
| 12twenty session | Yitzy's everyday Chrome profile. Nothing is stored by the scout. |
| What the scout found | `<CMG_HOME>/data/state.json` |
| The cards as last written | `<data folder>/cmg/cards.json` in the agents checkout, with `sent_to_hq` true or false |
| Scout problems and lessons | `<CMG_HOME>/FINDINGS.md` |
| Run history | HQ Agents view (`cmg`), the scout's `data/run.log` |

## Settings

From the environment or the agents checkout's `.env`. None is a secret.

| Setting | Meaning | Default |
|---------|---------|---------|
| `CMG_HOME` | the scout's folder | none, required |
| `CMG_PYTHON` | Python that runs the scout | the scout folder's own `.venv` |
| `HQ_RUNS_ON` | `mac` or `box`, shown in HQ | `mac` |
| `HQ_DATA_DIR`, `HQ_TZ` | as for every collector | `data/`, Pacific |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | written by the setup wizard. Without them everything still runs and cards stay in `cards.json`; the next run after they arrive sends every current card. | none |

## By hand, without opening any page

```bash
python -m collectors.cmg refresh
```

```bash
python -m collectors.cmg cards
```

The first rebuilds cards from the last scan and records a run; the second only prints them.

## Setting it up on a machine

1. Agents checkout: `python -m venv .venv`, `pip install -e ".[dev]"`, `CMG_HOME=<scout folder>` in `.env`.
2. Scout folder: `python -m venv .venv`. Scans need no packages (`icalendar` and `recurring-ical-events` only for the calendar conflict check).
3. Regular Chrome with the Claude in Chrome extension, signed in to Claude, and signed in to CMG Bears (`RUNBOOKS/cmg-relogin.md`).
4. Ask a Claude Code session on that machine for a scan; it follows `collectors/cmg/TASK.md`.

Only one machine files scans at a time, so there is one `state.json`.

## Moving it to the box (Windows)

1. On the Mac: `launchctl unload` the `com.yitzy.cmg-night` and `com.yitzy.cmg-hub` plists, mark the Registry row as moved.
2. Copy the scout folder to the box without `.venv/`, `profile/`, `profile-chrome/` and `retired/`. `data/` travels, so decisions and history carry over.
3. On the box do "Setting it up on a machine" with `HQ_RUNS_ON=box` in `.env`. The box then needs Claude Code, regular Chrome with the extension, and Yitzy's CalNet sign-in in that Chrome (over remote desktop, D-014).
4. Ask for a scan there. Expect "N events and M postings on the pages" and a `runs` row for `cmg` with `cards_upserted` above zero.

Since scans are on request, the box buys little here: the Mac he is sitting at already has the browser and the session. Moving is only worth it if the rest of HQ's collectors live there and he asks for scans there.

Known gaps for the box, not handled in code:

- The scout's desktop notifications and its task-board step are Mac only. Notifications are skipped elsewhere; the task-board step records a low finding per new item until it is switched off or ported. HQ cards replace both.
- The calendar conflict check reads the calendar feed list from the `haas-sync` folder on the Mac. Without it, cards say "no overlap found" without having checked. Copy `calendars.env` or port the path to a setting before trusting that line on the box.
- The lock that stops two runs overlapping has a Windows fallback that has never run on Windows.

None of the move has been done on real hardware.

## Limits to know about

- Freshness is as good as the last time he asked.
- The session copies the lines by hand from the console into the filing command. The checksum makes a miscopy cost one item for one scan, never wrong data.
- The events list shows the first 50 events (about five weeks ahead in November 2026) and the script never pages. Later events are seen once they enter that window.
- The page script depends on how 12twenty's page keeps its lists (AngularJS scope). If the page is rebuilt, the script returns `ERROR list-not-found`, the scan fails with that text, and nothing wrong is filed.
