-- Wake the agents the moment there is work. Decisions: D-023, D-045.
-- A note sent back (revisions) or an approved action (actions) fires a GitHub repository_dispatch
-- at the private agents repo through pg_net. The GitHub token lives in Supabase Vault under the
-- name hq_github_dispatch_token; it is never in a migration, a table we own, or the wakes log.
--
-- The rule that shapes everything here: a wake is a courtesy. It must never be able to block or
-- fail a swipe. Missing extension, missing token, network error: record it in wakes and carry on.
-- The agents' cron backstop picks up whatever a lost wake misses.

do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net not available here (%); wakes will be recorded as no_pg_net', sqlerrm;
end $$;

create table public.wakes (
  id         bigint generated always as identity primary key,
  event      text not null,
  status     text not null check (status in ('sent','debounced','no_token','no_pg_net','error')),
  detail     text,
  created_at timestamptz not null default now()
);
create index wakes_recent on public.wakes (event, created_at desc);
alter table public.wakes enable row level security;
revoke all on public.wakes from anon, authenticated;
grant select on public.wakes to authenticated;
create policy wakes_owner_select on public.wakes for select to authenticated using (public.hq_is_owner());

-- security definer: needs to read the vault and call pg_net, which the browser role must never do.
create function public.hq_wake(p_event text) returns text
language plpgsql security definer set search_path = '' as $$
declare token text; st text; det text;
        repo constant text := 'yitzybitzyspider/bitzy-hq-agents';
begin
  if p_event not in ('hq-revise', 'hq-action') then return 'ignored'; end if;
  begin
    -- Several notes in a burst need one run, not several: the agent drains everything waiting.
    if exists (select 1 from public.wakes w where w.event = p_event and w.status = 'sent' and w.created_at > now() - interval '20 seconds') then
      st := 'debounced';
    elsif to_regproc('net.http_post') is null then
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
revoke all on function public.hq_wake(text) from public, anon, authenticated, service_role;

create function public.hq_wake_on_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin perform public.hq_wake('hq-revise'); exception when others then null; end;
  return null;
end $$;
create function public.hq_wake_on_action() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin perform public.hq_wake('hq-action'); exception when others then null; end;
  return null;
end $$;
revoke all on function public.hq_wake_on_revision(), public.hq_wake_on_action() from public, anon, authenticated, service_role;

create trigger revisions_wake after insert on public.revisions
  for each row when (new.kind = 'note') execute function public.hq_wake_on_revision();
create trigger actions_wake after insert on public.actions
  for each row when (new.status = 'pending') execute function public.hq_wake_on_action();
