# Runbook: turn on Google sign-in for /hq

One time, about ten minutes, only Yitzy can do it (it needs his Google and Supabase logins). Until it is done the button on /hq returns "provider is not enabled".

## 1. Google Cloud: create the OAuth client

1. Open https://console.cloud.google.com/apis/credentials (any personal project, or create one named `bitzy-hq`).
2. If asked, configure the consent screen: External, app name `HQ`, your email as support and developer contact. Under Audience keep it in Testing and add yitzy305@gmail.com as the only test user. Testing mode means Google itself refuses every other account.
3. Create Credentials, OAuth client ID, type Web application, name `HQ`.
4. Authorized JavaScript origins: `https://bitzyspider.com`
5. Authorized redirect URIs: `https://rdtvwvylmkxpdbbnsmuu.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client secret. The secret goes only into Supabase in the next step, never into a repo or a chat.

## 2. Supabase: enable the provider

1. Open https://supabase.com/dashboard/project/rdtvwvylmkxpdbbnsmuu/auth/providers and expand Google.
2. Enable it, paste the Client ID and Client secret, save.

## 3. Supabase: allowed redirect URLs

1. Open https://supabase.com/dashboard/project/rdtvwvylmkxpdbbnsmuu/auth/url-configuration
2. Site URL: `https://bitzyspider.com/hq/`
3. Redirect URLs, add: `https://bitzyspider.com/hq/` and `http://localhost:4319/hq/` (local preview).

## 4. Supabase: keep the phone signed in

Auth, Sessions: leave time-box and inactivity timeout off (the default). Refresh tokens then keep the session alive until sign-out.

## 5. Check

1. Open https://bitzyspider.com/hq/ on the phone, tap the button, pick yitzy305@gmail.com. You should land on a number: the count of cards in today's deck (0 until collectors run).
2. Try another Google account from a private window. Google should refuse it (Testing mode). If the consent screen is ever published, the page itself signs strangers out and the database shows them nothing.

## Three layers, so one mistake is not a leak

| Layer | What stops a stranger |
|-------|-----------------------|
| Google consent screen in Testing | Only listed test users can complete sign-in |
| Page (`hq/auth.js`) | Asks `hq_is_owner`, signs out anyone else |
| Database (RLS) | Non-owner sessions read zero rows and write nothing; proven by `supabase/tests/rls_core.sql` |
