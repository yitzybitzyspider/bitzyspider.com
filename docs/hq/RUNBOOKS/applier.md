# Runbook: resume applier (`applier`)

What it is: one job posting in; a tailored one-page resume (Word file), a cover note and one HQ card out. It never submits anything. Code in the private repo `bitzy-hq-agents`, folder `applier/`. Decisions D-052 and D-053, finding F-016, issue #90.

## Where things live

| Thing | Where |
|-------|-------|
| Code and tests | `bitzy-hq-agents/applier/`, `tests/test_applier.py`, made-up person in `tests/fixtures/resume_system/` |
| The facts | `profile.js` and `stories.js` in the Resume System folder (`RESUME_SYSTEM_DIR`). Nothing else counts as a fact. |
| The drafting rules | `job_application_system.md` in the same folder; handed to the model whole |
| Each application | `<RESUME_SYSTEM_DIR>/applications/<Company>_<date>/`: the resume, `packet.md` (the record), `jd.txt`, `build.json`, `card.json`, and `card.pushed` once the card is on the deck |
| Settings | the checkout's `.env` (gitignored); names in `.env.example` |

## Use it

From the `bitzy-hq-agents` checkout:

```bash
.venv/bin/python -m applier prepare --url "https://jobs.example.com/acme/123"
```

A posting behind a login or drawn by JavaScript: paste it into a file and pass both, so the card still links to the posting.

```bash
.venv/bin/python -m applier prepare --text-file posting.txt --url "https://..." --company "Acme" --role "Chief of Staff"
```

Then look at the card on /hq. Approve means "the packet is good" and nothing else. Open the Word file in Google Docs or Word, check it is one page, and submit the application yourself at the posting link. To change wording, send the card back with a note (that rewrites the card text, not the Word file; run `prepare` again for a new file).

## The three drafters

| `--drafter` | What writes the bullets | When |
|-------------|------------------------|------|
| `auto` (default) | `claude` if it answers, otherwise `pool` | normal use |
| `claude` | the `claude` command line, tools off, the machine's own login | fails loudly if the login is dead |
| `pool` | no model: picks from bullets already approved, by overlap with the posting; no cover note | offline, or as a floor |

A Claude Code session can also do the drafting: `python -m applier brief --url ...` prints the brief, the session answers with the JSON it describes, and `prepare --draft-file answer.json` runs the same guard, render and card on it.

Whatever drafts, the fact guard decides. The card's Checks section lists every bullet it refused, every bullet trimmed for space, and the `validate.py` result.

## First setup on a machine

1. Node and Python 3.11 or later. In the checkout: `python -m venv .venv && .venv/bin/pip install -e ".[dev]"`, then `npm install --prefix applier` (the Word renderer), then `.venv/bin/python -m pytest -q`.
2. Copy the Resume System folder to the machine. In `.env`: `RESUME_SYSTEM_DIR=<that folder>`.
3. Optional settings: `RESUME_PROFILE_FILE` (default `profile.js`), `APPLIER_CHARS_PER_LINE` and `APPLIER_HEADROOM_LINES` (page calibration; without them `validate.py`'s own values apply), `APPLIER_OUT_DIR`, `APPLIER_CLAUDE_MODEL`, `HQ_RUNS_ON` (`mac`, `box` or `hosted`).
4. For the `claude` drafter: run `claude` once in a terminal and sign in. Check with `claude -p "say ok"`.
5. `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` come from the setup wizard. Without them `prepare` still works and saves the card; `python -m applier push` sends saved cards later.

## Moving to the box

Nothing in the code names a folder on the Mac. Copy the Resume System folder (it is not in git) including `applications/`, repeat the setup above, set `HQ_RUNS_ON=box`. Run only one copy against the same `applications/` folder.

## When something is wrong

| What you see | Cause | Fix |
|--------------|-------|-----|
| `RESUME_SYSTEM_DIR is not set` | no setting in `.env` | add it |
| `the docx package is not installed` | step 1 was skipped on this machine | `npm install --prefix applier` |
| `only N characters of posting text came back` | the page is drawn by JavaScript or needs a login | paste the posting, use `--text-file` with `--url` |
| Card says bullets came from the pool because the model was not reachable | the `claude` login expired | sign in again (setup step 4), run `prepare` again |
| Card says a drafted bullet was refused | the guard found a number, name or acronym that is not in the story bank | if it is true, add it to `stories.js` first, then run again |
| `the draft still fails the fact guard after repair` | no approved bullet was left to fall back on | run with `--drafter pool` to see what the pool holds |
| Resume spills to a second page in Google Docs | the estimate is arithmetic and the calibration is off | raise `APPLIER_HEADROOM_LINES` by one and run again |
| `applier` shows as off on the Agents view and the card is only on disk | it was switched off in HQ | switch it on, then `python -m applier push` |

## Known gaps

- Two profiles exist in the Resume System folder and they disagree (F-016). The Mac is set to the one the last two builds used. Folding it into `profile.js` ends the split.
- No PDF, no title overrides, no company research step, and no rebuild of the Word file from a note on the deck.
- After approve, nothing tracks whether the application was submitted (#94 and the rest of #90).
