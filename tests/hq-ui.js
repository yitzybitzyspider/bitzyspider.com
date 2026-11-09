// HQ deck UI behavior, no browser: node tests/hq-ui.js
// Loads the real hq/deck-ui.js against the real deck markup from hq/index.html in a fake DOM,
// then clicks, types, drags and presses keys and checks what reaches the API.
"use strict";
const fs = require("fs"), path = require("path");
const F = require("./lib/fakedom.js");
const D = require("../hq/deck.js"), MD = require("../hq/md.js");
const root = path.join(__dirname, "..", "hq");
let failed = 0;
const ok = (name, cond, extra) => { console.log((cond ? "pass " : "FAIL ") + name + (cond || extra === undefined ? "" : "  -> " + JSON.stringify(extra))); if (!cond) failed++; };
const tick = () => new Promise(r => setImmediate(r));

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const section = html.slice(html.indexOf('<section id="v-deck"'), html.indexOf("<noscript>"));
const uiSrc = fs.readFileSync(path.join(root, "deck-ui.js"), "utf8");

const CARDS = () => [
  { id: 1, kind: "approve", bucket: "startup", source: "gmail", title: "<img src=x onerror=alert(1)> Reply to Dana", body_md: "<script>x</script> **ctx**",
    proposed_action: { type: "email_reply", thread_id: "T1", draft: { to: "dana@x.test", subject: "Re: call", text: "v1 body" } } },
  { id: 2, kind: "batch", bucket: "community", source: "facebook", title: "Add birthdays", body_md: "", proposed_action: { type: "contacts_update" },
    raw: { rows: [{ id: "a", label: "Avi" }, { id: "b", label: "Maya" }] } },
  { id: 3, kind: "todo", bucket: "community", source: "cmg", title: "Register", body_md: "details", raw: { todo_reason: "needs your login" } },
  { id: 4, kind: "do", bucket: "inputs", source: "canvas", title: "Homework", body_md: "do it", url: "javascript:alert(1)" },
  { id: 5, kind: "approve", bucket: "other", source: "t", title: "Revised one", body_md: "", proposed_action: { type: "reply", draft: { text: "t" } },
    raw: { revision_count: 2, last_note: "shorter", revision_summary: "Cut it down" } }
];

function boot(opts) {
  opts = opts || {};
  const doc = F.makeDocument(), timers = F.makeTimers(), calls = [], winL = {};
  const host = F.parse(section, doc).children[0]; doc.body.appendChild(host); host.hidden = false;
  let cards = opts.cards || CARDS();
  const api = {
    deck: async () => { if (opts.loadFails) throw new Error("Failed to fetch"); return cards.filter(c => !c._gone); },
    cleared: async () => 0, sources: async () => [],
    swipe: async (id, dir, until, veto, edit) => { calls.push({ op: "swipe", id, dir, until, veto, edit }); if (opts.failWrites) throw new Error("offline"); cards.find(c => c.id === id)._gone = true; },
    revise: async (id, note) => { calls.push({ op: "revise", id, note }); if (opts.failWrites) throw new Error("offline"); cards.find(c => c.id === id)._gone = true; },
    unswipe: async id => { calls.push({ op: "undo", id }); cards.find(c => c.id === id)._gone = false; }
  };
  const win = { HQDeck: D, HQMarkdown: MD, matchMedia: () => ({ matches: true }), getSelection: () => "",
                addEventListener: (t, fn) => { (winL[t] = winL[t] || []).push(fn); } };
  new Function("window", "document", "setTimeout", "clearTimeout", "setInterval", uiSrc)(win, doc, timers.setTimeout, timers.clearTimeout, timers.setInterval);
  const deck = new D.Deck(api, null, () => new Date(2026, 10, 9, 10, 0), opts.cache);
  win.HQDeckUI.mount(host, deck);
  const $ = s => host.querySelector(s);
  return { doc, host, deck, calls, timers, $, top: () => $(".card:last-child"), btn: dir => $('[data-dir="' + dir + '"]'),
           key: (k, target) => (target || doc.body).fire("keydown", { key: k }), winFire: t => (winL[t] || []).forEach(fn => fn()), setCards: c => { cards = c; } };
}
const title = u => u.top().querySelector("h2").textContent;
async function go(u, fn) { fn(); await tick(); await tick(); }

(async () => {
  // ----- render -----
  let u = boot(); await u.deck.load();
  ok("three cards are stacked and the first is on top", u.host.querySelectorAll(".card").length === 3 && u.top().dataset.id === "1");
  ok("only the top card is interactive", u.host.querySelectorAll(".card").filter(c => c.inert).length === 2 && !u.top().inert);
  ok("actions show and the empty state is hidden", !u.$("[data-actions]").hidden && u.$("[data-empty]").hidden);
  ok("a hostile title is set as text, never as HTML", title(u) === "<img src=x onerror=alert(1)> Reply to Dana");
  const writes = u.doc.htmlWrites;
  ok("innerHTML is only ever written to the Markdown body", writes.length > 0 && writes.every(w => w.el.classList.contains("md")));
  ok("the Markdown body arrives escaped", writes.every(w => !/<script|<img|onerror=/i.test(w.html.replace(/&lt;[^&]*&gt;/g, ""))) && writes.some(w => w.html.includes("&lt;script&gt;") && w.html.includes("<strong>ctx</strong>")), writes.map(w => w.html));
  ok("the draft is shown as the artifact: To, Subject, body", u.top().querySelectorAll(".draft .line").length === 2 && u.top().querySelector(".draft .text").textContent === "v1 body");
  ok("routing is not shown on the card", !u.top().textContent.includes("T1"));
  ok("approve button says Approve for an action card", u.btn("right").textContent === "Approve");

  // ----- edit in place, then approve -----
  await go(u, () => u.top().querySelector(".mini").fire("click"));
  const ta = u.top().querySelector("textarea");
  ok("Edit opens a textarea holding the draft", !!ta && ta.value === "v1 body" && u.top().classList.contains("expanded"));
  ta.value = "my version"; ta.fire("input");
  u.key("ArrowLeft", ta);
  ok("typing in the draft never triggers a swipe", u.calls.length === 0);
  await go(u, () => u.top().querySelector(".mini").fire("click"));
  ok("after editing the card shows the edited text and says so", u.top().querySelector(".draft .text").textContent === "my version" && u.top().textContent.includes("Your edits will be sent."));
  await go(u, () => u.btn("right").fire("click"));
  ok("approve sends only the changed draft field", u.calls[0].op === "swipe" && u.calls[0].dir === "right" && JSON.stringify(u.calls[0].edit) === '{"text":"my version"}', u.calls[0]);
  ok("an approval that went to an agent offers no Undo", u.$("[data-undo]").hidden && u.$("[data-toast-text]").textContent === "Approved with your edits");

  // ----- batch veto -----
  ok("next card is the batch", u.top().dataset.id === "2");
  await go(u, () => u.top().querySelectorAll(".rows input")[1].fire("click"));
  ok("unchecking a row updates the count", u.top().textContent.includes("1 of 2 selected"));
  await go(u, () => u.btn("right").fire("click"));
  ok("the unchecked row travels as a veto", JSON.stringify(u.calls[1].veto) === '["b"]' && u.calls[1].edit === null, u.calls[1]);

  // ----- to-do -----
  ok("a to-do shows why and its button says Done", u.top().classList.contains("todo") && u.top().querySelector(".why").textContent.includes("needs your login") && u.btn("right").textContent === "Done");
  ok("a to-do has no Edit control", !u.top().querySelector(".mini"));

  // ----- revise sheet -----
  const sheet = u.$("[data-sheet]"), note = u.$("[data-note]"), send = u.$("[data-send]");
  await go(u, () => u.btn("down").fire("click"));
  ok("Revise opens the note sheet with Send disabled", sheet.open && send.disabled && u.$("[data-sheet-title]").textContent === "What should the agent try?");
  u.key("ArrowRight");
  ok("keys do nothing while the sheet is open", u.calls.length === 2);
  note.value = "   "; note.fire("input");
  ok("whitespace does not enable Send", send.disabled);
  note.value = " use my saved session "; note.fire("input");
  ok("text enables Send", !send.disabled);
  await go(u, () => send.fire("click"));
  ok("Send files the trimmed note and closes the sheet", u.calls[2].op === "revise" && u.calls[2].id === 3 && u.calls[2].note === "use my saved session" && !sheet.open, u.calls[2]);
  ok("sending back offers Undo", !u.$("[data-undo]").hidden);
  await go(u, () => u.$("[data-undo]").fire("click"));
  ok("Undo pulls the card back on top", u.calls[3].op === "undo" && u.top().dataset.id === "3");
  await go(u, () => { u.btn("down").fire("click"); });
  await go(u, () => u.$("[data-cancel]").fire("click"));
  ok("Cancel closes the sheet and sends nothing", !sheet.open && u.calls.length === 4);

  // ----- keyboard -----
  await go(u, () => u.key("ArrowUp"));
  ok("arrow up snoozes until tomorrow 06:00", u.calls[4].dir === "up" && new Date(u.calls[4].until).getHours() === 6 && new Date(u.calls[4].until).getDate() === 10, u.calls[4]);
  await go(u, () => u.key("z"));
  ok("z undoes while the toast is up", u.calls[5].op === "undo");
  await go(u, () => u.key("ArrowLeft"));
  ok("arrow left dismisses", u.calls[6].dir === "left" && u.calls[6].id === 3);
  await go(u, () => u.key("r"));
  ok("r opens the note sheet", sheet.open); u.$("[data-cancel]").fire("click");
  u.key("ArrowRight", Object.assign(u.doc.createElement("input"), {}));
  ok("keys typed into an input are ignored", u.calls.length === 7);
  u.doc.body.fire("keydown", { key: "ArrowRight", metaKey: true });
  ok("browser shortcuts are left alone", u.calls.length === 7);

  // ----- unsafe link -----
  ok("card 4 is on top", u.top().dataset.id === "4");
  ok("a javascript: source link is not rendered", !u.top().querySelector(".open"));

  // ----- pointer gestures -----
  const drag = async (dx, dy, target) => { const c = u.top(), t = target || c; t.fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1 }); c.fire("pointermove", { clientX: 100 + dx / 2, clientY: 300 + dy / 2 }); c.fire("pointermove", { clientX: 100 + dx, clientY: 300 + dy }); c.fire("pointerup", { clientX: 100 + dx, clientY: 300 + dy }); await tick(); await tick(); };
  let before = u.calls.length;
  await drag(40, 5);
  ok("a short drag springs back", u.calls.length === before && u.top().dataset.id === "4" && u.top().style.transform === "");
  u.top().fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1 }); u.top().fire("pointermove", { clientX: 170, clientY: 300 });
  ok("the stamp fades in toward the lean while dragging", parseFloat(u.top().querySelector(".stamp.right").style.opacity) > 0 && u.top().querySelector(".stamp.left").style.opacity === "0");
  u.top().fire("pointercancel", { clientX: 400, clientY: 300 }); await tick();
  ok("a cancelled pointer never commits a swipe", u.calls.length === before);
  await drag(0, 200);
  ok("dragging down opens the note sheet and swipes nothing", sheet.open && u.calls.length === before); u.$("[data-cancel]").fire("click");
  u.top().fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1 }); u.top().fire("pointerup", { clientX: 101, clientY: 300 }); await tick();
  ok("a tap expands the card", u.top().classList.contains("expanded"));
  await drag(200, 0, u.top().querySelector(".scroll"));
  ok("dragging inside an expanded card scrolls, never swipes", u.calls.length === before);
  u.top().fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1, button: 2 }); u.top().fire("pointerup", { clientX: 300, clientY: 300 }); await tick();
  ok("a right mouse button never swipes", u.calls.length === before);
  u.top().fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1 }); u.top().fire("pointerup", { clientX: 100, clientY: 300 }); await tick();   // collapse
  await drag(200, 10);
  ok("dragging right approves", u.calls[before] && u.calls[before].dir === "right" && u.calls[before].id === 4, u.calls[before]);
  ok("a plain card is Done and can be undone", u.$("[data-toast-text]").textContent === "Done" && !u.$("[data-undo]").hidden);

  // ----- revised badge -----
  ok("a revised card shows the badge, the note and what changed", u.top().textContent.includes("Revised x2") && u.top().querySelector(".revnote").textContent.includes("shorter") && u.top().querySelector(".revnote").textContent.includes("Cut it down"));
  await drag(-200, 0);
  ok("dragging left dismisses", u.calls[u.calls.length - 1].dir === "left" && u.calls[u.calls.length - 1].id === 5);

  // ----- empty state -----
  ok("with nothing left the empty state replaces the stack and buttons", u.$("[data-stack]").hidden && u.$("[data-actions]").hidden && !u.$("[data-empty]").hidden && u.$("[data-empty-title]").textContent === "Deck clear");
  before = u.calls.length; u.key("ArrowRight");
  ok("keys on an empty deck do nothing", u.calls.length === before);

  // ----- toast timing -----
  ok("the toast is still up before its timeout", !u.$("[data-toast]").hidden);
  u.timers.run(5000); await tick();
  ok("the toast clears itself after five seconds", u.$("[data-toast]").hidden);

  // ----- failures -----
  u = boot({ failWrites: true }); await u.deck.load();
  await go(u, () => u.btn("left").fire("click"));
  ok("a failed swipe puts the card back with an error toast", u.top().dataset.id === "1" && /Not saved/.test(u.$("[data-toast-text]").textContent) && u.$("[data-toast]").className.includes("error"));
  u.timers.run(5000); await tick();
  ok("an error toast outlasts a normal one", !u.$("[data-toast]").hidden);
  await go(u, () => u.btn("down").fire("click"));
  u.$("[data-note]").value = "do not lose me"; u.$("[data-note]").fire("input");
  await go(u, () => u.$("[data-send]").fire("click"));
  u.timers.run(0); await tick();
  ok("a failed send reopens the sheet with the note intact", u.$("[data-sheet]").open && u.$("[data-note]").value === "do not lose me" && u.top().dataset.id === "1");

  u = boot({ loadFails: true }); await u.deck.load();
  ok("a failed first load says so instead of claiming the deck is clear", u.$("[data-empty-title]").textContent === "Could not load the deck" && u.$("[data-empty-note]").textContent === "Failed to fetch");

  const mem = {}, O = require("../hq/offline.js");
  const cache = O.make({ getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } });
  cache.put(CARDS(), 2, new Date(2026, 10, 9, 8, 0));
  u = boot({ loadFails: true, cache }); await u.deck.load();
  ok("offline shows the stored deck under a banner", !u.$("[data-stale]").hidden && /Offline/.test(u.$("[data-stale]").textContent) && u.top().dataset.id === "1");

  // ----- background refresh never interrupts -----
  u = boot(); await u.deck.load();
  let loads = 0; const realLoad = u.deck.load.bind(u.deck); u.deck.load = () => { loads++; return realLoad(); };
  u.winFire("hq-refresh"); await tick();
  ok("an idle deck refreshes on request", loads === 1);
  u.btn("down").fire("click"); u.winFire("hq-refresh"); await tick();
  ok("no refresh while the note sheet is open", loads === 1); u.$("[data-cancel]").fire("click");
  await go(u, () => u.top().querySelector(".mini").fire("click")); u.winFire("hq-refresh"); await tick();
  ok("no refresh while editing a draft", loads === 1);
  await go(u, () => u.top().querySelector(".mini").fire("click"));
  u.top().fire("pointerdown", { clientX: 100, clientY: 300, pointerId: 1 }); u.winFire("hq-refresh"); await tick();
  ok("no refresh mid-drag", loads === 1); u.top().fire("pointercancel", {});
  u.host.hidden = true; u.winFire("hq-refresh"); await tick();
  ok("no refresh when the deck is not on screen", loads === 1);

  console.log(failed ? failed + " failed" : "all pass");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log("FAIL crashed: " + (e && e.stack || e)); process.exit(1); });
