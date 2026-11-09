-- Scoring, cap, and upsert behaviour. Run as a privileged role; rolls back. Returns 'scoring ok'.
begin;
delete from public.actions; delete from public.cards;
update public.hq_settings set value = '{"startup":5,"hackathon":4,"community":3,"inputs":2,"other":1}' where key = 'bucket_weights';
update public.hq_settings set value = '5' where key = 'inputs_cap';
do $$ declare n int; k text; ks text[]; cid bigint; s text; ch boolean; begin
  -- 8 inputs: one overdue, one due tomorrow, six undated
  perform public.hq_upsert_card(jsonb_build_object('key','in:'||g,'source','t','bucket','inputs','title','input '||g,'fingerprint','a')) from generate_series(1,6) g;
  perform public.hq_upsert_card(jsonb_build_object('key','in:overdue','source','t','bucket','inputs','title','overdue','due_at', now() - interval '1 day','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','in:soon','source','t','bucket','inputs','title','soon','due_at', now() + interval '6 hours','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','st:1','source','t','bucket','startup','title','startup undated','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','st:2','source','t','bucket','startup','title','startup due soon','due_at', now() + interval '6 hours','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','ot:1','source','t','bucket','other','title','other','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','al:1','source','warden','bucket','inputs','kind','alert','title','alert','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','pl:1','source','plan','bucket','other','kind','plan','title','plan','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','sn:past','source','t','bucket','community','title','snooze over','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','sn:future','source','t','bucket','community','title','still snoozed','fingerprint','a'));
  perform public.hq_upsert_card(jsonb_build_object('key','dis:1','source','t','bucket','startup','title','dismissed','fingerprint','a'));
  update public.cards set status='snoozed', snoozed_until = now() - interval '1 hour' where key='sn:past';
  update public.cards set status='snoozed', snoozed_until = now() + interval '1 day'  where key='sn:future';
  update public.cards set status='dismissed' where key='dis:1';

  select array_agg(key) into ks from public.today_deck;   -- view order
  if not (ks[1:2] @> array['al:1','pl:1']) then raise exception 'alert and plan not pinned on top: %', ks; end if;
  if ks[3] <> 'st:2' then raise exception 'startup due soon (12.5) should lead, got %', ks[3]; end if;
  if array_position(ks,'in:overdue') > array_position(ks,'st:1') then raise exception 'overdue input (6) should beat undated startup (5)'; end if;
  if array_position(ks,'st:1') > array_position(ks,'in:1') then raise exception 'undated startup (5) should beat undated input (2)'; end if;
  select count(*) into n from public.today_deck where bucket='inputs' and not pinned;
  if n <> 5 then raise exception 'inputs cap: wanted 5 visible, got %', n; end if;
  if not ks @> array['in:overdue','in:soon'] then raise exception 'cap dropped the urgent inputs'; end if;
  if ks @> array['dis:1'] or ks @> array['sn:future'] then raise exception 'dismissed or still-snoozed card in deck'; end if;
  if not ks @> array['sn:past','al:1'] then raise exception 'expired snooze or alert missing'; end if;

  update public.hq_settings set value = '2' where key = 'inputs_cap';
  select count(*) into n from public.today_deck where bucket='inputs' and not pinned;
  if n <> 2 then raise exception 'cap is not read from settings: %', n; end if;
  update public.hq_settings set value = '{"startup":1,"inputs":9}' where key = 'bucket_weights';
  select key into k from public.today_deck where not pinned limit 1;
  if k not like 'in:%' then raise exception 'weights are not read from settings: %', k; end if;

  -- resurfacing: same fingerprint stays dismissed, new fingerprint returns once with changed = true
  cid := public.hq_upsert_card(jsonb_build_object('key','dis:1','source','t','title','dismissed','fingerprint','a'));
  select status, changed into s, ch from public.cards where id = cid;
  if s <> 'dismissed' or ch then raise exception 'quiet refresh resurfaced a dismissed card'; end if;
  perform public.hq_upsert_card(jsonb_build_object('key','dis:1','source','t','title','dismissed v2','fingerprint','b'));
  select status, changed into s, ch from public.cards where id = cid;
  if s <> 'new' or not ch then raise exception 'material change did not resurface: % %', s, ch; end if;
  perform public.hq_upsert_card(jsonb_build_object('key','sn:future','source','t','title','x','fingerprint','b'));
  select status into s from public.cards where key = 'sn:future';
  if s <> 'snoozed' then raise exception 'a snoozed card was woken by a change'; end if;
  select count(*) into n from public.cards where key = 'dis:1';
  if n <> 1 then raise exception 'upsert duplicated a card'; end if;
  begin perform public.hq_upsert_card('{"key":"x"}'); raise exception 'upsert accepted a card with no title';
  exception when raise_exception then if sqlerrm like 'upsert accepted%' then raise; end if; end;
end $$;
-- the browser must not be able to call the collector upsert
set local role authenticated;
do $$ begin
  begin perform public.hq_upsert_card('{"key":"a","source":"b","title":"c"}'); raise exception 'browser could call hq_upsert_card';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'scoring ok' as result;
rollback;
