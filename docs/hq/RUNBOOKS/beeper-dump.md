# Runbook: Beeper chat dump (`collectors.beeper_dump`)

What it is: every 30 minutes, new messages from the ticked Haas chats are appended to Markdown, one file per chat. Read only. Code in the private repo `bitzy-hq-agents`, folder `collectors/beeper_dump/`. Decision D-049, finding F-014, issue #113.

## Where things live

| Thing | Where |
|-------|-------|
| Code, tests, schedule templates | `bitzy-hq-agents/collectors/beeper_dump/`, `tests/test_beeper_dump.py` |
| Which chats are read | `collectors/beeper_dump/chats.md` (tick a line to include it) |
| The Markdown | `<data folder>/beeper/<network>/<chat>.md` and `<data folder>/beeper/INDEX.md`; default data folder is `data/` in the checkout (gitignored) |
| Copy for reading on the phone | the folder in `HQ_BEEPER_MIRROR`, meant to be `<vault>/Sync/HQ/Beeper` |
| Where it stopped per chat | `<data folder>/beeper/.state.json` (never mirrored) |
| Token | `BEEPER_ACCESS_TOKEN` in the checkout's `.env` (gitignored), one per machine |

## First setup on a machine

1. Beeper Desktop installed, signed in, running. Check: `curl http://localhost:23373/v1/info` answers.
2. In the checkout: `python -m venv .venv && .venv/bin/pip install -e ".[dev]" && .venv/bin/python -m pytest -q`.
3. `.venv/bin/python -m collectors.beeper_dump login --allow-write-token` and approve in Beeper, then add `BEEPER_ALLOW_WRITE_TOKEN=1` to `.env` (D-050).
4. Put machine settings in `.env`: `HQ_BEEPER_MIRROR=<vault>/Sync/HQ/Beeper`, optionally `HQ_DATA_DIR` and `HQ_TZ`.
5. `.venv/bin/python -m collectors.beeper_dump run` once by hand. The first run pulls everything Beeper has for each chat; add `--since-days 90` to limit it.
6. Schedule it (next section) and add the row in the vault's `Sync/Ops/Registry.md`.

## Schedule

- Mac: fill `__HOME__` and `__REPO__` in `com.yitzy.hq-beeper-dump.plist.template`, save as `~/Library/LaunchAgents/com.yitzy.hq-beeper-dump.plist`, `launchctl load` it. It starts through `~/Sites/launchd-runner/launchd-runner`, which holds the disk access the vault needs. Logs in `~/Library/Logs/hq/`.
- The box: uncomment the cron in `.github/workflows/beeper-dump.yml`, set the secret `BEEPER_ACCESS_TOKEN` and the variables `HQ_DATA_DIR` and `HQ_BEEPER_MIRROR`.
- Only one machine runs it at a time. Two would each keep their own copy.

## Moving it to the other computer

1. On the old machine: `launchctl unload ~/Library/LaunchAgents/com.yitzy.hq-beeper-dump.plist`. Mark the Registry row as moved.
2. Copy the data folder's `beeper/` directory (Markdown plus `.state.json`) to the new machine's data folder. Skipping this is allowed: the new machine then rebuilds from whatever history its own Beeper has.
3. On the new machine do "First setup" from step 1. The token does not travel; log in again there.
4. Chat ids differ between installations (F-014). Nothing needs editing: a line whose id is unknown is matched by network plus exact title, and the carried-over file continues with no doubled messages. A title that matches two chats is refused and named in the output; fix that line's id from `list-chats`.
5. After the first good run, optionally refresh the ids: `list-chats --groups-only` prints lines with the new machine's ids.

Not yet proven on real hardware: step 2 to 4 are covered by `test_moving_to_another_computer_keeps_one_file_and_no_doubles`, not by an actual move.

## The write-scope question (settled by D-050)

The tool asks Beeper for `read` only, and Beeper returns a token that can also write (F-014). Yitzy accepted that on 2026-11-09 (D-050). So on every machine:

- `login --allow-write-token`
- `BEEPER_ALLOW_WRITE_TOKEN=1` in that machine's `.env`

The code still cannot send: the client has no method other than GET and a test asserts it. If Beeper ever offers a read-only choice in its approval dialog, pick it, drop the flag and the setting.

## Token renewal

The token lasts 30 days (F-015). First issued 2026-11-09 on the Mac, so it lapses about 2026-12-09. When the error log shows `Beeper refused the token (401)`, run `login --allow-write-token` again and approve in Beeper. Nothing is lost: the next run picks up where the last good one stopped.

## State on 2026-11-09

Running on the Mac from launchd as `com.yitzy.hq-beeper-dump`, every 30 minutes. First run 13,129 messages across 45 chats in about two minutes; later runs take seconds. Mirror: vault `Sync/HQ/Beeper/`. Registered in `Sync/Ops/Registry.md`. Not yet recorded in HQ `runs`: that starts by itself once `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are in the checkout's `.env`.

## When it goes wrong

| Symptom | Cause and fix |
|---------|---------------|
| `Beeper Desktop is not reachable` | App closed or asleep. Open it. |
| `Beeper refused the token (401)` | Token expired or revoked. Run `login` again. |
| `this token can write. Refusing to run` | See the section above. |
| `id ... not found here and the title matches 0 chats` | The chat was renamed or left. Update or untick its line in `chats.md`. |
| A chat's file looks short | First run used `--since-days`, or Beeper has not backfilled older history. `run --full` rebuilds everything. |
