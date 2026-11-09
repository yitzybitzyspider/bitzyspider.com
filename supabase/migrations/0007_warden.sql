-- The warden: a deterministic supervisor that watches the agents, not the inputs. Decisions: D-015, D-047.
-- It lives in the database and runs on pg_cron, so it needs no runner, no secret and no box:
-- if the box or GitHub is down, the warden still runs and says so. Every finding is an alert card.

do $$ begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron not available here (%); schedule hq_warden() some other way', sqlerrm;
end $$;

-- Thresholds live in settings so they can be tuned without a migration.
insert into public.hq_settings(key, value) values
  ('warden', '{"stale_factor": 1.5, "pending_action_minutes": 60, "revising_minutes": 15, "hung_run_minutes": 30,
               "quiet_runs": 3, "spike_factor": 3, "spike_min_cards": 20, "spike_min_history": 5}')
on conflict (key) do nothing;

create function public.hq_warden(p_now timestamptz default now()) returns int
language plpgsql set search_path = '' as $$
declare
  cfg jsonb := coalesce((select value from public.hq_settings where key = 'warden'), '{}'::jsonb);
  stale_factor   numeric := coalesce((cfg ->> 'stale_factor')::numeric, 1.5);
  pending_min    int := coalesce((cfg ->> 'pending_action_minutes')::int, 60);
  revising_min   int := coalesce((cfg ->> 'revising_minutes')::int, 15);
  hung_min       int := coalesce((cfg ->> 'hung_run_minutes')::int, 30);
  quiet_runs     int := coalesce((cfg ->> 'quiet_runs')::int, 3);
  spike_factor   numeric := coalesce((cfg ->> 'spike_factor')::numeric, 3);
  spike_min      int := coalesce((cfg ->> 'spike_min_cards')::int, 20);
  spike_hist     int := coalesce((cfg ->> 'spike_min_history')::int, 5);
  f record; n int := 0; keys text[] := '{}'; started timestamptz := clock_timestamp();
begin
  for f in
    -- 1. A source that stopped reporting (this is also how a dead box shows up).
    select 'warden:stale:' || s.name as key,
           s.name || ' has not reported since ' || to_char(s.last_ok_at at time zone 'America/Los_Angeles', 'Dy HH12:MI AM') as title,
           'Expected every ' || s.expected_interval || '. Last good run was ' || to_char(s.last_ok_at at time zone 'America/Los_Angeles', 'Mon DD HH12:MI AM')
             || ' Pacific. Runs on: ' || s.runs_on || E'.\n\nIf several sources that run on the box are stale at once, the box is off or offline.' as body
      from public.sources s
     where s.enabled and s.name <> 'warden' and s.last_ok_at is not null
       and s.last_ok_at + s.expected_interval * stale_factor < p_now
    union all
    select 'warden:never:' || s.name, s.name || ' is registered but has never reported',
           'It is enabled with an expected interval of ' || s.expected_interval || ' and no successful run on record.'
      from public.sources s
     where s.enabled and s.name <> 'warden' and s.last_ok_at is null
    union all
    -- 2. The latest finished run of a source failed.
    select 'warden:failing:' || r.source, r.source || ' failed on its last run', E'Error:\n\n```\n' || left(r.error, 400) || E'\n```'
      from (select distinct on (source) source, error from public.runs where finished_at is not null order by source, started_at desc) r
     where r.error is not null and r.source <> 'warden'
    union all
    -- 3. A run that started and never finished.
    select 'warden:hung:' || r.source, r.source || ' started a run that never finished',
           'Started ' || to_char(r.started_at at time zone 'America/Los_Angeles', 'Dy HH12:MI AM') || ' Pacific and has not reported back.'
      from (select distinct on (source) source, started_at, finished_at from public.runs order by source, started_at desc) r
     where r.finished_at is null and r.started_at < p_now - make_interval(mins => hung_min)
    union all
    -- 4. A collector that keeps running and finds nothing (a broken parser looks exactly like a quiet day).
    select 'warden:quiet:' || q.source, q.source || ' has found nothing in its last ' || quiet_runs || ' runs',
           'It runs and finishes without error but upserts zero cards. Check the login, the selector, or the source itself.'
      from (select source, count(*) as c, sum(coalesce(cards_upserted, 0)) as total
              from (select source, cards_upserted, row_number() over (partition by source order by started_at desc) as rn
                      from public.runs where finished_at is not null and error is null) x
             where rn <= quiet_runs group by source) q
      join public.sources s on s.name = q.source and s.enabled
     where q.c = quiet_runs and q.total = 0 and q.source not in ('warden', 'reviser') and q.source not like 'executor%'
    union all
    -- 5. A sudden flood of cards (usually a parser that lost its dedupe key).
    select 'warden:spike:' || l.source, l.source || ' produced ' || l.cards_upserted || ' cards in one run',
           'Its usual run produces about ' || round(h.med) || '. If the cards look duplicated, the collector lost its stable key.'
      from (select distinct on (source) source, cards_upserted, started_at from public.runs where finished_at is not null order by source, started_at desc) l
      join lateral (select percentile_cont(0.5) within group (order by coalesce(r.cards_upserted, 0)) as med, count(*) as c
                      from public.runs r where r.source = l.source and r.finished_at is not null
                       and r.started_at < l.started_at and r.started_at > p_now - interval '7 days') h on true
     where l.cards_upserted >= spike_min and h.c >= spike_hist and l.cards_upserted > greatest(h.med, 1) * spike_factor
    union all
    -- 6. Approved work nobody executed.
    select 'warden:actions:pending', count(*) || ' approved ' || case when count(*) = 1 then 'action has' else 'actions have' end || ' not been carried out',
           'Oldest was approved ' || to_char(min(a.created_at) at time zone 'America/Los_Angeles', 'Dy HH12:MI AM') || ' Pacific. Types: '
             || string_agg(distinct a.type, ', ') || E'.\n\nNo executor picked them up. See docs/hq/RUNBOOKS/wake.md.'
      from public.actions a
     where a.status in ('pending', 'claimed') and a.created_at < p_now - make_interval(mins => pending_min)
    having count(*) > 0
    union all
    -- 7. Cards sent back for a rewrite that never came back.
    select 'warden:revising:stuck', count(*) || case when count(*) = 1 then ' card is' else ' cards are' end || ' still waiting for a rewrite',
           E'Sent back and not returned:\n\n' || string_agg('- ' || c.title, E'\n' order by c.updated_at)
             || E'\n\nThe reviser did not run or failed. Open the card list and use Undo, or run the reviser by hand.'
      from public.cards c
     where c.status = 'revising' and c.updated_at < p_now - make_interval(mins => revising_min)
    having count(*) > 0
    union all
    -- 8. The wake trigger is not getting through.
    select 'warden:wake:' || w.status, 'Wake signals are not reaching the agents (' || w.status || ')',
           count(*) || ' in the last hour. ' || coalesce('Last detail: ' || max(w.detail) || '. ', '') || 'See docs/hq/RUNBOOKS/wake.md.'
      from public.wakes w
     where w.created_at > p_now - interval '1 hour' and w.status in ('error', 'no_token', 'no_pg_net')
     group by w.status
  loop
    -- The day is part of the fingerprint: a dismissed alert stays quiet today and returns tomorrow if still true.
    perform public.hq_upsert_card(jsonb_build_object(
      'key', f.key, 'source', 'warden', 'bucket', 'inputs', 'kind', 'alert', 'title', left(f.title, 300), 'body_md', f.body,
      'fingerprint', f.key || ':' || to_char(p_now at time zone 'America/Los_Angeles', 'YYYY-MM-DD')));
    -- A problem that was fixed and came back the same day must be seen again.
    update public.cards set status = 'new', changed = true, changed_at = now() where key = f.key and status = 'expired';
    keys := keys || f.key; n := n + 1;
  end loop;

  -- A problem that went away takes its alert with it.
  update public.cards set status = 'expired'
   where source = 'warden' and status in ('new', 'snoozed') and not (key = any(keys));

  -- The warden reports like any other source, and keeps its own history short.
  insert into public.sources(name, expected_interval, runs_on, last_ok_at) values ('warden', interval '30 minutes', 'hosted', p_now)
    on conflict (name) do update set last_ok_at = excluded.last_ok_at;
  insert into public.runs(source, started_at, finished_at, cards_upserted, host) values ('warden', started, clock_timestamp(), n, 'database');
  delete from public.runs where source = 'warden' and started_at < now() - interval '7 days';
  return n;
end $$;
revoke all on function public.hq_warden(timestamptz) from public, anon, authenticated, service_role;

do $$ begin
  if to_regproc('cron.schedule') is not null then
    perform cron.schedule('hq-warden', '*/30 * * * *', 'select public.hq_warden()');
  end if;
exception when others then
  raise notice 'could not schedule hq-warden: %', sqlerrm;
end $$;
