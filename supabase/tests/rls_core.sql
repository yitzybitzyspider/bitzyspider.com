-- RLS fault injection for 0001_core. Run as a privileged role; everything rolls back.
-- Each check raises on failure; the final select returns 'rls_core ok'.
begin;
insert into public.hq_settings(key, value) values ('owner_email', '"owner@test.invalid"')
  on conflict (key) do update set value = excluded.value;
insert into public.cards(key, source, title) values ('test:1', 'test', 'seed card');

-- anon: no privilege at all
set local role anon;
do $$ begin
  begin perform count(*) from public.cards; raise exception 'anon could read cards';
  exception when insufficient_privilege then null; end;
  begin perform count(*) from public.today_deck; raise exception 'anon could read today_deck';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- signed-in stranger: zero rows, cannot write
set local role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@test.invalid","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.cards;      if n <> 0 then raise exception 'stranger saw % cards', n; end if;
  select count(*) into n from public.today_deck; if n <> 0 then raise exception 'stranger saw deck'; end if;
  select count(*) into n from public.hq_settings; if n <> 0 then raise exception 'stranger saw settings'; end if;
  update public.cards set status = 'dismissed'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'stranger updated cards'; end if;
  begin insert into public.actions(card_id, type) values (1, 'reply'); raise exception 'stranger inserted an action';
  exception when insufficient_privilege then null; end;
end $$;

-- owner: sees the card, can swipe, can file an action, cannot retitle or insert cards or move ownership
select set_config('request.jwt.claims', '{"email":"Owner@Test.invalid","role":"authenticated"}', true);
do $$ declare n int; cid bigint; begin
  select count(*) into n from public.today_deck where key = 'test:1';
  if n <> 1 then raise exception 'owner did not see the seed card'; end if;
  select id into cid from public.cards where key = 'test:1';
  update public.cards set status = 'approved' where id = cid;
  insert into public.actions(card_id, type) values (cid, 'reply');
  begin update public.cards set title = 'hacked' where id = cid; raise exception 'owner could retitle from the browser';
  exception when insufficient_privilege then null; end;
  begin insert into public.cards(key, source, title) values ('test:2','test','x'); raise exception 'browser could insert cards';
  exception when insufficient_privilege then null; end;
  begin insert into public.actions(card_id, type, status) values (cid, 'reply', 'done'); raise exception 'owner could forge a finished action';
  exception when insufficient_privilege then null; end;
  begin update public.hq_settings set value = '"evil@test.invalid"' where key = 'owner_email';
        raise exception 'owner_email was changed from the browser';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'rls_core ok' as result;
rollback;
