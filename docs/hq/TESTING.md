# Testing HQ

Rule (Yitzy, 2026-11-09): default to tests that code can run. Visual inspection is Yitzy's, for now. If a behavior can be asserted by a script, it gets a script; the list at the bottom is what is deliberately left for eyes.

## One command

```bash
scripts/hq/test.sh
```

It runs every suite below and prints one verdict. CI runs the same script on every pull request, plus the clean-database job. A suite counts as passing only if it exits 0 and prints its own final "all pass" line.

## What each layer proves

| Layer | File | Proves |
|-------|------|--------|
| Sign-in gate | `tests/hq-auth.js` | Signed out never queries the database; a stranger is denied and signed out; an owner check that fails shows an error, never the deck; the service worker pre-caches every script the page loads. |
| Deck logic | `tests/hq-deck.js` | Gesture thresholds, outcomes, snooze time, draft fields and edit diffs, optimistic writes and rollback, undo, revise, offline fallback, hostile Markdown, the demo host gate. |
| Deck UI behavior | `tests/hq-ui.js` | The real `deck-ui.js` on the real markup in a fake DOM: clicks, typing, keys, drags, the note sheet, edit in place, batch veto, toasts, empty and offline states, and that background refresh never interrupts. No browser. |
| Agents view | `tests/hq-agents.js` | The wording of every state, grouping by kind with trouble first, the "waiting on you" piles adding up to the deck, pending actions matching the actions table, a stale answer being dropped, and the real `agents-ui.js` on the real markup: live refresh, polling fallback, failed refresh, empty states, hostile text. |
| Wiring and contract | `tests/hq-wiring.js` | The page, the migrations and the agents repo agree: every hook exists, every RPC argument matches its SQL signature, every status, kind and bucket is known to the database, agent-only functions are closed to the browser, every example card obeys the card contract, no secret-shaped string or dash is committed, decision ids are unbroken. |
| Pasted secrets | `scripts/hq/test_secret_checks.sh` | The wizard's real prompt, fed pasted input against a stand-in for Supabase and Anthropic: a key pasted several times is repaired and announced, a wrong key is never saved, the publishable key is refused before any call, no message contains the secret. |
| Live system | `bitzy-hq-agents: hq doctor [--full]` | Against the real project: the saved settings, the service key, every agent's state, the warden, Google sign-in, the deployed page, and with `--full` a test card through the whole revise loop and back. Its own logic has 52 pytest cases against an in-memory HQ. |
| Log rules | `scripts/hq/test_check_logs.sh` | The append-only checker catches edits, deletions and missing dev log entries. |
| Clean database | `scripts/hq/test-db.sh` (CI) | The migration files alone build the schema on an empty Postgres; every SQL suite passes there; suites leave no rows; every table has row security; anon holds nothing; agent functions are closed to the browser. |
| SQL suites | `supabase/tests/*.sql` | Row security by role, scoring and the inputs cap, atomic swipes with no double actions, the whole revise loop including a late agent losing to an undo. |
| Reviser agent | `bitzy-hq-agents: pytest` | The real Anthropic SDK against a local stand-in server: request shape, refusal, cut-off answers, retries, rate limits, undo during a rewrite. |

## How we know the tests can fail

A test that cannot fail proves nothing. When a suite is written or extended, break the code on purpose and confirm the suite notices, then restore it. Done so far: five mutations of `deck-ui.js` (title through innerHTML, keys live under the sheet, veto dropped, down-drag dismissing, refresh interrupting) and six of the wiring (renamed RPC argument, unknown status, missing hook, agent function left open, to-do without a reason, secret in the page config). Every one was caught.

## Adding a feature

1. Logic goes in a file with no DOM (`deck.js` style) and gets cases in its suite.
2. Anything the user can click, type or drag gets a case in `tests/hq-ui.js`.
3. A new RPC, column, status or kind needs no new wiring test: the existing one reads the sources and fails if the sides disagree.
4. A new migration gets a `supabase/tests/<name>.sql` that ends with `select '<name> ok' as result;` and is added to the list in `test-db.sh` (the wiring suite fails if it is not).
5. Break it once on purpose.

## Live dependencies (D-055)

Stand-ins cannot see a bad secret, a switched-off provider or a stale deploy. Anything that is only true on the live system gets a check in `hq doctor`, written with the feature and with tests that make the check fail. Run `hq doctor --full` after changing secrets, sign-in, the wake path or the reviser, and before saying something works live.

## Not covered by code (Yitzy's eyes, for now)

- How it looks: spacing, type, color, the card stack, the stamps, the icons on a home screen.
- How it feels: drag weight and thresholds under a real thumb, animation timing, the keyboard pushing the note sheet on iOS.
- Real devices: Add to Home Screen on iPhone and Android, offline launch from the home screen, safe-area insets.
- Real accounts: Google sign-in end to end, a 30-day session.
- Whether the live database matches the migration files byte for byte. CI prints a fingerprint of every function body from a clean build; compare it with the live project after applying a migration by hand.
