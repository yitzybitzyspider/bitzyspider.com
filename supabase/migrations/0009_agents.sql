-- Agent status: every agent has a kind, and one view says what each is doing right now. Decision: D-051.
-- Issue #115. The page and the warden read the same thresholds (hq_settings.warden), so they agree.

-- ---------- kind and title on sources ----------
alter table public.sources add column kind text;
alter table public.sources add column title text;

-- A source that registers without a kind gets one from its name, so the heartbeat and the warden
-- (which insert name, interval and host only) keep working unchanged.
create function public.hq_source_defaults() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind is null then
    new.kind := case when new.name = 'warden' or new.name like 'audit%' or new.name like 'review%' then 'auditor'
                     when new.name = 'reviser' or new.name like 'draft%' or new.name like 'plan%' then 'worker'
                     when new.name like 'executor%' or new.name like 'exec-%' then 'executor'
                     else 'collector' end;
  end if;
  if new.title is null and new.name in ('warden', 'reviser') then new.title := initcap(new.name); end if;
  return new;
end $$;
revoke all on function public.hq_source_defaults() from public, anon, authenticated, service_role;
create trigger sources_defaults before insert on public.sources for each row execute function public.hq_source_defaults();

update public.sources set kind = case when name = 'warden' then 'auditor' when name = 'reviser' then 'worker'
                                      when name like 'executor%' then 'executor' else 'collector' end
 where kind is null;
update public.sources set title = 'Warden' where name = 'warden' and title is null;
update public.sources set title = 'Reviser' where name = 'reviser' and title is null;
update public.sources set title = 'Beeper chat dump' where name = 'beeper' and title is null;

alter table public.sources alter column kind set not null;
alter table public.sources add constraint sources_kind_check check (kind in ('collector', 'worker', 'executor', 'auditor'));

-- ---------- one row per agent, with a derived state ----------
-- States: off, hung, running, failed, never, late, ok (first match wins, in that order).
-- An expected interval of a year or more means "on demand": such an agent is never late.
-- Not security definer: it reads as the caller, so row security on sources and runs still decides.
create function public.hq_agent_status(p_now timestamptz default now())
returns table (name text, title text, kind text, runs_on text, enabled boolean, on_demand boolean, expected_interval interval,
               last_ok_at timestamptz, next_due_at timestamptz, last_started_at timestamptz, last_finished_at timestamptz,
               last_error text, last_host text, last_cards int, cards_24h bigint, runs_24h bigint, state text)
language sql stable set search_path = '' as $$
  with lim as (
    select coalesce((w.v ->> 'stale_factor')::numeric, 1.5) as stale_factor, coalesce((w.v ->> 'hung_run_minutes')::int, 30) as hung_min
      from (select coalesce((select st.value from public.hq_settings st where st.key = 'warden'), '{}'::jsonb) as v) w)
  select s.name, coalesce(nullif(s.title, ''), s.name), s.kind, s.runs_on, s.enabled, s.expected_interval >= interval '1 year', s.expected_interval,
         s.last_ok_at,
         case when s.expected_interval < interval '1 year' then s.last_ok_at + s.expected_interval end,
         l.started_at, l.finished_at, l.error, l.host, l.cards_upserted, coalesce(d.cards, 0), coalesce(d.runs, 0),
         case when not s.enabled then 'off'
              when l.started_at is not null and l.finished_at is null and l.started_at < p_now - make_interval(mins => lim.hung_min) then 'hung'
              when l.started_at is not null and l.finished_at is null then 'running'
              when l.error is not null then 'failed'
              when s.last_ok_at is null and l.started_at is null then 'never'
              when s.expected_interval < interval '1 year' and s.last_ok_at is not null
                   and s.last_ok_at + s.expected_interval * lim.stale_factor < p_now then 'late'
              else 'ok' end
    from public.sources s cross join lim
    left join lateral (select r.started_at, r.finished_at, r.error, r.host, r.cards_upserted
                         from public.runs r where r.source = s.name order by r.started_at desc, r.id desc limit 1) l on true
    left join lateral (select sum(coalesce(r.cards_upserted, 0)) as cards, count(*) as runs
                         from public.runs r where r.source = s.name and r.started_at > p_now - interval '24 hours') d on true
$$;
revoke all on function public.hq_agent_status(timestamptz) from public, anon;
grant execute on function public.hq_agent_status(timestamptz) to authenticated, service_role;

create view public.agent_status with (security_invoker = true) as
  select * from public.hq_agent_status();
revoke all on public.agent_status from anon, authenticated;
grant select on public.agent_status to authenticated;

-- ---------- live updates: the page listens for run and source changes ----------
-- Realtime sends a row only to a session that may select it, so row security still holds.
do $$ begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.runs;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.sources; exception when duplicate_object then null; end;
  else
    raise notice 'no supabase_realtime publication here; the page falls back to polling';
  end if;
exception when others then
  raise notice 'could not add runs and sources to realtime: %', sqlerrm;
end $$;
