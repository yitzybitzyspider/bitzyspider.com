-- HQ revise loop. Decisions: D-034 to D-037. Contract: docs/hq/CARD-CONTRACT.md.

alter table public.cards drop constraint cards_status_check;
alter table public.cards add constraint cards_status_check
  check (status in ('new','approved','dismissed','snoozed','done','expired','revising'));
alter table public.cards drop constraint cards_kind_check;
alter table public.cards add constraint cards_kind_check
  check (kind in ('approve','do','fyi','birthday','plan','alert','batch','todo'));

-- Every note Yitzy sends back and every draft version, oldest first. Append only.
create table public.revisions (
  id         bigint generated always as identity primary key,
  card_id    bigint not null references public.cards(id) on delete restrict,
  kind       text not null check (kind in ('note','edit','cancel','draft','todo')),
  author     text not null default 'owner' check (author in ('owner','agent')),
  note       text,
  draft      jsonb,
  created_at timestamptz not null default now()
);
create index revisions_card on public.revisions (card_id, id);
alter table public.revisions enable row level security;
revoke all on public.revisions from anon, authenticated;
grant select, insert on public.revisions to authenticated;
create policy revisions_owner_select on public.revisions for select to authenticated using (public.hq_is_owner());
create policy revisions_owner_insert on public.revisions for insert to authenticated
  with check (public.hq_is_owner() and author = 'owner' and kind in ('note','edit','cancel'));

-- Send a card back with a note. The card leaves the deck until an agent returns it.
create function public.hq_revise(p_card bigint, p_note text) returns text
language plpgsql security invoker set search_path = '' as $$
declare c record; n text := btrim(coalesce(p_note, ''));
begin
  if n = '' then raise exception 'hq_revise: a note is required'; end if;
  if char_length(n) > 4000 then raise exception 'hq_revise: note is too long'; end if;
  select id, proposed_action into c from public.cards where id = p_card;
  if not found then raise exception 'hq_revise: card % not found', p_card using errcode = 'P0002'; end if;
  update public.cards set status = 'revising', changed = false
   where id = p_card and (status = 'new' or (status = 'snoozed' and snoozed_until <= now()));
  if not found then raise exception 'hq_revise: card % is not in the deck', p_card using errcode = 'P0003'; end if;
  insert into public.revisions(card_id, kind, note, draft) values (p_card, 'note', n, c.proposed_action -> 'draft');
  return 'revising';
end $$;
revoke all on function public.hq_revise(bigint, text) from public, anon;
grant execute on function public.hq_revise(bigint, text) to authenticated;

-- Swipe, now with an optional in-place edit of the draft on approve (D-037).
drop function public.hq_swipe(bigint, text, timestamptz, jsonb);
create function public.hq_swipe(p_card bigint, p_dir text, p_snooze_until timestamptz default null,
                                p_veto jsonb default '[]'::jsonb, p_edit jsonb default null)
returns text
language plpgsql security invoker set search_path = '' as $$
declare c record; new_status text; draft jsonb; k text; edited boolean := false;
begin
  if p_dir not in ('right','left','up') then raise exception 'hq_swipe: unknown direction %', p_dir; end if;
  select id, status, snoozed_until, proposed_action into c from public.cards where id = p_card;
  if not found then raise exception 'hq_swipe: card % not found', p_card using errcode = 'P0002'; end if;
  if not (c.status = 'new' or (c.status = 'snoozed' and c.snoozed_until <= now())) then
    raise exception 'hq_swipe: card % is already %', p_card, c.status using errcode = 'P0003';
  end if;

  if p_dir = 'left' then new_status := 'dismissed';
  elsif p_dir = 'up' then
    if p_snooze_until is null or p_snooze_until <= now() then raise exception 'hq_swipe: snooze needs a future time'; end if;
    new_status := 'snoozed';
  elsif c.proposed_action is not null and coalesce(c.proposed_action ->> 'type', '') <> '' then new_status := 'approved';
  else new_status := 'done';
  end if;

  draft := c.proposed_action -> 'draft';
  if p_edit is not null and p_edit <> '{}'::jsonb then
    -- An edit may only change text fields the draft already has. It cannot add routing.
    if new_status <> 'approved' or draft is null or jsonb_typeof(draft) <> 'object' or jsonb_typeof(p_edit) <> 'object' then
      raise exception 'hq_swipe: this card has no draft to edit';
    end if;
    for k in select jsonb_object_keys(p_edit) loop
      if not (draft ? k) or jsonb_typeof(p_edit -> k) <> 'string' or jsonb_typeof(draft -> k) <> 'string' then
        raise exception 'hq_swipe: cannot edit draft field %', k;
      end if;
      if char_length(p_edit ->> k) > 20000 then raise exception 'hq_swipe: draft field % is too long', k; end if;
    end loop;
    edited := (draft || p_edit) is distinct from draft;
    draft := draft || p_edit;
  end if;

  update public.cards
     set status = new_status, changed = false,
         snoozed_until = case when new_status = 'snoozed' then p_snooze_until else snoozed_until end
   where id = p_card and (status = 'new' or (status = 'snoozed' and snoozed_until <= now()));
  if not found then raise exception 'hq_swipe: card % was handled elsewhere', p_card using errcode = 'P0003'; end if;

  if new_status = 'approved' then
    insert into public.actions(card_id, type, payload)
    values (p_card, c.proposed_action ->> 'type',
            (c.proposed_action - 'type')
            || case when draft is null then '{}'::jsonb else jsonb_build_object('draft', draft) end
            || jsonb_build_object('veto', coalesce(p_veto, '[]'::jsonb), 'edited', edited));
    if edited then insert into public.revisions(card_id, kind, draft) values (p_card, 'edit', draft); end if;
  end if;
  return new_status;
end $$;
revoke all on function public.hq_swipe(bigint, text, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.hq_swipe(bigint, text, timestamptz, jsonb, jsonb) to authenticated;

-- Undo also pulls a card back from the reviser, as long as it has not been returned yet.
create or replace function public.hq_unswipe(p_card bigint) returns text
language plpgsql security invoker set search_path = '' as $$
declare was text;
begin
  select status into was from public.cards where id = p_card;
  update public.cards set status = 'new', snoozed_until = null
   where id = p_card and status in ('dismissed','snoozed','done','revising')
     and not exists (select 1 from public.actions a where a.card_id = p_card);
  if not found then raise exception 'hq_unswipe: card % cannot be put back', p_card using errcode = 'P0003'; end if;
  if was = 'revising' then insert into public.revisions(card_id, kind) values (p_card, 'cancel'); end if;
  return 'new';
end $$;

-- Agent side: return a rewritten draft. Only a card still in 'revising' can be returned,
-- so an undo by Yitzy always beats a late agent.
create function public.hq_return_revised(p_card bigint, p_draft jsonb, p_summary text default null,
                                         p_body_md text default null, p_action jsonb default null)
returns text
language plpgsql set search_path = '' as $$
declare c record; act jsonb; last_note text; n int;
begin
  select id, status, proposed_action, raw into c from public.cards where id = p_card for update;
  if not found then raise exception 'hq_return_revised: card % not found', p_card using errcode = 'P0002'; end if;
  if c.status <> 'revising' then raise exception 'hq_return_revised: card % is % and no longer waiting', p_card, c.status using errcode = 'P0003'; end if;
  act := coalesce(p_action, c.proposed_action);
  if act is null or coalesce(act ->> 'type', '') = '' then raise exception 'hq_return_revised: no action to attach the draft to; pass p_action or use hq_to_todo'; end if;
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then raise exception 'hq_return_revised: draft must be an object'; end if;
  select note into last_note from public.revisions where card_id = p_card and kind = 'note' order by id desc limit 1;
  select count(*) into n from public.revisions where card_id = p_card and kind = 'draft';
  update public.cards set
    proposed_action = jsonb_set(act, '{draft}', p_draft, true),
    kind = case when kind = 'todo' then 'approve' else kind end,
    body_md = coalesce(p_body_md, body_md), status = 'new', changed = true, changed_at = now(),
    raw = (coalesce(raw, '{}'::jsonb) - 'todo_reason') || jsonb_build_object('revision_count', n + 1, 'last_note', last_note, 'revision_summary', p_summary)
  where id = p_card;
  insert into public.revisions(card_id, kind, author, note, draft) values (p_card, 'draft', 'agent', p_summary, p_draft);
  return 'new';
end $$;
revoke all on function public.hq_return_revised(bigint, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.hq_return_revised(bigint, jsonb, text, text, jsonb) to service_role;

-- Agent side: the work could not be done. The card becomes a to-do with the reason (D-035).
create function public.hq_to_todo(p_card bigint, p_reason text) returns text
language plpgsql set search_path = '' as $$
begin
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'hq_to_todo: a reason is required'; end if;
  update public.cards set kind = 'todo', proposed_action = null, status = 'new', changed = true, changed_at = now(),
         raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('todo_reason', btrim(p_reason))
   where id = p_card and status in ('new','revising','snoozed');
  if not found then raise exception 'hq_to_todo: card % is not open', p_card using errcode = 'P0003'; end if;
  insert into public.revisions(card_id, kind, author, note) values (p_card, 'todo', 'agent', btrim(p_reason));
  return 'new';
end $$;
revoke all on function public.hq_to_todo(bigint, text) from public, anon, authenticated;
grant execute on function public.hq_to_todo(bigint, text) to service_role;

-- A collector refresh must not overwrite the draft or the context while a card is with the reviser.
create or replace function public.hq_upsert_card(p jsonb) returns bigint
language plpgsql set search_path = '' as $$
declare cid bigint; old_fp text; old_status text;
begin
  if coalesce(p ->> 'key', '') = '' or coalesce(p ->> 'source', '') = '' or coalesce(p ->> 'title', '') = '' then
    raise exception 'hq_upsert_card needs key, source and title';
  end if;
  select id, fingerprint, status into cid, old_fp, old_status from public.cards where key = p ->> 'key' for update;
  if cid is null then
    insert into public.cards(key, source, bucket, kind, title, body_md, proposed_action, url, score, due_at, fingerprint, raw)
    values (p ->> 'key', p ->> 'source', coalesce(p ->> 'bucket', 'other'), coalesce(p ->> 'kind', 'do'), p ->> 'title',
            coalesce(p ->> 'body_md', ''), p -> 'proposed_action', p ->> 'url', coalesce((p ->> 'score')::numeric, 0),
            (p ->> 'due_at')::timestamptz, p ->> 'fingerprint', coalesce(p -> 'raw', '{}'::jsonb))
    returning id into cid;
    return cid;
  end if;
  if old_status = 'revising' then
    update public.cards set due_at = case when p ? 'due_at' then (p ->> 'due_at')::timestamptz else due_at end,
           url = coalesce(p ->> 'url', url), fingerprint = p ->> 'fingerprint',
           changed_at = case when (p ->> 'fingerprint') is distinct from old_fp then now() else changed_at end
     where id = cid;
    return cid;
  end if;
  update public.cards set
    source = p ->> 'source', title = p ->> 'title',
    bucket = coalesce(p ->> 'bucket', bucket), kind = coalesce(p ->> 'kind', kind),
    body_md = coalesce(p ->> 'body_md', body_md),
    proposed_action = case when p ? 'proposed_action' then p -> 'proposed_action' else proposed_action end,
    url = coalesce(p ->> 'url', url), score = coalesce((p ->> 'score')::numeric, score),
    due_at = case when p ? 'due_at' then (p ->> 'due_at')::timestamptz else due_at end,
    raw = coalesce(p -> 'raw', raw), fingerprint = p ->> 'fingerprint'
  where id = cid;
  if (p ->> 'fingerprint') is distinct from old_fp then
    update public.cards set changed_at = now(),
      status  = case when old_status in ('dismissed','done','approved','expired') then 'new' else status end,
      changed = case when old_status in ('dismissed','done','approved','expired') then true  else changed end
    where id = cid;
  end if;
  return cid;
end $$;
