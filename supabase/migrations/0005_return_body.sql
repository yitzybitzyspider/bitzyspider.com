-- Cards with no draft (a plan, a to-do) are revised through their body. Decisions: D-036, D-039.
-- hq_return_revised now accepts either a draft (needs an action to attach to) or a body alone.
create or replace function public.hq_return_revised(p_card bigint, p_draft jsonb, p_summary text default null,
                                                    p_body_md text default null, p_action jsonb default null)
returns text
language plpgsql set search_path = '' as $$
declare c record; act jsonb; last_note text; n int;
begin
  select id, status, proposed_action, raw into c from public.cards where id = p_card for update;
  if not found then raise exception 'hq_return_revised: card % not found', p_card using errcode = 'P0002'; end if;
  if c.status <> 'revising' then raise exception 'hq_return_revised: card % is % and no longer waiting', p_card, c.status using errcode = 'P0003'; end if;
  act := coalesce(p_action, c.proposed_action);
  if p_draft is null then
    if btrim(coalesce(p_body_md, '')) = '' then raise exception 'hq_return_revised: pass a draft or a body'; end if;
  else
    if jsonb_typeof(p_draft) <> 'object' then raise exception 'hq_return_revised: draft must be an object'; end if;
    if act is null or coalesce(act ->> 'type', '') = '' then raise exception 'hq_return_revised: no action to attach the draft to; pass p_action or use hq_to_todo'; end if;
    act := jsonb_set(act, '{draft}', p_draft, true);
  end if;
  select note into last_note from public.revisions where card_id = p_card and kind = 'note' order by id desc limit 1;
  select count(*) into n from public.revisions where card_id = p_card and kind = 'draft';
  update public.cards set
    proposed_action = act,
    kind = case when kind = 'todo' and act is not null then 'approve' else kind end,
    body_md = coalesce(p_body_md, body_md), status = 'new', changed = true, changed_at = now(),
    raw = (coalesce(raw, '{}'::jsonb) - case when act is not null then 'todo_reason' else '' end)
          || jsonb_build_object('revision_count', n + 1, 'last_note', last_note, 'revision_summary', p_summary)
  where id = p_card;
  insert into public.revisions(card_id, kind, author, note, draft)
  values (p_card, 'draft', 'agent', p_summary, coalesce(p_draft, jsonb_build_object('body_md', p_body_md)));
  return 'new';
end $$;
