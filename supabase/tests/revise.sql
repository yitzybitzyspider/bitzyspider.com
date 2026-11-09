-- Revise loop end to end: owner sends back, agent returns, owner edits and approves. Rolls back. Returns 'revise ok'.
begin;
update public.hq_settings set value = '"owner@test.invalid"' where key = 'owner_email';
insert into public.cards(key, source, kind, title, proposed_action) values
  ('rv:mail', 't', 'approve', 'reply to dana', '{"type":"email_reply","thread_id":"T1","draft":{"to":"dana@x.test","subject":"Re: call","text":"v1"}}'),
  ('rv:undo', 't', 'approve', 'undo me',       '{"type":"reply","draft":{"text":"a"}}'),
  ('rv:todo', 't', 'approve', 'becomes todo',  '{"type":"reply","draft":{"text":"a"}}'),
  ('rv:plain','t', 'do',      'no draft',      null);
select set_config('hq.ids', (select jsonb_object_agg(key, id)::text from public.cards where key like 'rv:%'), true);

set local role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@test.invalid","role":"authenticated"}', true);
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; begin
  begin perform public.hq_revise((ids->>'rv:mail')::bigint, 'x'); raise exception 'stranger could revise';
  exception when no_data_found then null; end;
  begin perform public.hq_return_revised((ids->>'rv:mail')::bigint, '{"text":"evil"}'); raise exception 'browser could return a draft';
  exception when insufficient_privilege then null; end;
  begin perform public.hq_to_todo((ids->>'rv:mail')::bigint, 'x'); raise exception 'browser could call hq_to_todo';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; m bigint := (ids->>'rv:mail')::bigint; r text; n int; begin
  begin perform public.hq_revise(m, '   '); raise exception 'empty note accepted';
  exception when raise_exception then if sqlerrm like 'empty note%' then raise; end if; end;
  r := public.hq_revise(m, '  shorter, mention Thursday ');
  if r <> 'revising' or (select count(*) from public.today_deck where id = m) <> 0 then raise exception 'card did not leave the deck'; end if;
  if (select note from public.revisions where card_id = m and kind = 'note') <> 'shorter, mention Thursday' then raise exception 'note not stored trimmed'; end if;
  if (select draft->>'text' from public.revisions where card_id = m and kind = 'note') <> 'v1' then raise exception 'draft snapshot missing'; end if;
  begin perform public.hq_revise(m, 'again'); raise exception 'revise accepted twice';
  exception when sqlstate 'P0003' then null; end;
  begin perform public.hq_swipe(m, 'right'); raise exception 'approved while revising';
  exception when sqlstate 'P0003' then null; end;
  begin insert into public.revisions(card_id, kind, author, draft) values (m, 'draft', 'agent', '{"text":"forged"}'); raise exception 'owner forged an agent draft';
  exception when insufficient_privilege then null; end;

  perform public.hq_revise((ids->>'rv:undo')::bigint, 'never mind');
  perform public.hq_unswipe((ids->>'rv:undo')::bigint);
  if (select status from public.cards where key = 'rv:undo') <> 'new' then raise exception 'undo of revise failed'; end if;
  perform public.hq_revise((ids->>'rv:todo')::bigint, 'attach the contract PDF');
end $$;
reset role;

-- agent side (privileged here, service_role in production)
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; m bigint := (ids->>'rv:mail')::bigint; c record; begin
  -- a collector refresh while revising must not clobber the draft
  perform public.hq_upsert_card('{"key":"rv:mail","source":"t","title":"clobber","proposed_action":{"type":"x","draft":{"text":"clobbered"}},"fingerprint":"new"}');
  if (select proposed_action->'draft'->>'text' from public.cards where id = m) <> 'v1' or (select status from public.cards where id = m) <> 'revising' then
    raise exception 'collector refresh disturbed a revising card'; end if;
  begin perform public.hq_return_revised((ids->>'rv:undo')::bigint, '{"text":"late"}', 'late'); raise exception 'late agent overrode an undo';
  exception when sqlstate 'P0003' then null; end;
  if (select proposed_action->'draft'->>'text' from public.cards where key = 'rv:undo') <> 'a' then raise exception 'late agent changed the draft'; end if;

  perform public.hq_return_revised(m, '{"to":"dana@x.test","subject":"Re: call","text":"v2 Thursday"}', 'Shortened, added Thursday');
  select * into c from public.cards where id = m;
  if c.status <> 'new' or not c.changed or c.proposed_action->'draft'->>'text' <> 'v2 Thursday' or c.proposed_action->>'thread_id' <> 'T1'
     or c.raw->>'last_note' <> 'shorter, mention Thursday' or (c.raw->>'revision_count')::int <> 1 or c.raw->>'revision_summary' <> 'Shortened, added Thursday' then
    raise exception 'returned card wrong: %', row_to_json(c); end if;

  perform public.hq_to_todo((ids->>'rv:todo')::bigint, 'I do not have the contract PDF');
  select * into c from public.cards where key = 'rv:todo';
  if c.kind <> 'todo' or c.proposed_action is not null or c.status <> 'new' or c.raw->>'todo_reason' <> 'I do not have the contract PDF' then raise exception 'todo conversion wrong'; end if;
  begin perform public.hq_to_todo((ids->>'rv:todo')::bigint, ' '); raise exception 'todo without a reason accepted';
  exception when raise_exception then if sqlerrm like 'todo without%' then raise; end if; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; m bigint := (ids->>'rv:mail')::bigint; a record; r text; n int; begin
  begin perform public.hq_swipe(m, 'right', null, '[]', '{"thread_id":"T2"}'); raise exception 'edit changed routing';
  exception when raise_exception then if sqlerrm like 'edit changed%' then raise; end if; end;
  begin perform public.hq_swipe(m, 'right', null, '[]', '{"bcc":"evil@x.test"}'); raise exception 'edit added a field';
  exception when raise_exception then if sqlerrm like 'edit added%' then raise; end if; end;
  begin perform public.hq_swipe((ids->>'rv:plain')::bigint, 'right', null, '[]', '{"text":"x"}'); raise exception 'edit on a card with no draft';
  exception when raise_exception then if sqlerrm like 'edit on a card%' then raise; end if; end;
  if (select status from public.cards where id = m) <> 'new' then raise exception 'a refused edit still changed the card'; end if;

  r := public.hq_swipe(m, 'right', null, '[]', '{"text":"v3 mine"}');
  select * into a from public.actions where card_id = m;
  if r <> 'approved' or a.payload->'draft'->>'text' <> 'v3 mine' or a.payload->'draft'->>'to' <> 'dana@x.test' or a.payload->>'thread_id' <> 'T1' or (a.payload->>'edited')::boolean is not true then
    raise exception 'edited approval wrong: %', a.payload; end if;
  select count(*) into n from public.revisions where card_id = m;
  if n <> 3 then raise exception 'history should be note, draft, edit; got %', n; end if;

  r := public.hq_swipe((ids->>'rv:undo')::bigint, 'right', null, '[]', '{"text":"a"}');
  if (select (payload->>'edited')::boolean from public.actions where card_id = (ids->>'rv:undo')::bigint) then raise exception 'unchanged text flagged as edited'; end if;
  r := public.hq_swipe((ids->>'rv:todo')::bigint, 'right');
  if r <> 'done' then raise exception 'todo right-swipe should be done, got %', r; end if;
  perform public.hq_unswipe((ids->>'rv:todo')::bigint);
  perform public.hq_revise((ids->>'rv:todo')::bigint, 'the PDF is in Drive under Contracts');
end $$;
reset role;
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; c record; begin
  begin perform public.hq_return_revised((ids->>'rv:todo')::bigint, '{"text":"x"}'); raise exception 'draft attached to a todo with no action';
  exception when raise_exception then if sqlerrm like 'draft attached%' then raise; end if; end;
  perform public.hq_return_revised((ids->>'rv:todo')::bigint, '{"text":"attached"}', 'Found the PDF', null, '{"type":"reply"}');
  select * into c from public.cards where key = 'rv:todo';
  if c.kind <> 'approve' or c.proposed_action->>'type' <> 'reply' or c.raw ? 'todo_reason' then raise exception 'todo retry did not become an approve card'; end if;
end $$;
-- body-only revision: a plan card has no draft and no action
insert into public.cards(key, source, kind, title, body_md, status) values ('rv:plan', 't', 'plan', 'today', '1. A', 'revising'),
                                                                         ('rv:td', 't', 'todo', 'todo', 'ctx', 'revising');
update public.cards set raw = '{"todo_reason":"needs login"}' where key = 'rv:td';
insert into public.revisions(card_id, kind, note) select id, 'note', 'swap A for B' from public.cards where key in ('rv:plan','rv:td');
do $$ declare c record; begin
  begin perform public.hq_return_revised((select id from public.cards where key='rv:plan'), null, 's', '  '); raise exception 'empty return accepted';
  exception when raise_exception then if sqlerrm like 'empty return%' then raise; end if; end;
  perform public.hq_return_revised((select id from public.cards where key='rv:plan'), null, 'Swapped', '1. B');
  select * into c from public.cards where key = 'rv:plan';
  if c.body_md <> '1. B' or c.status <> 'new' or c.kind <> 'plan' or c.proposed_action is not null or (c.raw->>'revision_count')::int <> 1 or c.raw->>'last_note' <> 'swap A for B' then
    raise exception 'body-only return wrong: %', row_to_json(c); end if;
  perform public.hq_return_revised((select id from public.cards where key='rv:td'), null, 'Added detail', 'ctx plus');
  select * into c from public.cards where key = 'rv:td';
  if c.kind <> 'todo' or c.raw->>'todo_reason' <> 'needs login' then raise exception 'a body-only return must leave a to-do a to-do with its reason'; end if;
end $$;
select 'revise ok' as result;
rollback;
