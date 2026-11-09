-- HQ swipe: one atomic call per gesture. Decisions: D-004, D-022, D-028.
-- security invoker: runs with the caller's own grants and RLS, so it can do nothing
-- the owner could not already do with separate requests. It just makes them one transaction.

create function public.hq_swipe(p_card bigint, p_dir text, p_snooze_until timestamptz default null, p_veto jsonb default '[]'::jsonb)
returns text
language plpgsql security invoker set search_path = '' as $$
declare c record; new_status text;
begin
  if p_dir not in ('right','left','up') then raise exception 'hq_swipe: unknown direction %', p_dir; end if;
  select id, status, snoozed_until, proposed_action into c from public.cards where id = p_card;
  if not found then raise exception 'hq_swipe: card % not found', p_card using errcode = 'P0002'; end if;
  -- Only a card that is in the deck can be swiped. A second swipe on the same card
  -- (double tap, retry after a timeout) must never file a second action.
  if not (c.status = 'new' or (c.status = 'snoozed' and c.snoozed_until <= now())) then
    raise exception 'hq_swipe: card % is already %', p_card, c.status using errcode = 'P0003';
  end if;

  if p_dir = 'left' then
    new_status := 'dismissed';
  elsif p_dir = 'up' then
    if p_snooze_until is null or p_snooze_until <= now() then raise exception 'hq_swipe: snooze needs a future time'; end if;
    new_status := 'snoozed';
  elsif c.proposed_action is not null and coalesce(c.proposed_action ->> 'type', '') <> '' then
    new_status := 'approved';
  else
    new_status := 'done';
  end if;

  -- The guard in the where clause makes two concurrent swipes resolve to exactly one winner.
  update public.cards
     set status = new_status, changed = false,
         snoozed_until = case when new_status = 'snoozed' then p_snooze_until else snoozed_until end
   where id = p_card and (status = 'new' or (status = 'snoozed' and snoozed_until <= now()));
  if not found then raise exception 'hq_swipe: card % was handled elsewhere', p_card using errcode = 'P0003'; end if;

  if new_status = 'approved' then
    insert into public.actions(card_id, type, payload)
    values (p_card, c.proposed_action ->> 'type',
            (c.proposed_action - 'type') || jsonb_build_object('veto', coalesce(p_veto, '[]'::jsonb)));
  end if;
  return new_status;
end $$;
revoke all on function public.hq_swipe(bigint, text, timestamptz, jsonb) from public, anon;
grant execute on function public.hq_swipe(bigint, text, timestamptz, jsonb) to authenticated;

-- Undo for a dismiss or a snooze: put the card back. An approved card cannot be undone
-- from the browser because an executor may already hold its action.
create function public.hq_unswipe(p_card bigint) returns text
language plpgsql security invoker set search_path = '' as $$
begin
  update public.cards set status = 'new', snoozed_until = null
   where id = p_card and status in ('dismissed','snoozed','done')
     and not exists (select 1 from public.actions a where a.card_id = p_card);
  if not found then raise exception 'hq_unswipe: card % cannot be put back', p_card using errcode = 'P0003'; end if;
  return 'new';
end $$;
revoke all on function public.hq_unswipe(bigint) from public, anon;
grant execute on function public.hq_unswipe(bigint) to authenticated;
