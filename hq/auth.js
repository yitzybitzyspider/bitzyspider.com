// HQ sign-in gate. Pure decisions live in route(); boot() is the thin glue around it.
// D-017: Google sign-in, one allowlisted owner. The allowlist is enforced by the
// database (hq_is_owner + RLS); this file only decides what to show.
(function (root) {
  "use strict";

  // view: "signin" | "checking" | "denied" | "deck" | "error"
  function route(state) {
    if (state.error) return "error";
    if (state.denied) return "denied";
    if (!state.session) return "signin";
    if (state.isOwner === null || state.isOwner === undefined) return "checking";
    return state.isOwner ? "deck" : "denied";
  }

  function redirectTarget(loc) {
    // Always come back to /hq/ on the same origin, never to a caller-supplied URL.
    return loc.origin + "/hq/";
  }

  async function boot(sb, ui, loc) {
    var state = { session: null, isOwner: null, error: null, denied: false };
    function render() { ui.show(route(state), state); }

    async function check(session) {
      state.session = session; state.isOwner = null; state.error = null; state.denied = false;
      render();
      if (!session) return;
      var res = await sb.rpc("hq_is_owner");
      if (res.error) { state.error = res.error.message || "Could not verify access."; render(); return; }
      state.isOwner = res.data === true;
      if (!state.isOwner) {
        // Not the owner: mark denied first, then drop the session so nothing lingers on this device.
        state.denied = true; state.session = null;
        await sb.auth.signOut();
      }
      render();
    }

    ui.onSignIn(async function () {
      var res = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTarget(loc) } });
      if (res.error) { state.error = res.error.message; render(); }
    });
    ui.onSignOut(async function () { await sb.auth.signOut(); await check(null); });

    var got = await sb.auth.getSession();
    if (got.error) { state.error = got.error.message; render(); return state; }
    await check(got.data.session);
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT" && state.session && !state.denied) check(null);
      if (event === "SIGNED_IN" && !state.session) check(session);
    });
    return state;
  }

  var api = { route: route, redirectTarget: redirectTarget, boot: boot };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HQAuth = api;
})(typeof window !== "undefined" ? window : globalThis);
