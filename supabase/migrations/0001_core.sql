-- HQ core schema. Decisions: D-002, D-003, D-004, D-017, D-024 (docs/hq/DECISIONS.md).
-- One owner. The browser holds only the publishable key and the owner's session.
-- Collectors and executors use the service role, which bypasses RLS.

-- ---------- settings (owner email, scoring weights, caps) ----------
create table public.hq_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Owner check. The owner email lives in hq_settings, not in this public repo.
-- security definer so the lookup works before the caller is known to be the owner.
create function public.hq_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = lower((select value #>> '{}' from public.hq_settings where key = 'owner_email')),
    false)
$$;
revoke all on function public.hq_is_owner() from public, anon;
grant execute on function public.hq_is_owner() to authenticated;

-- ---------- cards: the single unit of the system ----------
create table public.cards (
  id              bigint generated always as identity primary key,
  key             text not null unique,                 -- stable per source: canvas:123, chat:slack:room, birthday:id:2026
  source          text not null,
  bucket          text not null default 'other'
                  check (bucket in ('startup','hackathon','community','inputs','other')),
  kind            text not null default 'do'
                  check (kind in ('approve','do','fyi','birthday','plan','alert','batch')),
  title           text not null check (char_length(title) between 1 and 300),
  body_md         text not null default '',
  proposed_action jsonb,                                -- {type, ...payload}; null means approve = mark done
  url             text,
  score           numeric not null default 0,
  due_at          timestamptz,
  snoozed_until   timestamptz,
  status          text not null default 'new'
                  check (status in ('new','approved','dismissed','snoozed','done','expired')),
  changed         boolean not null default false,       -- resurfaced after a material source change
  changed_at      timestamptz not null default now(),   -- collectors bump only on material change
  raw             jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index cards_deck   on public.cards (status, score desc, due_at);
create index cards_source on public.cards (source, changed_at desc);

-- ---------- actions: the outbox executors drain ----------
create table public.actions (
  id          bigint generated always as identity primary key,
  card_id     bigint not null references public.cards(id) on delete restrict,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending'
              check (status in ('pending','claimed','done','failed','refused')),
  executor    text,
  claimed_at  timestamptz,
  finished_at timestamptz,
  result_md   text,
  error       text,
  created_at  timestamptz not null default now()
);
create index actions_pending on public.actions (status, created_at);

-- ---------- sources and runs: what the warden watches ----------
create table public.sources (
  name              text primary key,
  expected_interval interval not null,
  runs_on           text not null default 'box' check (runs_on in ('box','hosted','mac')),
  enabled           boolean not null default true,
  last_ok_at        timestamptz
);

create table public.runs (
  id             bigint generated always as identity primary key,
  source         text not null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  cards_upserted int,
  error          text,
  host           text
);
create index runs_source on public.runs (source, started_at desc);

-- ---------- updated_at ----------
create function public.hq_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger cards_touch    before update on public.cards       for each row execute function public.hq_touch();
create trigger settings_touch before update on public.hq_settings for each row execute function public.hq_touch();

-- ---------- RLS: owner only; anon gets nothing ----------
alter table public.hq_settings enable row level security;
alter table public.cards       enable row level security;
alter table public.actions     enable row level security;
alter table public.sources     enable row level security;
alter table public.runs        enable row level security;

revoke all on public.hq_settings, public.cards, public.actions, public.sources, public.runs from anon;
revoke all on public.hq_settings, public.cards, public.actions, public.sources, public.runs from authenticated;

-- The owner reads everything, changes card state, and files actions. Nothing else from the browser.
grant select                 on public.cards       to authenticated;
grant update (status, snoozed_until, changed) on public.cards to authenticated;
grant select, insert         on public.actions     to authenticated;
grant select                 on public.sources, public.runs to authenticated;
grant select, update (value) on public.hq_settings to authenticated;

create policy cards_owner_select    on public.cards       for select to authenticated using (public.hq_is_owner());
create policy cards_owner_update    on public.cards       for update to authenticated using (public.hq_is_owner()) with check (public.hq_is_owner());
create policy actions_owner_select  on public.actions     for select to authenticated using (public.hq_is_owner());
create policy actions_owner_insert  on public.actions     for insert to authenticated with check (public.hq_is_owner() and status = 'pending');
create policy sources_owner_select  on public.sources     for select to authenticated using (public.hq_is_owner());
create policy runs_owner_select     on public.runs        for select to authenticated using (public.hq_is_owner());
create policy settings_owner_select on public.hq_settings for select to authenticated using (public.hq_is_owner());
create policy settings_owner_update on public.hq_settings for update to authenticated using (public.hq_is_owner()) with check (public.hq_is_owner() and key <> 'owner_email');

-- ---------- today_deck: stub, ordering filled in by the scoring issue ----------
create view public.today_deck with (security_invoker = true) as
  select * from public.cards
  where status = 'new'
     or (status = 'snoozed' and snoozed_until <= now())
  order by (kind in ('alert','plan')) desc, score desc, due_at nulls last;
revoke all on public.today_deck from anon;
grant select on public.today_deck to authenticated;
