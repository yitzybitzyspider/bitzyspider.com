// Local demo only: http://localhost:<port>/hq/?demo=1. Fixture cards and an in-memory API,
// so the deck can be exercised without signing in. Never active on a real host.
(function (root) {
  "use strict";
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.localhost$/.test(location.hostname);
  if (!local || !/[?&]demo=1(&|$)/.test(location.search)) return;
  var h = function (n) { return new Date(Date.now() + n * 3600e3).toISOString(); };
  var cards = [
    { id: 1, key: "plan:today", kind: "plan", bucket: "other", source: "plan", title: "Today: ship the HQ deck, reply to the Pegasus thread, IE 240 problem 3",
      body_md: "**Why these three**\n\n1. The deck unblocks every collector.\n2. The Pegasus thread has waited two days.\n3. Problem 3 is due tomorrow and is the long one.\n\nRight accepts the plan. Down sends it back with a note." },
    { id: 3, key: "gmail:18c2f", kind: "approve", bucket: "startup", source: "gmail", title: "Reply to Dana: Thursday 4pm pilot call",
      body_md: "> Thursday 4 works on our side, can you confirm and send the deck beforehand?\n\nDana Levi, pilot lead at Northwind. Second email in this thread.",
      proposed_action: { type: "email_reply", thread_id: "18c2f", draft: { to: "dana@northwind.example", subject: "Re: Pilot call", text: "Hi Dana,\n\nThursday at 4pm works. I will send the deck Wednesday night so you have time to look before we talk.\n\nYitzy" } } },
    { id: 8, key: "cmg:4471", kind: "todo", bucket: "community", source: "cmg", title: "Register for the Bain coffee chat (closes Friday)", due_at: h(70), url: "https://haas.12twenty.com/",
      body_md: "Thursday Nov 13, 12:30 to 1:30pm, Chou Hall. 14 of 20 spots taken. No conflict on your calendar.",
      raw: { todo_reason: "Registration needs your CalNet login and I am not allowed to register for events on your behalf." } },
    { id: 2, key: "warden:stale:cmg", kind: "alert", bucket: "inputs", source: "warden", title: "CMG scout has not reported in 6 hours",
      body_md: "Expected every 4 hours. Last good run 03:10. Likely the 12twenty session expired.\n\nRunbook: `docs/hq/RUNBOOKS/cmg-relogin.md`" },
    { id: 7, key: "birthday:77:2026", kind: "birthday", bucket: "community", source: "contacts", title: "Noa's birthday is tomorrow", due_at: h(30),
      body_md: "Last talked in September about her move to Seattle.", proposed_action: { type: "reply", network: "whatsapp", room: "noa", draft: { to: "Noa (WhatsApp)", text: "Happy birthday Noa! Hope Seattle is treating you well and this year is a big one." } } },
    { id: 4, key: "canvas:881", kind: "do", bucket: "inputs", source: "canvas", title: "INDENG 240: Homework 5", due_at: h(20), url: "https://bcourses.berkeley.edu/",
      body_md: "Problems 1 to 4. Problem 3 needs Gurobi.\n\n- Read section 7.2 first\n- Submit as one PDF" },
    { id: 5, key: "fb-batch:2026-11-09", kind: "batch", bucket: "community", source: "facebook", title: "Add 4 birthdays to Google Contacts",
      body_md: "Found on Facebook, missing from your contacts.", proposed_action: { type: "contacts_update" },
      raw: { rows: [{ id: "a", label: "Avi Stern", detail: "Nov 14" }, { id: "b", label: "Maya Cohen", detail: "Nov 21" }, { id: "c", label: "Sam Ortiz", detail: "Dec 2" }, { id: "d", label: "Priya N.", detail: "Dec 9" }] } },
    { id: 6, key: "xss:1", kind: "approve", bucket: "other", source: "test", title: "<img src=x onerror=alert(1)> hostile title",
      body_md: "<script>window.__pwned = 1</script> [click](javascript:window.__pwned=1) <b onmouseover=\"window.__pwned=1\">x</b>",
      proposed_action: { type: "reply", draft: { to: "<img src=x onerror=window.__pwned=1>", text: "<script>window.__pwned=1</script>" } }, raw: { revision_count: 1, last_note: "<img src=x onerror=window.__pwned=1>", revision_summary: "<b>x</b>" } }
  ];
  var log = [];
  var offline = /[?&]offline=1/.test(location.search), mem = {};
  root.HQ_DEMO = {
    log: log,
    // Demo keeps its "last deck" in memory, never in real storage. ?offline=1 fails every load after the first.
    cache: root.HQOffline.make({ getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = v; }, removeItem: function (k) { delete mem[k]; } }),
    loads: 0,
    api: {
      deck: async function () {
        if (offline && root.HQ_DEMO.loads++ > 0) throw new Error("Failed to fetch");
        return cards.filter(function (c) { return !c._gone; });
      },
      cleared: async function () { return log.filter(function (l) { return l.dir && l.dir !== "up"; }).length; },
      sources: async function () { return [{ name: "canvas", enabled: true, last_ok_at: h(-0.2), expected_interval: "00:30:00" }]; },
      swipe: async function (id, dir, until, veto, edit) {
        if (/[?&]fail=1/.test(location.search)) throw new Error("offline (demo)");
        log.push({ id: id, dir: dir, until: until, veto: veto, edit: edit }); cards.forEach(function (c) { if (c.id === id) c._gone = true; });
      },
      // Stands in for the reviser agent: after a moment the card comes back rewritten.
      revise: async function (id, note) {
        if (/[?&]fail=1/.test(location.search)) throw new Error("offline (demo)");
        log.push({ id: id, revise: note });
        var c = cards.filter(function (x) { return x.id === id; })[0]; c._gone = true;
        c._timer = setTimeout(function () {
          var n = ((c.raw && c.raw.revision_count) || 0) + 1;
          c.raw = Object.assign({}, c.raw, { revision_count: n, last_note: note, revision_summary: "Demo rewrite number " + n + ". The real reviser agent applies your note here." });
          if (c.kind === "todo") { c.kind = "approve"; delete c.raw.todo_reason; c.proposed_action = { type: "reply", draft: { text: "(demo) Tried again with: " + note } }; }
          else if (c.proposed_action && c.proposed_action.draft) c.proposed_action = Object.assign({}, c.proposed_action, { draft: Object.assign({}, c.proposed_action.draft, { text: "(demo, revised: " + note + ")\n\n" + c.proposed_action.draft.text }) });
          else c.body_md = "(demo, revised: " + note + ")\n\n" + c.body_md;
          c._gone = false; cards.splice(cards.indexOf(c), 1); cards.unshift(c);
          root.dispatchEvent(new Event("hq-refresh"));
        }, 2500);
      },
      unswipe: async function (id) { log.push({ undo: id }); cards.forEach(function (c) { if (c.id === id) { clearTimeout(c._timer); c._gone = false; } }); }
    }
  };
})(window);
