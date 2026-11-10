-- Agent kinds and derived states against a seeded, controlled clock. Rolls back. Returns 'agents ok'.
begin;
delete from public.actions; delete from public.revisions; delete from public.cards; delete from public.runs; delete from public.sources; delete from public.wakes;
insert into public.hq_settings(key, value) values ('owner_email', '"owner@test.invalid"') on conflict (key) do update set value = excluded.value;
select set_config('hq.now', '2026-11-10 20:00:00+00', true);

do $$ declare t timestamptz := current_setting('hq.now')::timestamptz; r record; got text; begin
  -- Kinds: defaulted from the name when the agent does not say, kept when it does, refused when unknown.
  insert into public.sources(name, expected_interval, last_ok_at) values
    ('canvas', '30 minutes', t - interval '10 minutes'), ('reviser', '1 hour', t - interval '10 minutes'),
    ('executor-beeper', '1 hour', t - interval '10 minutes'), ('warden', '30 minutes', t - interval '10 minutes');
  insert into public.sources(name, expected_interval, kind, title) values ('grok', '100 years', 'worker', 'Grok research');
  select string_agg(name || '=' || kind, ',' order by name) into got from public.sources;
  if got <> 'canvas=collector,executor-beeper=executor,grok=worker,reviser=worker,warden=auditor' then raise exception 'wrong default kinds: %', got; end if;
  if (select title from public.sources where name = 'warden') <> 'Warden' then raise exception 'warden got no title'; end if;
  begin insert into public.sources(name, expected_interval, kind) values ('bad', '1 hour', 'boss'); raise exception 'an unknown kind was accepted';
  exception when check_violation then null; end;
  -- Registering again the way the heartbeat does (no kind sent) must not reset a kind that was set.
  update public.sources set kind = 'auditor' where name = 'canvas';
  insert into public.sources(name, expected_interval, runs_on) values ('canvas', '30 minutes', 'box')
    on conflict (name) do update set expected_interval = excluded.expected_interval, runs_on = excluded.runs_on;
  if (select kind from public.sources where name = 'canvas') <> 'auditor' then raise exception 're-registering reset the kind'; end if;
  update public.sources set kind = 'collector' where name = 'canvas';

  -- One source per state.
  insert into public.sources(name, expected_interval, last_ok_at, enabled) values
    ('s-off', '5 minutes', t - interval '9 days', false),
    ('s-hung', '1 hour', t - interval '50 minutes', true), ('s-running', '1 hour', t - interval '50 minutes', true),
    ('s-failed', '1 hour', t - interval '2 hours', true), ('s-never', '1 hour', null, true),
    ('s-late', '1 hour', t - interval '91 minutes', true), ('s-grace', '1 hour', t - interval '89 minutes', true),
    ('s-okfirst', '1 hour', null, true), ('s-demand', '100 years', t - interval '40 days', true);
  insert into public.runs(source, started_at, finished_at, cards_upserted, error, host) values
    ('canvas', t - interval '30 hours', t - interval '30 hours' + interval '1 minute', 50, null, 'box'),
    ('canvas', t - interval '70 minutes', t - interval '69 minutes', 3, null, 'box'),
    ('canvas', t - interval '10 minutes', t - interval '9 minutes', 4, null, 'box'),
    ('s-off', t - interval '5 minutes', null, null, null, 'box'),
    ('s-hung', t - interval '3 hours', t - interval '179 minutes', 1, null, 'box'), ('s-hung', t - interval '31 minutes', null, null, null, 'box'),
    ('s-running', t - interval '29 minutes', null, null, null, 'mac'),
    ('s-failed', t - interval '2 hours', t - interval '119 minutes', 2, null, 'box'), ('s-failed', t - interval '10 minutes', t - interval '9 minutes', 0, 'HTTP 401', 'box'),
    ('s-okfirst', t - interval '10 minutes', t - interval '9 minutes', 0, null, 'box'),
    ('s-demand', t - interval '40 days', t - interval '40 days' + interval '1 minute', 0, null, 'mac');

  for r in select * from (values ('canvas','ok'), ('s-off','off'), ('s-hung','hung'), ('s-running','running'), ('s-failed','failed'),
                                 ('s-never','never'), ('s-late','late'), ('s-grace','ok'), ('s-okfirst','ok'), ('s-demand','ok'), ('grok','never')) v(name, want) loop
    select state into got from public.hq_agent_status(t) a where a.name = r.name;
    if got is distinct from r.want then raise exception 'state of %: wanted %, got %', r.name, r.want, got; end if;
  end loop;
  if (select count(*) from public.hq_agent_status(t)) <> (select count(*) from public.sources) then raise exception 'not exactly one row per source'; end if;

  -- The numbers beside the state.
  select * into r from public.hq_agent_status(t) a where a.name = 'canvas';
  if r.cards_24h <> 7 or r.runs_24h <> 2 or r.last_cards <> 4 or r.last_host <> 'box' or r.last_error is not null then raise exception 'canvas numbers wrong: %', row_to_json(r); end if;
  if r.next_due_at <> t + interval '20 minutes' or r.on_demand or r.title <> 'canvas' then raise exception 'canvas due or title wrong: %', row_to_json(r); end if;
  select * into r from public.hq_agent_status(t) a where a.name = 's-failed';
  if r.last_error <> 'HTTP 401' then raise exception 'the failure lost its error'; end if;
  select * into r from public.hq_agent_status(t) a where a.name = 's-demand';
  if not r.on_demand or r.next_due_at is not null then raise exception 'an on-demand agent has a due time'; end if;
  if (select title from public.hq_agent_status(t) a where a.name = 'grok') <> 'Grok research' then raise exception 'a given title was not used'; end if;

  -- A run finishing changes the state at once; a newer failure wins over an older success.
  update public.runs set finished_at = t where source = 's-running';
  if (select state from public.hq_agent_status(t) a where a.name = 's-running') <> 'ok' then raise exception 'a finished run still shows as running'; end if;
  -- Thresholds come from the warden settings, so the page and the warden agree.
  update public.hq_settings set value = value || '{"hung_run_minutes": 60, "stale_factor": 1.4}' where key = 'warden';
  if (select state from public.hq_agent_status(t) a where a.name = 's-hung') <> 'running' then raise exception 'hung limit is not read from settings'; end if;
  if (select state from public.hq_agent_status(t) a where a.name = 's-grace') <> 'late' then raise exception 'stale factor is not read from settings'; end if;
  -- The view is the function at the real clock.
  if (select count(*) from public.agent_status) <> (select count(*) from public.sources) then raise exception 'the view does not list every source'; end if;
end $$;

-- anon: nothing.
set local role anon;
do $$ begin
  begin perform count(*) from public.agent_status; raise exception 'anon could read agent_status';
  exception when insufficient_privilege then null; end;
  begin perform count(*) from public.hq_agent_status(); raise exception 'anon could call hq_agent_status';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A signed-in stranger sees no agents; the owner sees them all and cannot write.
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@test.invalid","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.agent_status) <> 0 then raise exception 'a stranger saw agents'; end if;
  if (select count(*) from public.hq_agent_status()) <> 0 then raise exception 'a stranger saw agents through the function'; end if;
end $$;
select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.agent_status;
  if n < 10 then raise exception 'the owner saw only % agents', n; end if;
  if (select state from public.agent_status where name = 's-off') <> 'off' then raise exception 'the owner got a wrong state'; end if;
  begin update public.sources set kind = 'auditor' where name = 'canvas'; raise exception 'the browser could change a kind';
  exception when insufficient_privilege then null; end;
  begin insert into public.runs(source) values ('canvas'); raise exception 'the browser could forge a run';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'agents ok' as result;
rollback;
