# HQ logs: how to write to them

Four append-only logs live in this folder. Nothing in them is ever edited or deleted; a wrong entry gets a later entry that corrects it and links back. Every agent and every human working on HQ writes to them as part of the work, not after.

| File | What goes in | When |
|------|--------------|------|
| `DECISIONS.md` | One entry per design or product decision: context, options, choice, consequences. | The moment a decision is made, before the code that depends on it. |
| `DEVLOG.md` | One entry per work session or PR: what changed, why, what was verified, what was left. | Every PR appends an entry; the reviewer checks it is there. |
| `FINDINGS.md` | Lessons learned, surprises, dead ends, things that bit us. One entry per finding, with the fix or the rule that follows from it. | As soon as something surprises you. |
| `OPEN-QUESTIONS.md` | Questions nobody can answer yet. Each gets closed by a later DECISIONS entry that links back. | Whenever you catch yourself assuming. |

Recommended extras, added when they earn their place: `RUNBOOKS/` (one file per repeatable manual procedure, such as re-login to 12twenty on the box), `INCIDENTS.md` (warden reds and what was done), `METRICS.md` (weekly counts: cards created, approved, dismissed, time to clear).

## Entry format

```
## YYYY-MM-DD HH:MM  <short title>  (author: <agent or human>, refs: #issue, PR, DECISION-id)
<body in Markdown>
```

Decisions are numbered `D-001`, `D-002` ... so other logs can cite them. Findings are numbered `F-001` ... .

## Rules
- Append at the end. Never reorder, never rewrite.
- Cite the issue or PR number. Cite the decision id when the entry depends on one.
- Markdown only, plain prose, short paragraphs. These files are context for later AI layers as much as for Yitzy.
- A PR that changes behavior without a DEVLOG entry is not ready to merge.
- The nightly Markdown export (see PLAN.md decision 25) copies these four files into the Obsidian vault.
