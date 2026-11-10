// HQ agents view: renders HQAgents state. Everything is written with textContent, never innerHTML,
// because agent names, errors and card titles come from outside.
(function (root) {
  "use strict";
  var A = root.HQAgents;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clock(d) { return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  // opts: { openDeck(), badge (element on the deck bar that shows the overall level), version }
  function mount(host, board, opts) {
    opts = opts || {};
    var q = function (s) { return host.querySelector(s); };
    var meta = q("[data-agents-meta]"), err = q("[data-agents-error]"), reds = q("[data-reds]"), tiles = q("[data-waiting]"),
        wlist = q("[data-waiting-list]"), head = q("[data-agents-headline]"), groups = q("[data-groups]"), ver = q("[data-version]"),
        ticks = 0, soon = null;
    if (ver && opts.version) ver.textContent = "HQ " + opts.version;
    function toDeck() { if (opts.openDeck) opts.openDeck(); }

    function tile(label, n, note, go) {
      var t = el(go ? "button" : "div", "tile" + (n ? " has" : ""));
      if (go) { t.type = "button"; t.addEventListener("click", toDeck); }
      t.appendChild(el("strong", null, String(n))); t.appendChild(el("span", "k", label));
      if (note) t.appendChild(el("small", null, note));
      return t;
    }

    function agentEl(a, now) {
      var li = el("li", "agent"); li.dataset.state = a.state; li.dataset.name = a.name;
      var dot = el("span", "dot"); dot.setAttribute("aria-hidden", "true"); li.appendChild(dot);
      var body = el("div", "abody"), top = el("div", "atop");
      top.appendChild(el("strong", null, a.title || a.name));
      top.appendChild(el("span", "chip st", A.STATE[a.state] || a.state));
      body.appendChild(top); body.appendChild(el("p", "adetail", A.detail(a, now)));
      if (a.state === "planned" && a.issue) {
        var link = el("a", "open", "Issue " + a.issue); link.href = A.ISSUE_URL + a.issue; link.target = "_blank"; link.rel = "noopener noreferrer"; body.appendChild(link);
      }
      li.appendChild(body);
      return li;
    }

    function render(s) {
      var now = board.now(), w = A.waiting(s.cards, s.actions, now), sum = A.summary(s.rows), g = A.group(s.rows);
      var planned = g.reduce(function (n, k) { return n + k.agents.filter(function (a) { return a.state === "planned"; }).length; }, 0);
      meta.textContent = s.loading && !s.at ? "Loading" : (s.live ? "Live" : "Checking every 30 sec") + (s.at ? ", " + clock(s.at) : "");
      err.hidden = !s.error;
      if (s.error) err.textContent = "Could not refresh (" + s.error + ")." + (s.at ? " Showing the picture from " + clock(s.at) + "." : "");

      reds.textContent = ""; reds.hidden = w.alerts.length === 0;
      w.alerts.forEach(function (c) { var b = el("button", "red", c.title); b.type = "button"; b.addEventListener("click", toDeck); reds.appendChild(b); });

      tiles.textContent = "";
      tiles.appendChild(tile("To decide", w.decide.length, w.revised ? w.revised + " came back revised" : "", true));
      tiles.appendChild(tile("To do", w.todo.length, "", true));
      tiles.appendChild(tile("To read", w.read.length, "", true));
      tiles.appendChild(tile("Approved, not done yet", w.pending.length, w.oldestPending ? "oldest " + w.oldestPending : "", false));

      wlist.textContent = "";
      var mine = w.decide.concat(w.todo), show = mine.slice(0, 5);
      show.forEach(function (c) {
        var li = el("li"), b = el("button", "wrow"); b.type = "button"; b.addEventListener("click", toDeck);
        b.appendChild(el("span", "k", c.kind === "todo" || c.kind === "do" ? "To do" : "Decide")); b.appendChild(el("span", "wt", c.title));
        li.appendChild(b); wlist.appendChild(li);
      });
      if (mine.length > show.length) wlist.appendChild(el("li", "more", "and " + (mine.length - show.length) + " more in the deck"));
      if (!mine.length && !s.loading) wlist.appendChild(el("li", "more", "Nothing is waiting on you."));

      head.textContent = s.loading && !s.at ? "" : A.headline(sum, planned);
      groups.textContent = "";
      g.forEach(function (k) {
        var sec = el("section", "kind"); sec.dataset.kind = k.key;
        var h = el("h3", "ag-h", k.label); h.appendChild(el("small", null, k.does)); sec.appendChild(h);
        var ul = el("ul", "agents");
        k.agents.forEach(function (a) { ul.appendChild(agentEl(a, now)); });
        if (!k.agents.length) ul.appendChild(el("li", "more", "None yet"));
        sec.appendChild(ul); groups.appendChild(sec);
      });

      if (opts.badge) {
        opts.badge.dataset.level = sum.level;
        opts.badge.setAttribute("aria-label", "Agents: " + A.headline(sum, 0));
      }
    }

    // Called every 30 seconds. With live updates on, or with the view closed, a slow check is enough.
    function poll() {
      ticks++;
      if (document.hidden) return false;
      var every = host.hidden || board.state.live ? 4 : 1;
      if (ticks % every !== 0) return false;
      board.load(); return true;
    }
    // A run started or finished somewhere: refresh, once, even if several rows changed together.
    function changed() { clearTimeout(soon); soon = setTimeout(function () { board.load(); }, 400); }
    // Keep "running for 1:05" and "3 min ago" moving without asking the database.
    function tick() { if (!host.hidden && board.state.at) render(board.state); }

    q("[data-open-deck]").addEventListener("click", toDeck);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) board.load(); });
    setInterval(poll, 30000);
    setInterval(function () { if (board.state.rows.some(function (r) { return r.state === "running"; })) tick(); }, 1000);
    setInterval(tick, 20000);
    board.onChange = render;
    return { render: render, poll: poll, changed: changed, tick: tick };
  }

  root.HQAgentsUI = { mount: mount };
})(window);
