// HQ wiring: do the page, the database and the agents agree with each other? node tests/hq-wiring.js
// Everything here is read from the real source files, so a rename on one side fails the build.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const repo = path.join(__dirname, ".."), hq = path.join(repo, "hq");
const read = p => fs.readFileSync(path.join(repo, p), "utf8");
const S = require("./lib/schema.js").load(path.join(repo, "supabase", "migrations"));
const D = require("../hq/deck.js");
let failed = 0, skipped = 0;
const ok = (name, cond, extra) => { console.log((cond ? "pass " : "FAIL ") + name + (cond || extra === undefined ? "" : "  -> " + JSON.stringify(extra))); if (!cond) failed++; };
const skip = (name, why) => { console.log("skip " + name + " (" + why + ")"); skipped++; };

const html = read("hq/index.html"), ui = read("hq/deck-ui.js"), deckJs = read("hq/deck.js"), authJs = read("hq/auth.js");
const tracked = cp.execSync("git ls-files", { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean);

// ----- 1. every hook the scripts look for exists in the page -----
const hooks = [...new Set([...ui.matchAll(/q\("(\[data-[\w-]+(?:="[^"]*")?\])"\)/g)].map(m => m[1]))];
const missingHooks = hooks.filter(h => { const m = /\[(data-[\w-]+)(?:="([^"]*)")?\]/.exec(h); return !new RegExp(m[1] + (m[2] !== undefined ? '="' + m[2] + '"' : '(?=[\\s>=])')).test(html); });
ok("every data hook deck-ui queries exists in index.html (" + hooks.length + ")", hooks.length >= 10 && missingHooks.length === 0, missingHooks);
const inline = html.slice(html.lastIndexOf("<script>"));
const ids = [...new Set([...inline.matchAll(/\$\("([\w-]+)"\)/g)].map(m => m[1]))].concat(["v-signin", "v-checking", "v-denied", "v-error", "v-deck"]);
ok("every element id the page script uses exists (" + ids.length + ")", ids.every(id => html.includes('id="' + id + '"')), ids.filter(id => !html.includes('id="' + id + '"')));
const dirs = [...html.matchAll(/<button[^>]*data-dir="(\w+)"/g)].map(m => m[1]).sort();
ok("the four action buttons are the four gestures", dirs.join() === "down,left,right,up", dirs);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
ok("every script the page loads exists, and logic loads before the UI", scripts.every(f => fs.existsSync(path.join(hq, f))) && scripts.indexOf("deck.js") < scripts.indexOf("deck-ui.js") && scripts.indexOf("md.js") < scripts.indexOf("deck-ui.js") && scripts.indexOf("offline.js") < scripts.indexOf("demo.js"), scripts);

// ----- 2. every database call the page makes matches the migrations -----
const rpcs = [...inline.matchAll(/sb\.rpc\("(\w+)"(?:,\s*\{([^}]*)\})?\)/g)].map(m => ({ name: m[1], keys: (m[2] || "").split(",").map(x => x.split(":")[0].trim()).filter(Boolean) }));
const authRpcs = [...authJs.matchAll(/sb\.rpc\("(\w+)"\)/g)].map(m => ({ name: m[1], keys: [] }));
const allRpcs = rpcs.concat(authRpcs);
ok("the page calls the functions we expect", allRpcs.map(r => r.name).sort().join() === "hq_is_owner,hq_revise,hq_swipe,hq_unswipe", allRpcs.map(r => r.name));
allRpcs.forEach(r => {
  const sig = S.functions[r.name];
  if (!sig) return ok("function " + r.name + " exists in the migrations", false);
  const names = sig.map(p => p.name), unknown = r.keys.filter(k => !names.includes(k)), missing = sig.filter(p => !p.optional && !r.keys.includes(p.name)).map(p => p.name);
  ok(r.name + ": page arguments match the SQL signature", unknown.length === 0 && missing.length === 0, { unknown, missing, sql: names });
  ok(r.name + ": the signed-in browser may run it, anonymous may not", S.exec[r.name].has("authenticated") && !S.exec[r.name].has("anon"), [...S.exec[r.name]]);
});
["hq_wake", "hq_wake_on_revision", "hq_wake_on_action", "hq_warden", "hq_schedule_warden", "hq_has_function", "hq_source_defaults"].forEach(f =>
  ok(f + ": callable by no role at all (triggers only)", S.exec[f] && S.exec[f].size === 0, S.exec[f] && [...S.exec[f]]));
const wakeSql = read("supabase/migrations/" + S.files.filter(f => /wake/.test(f))[0]);
const allSql = S.files.map(f => read("supabase/migrations/" + f).replace(/--.*$/gm, "")).join("\n");
const lastDef = name => { const all = [...allSql.matchAll(new RegExp("create (?:or replace )?function public\\." + name + "\\b[\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$;", "g"))]; return all.length ? all[all.length - 1][0] : ""; };
ok("no live function guards on to_regproc, which is blind to overloaded names (F-013)", Object.keys(S.functions).every(f => !/to_regproc\(/.test(lastDef(f))), Object.keys(S.functions).filter(f => /to_regproc\(/.test(lastDef(f))));
const agentsEvents = (() => { try { return cp.execSync("git show HEAD:.github/workflows/reviser.yml", { cwd: path.join(repo, "..", "bitzy-hq-agents"), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { return null; } })();
if (!agentsEvents) skip("the event the database sends is one the reviser workflow listens for", "bitzy-hq-agents not found next to this repo");
else ok("the event the database sends is one the reviser workflow listens for", /types:\s*\[hq-revise\]/.test(agentsEvents) && /'hq-revise'/.test(wakeSql));
ok("the wake function never logs or returns the token", !/detail\s*:=[^;]*token/.test(wakeSql) && !/return\s+token/.test(wakeSql) && !/values \([^)]*token/.test(wakeSql));
["hq_upsert_card", "hq_return_revised", "hq_to_todo"].forEach(f =>
  ok(f + ": agents only, closed to every browser role", S.exec[f] && S.exec[f].has("service_role") && !S.exec[f].has("authenticated") && !S.exec[f].has("anon"), S.exec[f] && [...S.exec[f]]));
const froms = [...inline.matchAll(/sb\.from\("(\w+)"\)\.select\("([^"]*)"/g)].map(m => ({ t: m[1], cols: m[2] }));
froms.forEach(f => {
  const known = S.tables[f.t] || (S.views.includes(f.t) ? S.tables.cards : null);
  const cols = f.cols === "*" ? [] : f.cols.split(",").map(x => x.trim());
  ok("select from " + f.t + " uses columns that exist", !!known && cols.every(c => known.includes(c)), { cols, known });
});
const filters = [...inline.matchAll(/sb\.from\("(\w+)"\)[^;]*?\.in\("status",\s*\[([^\]]*)\]\)/g)].flatMap(m => m[2].match(/"(\w+)"/g).map(x => ({ t: m[1], v: x.slice(1, -1) })));
ok("status values the page filters on are allowed by that table (" + filters.length + ")", filters.length >= 5 && filters.every(f => (S.checks[f.t + ".status"] || []).includes(f.v)), filters.filter(f => !(S.checks[f.t + ".status"] || []).includes(f.v)));

// ----- 2b. the agents view agrees with the agent_status view -----
const AG = require("../hq/agents.js"), agJs = read("hq/agents.js"), agUi = read("hq/agents-ui.js"), agSql = read("supabase/migrations/" + S.files.filter(f => /agents/.test(f))[0]).replace(/--.*$/gm, "");
const agHooks = [...new Set([...agUi.matchAll(/q\("(\[data-[\w-]+\])"\)/g)].map(m => m[1].slice(1, -1)))];
const agSection = html.slice(html.indexOf('<section id="v-agents"'), html.indexOf("<noscript>"));
ok("every data hook agents-ui queries exists in the agents section (" + agHooks.length + ")", agHooks.length >= 8 && agHooks.every(h => new RegExp(h + "(?=[\\s>=])").test(agSection)), agHooks.filter(h => !new RegExp(h + "(?=[\\s>=])").test(agSection)));
const statusCols = /returns table \(([\s\S]*?)\)\s*language/.exec(agSql)[1].split(",").map(x => x.trim().split(/\s+/)[0]);
const readCols = [...new Set([...(agJs + agUi).matchAll(/\b(?:a|r)\.(\w+)\b/g)].map(m => m[1]))].filter(c => !["issue", "created_at", "status"].includes(c));
ok("every agent field the page reads is a column of agent_status (" + readCols.length + ")", readCols.length >= 10 && readCols.every(c => statusCols.includes(c)), readCols.filter(c => !statusCols.includes(c)));
ok("the page's four kinds are the database's four kinds", AG.KINDS.map(k => k.key).sort().join() === S.checks["sources.kind"].slice().sort().join(), S.checks["sources.kind"]);
const sqlStates = [...new Set([.../case when not s\.enabled([\s\S]*?)end\s+from/.exec(agSql)[0].matchAll(/then '(\w+)'|else '(\w+)'/g)].map(m => m[1] || m[2]))].sort();
ok("every state the database can report has a label, and the page invents none", sqlStates.join() === Object.keys(AG.STATE).filter(k => k !== "planned").sort().join(), sqlStates);
ok("the states the page treats as trouble are real states", Object.keys(AG.BAD).every(k => sqlStates.includes(k)));
const issueIndex = read("docs/hq/ISSUES.md");
ok("every planned agent has a real kind and an indexed issue (" + AG.PLANNED.length + ")", AG.PLANNED.length >= 10 && AG.PLANNED.every(p => S.checks["sources.kind"].includes(p.kind) && issueIndex.includes("issues/" + p.issue + ")")) && new Set(AG.PLANNED.map(p => p.name)).size === AG.PLANNED.length, AG.PLANNED.filter(p => !issueIndex.includes("issues/" + p.issue + ")")));
ok("hq_agent_status: the signed-in browser may run it, anonymous may not", S.exec.hq_agent_status.has("authenticated") && !S.exec.hq_agent_status.has("anon"), [...S.exec.hq_agent_status]);
ok("agent_status is a security invoker view closed to anon", /create view public\.agent_status with \(security_invoker = true\)/.test(agSql) && /revoke all on public\.agent_status from anon/.test(agSql) && !/security definer/.test(agSql));
ok("the agents view never writes HTML from data", !/innerHTML|insertAdjacentHTML|outerHTML/.test(agUi.replace(/\/\/.*$/gm, "")));
ok("the page asks for live updates on tables the migration publishes", [...inline.matchAll(/postgres_changes",\s*\{[^}]*table:\s*"(\w+)"/g)].map(m => m[1]).every(t => new RegExp("add table public\\." + t + ";").test(agSql)) && /postgres_changes/.test(inline));

// ----- 3. the vocabulary is the same on both sides -----
const outcomes = ["right", "left", "up"].flatMap(d => [D.outcome({ proposed_action: { type: "x" } }, d).status, D.outcome({}, d).status]);
ok("every status the deck can produce is allowed by the database", outcomes.every(v => S.checks["cards.status"].includes(v)), [...new Set(outcomes)]);
ok("the database knows the revising status and the todo kind", S.checks["cards.status"].includes("revising") && S.checks["cards.kind"].includes("todo"));
const uiKinds = [...ui.matchAll(/card\.kind === "(\w+)"/g)].map(m => m[1]).concat([...deckJs.matchAll(/card\.kind === "(\w+)"/g)].map(m => m[1]));
ok("every card kind the UI branches on is a real kind", uiKinds.length > 0 && uiKinds.every(k => S.checks["cards.kind"].includes(k)), [...new Set(uiKinds)]);
const uiBuckets = Object.keys(new Function("return " + /var BUCKET = (\{[^}]*\})/.exec(ui)[1])());
ok("the UI has a label for every bucket, and no bucket the database lacks", uiBuckets.slice().sort().join() === S.checks["cards.bucket"].slice().sort().join(), { ui: uiBuckets, db: S.checks["cards.bucket"] });
const sqlDirs = /p_dir not in \(([^)]*)\)/.exec(read("supabase/migrations/" + S.files.filter(f => /revise/.test(f))[0]))[1].match(/'(\w+)'/g).map(x => x.slice(1, -1));
ok("the swipe directions the page sends are the ones the database accepts", sqlDirs.sort().join() === "left,right,up" && /dir !== "right" && dir !== "left" && dir !== "up"/.test(deckJs), sqlDirs);

// ----- 4. the card contract: one validator, applied to every example we ship -----
function contractErrors(c) {
  const e = [], a = c.proposed_action;
  if (!c.key || !c.source || !c.title) e.push("needs key, source and title");
  if (c.kind && !S.checks["cards.kind"].includes(c.kind)) e.push("unknown kind " + c.kind);
  if (c.bucket && !S.checks["cards.bucket"].includes(c.bucket)) e.push("unknown bucket " + c.bucket);
  if (c.kind === "todo") { if (a) e.push("a to-do carries no action"); if (!(c.raw && String(c.raw.todo_reason || "").trim())) e.push("a to-do must say why (raw.todo_reason)"); }
  if (a) {
    if (typeof a.type !== "string" || !a.type) e.push("action needs a type");
    if (c.kind !== "batch") {
      if (!a.draft || typeof a.draft !== "object") e.push("an action card must carry the finished draft");
      else if (typeof a.draft.text !== "string" || !a.draft.text.trim()) e.push("draft.text must be the finished body");
      else if (/\[[A-Z ]{3,}\]|\bTODO\b|lorem ipsum/i.test(a.draft.text)) e.push("draft contains a placeholder");
    }
  }
  if (c.kind === "approve" && !a) e.push("an approve card with nothing to approve");
  if (c.kind === "batch" && !(c.raw && Array.isArray(c.raw.rows) && c.raw.rows.length && c.raw.rows.every(r => r && r.id != null))) e.push("a batch needs rows with ids");
  return e;
}
const contract = read("docs/hq/CARD-CONTRACT.md");
const example = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(contract)[1]);
ok("the example in CARD-CONTRACT.md obeys the contract", contractErrors(example).length === 0, contractErrors(example));
const upsertKeys = [...read("supabase/migrations/" + S.files.filter(f => /revise/.test(f))[0]).matchAll(/p\s*->>?\s*'(\w+)'/g)].map(m => m[1]);
ok("every field in the contract example is one hq_upsert_card reads", Object.keys(example).every(k => upsertKeys.includes(k)), Object.keys(example).filter(k => !upsertKeys.includes(k)));
const w = { HQOffline: require("../hq/offline.js") };
new Function("window", "location", read("hq/demo.js").replace("root.HQ_DEMO = {", "root.HQ_DEMO_CARDS = cards; root.HQ_DEMO = {"))(w, { hostname: "localhost", search: "?demo=1" });
const demo = w.HQ_DEMO_CARDS.filter(c => !/^xss:/.test(c.key));
const bad = demo.map(c => ({ key: c.key, errors: contractErrors(c) })).filter(x => x.errors.length);
ok("every demo card obeys the contract (" + demo.length + ")", demo.length >= 6 && bad.length === 0, bad);
ok("the validator rejects a bare reminder", contractErrors({ key: "k", source: "s", title: "Reply to Dana", kind: "approve" }).length > 0);
ok("the validator rejects a to-do with no reason", contractErrors({ key: "k", source: "s", title: "t", kind: "todo" }).length > 0);
ok("the validator rejects a placeholder draft", contractErrors({ key: "k", source: "s", title: "t", kind: "approve", proposed_action: { type: "reply", draft: { text: "Hi [NAME], see you on [DATE]" } } }).length > 0);

// ----- 5. the agents repo agrees with the database (when it is checked out next door) -----
const agents = path.join(repo, "..", "bitzy-hq-agents");
function agentFile(rel) { for (const ref of ["HEAD", "cli"]) { try { return cp.execSync("git show " + ref + ":" + rel, { cwd: agents, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) {} } return null; }
const store = fs.existsSync(agents) ? agentFile("reviser/store.py") : null, shared = fs.existsSync(agents) ? agentFile("hq_heartbeat/supabase.py") : null;
if (!store || !shared) skip("agents repo calls match the SQL signatures", "bitzy-hq-agents with reviser/store.py and hq_heartbeat/supabase.py not found next to this repo");
else {
  const cli = agentFile("cli/hq.py") || "";
  const py = store + "\n" + shared + "\n" + cli;
  const calls = [...py.matchAll(/"rpc\/(\w+)",\s*\{([^}]*)\}/g)].map(m => ({ name: m[1], keys: [...m[2].matchAll(/"(p_?\w*)"\s*:/g)].map(k => k[1]) }));
  ok("the agents call only functions we know about", [...new Set(calls.map(c => c.name))].sort().join() === "hq_return_revised,hq_swipe,hq_to_todo,hq_upsert_card", calls);
  ok("every function the agents call is open to the service role", calls.every(c => S.exec[c.name] && S.exec[c.name].has("service_role")), calls.filter(c => !(S.exec[c.name] && S.exec[c.name].has("service_role"))));
  const deckCols = S.tables.cards.concat(["live_score", "pinned", "inputs_rank"]);
  const cliSelects = [...cli.matchAll(/(today_deck|cards)\?[^"]*select=([\w,]+)|"select":\s*"([\w,]+)"/g)].map(m => (m[2] || m[3]).split(","));
  ok("the hq command selects columns that exist (" + cliSelects.length + " queries)", cliSelects.length >= 3 && cliSelects.every(cols => cols.every(c => deckCols.includes(c))), cliSelects.map(cols => cols.filter(c => !deckCols.includes(c))));
  const cliBuckets = /BUCKETS = \(([^)]*)\)/.exec(cli);
  ok("the hq command offers exactly the database's buckets", !!cliBuckets && cliBuckets[1].match(/"(\w+)"/g).map(x => x.slice(1, -1)).sort().join() === S.checks["cards.bucket"].slice().sort().join());
  const cliKinds = [...cli.matchAll(/"kind":\s*"(\w+)"/g)].map(m => m[1]);
  ok("the kind the hq command files is a real kind", cliKinds.length > 0 && cliKinds.every(k => S.checks["cards.kind"].includes(k)), cliKinds);
  const viewCols = /as live_score[\s\S]*?as pinned[\s\S]*?as inputs_rank/.test(S.files.map(f => read("supabase/migrations/" + f)).join("\n"));
  ok("today_deck really exposes live_score, pinned and inputs_rank", viewCols);
  calls.forEach(c => { const sig = (S.functions[c.name] || []), names = sig.map(p => p.name);
    ok("agents " + c.name + ": arguments match the SQL signature", c.keys.length > 0 && c.keys.every(k => names.includes(k)) && sig.filter(p => !p.optional).every(p => c.keys.includes(p.name)), { sent: c.keys, sql: names }); });
  const sel = /"select":\s*"([^"]+)"/.exec(store)[1].split(",");
  ok("the reviser selects card columns that exist", sel.every(c => S.tables.cards.includes(c)), sel.filter(c => !S.tables.cards.includes(c)));
  ok("the reviser filters on a status the database allows", /status": "eq\.(\w+)"/.exec(store) && S.checks["cards.status"].includes(/status": "eq\.(\w+)"/.exec(store)[1]));
  // Every JSON body the shared client sends to a table uses only that table's columns.
  const writes = [...shared.matchAll(/_call\("(?:POST|PATCH)",\s*f?"(runs|sources)[^"]*",\s*\{([^}]*)\}/g)].map(m => ({ t: m[1], cols: [...m[2].matchAll(/"(\w+)"\s*:/g)].map(k => k[1]) }));
  ok("the heartbeat writes to runs and sources (" + writes.length + " calls)", writes.length === 4 && writes.some(w => w.t === "runs") && writes.some(w => w.t === "sources"), writes);
  writes.forEach(w => ok("heartbeat write to " + w.t + " uses columns that exist: " + w.cols.join(", "), w.cols.length > 0 && w.cols.every(c => S.tables[w.t].includes(c)), w.cols.filter(c => !S.tables[w.t].includes(c))));
  ok("registering a source never sends the enabled flag", !/register_source[\s\S]{0,400}"enabled"\s*:/.test(shared.split("def start_run")[0].split("def register_source")[1].split("prefer=")[0]));
  // agent-ping (#115): outside agents write the same rows, with the same vocabulary.
  if (!/def cmd_ping/.test(cli)) skip("agent-ping matches the database", "the agents checkout next door predates agent-ping");
  else {
    const tuple = n => (new RegExp("^" + n + " = \\(([^)]*)\\)", "m").exec(cli) || [, ""])[1].match(/"(\w+)"/g).map(x => x.slice(1, -1)).sort().join();
    ok("agent-ping offers exactly the database's kinds and hosts", tuple("KINDS") === S.checks["sources.kind"].slice().sort().join() && tuple("RUNS_ON") === S.checks["sources.runs_on"].slice().sort().join(), [tuple("KINDS"), tuple("RUNS_ON")]);
    const pingWrites = [...cli.matchAll(/_call\("(?:POST|PATCH)",\s*f?"(runs|sources)[^"]*",\s*\{([^}]*)\}/g)].map(m => ({ t: m[1], cols: [...m[2].matchAll(/"(\w+)"\s*:/g)].map(k => k[1]) }));
    const patchCols = [...(/changes = \{[^}]*\}/.exec(cli) || [""])[0].matchAll(/\("(\w+)",/g)].map(m => m[1]);
    ok("agent-ping writes only columns that exist (" + pingWrites.length + " inserts, " + patchCols.length + " patchable)", pingWrites.length === 2 && pingWrites.every(w => w.cols.every(c => S.tables[w.t].includes(c))) && patchCols.length === 4 && patchCols.every(c => S.tables.sources.includes(c)), pingWrites);
    ok("agent-ping never sends the enabled flag", !/"enabled"\s*:/.test(cli));
    ok("the on-demand interval is one the view reads as on demand", /^ON_DEMAND = "(\d+) years?"/m.test(cli) && />= interval '1 year'/.test(agSql));
    const labelUses = [...((agentFile("reviser/run.py") || "") + (agentFile("collectors/beeper_dump/cli.py") || "")).matchAll(/kind="(\w+)"/g)].map(m => m[1]);
    ok("kinds the agents register with are real kinds", labelUses.length > 0 && labelUses.every(k => S.checks["sources.kind"].includes(k)), labelUses);
  }
  const usesOn = [...(agentFile("reviser/run.py") || "").matchAll(/runs_on="(\w+)"/g)].map(m => m[1]);
  ok("runs_on values the agents use are allowed by the database", usesOn.length > 0 && usesOn.every(v => S.checks["sources.runs_on"].includes(v)), usesOn);
}

// ----- 6. migrations and their suites -----
ok("migrations are numbered with no gaps", S.files.every((f, i) => f.startsWith(String(i + 1).padStart(4, "0") + "_")), S.files);
const dbScript = read("scripts/hq/test-db.sh"), suites = fs.readdirSync(path.join(repo, "supabase", "tests")).filter(f => f.endsWith(".sql") && f !== "bootstrap.sql").map(f => f.replace(".sql", ""));
ok("every SQL suite is run by test-db.sh and ends with its own ok line", suites.every(s => new RegExp("\\b" + s + "\\b").test(/for t in ([^;]+);/.exec(dbScript)[1]) && read("supabase/tests/" + s + ".sql").includes("select '" + s + " ok' as result;")), suites);
ok("every SQL suite rolls back", suites.every(s => /^begin;/m.test(read("supabase/tests/" + s + ".sql")) && /rollback;\s*$/.test(read("supabase/tests/" + s + ".sql"))));
ok("no migration hardcodes the owner's email", !S.files.some(f => /@gmail\.com|yitzy305/i.test(read("supabase/migrations/" + f))));
ok("every table the migrations create turns on row security", Object.keys(S.tables).every(t => S.files.some(f => new RegExp("alter table public\\." + t + "\\s+enable row level security").test(read("supabase/migrations/" + f)))), Object.keys(S.tables));

// ----- 7. hygiene across everything committed for HQ -----
const hqFiles = tracked.filter(f => /^(hq\/|docs\/hq\/|scripts\/hq\/|supabase\/|tests\/hq-|tests\/lib\/)/.test(f) && !/\.png$|vendor\//.test(f));
const SECRET = /sb_secret_[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
const leaks = hqFiles.filter(f => SECRET.test(read(f)));
ok("no secret-shaped string in any committed HQ file (" + hqFiles.length + " files)", hqFiles.length > 20 && leaks.length === 0, leaks);
ok("the only key in the page config is the publishable one", /sb_publishable_/.test(read("hq/config.js")) && !/service_role|sb_secret_/.test(read("hq/config.js")));
const dashy = hqFiles.filter(f => /\.(md|html|webmanifest)$/.test(f) && /[\u2014\u2013]/.test(read(f)));
ok("no em or en dash in HQ docs or pages", dashy.length === 0, dashy);
ok("the private page carries no analytics and is not indexable", !/clarity/i.test(html) && /noindex/.test(html) && /Disallow: \/hq\//.test(read("robots.txt")));
ok("the private page loads nothing from another origin", !/(src|href)="https?:\/\//.test(html.replace(/<a [^>]*>/g, "")));
const logs = ["DECISIONS", "FINDINGS", "OPEN-QUESTIONS"].map(n => read("docs/hq/" + n + ".md"));
const idsOf = (txt, p) => [...txt.matchAll(new RegExp("^" + p + "-(\\d{3})\\b", "gm"))].map(m => +m[1]);
[["D", logs[0]], ["F", logs[1]], ["OQ", logs[2]]].forEach(([p, txt]) => { const n = idsOf(txt, p);
  ok(p + " ids are unique and run in order with no gaps (" + n.length + ")", n.length > 0 && n.every((v, i) => v === i + 1), n.filter((v, i) => v !== i + 1).slice(0, 3)); });
const cited = [...new Set(hqFiles.filter(f => !/DECISIONS\.md$/.test(f)).flatMap(f => [...read(f).matchAll(/\bD-(\d{3})\b/g)].map(m => +m[1])))];
ok("every decision cited anywhere exists in the log", cited.every(n => idsOf(logs[0], "D").includes(n)), cited.filter(n => !idsOf(logs[0], "D").includes(n)));

console.log((failed ? failed + " failed" : "all pass") + (skipped ? " (" + skipped + " skipped)" : ""));
process.exit(failed ? 1 : 0);
