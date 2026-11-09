-- Wake trigger. CLEAN DATABASE ONLY: it builds stand-ins for pg_net and the vault inside its
-- transaction, which a real Supabase project already has. Rolls back. Returns 'wake ok'.
begin;
update public.hq_settings set value = '"owner@test.invalid"' where key = 'owner_email';
insert into public.cards(key, source, kind, title, proposed_action) values
  ('wk:1', 't', 'approve', 'a', '{"type":"reply","draft":{"text":"v1"}}'),
  ('wk:2', 't', 'approve', 'b', '{"type":"reply","draft":{"text":"v1"}}'),
  ('wk:3', 't', 'approve', 'c', '{"type":"reply","draft":{"text":"v1"}}'),
  ('wk:4', 't', 'approve', 'd', '{"type":"reply","draft":{"text":"v1"}}');
select set_config('hq.ids', (select jsonb_object_agg(key, id)::text from public.cards where key like 'wk:%'), true);

-- 1. No pg_net at all: the swipe still works and the miss is recorded.
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; begin
  perform public.hq_revise((ids->>'wk:1')::bigint, 'shorter');
  if (select status from public.cards where key = 'wk:1') <> 'revising' then raise exception 'revise failed without pg_net'; end if;
  if (select status from public.wakes order by id desc limit 1) <> 'no_pg_net' then raise exception 'missing pg_net not recorded'; end if;
  begin perform public.hq_wake('hq-revise'); raise exception 'the browser could call hq_wake directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- stand-ins
create schema net;
create table net.calls (id bigint generated always as identity, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language plpgsql as $$ declare i bigint; begin
  if current_setting('hq.net_down', true) = '1' then raise exception 'network is down'; end if;
  insert into net.calls(url, body, headers) values (url, body, headers) returning id into i; return i; end $$;
create schema vault;
create table vault.decrypted_secrets (name text, decrypted_secret text);

-- 2. pg_net but no token: recorded, nothing sent.
set local role authenticated;
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; begin
  perform public.hq_revise((ids->>'wk:2')::bigint, 'longer');
end $$;
reset role;
do $$ begin
  if (select status from public.wakes order by id desc limit 1) <> 'no_token' then raise exception 'missing token not recorded'; end if;
  if (select count(*) from net.calls) <> 0 then raise exception 'sent without a token'; end if;
end $$;

-- 3. With a token: one dispatch, shaped the way GitHub wants it.
insert into vault.decrypted_secrets values ('other_secret', 'nope'), ('hq_github_dispatch_token', 'tok_TEST_123');
set local role authenticated;
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; begin
  perform public.hq_revise((ids->>'wk:3')::bigint, 'friendlier');
end $$;
reset role;
do $$ declare c record; begin
  if (select count(*) from net.calls) <> 1 then raise exception 'expected one dispatch, got %', (select count(*) from net.calls); end if;
  select * into c from net.calls;
  if c.url <> 'https://api.github.com/repos/yitzybitzyspider/bitzy-hq-agents/dispatches' then raise exception 'wrong url %', c.url; end if;
  if c.body <> '{"event_type":"hq-revise"}'::jsonb then raise exception 'wrong body %', c.body; end if;
  if c.headers->>'Authorization' <> 'Bearer tok_TEST_123' or c.headers->>'Accept' <> 'application/vnd.github+json' or coalesce(c.headers->>'User-Agent','') = '' then
    raise exception 'wrong headers %', c.headers - 'Authorization'; end if;
  if (select status from public.wakes order by id desc limit 1) <> 'sent' then raise exception 'send not recorded'; end if;
  if exists (select 1 from public.wakes where coalesce(detail,'') like '%tok_TEST%' or event like '%tok_TEST%') then raise exception 'the token leaked into the wakes log'; end if;
end $$;

-- 4. A burst is one run: a second note inside the window is debounced. An approval is its own event.
set local role authenticated;
do $$ declare ids jsonb := current_setting('hq.ids')::jsonb; begin
  perform public.hq_revise((ids->>'wk:4')::bigint, 'again');
  perform public.hq_unswipe((ids->>'wk:4')::bigint);       -- writes a 'cancel' revision: must not wake
  perform public.hq_swipe((ids->>'wk:4')::bigint, 'right');
end $$;
reset role;
do $$ begin
  if (select count(*) from net.calls where body->>'event_type' = 'hq-revise') <> 1 then raise exception 'burst was not debounced'; end if;
  if (select count(*) from public.wakes where status = 'debounced') <> 1 then raise exception 'debounce not recorded exactly once (a cancel must not wake)'; end if;
  if (select count(*) from net.calls where body->>'event_type' = 'hq-action') <> 1 then raise exception 'approval did not wake the executor'; end if;
end $$;

-- 5. Network down: the approval still lands, the failure is recorded, nothing is raised.
update public.wakes set created_at = now() - interval '1 minute';
select set_config('hq.net_down', '1', true);
insert into public.cards(key, source, kind, title, proposed_action) values ('wk:5', 't', 'approve', 'e', '{"type":"reply","draft":{"text":"v1"}}');
set local role authenticated;
do $$ declare r text; begin
  r := public.hq_swipe((select id from public.cards where key = 'wk:5'), 'right');
  if r <> 'approved' then raise exception 'approval failed while the network was down'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.actions a join public.cards c on c.id = a.card_id where c.key = 'wk:5') <> 1 then raise exception 'action row missing'; end if;
  if (select status from public.wakes order by id desc limit 1) <> 'error' then raise exception 'network failure not recorded'; end if;
  if (select detail from public.wakes order by id desc limit 1) like '%tok_TEST%' then raise exception 'the token leaked into an error detail'; end if;
end $$;
select set_config('hq.net_down', '0', true);

-- 6. Unknown events are ignored; agent drafts and to-dos never wake anyone; who can see the log.
do $$ declare n int; begin
  select count(*) into n from net.calls;
  if public.hq_wake('rm -rf') <> 'ignored' then raise exception 'unknown event accepted'; end if;
  update public.wakes set created_at = now() - interval '1 minute';
  insert into public.revisions(card_id, kind, author, draft) select id, 'draft', 'agent', '{"text":"v2"}' from public.cards where key = 'wk:1';
  insert into public.revisions(card_id, kind, author, note) select id, 'todo', 'agent', 'why' from public.cards where key = 'wk:1';
  if (select count(*) from net.calls) <> n then raise exception 'an agent revision woke the agents'; end if;
end $$;
set local role anon;
do $$ begin begin perform count(*) from public.wakes; raise exception 'anon read wakes'; exception when insufficient_privilege then null; end; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@test.invalid","role":"authenticated"}', true);
do $$ begin if (select count(*) from public.wakes) <> 0 then raise exception 'a stranger read wakes'; end if; end $$;
select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.wakes) = 0 then raise exception 'the owner cannot read wakes'; end if;
  begin insert into public.wakes(event, status) values ('x', 'sent'); raise exception 'the browser wrote to wakes'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'wake ok' as result;
rollback;
