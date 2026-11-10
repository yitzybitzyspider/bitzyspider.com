# Runbook: signing in again for the CMG Bears scout

When: HQ shows the to-do card "Sign in to CMG Bears so the scout can read again", or the agent `cmg` shows failed with "12twenty sign-in expired". The scout reads through Yitzy's regular Chrome, so "signed in" means that Chrome has a CalNet session. No agent types a passphrase or approves Duo. Decisions D-014, D-054, finding F-017.

## On the Mac

1. In everyday Chrome (the profile that has the Claude extension) open https://mba-haas-berkeley.12twenty.com/events
2. Sign in with CalNet and approve Duo if asked.
3. When the events list shows, that is all. Swipe the card away. The next scheduled run reads the pages.

While signed out the scout looks again at most once every 20 hours, so after signing in the next run may be a few hours off. To scan now, press "Run now" on the task `cmg-bears-scan` in the Claude app.

## On the box

1. Connect with Chrome Remote Desktop (D-014).
2. Same three steps in the box's Chrome. Duo is approved on the phone as usual.

## If it still fails after signing in

- **The run says "Just a moment" or a Cloudflare check**: the check appeared in everyday Chrome too. Open the events page by hand once and pass the check yourself. If it comes back on every run, stop the task and write it up in `FINDINGS.md`: it would mean the last working path is closing.
- **The run says `ERROR list-not-found`**: the page changed how it keeps its list. That is a code fix in the scout's page script, not a sign-in problem.
- **The run says the scout is backing off**: the scout saw a missing field and stopped itself for 24 hours. Read the scout's `FINDINGS.md`; `./cmg resume` in the scout folder clears it once the cause is understood.
- **Nothing runs at all**: the Claude desktop app must be open, the task must be in Auto mode, and Chrome must be running with the Claude extension connected.

## Do not use `cmg login`

The old sign-in command opens a browser driven by a script. Cloudflare stops that browser even after a correct sign-in (F-017). It now refuses to start.

## How long a sign-in lasts

Not measured yet for everyday Chrome. Each expiry brings the to-do card back by itself.
