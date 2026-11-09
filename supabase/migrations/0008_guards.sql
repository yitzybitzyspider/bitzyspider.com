-- Fix forward (F-013): to_regproc('schema.name') returns null when the name is overloaded, so the
-- guards in 0006 and 0007 could read a present extension as missing. pg_cron's cron.schedule has two
-- overloads, which left the warden unscheduled on the live project. Guards now ask the catalog directly.

create function public.hq_has_function(p_schema text, p_name text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = p_schema and p.proname = p_name)
$$;
revoke all on function public.hq_has_function(text, text) from public, anon, authenticated, service_role;

create or replace function public.hq_wake(p_event text) returns text
language plpgsql security definer set search_path = '' as $$
declare token text; st text; det text;
        repo constant text := 'yitzybitzyspider/bitzy-hq-agents';
begin
  if p_event not in ('hq-revise', 'hq-action') then return 'ignored'; end if;
  begin
    -- Several notes in a burst need one run, not several: the agent drains everything waiting.
    if exists (select 1 from public.wakes w where w.event = p_event and w.status = 'sent' and w.created_at > now() - interval '20 seconds') then
      st := 'debounced';
    elsif not public.hq_has_function('net', 'http_post') then
      st := 'no_pg_net';
    elsif to_regclass('vault.decrypted_secrets') is null then
      st := 'no_token'; det := 'vault not available';
    else
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into token using 'hq_github_dispatch_token';
      if coalesce(token, '') = '' then
        st := 'no_token';
      else
        execute 'select net.http_post(url := $1, body := $2, headers := $3)'
          using 'https://api.github.com/repos/' || repo || '/dispatches',
                jsonb_build_object('event_type', p_event),
                jsonb_build_object('Authorization', 'Bearer ' || token, 'Accept', 'application/vnd.github+json',
                                   'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'bitzy-hq', 'Content-Type', 'application/json');
        st := 'sent';
      end if;
    end if;
  exception when others then
    st := 'error'; det := left(sqlstate || ' ' || sqlerrm, 300);
  end;
  begin
    insert into public.wakes(event, status, detail) values (p_event, st, det);
  exception when others then null;      -- even the log is optional
  end;
  return st;
end $$;

-- Scheduling as a function, so it can be tested and re-run. Returns what it did.
create function public.hq_schedule_warden() returns text
language plpgsql set search_path = '' as $$
begin
  if not public.hq_has_function('cron', 'schedule') then return 'no_pg_cron'; end if;
  execute 'select cron.schedule($1, $2, $3)' using 'hq-warden', '*/30 * * * *', 'select public.hq_warden()';
  return 'scheduled';
exception when others then
  return 'error: ' || left(sqlerrm, 200);
end $$;
revoke all on function public.hq_schedule_warden() from public, anon, authenticated, service_role;

do $$ begin raise notice 'hq-warden: %', public.hq_schedule_warden(); end $$;
