# Runbook: signing in again for the CMG Bears scout

When: HQ shows the to-do card "Sign in to CMG Bears so the scout can read again", or the agent `cmg` shows failed with "12twenty sign-in expired". The scout reads through Yitzy's regular Chrome, so "signed in" means that Chrome has a CalNet session. No agent types a passphrase or approves Duo. Decisions D-014, D-054, finding F-017.

## On the Mac

1. In everyday Chrome (the profile that has the Claude extension) open https://mba-haas-berkeley.12twenty.com/events
2. Sign in with CalNet and approve Duo if asked.
3. When the events list shows, swipe the card away and ask a Claude session for a CMG scan.

Nothing reads the portal by itself (D-054), so signing in alone changes nothing until a scan is asked for.

## On the box

1. Connect with Chrome Remote Desktop (D-014).
2. Same three steps in the box's Chrome. Duo is approved on the phone as usual.

## If it still fails after signing in

- **The scan says "Just a moment" or a Cloudflare check**: the check appeared in everyday Chrome too. The session stops there; it never waits out or solves a check. Open the events page yourself and deal with it. If it keeps coming back, write it up in `FINDINGS.md`: it would mean reading through the portal is closing and the email-only fallback is what is left.
- **The scan says `ERROR list-not-found`**: the page changed how it keeps its list. That is a code fix in the scout's page script, not a sign-in problem.
- **The scan says the scout is backing off**: the scout saw a missing field and stopped itself for 24 hours. Read the scout's `FINDINGS.md`; `./cmg resume` in the scout folder clears it once the cause is understood.
- **The session cannot reach Chrome**: Chrome must be running with the Claude extension connected.

## Do not use `cmg login`

The old sign-in command opens a browser driven by a script. Cloudflare stops that browser even after a correct sign-in (F-017). It now refuses to start.

## How long a sign-in lasts

Not measured yet for everyday Chrome. Each expiry brings the to-do card back by itself.
