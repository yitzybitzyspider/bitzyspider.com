# Runbook: the wake trigger

When Yitzy sends a card back or approves an action, the database pings GitHub and the right agent workflow starts. Decision D-045.

## How it works

1. A trigger on `revisions` (owner notes) or `actions` (pending) calls `hq_wake('hq-revise')` or `hq_wake('hq-action')`.
2. `hq_wake` reads the GitHub token from Supabase Vault (`hq_github_dispatch_token`) and queues a `repository_dispatch` to `yitzybitzyspider/bitzy-hq-agents` through pg_net. pg_net sends it after the transaction commits.
3. The `reviser` workflow listens for `hq-revise`. Nothing listens for `hq-action` yet (the executor workflow arrives with the box, #76).
4. Every attempt writes a row to `wakes`.

## Reading the wakes log

```sql
select created_at, event, status, detail from public.wakes order by id desc limit 20;
```

| status | Meaning | Fix |
|--------|---------|-----|
| `sent` | Queued to GitHub | None. If no run appeared, check pg_net's response: `select status_code, content from net._http_response order by id desc limit 5;` 204 is success, 401 or 403 means the token expired or lost access, 404 means wrong repo access. |
| `debounced` | Another wake for the same event went out in the last 20 seconds | None. One run drains everything waiting. |
| `no_token` | Vault has no `hq_github_dispatch_token` | Run the setup wizard's wake stage. |
| `no_pg_net` | The pg_net extension is missing | `create extension pg_net;` |
| `error` | Anything else; `detail` has the database error | Read `detail`. The swipe itself still succeeded. |

A wake can never block or fail a swipe. If wakes stop, cards sent back still get picked up by the reviser's six-hour backstop, or run it by hand: `gh workflow run reviser.yml --repo yitzybitzyspider/bitzy-hq-agents`.

## Rotating the token

Create a new fine-grained token (only `bitzy-hq-agents`, Contents read and write), then in the SQL editor:

```sql
select vault.update_secret((select id from vault.secrets where name = 'hq_github_dispatch_token'), 'NEW_TOKEN');
```

Revoke the old token on GitHub.
