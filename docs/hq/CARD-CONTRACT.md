# The card contract

Every collector and every agent that writes a card follows this. Decisions D-034 to D-037.

## Rule 1: do the work first

A card is not a reminder. Before you write a card, do the thing as far as an agent can: write the reply, draft the email, fill the form values, prepare the calendar event, assemble the application packet. The card shows the finished artifact. Yitzy's only job is to approve it, send it back with a note, or dismiss it.

## Rule 2: if you cannot do it, say so and make it a to-do

If the work needs something only Yitzy has (a login, a decision, a physical action), write a to-do card: `kind = 'todo'`, no `proposed_action`, and a body that starts with what you tried and exactly why you stopped. Never a silent downgrade: a to-do without a reason is a bug.

## Rule 3: the shape of a done card

Write cards only through `hq_upsert_card(jsonb)`.

```json
{
  "key": "gmail:18c2f...",
  "source": "gmail",
  "bucket": "startup",
  "kind": "approve",
  "title": "Reply to Dana: Thursday 4pm pilot call",
  "body_md": "Context in Markdown: who, what they asked, anything Yitzy needs to judge the draft.",
  "proposed_action": {
    "type": "email_reply",
    "draft": { "to": "dana@example.com", "subject": "Re: pilot call", "text": "Thursday 4pm works. I will send the deck Wednesday night." },
    "thread_id": "18c2f..."
  },
  "fingerprint": "hash of the source state this draft answers",
  "due_at": null,
  "url": "https://mail.google.com/..."
}
```

- `proposed_action.type` names the executor. `proposed_action.draft` is what Yitzy sees and can edit; `draft.text` is the main body, other draft fields are shown as labeled lines. Everything else in `proposed_action` is routing the executor needs and Yitzy does not see.
- `body_md` is context, not the artifact.
- `fingerprint` changes only when the source changed materially (a new message in the thread), never because you reworded the draft.

## Rule 4: revisions

When Yitzy sends a card back, its status is `revising` and a `revisions` row holds his note. The reviser rewrites `draft` using the note and every earlier version, then calls `hq_return_revised`. If it cannot satisfy the note, it calls `hq_to_todo` with the reason. A collector that refreshes a card in `revising` must not overwrite the draft; `hq_upsert_card` leaves `revising` cards' drafts alone.

## Rule 5: executors

An executor sends exactly `payload.draft` from the action row (which already includes any edit Yitzy made on the card) and honors `payload.veto` for batch cards. It never re-reads the card for content.
