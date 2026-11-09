-- HQ scoring, inputs cap, today_deck, and the collector upsert. Decisions: D-007, D-024.
-- live_score = bucket weight x urgency + cards.score (a collector-supplied boost, default 0).
-- Weights and the cap are rows in hq_settings, editable without a migration.

insert into public.hq_settings(key, value) values
  ('bucket_weights', '{"startup":5,"hackathon":4,"community":3,"inputs":2,"other":1}'),
  ('inputs_cap', '5')
on conflict (key) do nothing;

alter table public.cards add column fingerprint text;   -- what "materially changed" is measured against

-- Urgency from the due date alone. No due date is neutral, never zero.
create function public.hq_urgency(due timestamptz, at timestamptz default now()) returns numeric
language sql immutable set search_path = '' as $$
  select case
    when due is null                      then 1
    when due <  at                        then 3      -- overdue
    when due <  at + interval '24 hours'  then 2.5
    when due <  at + interval '3 days'    then 2
    when due <  at + interval '7 days'    then 1.5
    else 1 end
$$;

create function public.hq_score(bucket text, due timestamptz, boost numeric default 0) returns numeric
language sql stable set search_path = '' as $$
  select coalesce((select (value ->> bucket)::numeric from public.hq_settings where key = 'bucket_weights'), 1)
         * public.hq_urgency(due) + coalesce(boost, 0)
$$;

drop view public.today_deck;
create view public.today_deck with (security_invoker = true) as
  with live as (
    select c.*,
           public.hq_score(c.bucket, c.due_at, c.score) as live_score,
           (c.kind in ('alert','plan'))                 as pinned
    from public.cards c
    where c.status = 'new' or (c.status = 'snoozed' and c.snoozed_until <= now())
  ), ranked as (
    select live.*,
           case when bucket = 'inputs' and not pinned
                then row_number() over (partition by (bucket = 'inputs' and not pinned)
                                        order by live_score desc, due_at nulls last, id) end as inputs_rank
    from live
  )
  select * from ranked
  where inputs_rank is null
     or inputs_rank <= coalesce((select (value #>> '{}')::int from public.hq_settings where key = 'inputs_cap'), 5)
  order by pinned desc, live_score desc, due_at nulls last, id;
revoke all on public.today_deck from anon;
grant select on public.today_deck to authenticated;
grant execute on function public.hq_urgency(timestamptz, timestamptz), public.hq_score(text, timestamptz, numeric) to authenticated;

-- The one way collectors write cards. Same key + same fingerprint = quiet refresh.
-- A new fingerprint is a material change: bump changed_at, and a card the owner already
-- cleared (dismissed, done, approved, expired) comes back once as new with changed = true.
-- A snoozed card stays snoozed. Returns the card id.
create function public.hq_upsert_card(p jsonb) returns bigint
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
revoke all on function public.hq_upsert_card(jsonb) from public, anon, authenticated;
grant execute on function public.hq_upsert_card(jsonb) to service_role;
