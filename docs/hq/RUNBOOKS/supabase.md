# Runbook: the bitzy-hq Supabase project

| | |
|---|---|
| Project | `bitzy-hq`, personal org, free tier, region us-west-1 |
| Ref | `rdtvwvylmkxpdbbnsmuu` |
| API URL | `https://rdtvwvylmkxpdbbnsmuu.supabase.co` |
| Publishable key | `sb_publishable_nGYMYwYdvDnSqsn7rO2nzw_r9ZH8vPY` |
| Dashboard | https://supabase.com/dashboard/project/rdtvwvylmkxpdbbnsmuu |

The publishable key is meant to be public: with it alone every table returns 401. Access comes from the owner's signed-in session plus RLS.

**Never in this repo:** the service role key, the database password, any access token. The service key lives only as the GitHub secret `SUPABASE_SERVICE_KEY` in the private `bitzy-hq-agents` repo and in the box's environment.

## Who can do what

| Caller | Can |
|--------|-----|
| Anonymous (publishable key only) | Nothing. Every table and view returns 401. |
| Signed in, not the owner | Sees zero rows everywhere, writes nothing. |
| Owner (email matches `hq_settings.owner_email`) | Read all tables. Update a card's `status`, `snoozed_until`, `changed`. Insert `actions` with status `pending`. Update settings values except `owner_email`. |
| Service role (collectors, executors, warden) | Everything. Bypasses RLS. |

The owner email is a row in `hq_settings`, set by hand with the service role, never from the browser and never in a migration.

## Apply a migration

Migrations live in `supabase/migrations/`. Apply with the Supabase MCP `apply_migration` tool or `supabase db push` after `supabase link --project-ref rdtvwvylmkxpdbbnsmuu`. Writing a migration file is not applying it: confirm with `list_migrations`.

## Test RLS

Run `supabase/tests/rls_core.sql` as a privileged role (MCP `execute_sql` or psql). It seeds inside a transaction, impersonates anon, a stranger and the owner, raises on any hole, returns `rls_core ok`, and rolls back.

Outside-in check with only the publishable key (expect six 401s):

```bash
for t in cards today_deck actions hq_settings runs sources; do curl -s -o /dev/null -w "$t %{http_code}\n" "https://rdtvwvylmkxpdbbnsmuu.supabase.co/rest/v1/$t?select=*&limit=1" -H "apikey: sb_publishable_nGYMYwYdvDnSqsn7rO2nzw_r9ZH8vPY"; done
```

## Known advisor notice

`hq_is_owner()` is SECURITY DEFINER and executable by `authenticated`. Intentional: policies call it, and it returns only whether the caller is the owner. It is not executable by anon.
