-- hq_swipe and hq_unswipe as the owner would call them. Privileged role; rolls back. Returns 'swipe ok'.
begin;
update public.hq_settings set value = '"owner@test.invalid"' where key = 'owner_email';
insert into public.cards(key, source, title, proposed_action) values
  ('sw:act',  't', 'has action', '{"type":"reply","to":"room1","text":"hi"}'),
  ('sw:batch','t', 'batch',      '{"type":"contacts_update","rows":[1,2,3]}'),
  ('sw:plain','t', 'no action',  null),
  ('sw:left', 't', 'dismiss me', null),
  ('sw:up',   't', 'snooze me',  null),
  ('sw:empty','t', 'empty type', '{"type":""}');
update public.cards set changed = true where key = 'sw:act';

set local role anon;
do $$ begin
  begin perform public.hq_swipe(1, 'left'); raise exception 'anon could swipe';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('hq.t_left', id::text, true) from public.cards where key = 'sw:left';
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@test.invalid","role":"authenticated"}', true);
do $$ begin
  begin perform public.hq_swipe(current_setting('hq.t_left')::bigint, 'left'); raise exception 'stranger could swipe';
  exception when no_data_found then null; end;       -- RLS hides the card: "not found"
end $$;

select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ declare r text; n int; a record; id_of jsonb; begin
  select jsonb_object_agg(key, id) into id_of from public.cards where key like 'sw:%';

  r := public.hq_swipe((id_of->>'sw:act')::bigint, 'right');
  if r <> 'approved' then raise exception 'action card should be approved, got %', r; end if;
  select * into a from public.actions where card_id = (id_of->>'sw:act')::bigint;
  if a.type <> 'reply' or a.status <> 'pending' or a.payload->>'to' <> 'room1' or a.payload ? 'type' then
    raise exception 'action row wrong: %', row_to_json(a); end if;
  if (select changed from public.cards where key='sw:act') then raise exception 'changed flag not cleared'; end if;

  begin perform public.hq_swipe((id_of->>'sw:act')::bigint, 'right'); raise exception 'second swipe accepted';
  exception when sqlstate 'P0003' then null; end;
  select count(*) into n from public.actions where card_id = (id_of->>'sw:act')::bigint;
  if n <> 1 then raise exception 'double swipe filed % actions', n; end if;

  r := public.hq_swipe((id_of->>'sw:batch')::bigint, 'right', null, '[2]');
  select payload into a from public.actions where card_id = (id_of->>'sw:batch')::bigint;
  if a.payload->'veto' <> '[2]'::jsonb or a.payload->'rows' <> '[1,2,3]'::jsonb then raise exception 'veto not carried: %', a.payload; end if;

  r := public.hq_swipe((id_of->>'sw:plain')::bigint, 'right');
  if r <> 'done' then raise exception 'plain card should be done, got %', r; end if;
  r := public.hq_swipe((id_of->>'sw:empty')::bigint, 'right');
  if r <> 'done' then raise exception 'empty action type should be done, got %', r; end if;
  select count(*) into n from public.actions where card_id in ((id_of->>'sw:plain')::bigint, (id_of->>'sw:empty')::bigint);
  if n <> 0 then raise exception 'plain approve filed an action'; end if;

  r := public.hq_swipe((id_of->>'sw:left')::bigint, 'left');
  if r <> 'dismissed' then raise exception 'left should dismiss'; end if;
  r := public.hq_unswipe((id_of->>'sw:left')::bigint);
  if (select status from public.cards where key='sw:left') <> 'new' then raise exception 'undo did not restore'; end if;

  begin perform public.hq_swipe((id_of->>'sw:up')::bigint, 'up'); raise exception 'snooze without a time accepted';
  exception when raise_exception then if sqlerrm like 'snooze without%' then raise; end if; end;
  begin perform public.hq_swipe((id_of->>'sw:up')::bigint, 'up', now() - interval '1 hour'); raise exception 'snooze into the past accepted';
  exception when raise_exception then if sqlerrm like 'snooze into%' then raise; end if; end;
  r := public.hq_swipe((id_of->>'sw:up')::bigint, 'up', now() + interval '1 day');
  if r <> 'snoozed' or (select count(*) from public.today_deck where key='sw:up') <> 0 then raise exception 'snooze failed'; end if;

  begin perform public.hq_unswipe((id_of->>'sw:act')::bigint); raise exception 'approved card with an action was undone';
  exception when sqlstate 'P0003' then null; end;
  begin perform public.hq_swipe((id_of->>'sw:left')::bigint, 'sideways'); raise exception 'bad direction accepted';
  exception when raise_exception then if sqlerrm like 'bad direction%' then raise; end if; end;
end $$;
reset role;
select 'swipe ok' as result;
rollback;
