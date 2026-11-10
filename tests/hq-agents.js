// HQ agents view, no browser: node tests/hq-agents.js
// Logic from hq/agents.js, then the real hq/agents-ui.js on the real markup in a fake DOM.
"use strict";
const fs = require("fs"), path = require("path");
const F = require("./lib/fakedom.js");
const A = require("../hq/agents.js");
const root = path.join(__dirname, "..", "hq");
let failed = 0;
const ok = (name, cond, extra) => { console.log((cond ? "pass " : "FAIL ") + name + (cond || extra === undefined ? "" : "  -> " + JSON.stringify(extra))); if (!cond) failed++; };
const tick = () => new Promise(r => setImmediate(r));
const NOW = new Date("2026-11-10T20:00:00Z"), at = min => new Date(NOW.getTime() + min * 60e3).toISOString();

const ROWS = () => [
  { name: "beeper", title: "beeper", kind: "collector", runs_on: "mac", enabled: true, on_demand: false, state: "ok", last_ok_at: at(-12), next_due_at: at(18), last_finished_at: at(-12), last_cards: 3, last_host: "mac" },
  { name: "cmg", title: "CMG Bears scout", kind: "collector", enabled: true, on_demand: false, state: "late", last_ok_at: at(-420), next_due_at: at(-180) },
  { name: "email", title: "Email triage", kind: "collector", enabled: true, state: "failed", last_finished_at: at(-9), last_error: "<img src=x onerror=alert(1)> 401" },
  { name: "grok", title: "Grok research", kind: "worker", runs_on: "box", enabled: true, on_demand: true, state: "running", last_started_at: at(-1.1), last_host: "box" },
  { name: "muse", title: "Muse", kind: "worker", enabled: true, on_demand: true, state: "hung", last_started_at: at(-64) },
  { name: "reviser", title: "Reviser", kind: "worker", enabled: true, on_demand: true, state: "ok", last_ok_at: at(-95), last_finished_at: at(-95) },
  { name: "executor-beeper", title: "executor-beeper", kind: "executor", enabled: false, state: "off" },
  { name: "warden", title: "Warden", kind: "auditor", enabled: true, on_demand: false, state: "never" }
];
const CARDS = () => [
  { id: 1, kind: "alert", title: "cmg has not reported", source: "warden" },
  { id: 2, kind: "approve", title: "<b>Reply</b> to Dana", proposed_action: { type: "email_reply", draft: { text: "x" } }, raw: { revision_count: 2 } },
  { id: 3, kind: "birthday", title: "Noa birthday", proposed_action: { type: "reply", draft: { text: "hb" } } },
  { id: 4, kind: "plan", title: "Today plan" },
  { id: 5, kind: "batch", title: "Add contacts", proposed_action: { type: "contacts_update" } },
  { id: 6, kind: "todo", title: "Register", raw: { todo_reason: "login" } },
  { id: 7, kind: "do", title: "Homework" },
  { id: 8, kind: "fyi", title: "Newsletter" },
  { id: 9, kind: "birthday", title: "No draft birthday" }
];
const ACTIONS = () => [
  { id: 2, type: "reply", status: "claimed", created_at: at(-30) }, { id: 1, type: "email_reply", status: "pending", created_at: at(-190) },
  { id: 3, type: "reply", status: "done", created_at: at(-500) }, { id: 4, type: "reply", status: "failed", created_at: at(-600) }
];

(async function () {
  // ----- wording -----
  ok("ago: seconds, minutes, hours, days", A.ago(at(-0.2), +NOW) === "just now" && A.ago(at(-5), +NOW) === "5 min ago" && A.ago(at(-180), +NOW) === "3 h ago" && A.ago(at(-60 * 72), +NOW) === "3 d ago");
  ok("ago and until tolerate a missing or broken time", A.ago(null, +NOW) === "" && A.ago("nope", +NOW) === "" && A.until(undefined, +NOW) === "");
  ok("until: future and past", A.until(at(18), +NOW) === "in 18 min" && A.until(at(-3), +NOW) === "due now");
  ok("elapsed counts up as m:ss, then hours", A.elapsed(at(-1.1), +NOW) === "1:06" && A.elapsed(at(-125), +NOW) === "2 h 5 min");
  const D = r => A.detail(r, NOW), R = ROWS();
  ok("detail: ok collector says when, how many cards, and what is next", D(R[0]) === "Ran 12 min ago, 3 cards. Next in 18 min", D(R[0]));
  ok("detail: late says the last good run and how overdue", D(R[1]) === "Last good run 7 h ago. Was due 3 h ago", D(R[1]));
  ok("detail: failed carries the error", /^Failed 9 min ago: .*401$/.test(D(R[2])), D(R[2]));
  ok("detail: running shows how long and where", D(R[3]) === "Running for 1:06 on box", D(R[3]));
  ok("detail: hung, on demand, off, never, planned", D(R[4]) === "Started 1 h ago and never finished" && D(R[5]) === "Ran 2 h ago. Runs on demand" && D(R[6]) === "Switched off" && D(R[7]) === "Registered. No run yet" && D({ state: "planned" }) === "Not built yet", [D(R[4]), D(R[5]), D(R[7])]);
  ok("detail: a long error is cut, never the whole stack", D({ state: "failed", last_finished_at: at(-1), last_error: "x".repeat(900) }).length < 180);
  ok("detail: an unknown state does not throw", typeof D({ state: "weird" }) === "string");

  // ----- grouping -----
  const g = A.group(ROWS());
  ok("four groups in the fixed order", g.map(k => k.key).join() === "collector,worker,executor,auditor");
  ok("inside a group, trouble comes first", g[0].agents.slice(0, 3).map(a => a.state).join() === "failed,late,ok" && g[1].agents.slice(0, 3).map(a => a.state).join() === "hung,running,ok", g[1].agents.map(a => a.state));
  ok("a planned agent with no row is listed greyed with its issue", g[0].agents.some(a => a.name === "haas" && a.state === "planned" && a.issue === 80));
  ok("a planned agent that has a row is not listed twice, and keeps its issue", g[0].agents.filter(a => a.name === "beeper").length === 1 && g[0].agents.find(a => a.name === "beeper").issue === 113 && g[3].agents.filter(a => a.name === "warden").length === 1);
  ok("a row whose title is just its name borrows the planned title", g[0].agents.find(a => a.name === "beeper").title === "Beeper chat dump" && g[2].agents.find(a => a.name === "executor-beeper").title === "Send approved chat replies");
  ok("an agent nobody planned still shows", g[1].agents.some(a => a.name === "grok") && g[1].agents.some(a => a.name === "muse"));
  ok("an unknown kind is not dropped", A.group([{ name: "x", kind: "wizard", state: "ok" }], []).reduce((n, k) => n + k.agents.length, 0) === 1);
  ok("every row appears exactly once", g.reduce((n, k) => n + k.agents.filter(a => a.state !== "planned").length, 0) === ROWS().length);
  ok("no rows and no plan gives four empty groups", A.group([], []).every(k => k.agents.length === 0) && A.group(null).length === 4);

  // ----- summary -----
  const s = A.summary(ROWS());
  ok("summary counts running, trouble and ok", s.total === 8 && s.running === 1 && s.bad === 3 && s.ok === 2 && s.off === 2 && s.level === "bad", s);
  ok("level: running when nothing is wrong, ok when idle, none when empty", A.summary([{ state: "running" }, { state: "ok" }]).level === "running" && A.summary([{ state: "ok" }, { state: "off" }]).level === "ok" && A.summary([]).level === "none");
  ok("headline reads as a sentence", A.headline(s, 9) === "3 need a look, 1 running now, 2 ok. 9 not built" && A.headline(A.summary([{ state: "failed" }]), 0) === "1 needs a look, 0 ok" && A.headline(A.summary([]), 4) === "No agent has reported yet", A.headline(s, 9));

  // ----- waiting on you -----
  const w = A.waiting(CARDS(), ACTIONS(), NOW);
  ok("every deck card lands in exactly one pile", w.alerts.length + w.decide.length + w.todo.length + w.read.length === CARDS().length && w.deck === CARDS().length, [w.alerts.length, w.decide.length, w.todo.length, w.read.length]);
  ok("piles: alerts, decisions, to-dos, reading", w.alerts.map(c => c.id).join() === "1" && w.decide.map(c => c.id).join() === "2,3,4,5" && w.todo.map(c => c.id).join() === "6,7" && w.read.map(c => c.id).join() === "8,9");
  ok("revised cards are counted", w.revised === 1);
  ok("pending counts match the actions table: pending and claimed only, oldest first", w.pending.map(a => a.id).join() === "1,2" && w.oldestPending === "3 h ago", w.pending);
  ok("nothing waiting is all zeros", (x => x.deck === 0 && x.pending.length === 0 && x.oldestPending === null)(A.waiting([], [], NOW)) && A.waiting(null, null, NOW).deck === 0);

  // ----- controller -----
  let calls = 0, fail = false, gate = null;
  const api = { agents: async () => { calls++; if (gate) await gate; if (fail) throw new Error("Failed to fetch"); return ROWS(); }, pendingActions: async () => ACTIONS(), deck: async () => CARDS() };
  let seen = 0; const b = new A.Board(api, () => { seen++; }, () => NOW);
  ok("starts loading and empty", b.state.loading && b.state.rows.length === 0 && b.state.at === null);
  await b.load();
  ok("load fills rows, actions and cards and stamps the time", !b.state.loading && b.state.rows.length === 8 && b.state.actions.length === 4 && b.state.cards.length === 9 && b.state.at === NOW && b.state.error === null && seen === 1);
  fail = true; await b.load();
  ok("a failed refresh keeps the last picture and says so", b.state.rows.length === 8 && b.state.error === "Failed to fetch" && b.state.at === NOW);
  fail = false; await b.load();
  ok("the next good refresh clears the error", b.state.error === null);
  let open; gate = new Promise(r => { open = r; }); const slow = b.load(); gate = null; const before = seen; await b.load(); open(); await slow;
  ok("a slow answer that arrives after a newer one is dropped", seen === before + 1);
  b.setLive(true); b.setLive(true);
  ok("setLive notifies once per change", b.state.live === true && seen === before + 2);

  // ----- the real UI on the real markup -----
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const section = html.slice(html.indexOf('<section id="v-agents"'), html.indexOf("<noscript>"));
  const uiSrc = fs.readFileSync(path.join(root, "agents-ui.js"), "utf8");
  function boot(opts) {
    opts = opts || {};
    const doc = F.makeDocument(), timers = F.makeTimers(), u = { rows: opts.rows || ROWS(), cards: opts.cards || CARDS(), actions: opts.actions || ACTIONS(), fail: false, loads: 0, opened: 0, now: NOW };
    const host = F.parse(section, doc).children[0]; doc.body.appendChild(host); host.hidden = false;
    const badge = doc.createElement("button");
    const api = { agents: async () => { u.loads++; if (u.fail) throw new Error("Failed to fetch"); return u.rows; }, pendingActions: async () => u.actions, deck: async () => u.cards };
    const win = { HQAgents: A };
    new Function("window", "document", "setTimeout", "clearTimeout", "setInterval", uiSrc)(win, doc, timers.setTimeout, timers.clearTimeout, timers.setInterval);
    u.board = new A.Board(api, null, () => u.now);
    u.ui = win.HQAgentsUI.mount(host, u.board, { openDeck: () => { u.opened++; }, badge, version: "9.9.9" });
    return Object.assign(u, { doc, host, badge, timers, $: s => host.querySelector(s), $$: s => host.querySelectorAll(s) });
  }
  const agentRow = (u, name) => u.$$(".agent").find(e => e.dataset.name === name);

  let u = boot(); await u.board.load();
  ok("ui: four kind sections with their labels", u.$$(".kind").map(e => e.dataset.kind).join() === "collector,worker,executor,auditor" && /Collectors/.test(u.$$(".kind")[0].textContent) && /Gather information/.test(u.$$(".kind")[0].textContent));
  ok("ui: one row per agent plus the planned ones", u.$$(".agent").length === ROWS().length + A.PLANNED.filter(p => !ROWS().some(r => r.name === p.name)).length);
  ok("ui: a row carries its state for styling and a readable chip", agentRow(u, "grok").dataset.state === "running" && agentRow(u, "grok").querySelector(".st").textContent === "Running" && agentRow(u, "email").querySelector(".st").textContent === "Failed");
  ok("ui: running row says how long", /Running for 1:06 on box/.test(agentRow(u, "grok").textContent));
  ok("ui: planned row links to its issue and nothing else does", agentRow(u, "haas").querySelector("a").href === A.ISSUE_URL + "80" && agentRow(u, "haas").querySelector("a").rel === "noopener noreferrer" && !agentRow(u, "beeper").querySelector("a"));
  ok("ui: hostile text is never written as HTML", u.doc.htmlWrites.length === 0 && /<img src=x/.test(agentRow(u, "email").textContent) && /<b>Reply<\/b>/.test(u.$("[data-waiting-list]").textContent));
  const tiles = u.$$(".tile");
  ok("ui: the four tiles show the waiting counts", tiles.map(t => t.querySelector("strong").textContent).join() === "4,2,2,2", tiles.map(t => t.textContent));
  ok("ui: tiles note revised cards and the oldest pending action", /1 came back revised/.test(tiles[0].textContent) && /oldest 3 h ago/.test(tiles[3].textContent));
  ok("ui: the pending tile is not a button, the deck tiles are", tiles[3].tagName === "DIV" && tiles.slice(0, 3).every(t => t.tagName === "BUTTON"));
  ok("ui: warden reds are shown on top", !u.$("[data-reds]").hidden && u.$$(".red").length === 1 && u.$(".red").textContent === "cmg has not reported");
  ok("ui: the list shows five items and counts the rest", u.$$(".wrow").length === 5 && /and 1 more in the deck/.test(u.$("[data-waiting-list]").textContent));
  ok("ui: headline and badge reflect trouble", /3 need a look, 1 running now/.test(u.$("[data-agents-headline]").textContent) && u.badge.dataset.level === "bad" && /3 need a look/.test(u.badge.getAttribute("aria-label")));
  ok("ui: version label", u.$("[data-version]").textContent === "HQ 9.9.9");
  ok("ui: says it is polling until live updates connect", /Checking every 30 sec/.test(u.$("[data-agents-meta]").textContent));
  u.board.setLive(true);
  ok("ui: says Live once connected", /^Live/.test(u.$("[data-agents-meta]").textContent));

  u.$(".red").fire("click"); tiles[0].fire("click"); u.$(".wrow").fire("click"); u.$("[data-open-deck]").fire("click"); u.$$(".tile")[3].fire("click");
  ok("ui: reds, tiles, rows and the Deck button open the deck; the pending tile does not", u.opened === 4, u.opened);

  // A run finishes somewhere else: the row changes with no reload of the page.
  u.rows = ROWS(); u.rows[3] = Object.assign({}, u.rows[3], { state: "ok", last_finished_at: at(0), last_ok_at: at(0) });
  const loadsBefore = u.loads; u.ui.changed(); u.ui.changed(); u.ui.changed();
  ok("ui: a burst of live events waits, then refreshes once", u.loads === loadsBefore && u.timers.pending() === 1);
  u.timers.run(400); await tick(); await tick();
  ok("ui: after the live event the row shows the new state", u.loads === loadsBefore + 1 && agentRow(u, "grok").dataset.state === "ok" && /Ran just now/.test(agentRow(u, "grok").textContent), agentRow(u, "grok").textContent);

  // Polling fallback.
  u = boot(); await u.board.load(); let n = u.loads;
  ok("ui: without live updates the open view checks every 30 seconds", u.ui.poll() === true && u.ui.poll() === true && u.loads === n + 2);
  u.board.setLive(true); n = u.loads; const polled = [1, 2, 3, 4, 5, 6, 7, 8].map(() => u.ui.poll()).filter(Boolean).length;
  ok("ui: with live updates it only checks every two minutes", polled === 2 && u.loads === n + 2, polled);
  u.board.setLive(false); u.host.hidden = true; n = u.loads; const hiddenPolls = [1, 2, 3, 4, 5, 6, 7, 8].map(() => u.ui.poll()).filter(Boolean).length;
  ok("ui: with the view closed it keeps the badge fresh at the slow pace", hiddenPolls === 2 && u.loads === n + 2, hiddenPolls);
  u.host.hidden = false; u.doc.hidden = true; n = u.loads;
  ok("ui: a backgrounded tab does not poll", u.ui.poll() === false && u.loads === n);
  u.doc.hidden = false; (u.doc.listeners.visibilitychange || []).forEach(fn => fn()); await tick();
  ok("ui: coming back to the tab refreshes at once", u.loads === n + 1);

  // The clock moves without a refresh.
  u = boot({ rows: [ROWS()[3]] }); await u.board.load(); n = u.loads;
  u.now = new Date(NOW.getTime() + 30e3); u.ui.tick();
  ok("ui: a running agent's timer advances without asking the database", /Running for 1:36/.test(agentRow(u, "grok").textContent) && u.loads === n, agentRow(u, "grok").textContent);

  // Failure and empty states.
  u = boot(); await u.board.load(); u.fail = true; await u.board.load();
  ok("ui: a failed refresh keeps the rows and shows a notice", !u.$("[data-agents-error]").hidden && /Could not refresh \(Failed to fetch\)/.test(u.$("[data-agents-error]").textContent) && u.$$(".agent").length > 8);
  u.fail = false; await u.board.load();
  ok("ui: the notice goes away when it works again", u.$("[data-agents-error]").hidden);
  u = boot(); u.fail = true; await u.board.load();
  ok("ui: first load failing still shows the planned agents, not a blank screen", u.$$(".agent").length === A.PLANNED.length && !u.$("[data-agents-error]").hidden && u.badge.dataset.level === "none");
  u = boot({ rows: [], cards: [], actions: [] }); await u.board.load();
  ok("ui: zero live agents and an empty deck read cleanly", /No agent has reported yet/.test(u.$("[data-agents-headline]").textContent) && /Nothing is waiting on you/.test(u.$("[data-waiting-list]").textContent) && u.$("[data-reds]").hidden && u.$$(".tile").every(t => t.querySelector("strong").textContent === "0"));
  u = boot({ rows: [{ name: "a", kind: "collector", state: "running", last_started_at: at(-1) }, { name: "b", kind: "worker", state: "ok" }] }); await u.board.load();
  ok("ui: badge pulses when something runs and nothing is wrong", u.badge.dataset.level === "running");

  // ----- demo mode has sample agents of every kind -----
  const w2 = { HQOffline: require("../hq/offline.js"), dispatchEvent() {} };
  new Function("window", "location", "setInterval", "clearInterval", fs.readFileSync(path.join(root, "demo.js"), "utf8"))(w2, { hostname: "localhost", search: "?demo=1" }, () => 1, () => {});
  const demoRows = await w2.HQ_DEMO.api.agents();
  ok("demo: sample agents cover all four kinds and the main states", A.KINDS.every(k => demoRows.some(r => r.kind === k.key)) && ["ok", "late", "failed", "hung", "off"].every(st => demoRows.some(r => r.state === st)), demoRows.map(r => r.kind + ":" + r.state));
  let events = 0, liveOn = null; const stop = w2.HQ_DEMO.api.live(() => { events++; }, on => { liveOn = on; });
  ok("demo: live connects and can be stopped", liveOn === true && typeof stop === "function");
  await w2.HQ_DEMO.api.swipe(3, "right", null, [], null);
  const pend = await w2.HQ_DEMO.api.pendingActions();
  ok("demo: approving a card with an action leaves it pending", pend.length === 1 && pend[0].type === "email_reply" && pend[0].status === "pending");
  const w3 = { HQOffline: require("../hq/offline.js") };
  new Function("window", "location", "setInterval", "clearInterval", fs.readFileSync(path.join(root, "demo.js"), "utf8"))(w3, { hostname: "localhost", search: "?demo=1&nolive=1" }, () => 1, () => {});
  let off = null; w3.HQ_DEMO.api.live(() => {}, on => { off = on; });
  ok("demo: nolive=1 reports no live connection", off === false);

  console.log(failed ? failed + " failed" : "all pass");
  process.exit(failed ? 1 : 0);
})();
