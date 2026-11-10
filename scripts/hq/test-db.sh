#!/usr/bin/env bash
# Builds the HQ database from nothing and runs every SQL suite against it.
# Proves the migration files alone produce a working, locked-down schema (not just the live project).
# Needs psql and a throwaway Postgres: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (CI provides one).
set -euo pipefail
cd "$(dirname "$0")/../.."
q() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

q -f supabase/tests/bootstrap.sql
for m in supabase/migrations/*.sql; do echo "apply $m"; q -f "$m"; done
# The owner row is set by hand in production (never in a migration); the suites swap in a test owner.
q -c "insert into public.hq_settings(key, value) values ('owner_email', '\"seed@test.invalid\"') on conflict (key) do nothing"

fail=0
for t in rls_core scoring swipe revise wake warden agents; do
  out="$(psql -X -q -At -v ON_ERROR_STOP=1 -f "supabase/tests/$t.sql" 2>&1)" || { echo "FAIL $t"; echo "$out" | tail -n 5; fail=1; continue; }
  if echo "$out" | grep -qx "$t ok"; then echo "pass $t"; else echo "FAIL $t: no '$t ok' line"; echo "$out" | tail -n 5; fail=1; fi
done

# Every suite rolls back: the database must be exactly as the migrations left it.
left="$(psql -X -q -At -c "select (select count(*) from public.cards) + (select count(*) from public.actions) + (select count(*) from public.revisions) + (select count(*) from public.wakes) + (select count(*) from public.runs) + (select count(*) from public.sources) + (select count(*) from pg_namespace where nspname in ('net','vault','cron'))")"
if [ "$left" = "0" ]; then echo "pass suites leave no rows behind"; else echo "FAIL suites left $left rows"; fail=1; fi

# Anything in public without row security is a hole.
open="$(psql -X -q -At -c "select string_agg(relname, ', ') from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity")"
if [ -z "$open" ]; then echo "pass every table has row security on"; else echo "FAIL tables without row security: $open"; fail=1; fi

# anon must hold no privilege on any table, view or function we created.
anon_t="$(psql -X -q -At -c "select string_agg(distinct table_name, ', ') from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'")"
anon_f="$(psql -X -q -At -c "select string_agg(p.proname, ', ') from pg_proc p where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') and p.proname not in ('hq_touch', 'hq_urgency', 'hq_score')")"
if [ -z "$anon_t" ] && [ -z "$anon_f" ]; then echo "pass anon holds nothing"; else echo "FAIL anon can reach: tables [$anon_t] functions [$anon_f]"; fail=1; fi

# The browser role must not be able to run agent-only functions.
agent_only="$(psql -X -q -At -c "select string_agg(p.proname, ', ') from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('hq_upsert_card','hq_return_revised','hq_to_todo','hq_wake','hq_wake_on_revision','hq_wake_on_action','hq_warden','hq_schedule_warden','hq_has_function','hq_source_defaults') and has_function_privilege('authenticated', p.oid, 'execute')")"
if [ -z "$agent_only" ]; then echo "pass agent-only functions are closed to the browser"; else echo "FAIL browser can run: $agent_only"; fail=1; fi

# Fingerprint of every function body, for comparing a clean build with the live project by hand.
echo "--- function fingerprints (name md5)"
psql -X -q -At -F ' ' -c "select proname, md5(prosrc) from pg_proc where pronamespace = 'public'::regnamespace order by 1"

[ "$fail" -eq 0 ] && echo "db all pass"
exit "$fail"
