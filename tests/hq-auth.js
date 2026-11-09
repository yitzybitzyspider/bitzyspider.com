// HQ sign-in gate: node tests/hq-auth.js
// Drives hq/auth.js against a fake Supabase client. The database-side allowlist is
// proven separately by supabase/tests/rls_core.sql.
"use strict";
const path = require("path"), fs = require("fs");
const A = require(path.join(__dirname, "..", "hq", "auth.js"));
let failed = 0;
const ok = (name, cond) => { console.log((cond ? "pass " : "FAIL ") + name); if (!cond) failed++; };

function fakes(opts) {
  const calls = { signOut: 0, oauth: null, rpc: 0 };
  let session = opts.session || null, listener = null;
  const sb = {
    auth: {
      getSession: async () => opts.sessionError ? { error: { message: "boom" } } : { data: { session }, error: null },
      signOut: async () => { calls.signOut++; session = null; if (listener) listener("SIGNED_OUT", null); return {}; },
      signInWithOAuth: async (a) => { calls.oauth = a; return opts.oauthError ? { error: { message: "Unsupported provider" } } : {}; },
      onAuthStateChange: (fn) => { listener = fn; }
    },
    rpc: async (name) => { calls.rpc++; calls.rpcName = name; return opts.rpcError ? { error: { message: "rpc down" } } : { data: opts.isOwner, error: null }; }
  };
  const seen = []; const handlers = {};
  const ui = { show: (v, s) => seen.push(v), onSignIn: (fn) => handlers.in = fn, onSignOut: (fn) => handlers.out = fn };
  return { sb, ui, calls, seen, handlers, last: () => seen[seen.length - 1] };
}
const loc = { origin: "https://bitzyspider.com", href: "https://bitzyspider.com/hq/?next=https://evil.example" };

(async () => {
  ok("route: no session shows sign-in", A.route({ session: null }) === "signin");
  ok("route: session, unknown owner is checking", A.route({ session: {}, isOwner: null }) === "checking");
  ok("route: owner sees deck", A.route({ session: {}, isOwner: true }) === "deck");
  ok("route: stranger is denied", A.route({ session: null, denied: true }) === "denied");
  ok("route: error wins", A.route({ session: {}, isOwner: true, error: "x" }) === "error");
  ok("redirect ignores query and stays on /hq/", A.redirectTarget(loc) === "https://bitzyspider.com/hq/");

  let f = fakes({});
  await A.boot(f.sb, f.ui, loc);
  ok("signed out: shows sign-in and never asks the database", f.last() === "signin" && f.calls.rpc === 0);
  await f.handlers.in();
  ok("sign-in uses Google and the fixed redirect", f.calls.oauth.provider === "google" && f.calls.oauth.options.redirectTo === "https://bitzyspider.com/hq/");

  f = fakes({ session: { user: { email: "stranger@x" } }, isOwner: false });
  await A.boot(f.sb, f.ui, loc);
  ok("stranger: denied, signed out, deck never shown", f.last() === "denied" && f.calls.signOut === 1 && !f.seen.includes("deck"));
  ok("stranger: asked hq_is_owner", f.calls.rpcName === "hq_is_owner");

  let st = await (async () => { const g = fakes({ session: { user: {} }, isOwner: false }); const s = await A.boot(g.sb, g.ui, loc); g.sb.auth.signOut(); await 0; return { s, g }; })();
  ok("stranger: a late SIGNED_OUT event does not replace the denied view", st.g.last() === "denied" && st.s.session === null);

  f = fakes({ session: { user: { email: "owner@x" } }, isOwner: true });
  await A.boot(f.sb, f.ui, loc);
  ok("owner: deck shown, not signed out", f.last() === "deck" && f.calls.signOut === 0);
  await f.handlers.out();
  ok("owner signs out: back to sign-in", f.last() === "signin" && f.calls.signOut === 1);

  f = fakes({ session: { user: {} }, isOwner: "true" });
  await A.boot(f.sb, f.ui, loc);
  ok("truthy non-boolean owner answer is denied", f.last() === "denied");

  f = fakes({ session: { user: {} }, rpcError: true });
  await A.boot(f.sb, f.ui, loc);
  ok("owner check failing shows error, not deck", f.last() === "error" && !f.seen.includes("deck"));

  f = fakes({ sessionError: true });
  await A.boot(f.sb, f.ui, loc);
  ok("session lookup failing shows error", f.last() === "error");

  f = fakes({ oauthError: true });
  await A.boot(f.sb, f.ui, loc); await f.handlers.in();
  ok("provider not enabled surfaces an error", f.last() === "error");

  const html = fs.readFileSync(path.join(__dirname, "..", "hq", "index.html"), "utf8");
  ok("page is noindex", /name="robots" content="noindex/.test(html));
  ok("page loads no third-party script", !/<script[^>]+src="https?:/.test(html));
  ok("page has no Clarity tag", !/clarity/i.test(html));
  ok("no service key or JWT secret in hq/", !/service_role|sb_secret_/.test(html + fs.readFileSync(path.join(__dirname, "..", "hq", "config.js"), "utf8")));
  const robots = fs.readFileSync(path.join(__dirname, "..", "robots.txt"), "utf8");
  ok("robots.txt disallows /hq/", /Disallow: \/hq\//.test(robots));

  console.log(failed ? failed + " failed" : "all pass");
  process.exit(failed ? 1 : 0);
})();
