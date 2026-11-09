-- The warden against a seeded, fully controlled clock. Rolls back. Returns 'warden ok'.
begin;
delete from public.actions; delete from public.revisions; delete from public.cards; delete from public.runs; delete from public.sources; delete from public.wakes;
select set_config('hq.now', '2026-11-09 20:00:00+00', true);

do $$ declare t timestamptz := current_setting('hq.now')::timestamptz; n int; k text[]; c record; begin
  -- A healthy system produces no alerts.
  insert into public.sources(name, expected_interval, runs_on, last_ok_at) values
    ('canvas', '30 minutes', 'box', t - interval '20 minutes'), ('cmg', '4 hours', 'box', t - interval '5 hours'),
    ('off', '5 minutes', 'box', t - interval '9 days');
  update public.sources set enabled = false where name = 'off';
  insert into public.runs(source, started_at, finished_at, cards_upserted) select 'canvas', t - (g || ' hours')::interval, t - (g || ' hours')::interval + interval '1 minute', 4 from generate_series(1, 6) g;
  n := public.hq_warden(t);
  if n <> 0 then raise exception 'healthy system raised % alerts: %', n, (select string_agg(key, ', ') from public.cards); end if;
  if (select count(*) from public.runs where source = 'warden') <> 1 or (select last_ok_at from public.sources where name = 'warden') <> t then raise exception 'warden did not record its own run'; end if;

  -- cmg is 5h into a 4h interval: inside the 1.5x grace. At 7h it is stale.
  update public.sources set last_ok_at = t - interval '7 hours' where name = 'cmg';
  -- gmail registered, never ran. slack failing. box-x hung. quiet finds nothing 3x. flood spikes.
  insert into public.sources(name, expected_interval, last_ok_at) values ('gmail', '15 minutes', null), ('slack', '15 minutes', t - interval '10 minutes'),
    ('quiet', '1 hour', t - interval '10 minutes'), ('flood', '1 hour', t - interval '10 minutes'), ('boxx', '1 hour', t - interval '10 minutes');
  insert into public.runs(source, started_at, finished_at, cards_upserted, error) values ('slack', t - interval '2 hours', t - interval '119 minutes', 3, null), ('slack', t - interval '10 minutes', t - interval '9 minutes', 0, 'HTTP 401 token_revoked');
  insert into public.runs(source, started_at, finished_at) values ('boxx', t - interval '45 minutes', null);
  insert into public.runs(source, started_at, finished_at, cards_upserted) select 'quiet', t - (g || ' hours')::interval, t - (g || ' hours')::interval + interval '1 minute', 0 from generate_series(1, 3) g;
  insert into public.runs(source, started_at, finished_at, cards_upserted) select 'flood', t - (g || ' hours')::interval, t - (g || ' hours')::interval + interval '1 minute', case when g = 1 then 90 else 5 end from generate_series(1, 7) g;
  -- an approved action nobody ran, a card stuck revising, wake trouble
  insert into public.cards(key, source, title, status, proposed_action) values ('w:act', 't', 'send it', 'approved', '{"type":"email_reply","draft":{"text":"x"}}'), ('w:rev', 't', 'Reply to Dana', 'revising', null), ('w:fresh', 't', 'just sent back', 'revising', null);
  insert into public.actions(card_id, type, created_at) select id, 'email_reply', t - interval '3 hours' from public.cards where key = 'w:act';
  alter table public.cards disable trigger cards_touch;
  update public.cards set updated_at = t - interval '40 minutes' where key = 'w:rev';
  update public.cards set updated_at = t - interval '2 minutes' where key = 'w:fresh';
  alter table public.cards enable trigger cards_touch;
  delete from public.wakes; insert into public.wakes(event, status, created_at) values ('hq-revise', 'no_token', t - interval '5 minutes'), ('hq-revise', 'sent', t - interval '4 minutes'), ('hq-revise', 'error', t - interval '3 hours');

  n := public.hq_warden(t);
  select array_agg(key order by key) into k from public.cards where source = 'warden' and status = 'new';
  if not (k @> array['warden:actions:pending','warden:failing:slack','warden:hung:boxx','warden:never:gmail','warden:quiet:quiet','warden:revising:stuck','warden:spike:flood','warden:stale:cmg','warden:wake:no_token'] and array_length(k, 1) = 9) then
    raise exception 'wrong alerts (% found): %', n, k; end if;
  if n <> 9 then raise exception 'warden returned % for 9 findings', n; end if;
  if exists (select 1 from public.cards where source = 'warden' and (kind <> 'alert' or bucket <> 'inputs' or body_md = '')) then raise exception 'alert cards malformed'; end if;
  select * into c from public.cards where key = 'warden:revising:stuck';
  if c.title <> '1 card is still waiting for a rewrite' or c.body_md not like '%Reply to Dana%' or c.body_md like '%just sent back%' then raise exception 'stuck-revising alert wrong: % / %', c.title, c.body_md; end if;
  if (select body_md from public.cards where key = 'warden:failing:slack') not like '%token_revoked%' then raise exception 'failure alert lost the error'; end if;
  if (select count(*) from public.today_deck where pinned) <> 9 then raise exception 'alerts are not pinned on the deck'; end if;

  -- Running again changes nothing: no duplicates, and a dismissed alert stays dismissed the same day.
  update public.cards set status = 'dismissed' where key = 'warden:stale:cmg';
  n := public.hq_warden(t + interval '30 minutes');
  if (select count(*) from public.cards where source = 'warden') <> 9 then raise exception 'second run duplicated alerts'; end if;
  if (select status from public.cards where key = 'warden:stale:cmg') <> 'dismissed' then raise exception 'a dismissed alert came back the same day'; end if;
  -- The next day it returns, once, marked changed.
  n := public.hq_warden(t + interval '1 day');
  select * into c from public.cards where key = 'warden:stale:cmg';
  if c.status <> 'new' or not c.changed then raise exception 'a still-true alert did not return the next day'; end if;

  -- Fix three problems: their alerts expire, the rest stay.
  update public.sources set last_ok_at = t + interval '1 day' where name in ('cmg', 'gmail');
  update public.actions set status = 'done';
  n := public.hq_warden(t + interval '1 day');
  if (select count(*) from public.cards where source = 'warden' and status = 'expired' and key in ('warden:stale:cmg','warden:never:gmail','warden:actions:pending')) <> 3 then raise exception 'resolved alerts did not expire'; end if;
  if (select status from public.cards where key = 'warden:failing:slack') <> 'new' then raise exception 'an unresolved alert was expired'; end if;
  if exists (select 1 from public.cards where source <> 'warden' and status = 'expired') then raise exception 'the warden expired a card that is not its own'; end if;

  -- The box dies: every box source goes stale and each gets its alert.
  update public.sources set last_ok_at = t - interval '3 days' where runs_on = 'box' and enabled;
  n := public.hq_warden(t + interval '1 day');
  if (select count(*) from public.cards where key like 'warden:stale:%' and status = 'new') < 5 then raise exception 'a dead box did not raise stale alerts for its sources'; end if;
  if (select status from public.cards where key = 'warden:stale:cmg') <> 'new' then raise exception 'a problem that was fixed and came back the same day stayed hidden'; end if;
  if exists (select 1 from public.cards where key = 'warden:stale:off') then raise exception 'a disabled source raised an alert'; end if;
  if exists (select 1 from public.cards where key like 'warden:%:warden') then raise exception 'the warden alerted on itself'; end if;

  -- Thresholds come from settings.
  update public.hq_settings set value = value || '{"revising_minutes": 1}' where key = 'warden';
  n := public.hq_warden(t);
  if (select title from public.cards where key = 'warden:revising:stuck') <> '2 cards are still waiting for a rewrite' then raise exception 'revising threshold is not read from settings'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"email":"owner@test.invalid","role":"authenticated"}', true);
do $$ begin begin perform public.hq_warden(); raise exception 'the browser could run the warden'; exception when insufficient_privilege then null; end; end $$;
reset role;
select 'warden ok' as result;
rollback;
