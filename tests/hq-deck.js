// HQ deck logic and Markdown safety: node tests/hq-deck.js
"use strict";
const path = require("path");
const D = require(path.join(__dirname, "..", "hq", "deck.js"));
const M = require(path.join(__dirname, "..", "hq", "md.js"));
let failed = 0;
const ok = (name, cond, extra) => { console.log((cond ? "pass " : "FAIL ") + name + (cond || extra === undefined ? "" : "  -> " + extra)); if (!cond) failed++; };

(async () => {
  // ----- Markdown: nothing a card body says can become markup we did not write -----
  const evil = [
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '[x](javascript:alert(1))', '[x](JaVaScRiPt:alert(1))',
    '[x](java\tscript:alert(1))', '[x](data:text/html,<script>1</script>)', '[x](" onmouseover="alert(1))',
    '[x](https://a.com" onclick="alert(1))', '`<b>` **<i>x</i>**', '<a href="javascript:1">y</a>', '[a](vbscript:x)',
    'https://ok.com/"><script>x</script>', '```\n</code></pre><script>1</script>\n```', '\u0001' + '0' + '\u0001 `x`'
  ];
  evil.forEach((s, i) => {
    const h = M.render(s);
    const tags = (h.match(/<[^>]*>/g) || []).filter(t => !/^<\/?(p|br|strong|em|code|pre|ul|ol|li|h3|h4|h5|blockquote)>$/.test(t) && !/^<a href="(https?:\/\/|mailto:)[^"<>]*" target="_blank" rel="noopener noreferrer">$/.test(t) && t !== "</a>");
    ok("md hostile input " + i + " yields only allowed tags", tags.length === 0 && !/javascript:|vbscript:|data:text/i.test((h.match(/href="[^"]*"/g) || []).join("")), h);
  });
  ok("md bold, italic, code", M.render("**b** *i* `c`") === "<p><strong>b</strong> <em>i</em> <code>c</code></p>", M.render("**b** *i* `c`"));
  ok("md link", M.render("[t](https://a.com/x?y=1&z=2)") === '<p><a href="https://a.com/x?y=1&amp;z=2" target="_blank" rel="noopener noreferrer">t</a></p>', M.render("[t](https://a.com/x?y=1&z=2)"));
  ok("md lists and headings", M.render("# H\n- a\n- b\n\n1. x") === "<h3>H</h3><ul><li>a</li><li>b</li></ul><ol><li>x</li></ol>", M.render("# H\n- a\n- b\n\n1. x"));
  ok("md code is not styled inside", M.render("`**x**`") === "<p><code>**x**</code></p>", M.render("`**x**`"));
  ok("md null body is empty", M.render(null) === "" && M.render(undefined) === "");

  // ----- gestures -----
  ok("drag right past threshold", D.dirFromDrag(120, 10, 360, 500) === "right");
  ok("drag left past threshold", D.dirFromDrag(-120, -30, 360, 500) === "left");
  ok("short drag is nothing", D.dirFromDrag(60, -40, 360, 500) === null);
  ok("drag up", D.dirFromDrag(20, -140, 360, 500) === "up");
  ok("diagonal up-right resolves sideways, never snooze", D.dirFromDrag(150, -150, 360, 500) === "right");
  ok("drag down is nothing", D.dirFromDrag(0, 300, 360, 500) === null);

  // ----- outcomes -----
  ok("approve with action", D.outcome({ proposed_action: { type: "reply" } }, "right").status === "approved");
  ok("approve with action cannot be undone", D.outcome({ proposed_action: { type: "reply" } }, "right").undoable === false);
  ok("approve without action is done", D.outcome({ proposed_action: null }, "right").status === "done");
  ok("empty action type is done", D.outcome({ proposed_action: { type: "" } }, "right").status === "done");
  ok("left dismisses, up snoozes", D.outcome({}, "left").status === "dismissed" && D.outcome({}, "up").status === "snoozed");

  // ----- time -----
  const late = new Date(2026, 10, 9, 23, 30), early = new Date(2026, 10, 9, 0, 10), nye = new Date(2026, 11, 31, 12, 0);
  const s1 = D.snoozeUntil(late), s2 = D.snoozeUntil(early), s3 = D.snoozeUntil(nye);
  ok("snooze from 23:30 is next day 06:00", s1.getDate() === 10 && s1.getHours() === 6 && s1.getMinutes() === 0);
  ok("snooze from 00:10 is still tomorrow, not today", s2.getDate() === 10 && s2.getHours() === 6);
  ok("snooze crosses the year", s3.getFullYear() === 2027 && s3.getMonth() === 0 && s3.getDate() === 1);
  const now = new Date(2026, 10, 9, 10, 0);
  ok("due labels", D.dueLabel(new Date(2026, 10, 9, 9, 0), now) === "Overdue" && /^Due today/.test(D.dueLabel(new Date(2026, 10, 9, 17, 0), now)) && /^Due tomorrow/.test(D.dueLabel(new Date(2026, 10, 10, 1, 0), now)) && D.dueLabel(null, now) === "" && D.dueLabel("garbage", now) === "");
  ok("intervals", D.intervalMs("00:15:00") === 9e5 && D.intervalMs("1 day") === 864e5 && D.intervalMs("1 day 02:00:00") === 864e5 + 72e5 && D.intervalMs("") === null && D.intervalMs(null) === null);
  const nr = D.nextRun([{ name: "a", enabled: true, last_ok_at: new Date(2026, 10, 9, 9, 50).toISOString(), expected_interval: "00:15:00" }, { name: "b", enabled: false, last_ok_at: now.toISOString(), expected_interval: "00:01:00" }, { name: "c", enabled: true, last_ok_at: null, expected_interval: "00:01:00" }], now);
  ok("next run picks the enabled source and a future time", nr && nr.name === "a" && nr.at === new Date(2026, 10, 9, 10, 5).getTime());
  ok("a stale source still gives a future time", D.nextRun([{ name: "a", enabled: true, last_ok_at: new Date(2026, 10, 1).toISOString(), expected_interval: "01:00:00" }], now).at > now.getTime());
  ok("no sources means unknown", D.nextRun([], now) === null);

  // ----- batch -----
  ok("batch rows only on batch cards", D.batchRows({ kind: "batch", raw: { rows: [{ id: 1 }, { id: 0 }, null, { label: "no id" }] } }).length === 2 && D.batchRows({ kind: "do", raw: { rows: [{ id: 1 }] } }).length === 0 && D.batchRows({ kind: "batch", raw: {} }).length === 0);

  // ----- controller: optimistic writes, rollback, undo, double swipe -----
  function fake(opts) {
    const calls = []; const releases = [];
    const api = {
      deck: async () => [{ id: 1, title: "a", proposed_action: { type: "reply" } }, { id: 2, title: "b" }, { id: 3, title: "c" }],
      cleared: async () => 4, sources: async () => [],
      swipe: (id, dir, until, veto) => { calls.push({ id, dir, until, veto }); if (opts.hold) return new Promise((res, rej) => { releases.push(opts.fail ? () => rej(new Error("offline")) : res); }); return opts.fail ? Promise.reject(new Error("offline")) : Promise.resolve(); },
      unswipe: async (id) => { calls.push({ undo: id }); if (opts.undoFail) throw new Error("too late"); }
    };
    return { api, calls, release: () => releases.splice(0).forEach(r => r()) };
  }
  let f = fake({}), states = [], d = new D.Deck(f.api, s => states.push(JSON.parse(JSON.stringify(s))), () => late);
  await d.load();
  ok("load fills the deck", d.state.cards.length === 3 && d.state.cleared === 4 && !d.state.loading);
  await d.swipe("right", [7]);
  ok("approve sends veto and no snooze time", f.calls[0].id === 1 && f.calls[0].dir === "right" && f.calls[0].until === null && f.calls[0].veto[0] === 7);
  ok("approved card leaves, count rises, no undo offered", d.top().id === 2 && d.state.cleared === 5 && d.state.toast.undo === null);
  await d.swipe("up");
  ok("snooze sends tomorrow 06:00 and does not count as cleared", new Date(f.calls[1].until).getHours() === 6 && d.state.cleared === 5 && f.calls[1].veto.length === 0);
  await d.undo();
  ok("undo puts the card back on top", d.top().id === 2 && f.calls[2].undo === 2 && d.state.toast === null);
  await d.swipe("left"); await d.undo();
  ok("undo of a dismiss restores the count", d.top().id === 2 && d.state.cleared === 5);
  ok("unknown direction is ignored", (await d.swipe("down")) === null && d.top().id === 2);

  f = fake({ fail: true }); d = new D.Deck(f.api); await d.load(); await d.swipe("left");
  ok("failed write puts the card back and says so", d.top().id === 1 && d.state.cleared === 4 && /Not saved/.test(d.state.toast.text) && d.state.toast.undo === null);

  f = fake({ hold: true }); d = new D.Deck(f.api); await d.load();
  const p = d.swipe("right");
  ok("optimistic: card is gone before the server answers", d.top().id === 2);
  const p2 = d.swipe("right");   // second card, while the first is in flight: allowed, separate card
  ok("a second card can be swiped while the first is in flight", f.calls.length === 2 && f.calls[1].id === 2);
  f.release(); await p; await p2;
  ok("both in-flight swipes settle and the third card is on top", d.top().id === 3 && d.state.cleared === 6);

  f = fake({ undoFail: true }); d = new D.Deck(f.api); await d.load(); await d.swipe("left"); await d.undo();
  ok("failed undo leaves the card cleared and says so", d.top().id === 2 && /Could not undo/.test(d.state.toast.text));

  d = new D.Deck({ deck: async () => { throw new Error("401"); }, cleared: async () => 0, sources: async () => [] }); await d.load();
  ok("load failure is an error state, not an empty deck", d.state.error === "401" && !d.state.loading);
  d = new D.Deck({ deck: async () => [], cleared: async () => 0, sources: async () => [] }); await d.load();
  ok("swipe on an empty deck does nothing", (await d.swipe("right")) === null);

  // ----- demo mode can only switch on from a local host -----
  const demoSrc = require("fs").readFileSync(path.join(__dirname, "..", "hq", "demo.js"), "utf8");
  const demoOn = (hostname, search) => { const w = {}; new Function("window", "location", demoSrc)(w, { hostname, search }); return !!w.HQ_DEMO; };
  ok("demo off on the real site even with ?demo=1", !demoOn("bitzyspider.com", "?demo=1") && !demoOn("www.bitzyspider.com", "?demo=1"));
  ok("demo off for lookalike hosts", !demoOn("localhost.evil.com", "?demo=1") && !demoOn("evil-localhost", "?demo=1") && !demoOn("127.0.0.1.evil.com", "?demo=1"));
  ok("demo off locally without the flag", !demoOn("localhost", "") && !demoOn("localhost", "?demo=10"));
  ok("demo on for localhost with the flag", demoOn("localhost", "?demo=1") && demoOn("127.0.0.1", "?x=1&demo=1"));

  console.log(failed ? failed + " failed" : "all pass");
  process.exit(failed ? 1 : 0);
})();
