# Bug Hunt — Global Leaderboard Setup (Supabase)

The Bug Hunt game (`game.html`) has an **optional** shared, cross-device high-score
board. Out of the box it's **off** and every score is stored locally on the
player's device — the game works fully offline with zero setup.

Turning on the global board takes about 5 minutes and costs **$0** on Supabase's
free tier (no credit card required). Here's the whole process.

## Why Supabase?

A static site on GitHub Pages has no backend, so the leaderboard needs a hosted
database we can read/write straight from the browser. Supabase gives us a Postgres
database with an auto-generated REST API and a generous free tier (500 MB DB, plenty
of requests). We hit it with two plain `fetch` calls — no SDK, no build step — which
keeps the page dependency-free like the rest of the repo.

The browser uses the project's **anon (public) key**. That key is *designed* to be
embedded in client-side code; access is constrained by **Row-Level Security (RLS)**
policies on the table, not by keeping the key secret.

> **Honest caveat:** because the page talks to the database directly, a determined
> person can forge a score by replaying the network request. That's normal for a
> client-only arcade leaderboard and fine for a fun portfolio board. The SQL below
> adds sanity limits (score/name bounds) and you can delete junk rows from the
> Supabase dashboard at any time. True anti-cheat would require a server-side
> validation step, which is out of scope for "cheap and simple."

## 1. Create the project

1. Go to <https://supabase.com>, sign up (free), and create a new project.
2. Pick any name/region. Wait ~1 minute for it to provision.

## 2. Create the table + policies

Open **SQL Editor** in the Supabase dashboard, paste this, and click **Run**:

```sql
-- one row per finished run
create table public.scores (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 12),
  score       int  not null check (score >= 0 and score <= 100000000),
  level       int  not null check (level >= 1 and level <= 999),
  created_at  timestamptz not null default now()
);

-- fast "top scores" reads
create index scores_top on public.scores (score desc);

-- lock the table down, then allow exactly two anonymous actions:
alter table public.scores enable row level security;

-- anyone may READ the leaderboard
create policy "public read" on public.scores
  for select using (true);

-- anyone may INSERT a run, but only within sane bounds
create policy "public insert" on public.scores
  for insert with check (
    char_length(name) between 1 and 12
    and score >= 0 and score <= 100000000
    and level >= 1 and level <= 999
  );
```

There are **no** update or delete policies, so the public key can only read and
append — it can't edit or wipe other people's scores.

## 3. Grab your keys

In the dashboard: **Project Settings → API**. Copy:

- **Project URL** — e.g. `https://abcdefgh.supabase.co`
- **anon public** key — a long `eyJ...` string

## 4. Paste them into the game

Open `game.html`, find the `CLOUD` config block near the top of the `<script id="game-js">`
(search for `var CLOUD =`), and fill in the two strings:

```js
var CLOUD = {
  url: 'https://abcdefgh.supabase.co',  // your Project URL (no trailing slash)
  key: 'eyJhbGciOiJ...'                 // your anon public key
};
```

Commit and push. That's it.

## What turns on

- The **HIGH SCORES** overlay grows a **THIS DEVICE / GLOBAL** tab switch.
- On **game over** (with a score > 0), a name field + **SUBMIT TO GLOBAL** button
  appears. The player's name is remembered for next time.
- Leave the two strings blank again and everything reverts to local-only — no other
  code changes needed.

## Moderation

To remove an inappropriate name/score, open **Table Editor → scores** in the
dashboard and delete the row. (You're authenticated as the project owner there, so
the read-only public policies don't apply to you.)
