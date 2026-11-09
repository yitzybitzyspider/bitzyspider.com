// Local demo only: http://localhost:<port>/hq/?demo=1. Fixture cards and an in-memory API,
// so the deck can be exercised without signing in. Never active on a real host.
(function (root) {
  "use strict";
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.localhost$/.test(location.hostname);
  if (!local || !/[?&]demo=1(&|$)/.test(location.search)) return;
  var h = function (n) { return new Date(Date.now() + n * 3600e3).toISOString(); };
  var cards = [
    { id: 1, key: "plan:today", kind: "plan", bucket: "other", source: "plan", title: "Today: ship the HQ deck, reply to the Pegasus thread, IE 240 problem 3",
      body_md: "**Why these three**\n\n1. The deck unblocks every collector.\n2. The Pegasus thread has waited two days.\n3. Problem 3 is due tomorrow and is the long one.\n\nSwipe right to accept the plan." },
    { id: 2, key: "warden:stale:cmg", kind: "alert", bucket: "inputs", source: "warden", title: "CMG scout has not reported in 6 hours",
      body_md: "Expected every 4 hours. Last good run 03:10. Likely the 12twenty session expired.\n\nRunbook: `docs/hq/RUNBOOKS/cmg-relogin.md`" },
    { id: 3, key: "chat:whatsapp:dana", kind: "approve", bucket: "startup", source: "whatsapp", title: "Dana: can you do Thursday 4pm for the pilot call?", changed: true,
      body_md: "> Thursday 4 works on our side, can you confirm and send the deck beforehand?\n\n**Draft reply**\n\nThursday 4pm works. I will send the deck Wednesday night.",
      proposed_action: { type: "reply", network: "whatsapp", text: "Thursday 4pm works. I will send the deck Wednesday night." } },
    { id: 4, key: "canvas:881", kind: "do", bucket: "inputs", source: "canvas", title: "INDENG 240: Homework 5", due_at: h(20), url: "https://bcourses.berkeley.edu/",
      body_md: "Problems 1 to 4. Problem 3 needs Gurobi.\n\n- Read section 7.2 first\n- Submit as one PDF" },
    { id: 5, key: "fb-batch:2026-11-09", kind: "batch", bucket: "community", source: "facebook", title: "Add 4 birthdays to Google Contacts",
      body_md: "Found on Facebook, missing from your contacts.", proposed_action: { type: "contacts_update" },
      raw: { rows: [{ id: "a", label: "Avi Stern", detail: "Nov 14" }, { id: "b", label: "Maya Cohen", detail: "Nov 21" }, { id: "c", label: "Sam Ortiz", detail: "Dec 2" }, { id: "d", label: "Priya N.", detail: "Dec 9" }] } },
    { id: 6, key: "xss:1", kind: "fyi", bucket: "other", source: "test", title: "<img src=x onerror=alert(1)> hostile title",
      body_md: "<script>window.__pwned = 1</script> [click](javascript:window.__pwned=1) <b onmouseover=\"window.__pwned=1\">x</b>" },
    { id: 7, key: "birthday:77:2026", kind: "birthday", bucket: "community", source: "contacts", title: "Noa's birthday is tomorrow", due_at: h(30),
      body_md: "**Draft**\n\nHappy birthday Noa! Hope this year is a big one.", proposed_action: { type: "reply", network: "whatsapp" } }
  ];
  var log = [];
  root.HQ_DEMO = {
    log: log,
    api: {
      deck: async function () { return cards.filter(function (c) { return !c._gone; }); },
      cleared: async function () { return log.filter(function (l) { return l.dir && l.dir !== "up"; }).length; },
      sources: async function () { return [{ name: "canvas", enabled: true, last_ok_at: h(-0.2), expected_interval: "00:30:00" }]; },
      swipe: async function (id, dir, until, veto) {
        if (/[?&]fail=1/.test(location.search)) throw new Error("offline (demo)");
        log.push({ id: id, dir: dir, until: until, veto: veto }); cards.forEach(function (c) { if (c.id === id) c._gone = true; });
      },
      unswipe: async function (id) { log.push({ undo: id }); cards.forEach(function (c) { if (c.id === id) c._gone = false; }); }
    }
  };
})(window);
