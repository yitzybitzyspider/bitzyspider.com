# HQ open questions (append only; each closed by a later decision that links back)

## 2026-11-09  (author: Claude Code)

OQ-001 What are Instinct and Grokbot good at? Needed to fill `agent:` hints on issues.

OQ-002 Does Beeper's API expose read and send for WhatsApp and every Slack workspace Yitzy is in? Owned by the M2 research issue.

OQ-003 Is the WhatsApp account-flag risk of an unofficial bridge acceptable if Beeper falls short? Default is no sending until proven stable.

OQ-004 Which hosting runs the box's Docker: WSL2 on Windows as planned, or does Yitzy prefer a Linux reinstall once the box is dedicated?

OQ-005 Bucket weights for scoring (startup, hackathon, community, inputs, other). First guess 5/4/3/2/1 with inputs capped at 5 visible per day.

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #67, F-007)

OQ-006 Should DEVLOG and FINDINGS become one file per entry so parallel agents never conflict? Costs readability as a single scroll; the nightly export could concatenate them.

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #72)

OQ-007 Is the inputs cap "5 visible at a time" (built: clear one and the next appears) or "5 per day, then inputs stop until tomorrow"? The second enforces 80/20 harder but can hide something urgent.

OQ-008 With default weights an overdue input (2 x 3 = 6) outranks an undated startup card (5 x 1 = 5). Is that right, or should startup work always sit above inputs unless the input is pinned?

## 2026-11-09  (author: Claude Code on Fable 5.2, refs: #101, #102)

OQ-009 Should the warden turn a card stuck in `revising` (say 15 minutes) into an alert, or put it back in the deck with a "rewrite did not arrive" badge?

OQ-010 Should the reviser learn Yitzy's standing preferences from past notes (for example "always shorter") and apply them to first drafts, so fewer cards come back?

## 2026-11-09  (author: Claude Code, refs: D-048)

OQ-001 closed by D-048: all three agents browse, act in Yitzy's sessions, run on the box and open PRs.
