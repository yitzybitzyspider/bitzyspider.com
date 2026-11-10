// HQ agents: who is supposed to be running, what each is doing right now, and what waits on Yitzy.
// Pure logic and the controller; no DOM here. Decision D-051. States come from the database view
// agent_status (supabase/migrations/0009_agents.sql), so the page and the warden agree.
(function (root) {
  "use strict";

  var KINDS = [
    { key: "collector", label: "Collectors", does: "Gather information" },
    { key: "worker",    label: "Workers",    does: "Draft the reply or do the work" },
    { key: "executor",  label: "Executors",  does: "Carry out what you approved" },
    { key: "auditor",   label: "Auditors",   does: "Check the others" }
  ];
  var STATE = { running: "Running", ok: "OK", late: "Late", failed: "Failed", hung: "Hung", off: "Off", never: "Never ran", planned: "Not built" };
  var BAD = { failed: 1, hung: 1, late: 1 };
  var ORDER = ["failed", "hung", "late", "running", "ok", "never", "off", "planned"];

  // Agents that are supposed to exist. One with no row in the database yet shows greyed with its issue.
  // An agent must register under the name given here, or it will show twice.
  var PLANNED = [
    { name: "beeper",            kind: "collector", title: "Beeper chat dump",         issue: 113 },
    { name: "haas",              kind: "collector", title: "Haas calendar and Canvas", issue: 80 },
    { name: "birthdays",         kind: "collector", title: "Birthdays",                issue: 81 },
    { name: "beeper-replies",    kind: "collector", title: "Chats needing a reply",    issue: 85 },
    { name: "cmg",               kind: "collector", title: "CMG Bears scout",          issue: 88 },
    { name: "email",             kind: "collector", title: "Email triage",             issue: 89 },
    { name: "jobs",              kind: "collector", title: "Job pipeline",             issue: 90 },
    { name: "facebook",          kind: "collector", title: "Facebook birthdays",       issue: 91 },
    { name: "reviser",           kind: "worker",    title: "Reviser",                  issue: 102 },
    { name: "plan",              kind: "worker",    title: "Morning plan",             issue: 82 },
    { name: "export",            kind: "worker",    title: "Nightly export to Obsidian", issue: 79 },
    { name: "executor-beeper",   kind: "executor",  title: "Send approved chat replies", issue: 86 },
    { name: "executor-contacts", kind: "executor",  title: "Google Contacts write-back", issue: 92 },
    { name: "warden",            kind: "auditor",   title: "Warden",                   issue: 74 },
    { name: "audit-daily",       kind: "auditor",   title: "Daily reasoning pass",     issue: 93 }
  ];
  var ISSUE_URL = "https://github.com/yitzybitzyspider/bitzyspider.com/issues/";

  function ms(iso) { var t = iso ? new Date(iso).getTime() : NaN; return isNaN(t) ? null : t; }
  function span(msec) {
    var s = Math.max(0, Math.round(msec / 1000));
    if (s < 60) return s + " sec";
    if (s < 3600) return Math.round(s / 60) + " min";
    if (s < 172800) return Math.round(s / 3600) + " h";
    return Math.round(s / 86400) + " d";
  }
  function ago(iso, now) { var t = ms(iso); return t === null ? "" : now - t < 45000 ? "just now" : span(now - t) + " ago"; }
  function until(iso, now) { var t = ms(iso); return t === null ? "" : t <= now ? "due now" : "in " + span(t - now); }
  function elapsed(iso, now) {
    var t = ms(iso); if (t === null) return "";
    var s = Math.max(0, Math.floor((now - t) / 1000));
    return s < 3600 ? Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2) : Math.floor(s / 3600) + " h " + Math.floor((s % 3600) / 60) + " min";
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  // One plain sentence per agent: what it last did and what happens next.
  function detail(a, nowDate) {
    var now = nowDate.getTime(), host = a.last_host || a.runs_on || "";
    switch (a.state) {
      case "planned": return "Not built yet";
      case "off": return "Switched off";
      case "never": return a.on_demand ? "Registered. Has not reported yet" : "Registered. No run yet";
      case "running": return "Running for " + elapsed(a.last_started_at, now) + (host ? " on " + host : "");
      case "hung": return "Started " + ago(a.last_started_at, now) + " and never finished";
      case "failed": return "Failed " + ago(a.last_finished_at || a.last_started_at, now) + (a.last_error ? ": " + String(a.last_error).slice(0, 140) : "");
      case "late": return "Last good run " + (ago(a.last_ok_at, now) || "unknown") + ". Was due " + (ago(a.next_due_at, now) || "earlier");
      default:
        var did = a.last_finished_at || a.last_ok_at;
        var s = did ? "Ran " + ago(did, now) : "No run on record";
        if (a.kind === "collector" && a.last_cards != null) s += ", " + plural(a.last_cards, "card", "cards");
        return s + (a.on_demand ? ". Runs on demand" : a.next_due_at ? ". Next " + until(a.next_due_at, now) : "");
    }
  }

  // Database rows plus the planned agents nobody has built, grouped by kind, worst first.
  function group(rows, planned) {
    rows = rows || []; planned = planned || PLANNED;
    var have = {}; rows.forEach(function (r) { have[r.name] = true; });
    var all = rows.map(function (r) { var p = planned.filter(function (x) { return x.name === r.name; })[0];
      return Object.assign({}, r, { title: r.title && r.title !== r.name ? r.title : (p && p.title) || r.name, issue: p ? p.issue : null }); })
      .concat(planned.filter(function (p) { return !have[p.name]; }).map(function (p) { return Object.assign({ state: "planned", enabled: false }, p); }));
    var known = KINDS.map(function (k) { return k.key; });
    return KINDS.map(function (k) {
      var mine = all.filter(function (a) { return a.kind === k.key || (k.key === "collector" && known.indexOf(a.kind) < 0); });
      mine.sort(function (a, b) { return ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || String(a.title).localeCompare(String(b.title)); });
      return { key: k.key, label: k.label, does: k.does, agents: mine };
    });
  }

  function summary(rows) {
    var s = { total: 0, running: 0, bad: 0, ok: 0, off: 0, level: "none" };
    (rows || []).forEach(function (r) {
      s.total++;
      if (r.state === "running") s.running++; else if (BAD[r.state]) s.bad++; else if (r.state === "ok") s.ok++; else s.off++;
    });
    s.level = s.bad ? "bad" : s.running ? "running" : s.total ? "ok" : "none";
    return s;
  }
  function headline(s, planned) {
    if (!s.total) return "No agent has reported yet";
    var parts = [];
    if (s.bad) parts.push(plural(s.bad, "needs", "need") + " a look");
    if (s.running) parts.push(s.running + " running now");
    parts.push(s.ok + " ok");
    return parts.join(", ") + (planned ? ". " + planned + " not built" : "");
  }

  // Everything that waits on Yitzy. Every deck card lands in exactly one of alerts, decide, todo, read,
  // so the four counts always add up to the deck. pending is approved work no executor has finished.
  function waiting(cards, actions, nowDate) {
    var w = { alerts: [], decide: [], todo: [], read: [], revised: 0, pending: [], oldestPending: null, deck: 0 };
    (cards || []).forEach(function (c) {
      w.deck++;
      var acts = c.proposed_action && typeof c.proposed_action === "object" && c.proposed_action.type;
      if (c.kind === "alert") w.alerts.push(c);
      else if (acts || c.kind === "approve" || c.kind === "batch" || c.kind === "plan") w.decide.push(c);
      else if (c.kind === "todo" || c.kind === "do") w.todo.push(c);
      else w.read.push(c);
      if (c.raw && c.raw.revision_count > 0) w.revised++;
    });
    (actions || []).forEach(function (a) { if (a.status === "pending" || a.status === "claimed") w.pending.push(a); });
    w.pending.sort(function (a, b) { return (ms(a.created_at) || 0) - (ms(b.created_at) || 0); });
    if (w.pending.length) w.oldestPending = ago(w.pending[0].created_at, nowDate.getTime());
    return w;
  }

  // The controller. api: { agents(), pendingActions(), deck() } each returning a promise.
  // A failed refresh keeps the last picture on screen and says so; it never blanks the view.
  function Board(api, onChange, clock) {
    this.api = api; this.onChange = onChange || function () {};
    this.now = clock || function () { return new Date(); };
    this.state = { loading: true, rows: [], actions: [], cards: [], error: null, at: null, live: false };
    this._seq = 0;
  }
  Board.prototype.emit = function () { this.onChange(this.state); };
  Board.prototype.load = async function () {
    var seq = ++this._seq, st = this.state;
    try {
      var r = await Promise.all([this.api.agents(), this.api.pendingActions(), this.api.deck()]);
      if (seq !== this._seq) return;                     // a newer refresh is on its way; drop this answer
      st.rows = r[0] || []; st.actions = r[1] || []; st.cards = r[2] || []; st.error = null; st.at = this.now();
    } catch (e) {
      if (seq !== this._seq) return;
      st.error = (e && e.message) || String(e);
    }
    st.loading = false; this.emit();
  };
  Board.prototype.setLive = function (on) { if (this.state.live !== !!on) { this.state.live = !!on; this.emit(); } };

  var api = { KINDS: KINDS, STATE: STATE, BAD: BAD, PLANNED: PLANNED, ISSUE_URL: ISSUE_URL, ago: ago, until: until, elapsed: elapsed,
              detail: detail, group: group, summary: summary, headline: headline, waiting: waiting, Board: Board };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HQAgents = api;
})(typeof window !== "undefined" ? window : globalThis);
