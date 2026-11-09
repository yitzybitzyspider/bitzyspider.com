// HQ deck UI: renders HQDeck state and turns pointer, button and key input into swipes.
(function (root) {
  "use strict";
  var D = root.HQDeck, MD = root.HQMarkdown;
  var BUCKET = { startup: "Startup", hackathon: "Hackathon", community: "Community", inputs: "Input", other: "Other" };
  var STAMP = { right: "Approve", left: "Dismiss", up: "Snooze" };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function mount(host, deck) {
    var stack = host.querySelector("[data-stack]"), empty = host.querySelector("[data-empty]"),
        actions = host.querySelector("[data-actions]"), toast = host.querySelector("[data-toast]"),
        cleared = host.querySelector("[data-cleared]"), ui = {}, toastTimer = null,
        reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function uiOf(id) { return ui[id] || (ui[id] = { expanded: false, veto: {} }); }
    function vetoList(card) { var v = uiOf(card.id).veto; return D.batchRows(card).filter(function (r) { return v[r.id]; }).map(function (r) { return r.id; }); }

    function cardEl(card, isTop) {
      var st = uiOf(card.id), a = el("article", "card" + (st.expanded ? " expanded" : "") + (card.kind === "alert" ? " alert" : ""));
      a.dataset.id = card.id; a.dataset.bucket = card.bucket || "other";
      if (!isTop) { a.setAttribute("aria-hidden", "true"); a.inert = true; }
      var chips = el("div", "chips");
      chips.appendChild(el("span", "chip bucket", card.kind === "alert" ? "Alert" : card.kind === "plan" ? "Today's plan" : (BUCKET[card.bucket] || "Other")));
      if (card.source) chips.appendChild(el("span", "chip", card.source));
      var due = D.dueLabel(card.due_at, new Date());
      if (due) chips.appendChild(el("span", "chip" + (due === "Overdue" ? " hot" : ""), due));
      if (card.changed) chips.appendChild(el("span", "chip hot", "Changed"));
      a.appendChild(chips);
      a.appendChild(el("h2", null, card.title));
      var body = el("div", "body md"); body.innerHTML = MD.render(card.body_md); a.appendChild(body);
      var rows = D.batchRows(card);
      if (rows.length) {
        var list = el("ul", "rows");
        rows.forEach(function (r) {
          var li = el("li"), lab = el("label"), box = el("input"); box.type = "checkbox"; box.checked = !st.veto[r.id];
          box.addEventListener("change", function () { st.veto[r.id] = !box.checked; count.textContent = summary(); });
          lab.appendChild(box); lab.appendChild(el("span", null, r.label != null ? String(r.label) : String(r.id)));
          if (r.detail) lab.appendChild(el("small", null, String(r.detail)));
          li.appendChild(lab); list.appendChild(li);
        });
        var summary = function () { var off = vetoList(card).length; return (rows.length - off) + " of " + rows.length + " selected. Tap to review."; };
        var count = el("p", "will", summary());
        a.appendChild(count); a.appendChild(list);
      }
      if (D.hasAction(card)) a.appendChild(el("p", "will", "Approve hands this to an agent: " + card.proposed_action.type.replace(/_/g, " ")));
      if (card.url && /^https?:\/\//i.test(card.url)) {
        var link = el("a", "open", "Open source"); link.href = card.url; link.target = "_blank"; link.rel = "noopener noreferrer"; a.appendChild(link);
      }
      ["right", "left", "up"].forEach(function (d) { var s = el("span", "stamp " + d, STAMP[d]); s.setAttribute("aria-hidden", "true"); a.appendChild(s); });
      if (isTop) { a.tabIndex = 0; a.setAttribute("aria-label", card.title + ". Arrow right approve, left dismiss, up snooze, Enter to expand."); bindDrag(a, card); }
      return a;
    }

    function fly(node, dir, then) {
      if (!node || reduce) return then();
      node.classList.add("leaving");
      node.style.transform = dir === "up" ? "translate(0,-130%)" : "translate(" + (dir === "right" ? 140 : -140) + "%, 8%) rotate(" + (dir === "right" ? 18 : -18) + "deg)";
      node.style.opacity = "0";
      setTimeout(then, 190);
    }
    function commit(dir, node) {
      var card = deck.top(); if (!card) return;
      var veto = vetoList(card);
      fly(node || stack.querySelector(".card:last-child"), dir, function () { deck.swipe(dir, veto); });
    }

    function bindDrag(node, card) {
      var start = null, moved = false;
      node.addEventListener("pointerdown", function (e) {
        if (e.button > 0 || e.target.closest("a, input, label, button")) return;
        if (uiOf(card.id).expanded && e.target.closest(".body, .rows")) { start = { x: e.clientX, y: e.clientY, tapOnly: true }; return; }
        start = { x: e.clientX, y: e.clientY }; moved = false;
        node.setPointerCapture(e.pointerId); node.classList.add("dragging");
      });
      node.addEventListener("pointermove", function (e) {
        if (!start || start.tapOnly) return;
        var dx = e.clientX - start.x, dy = Math.min(0, e.clientY - start.y) + Math.max(0, e.clientY - start.y) * 0.15;
        if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
        node.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx * 0.04 + "deg)";
        var r = node.getBoundingClientRect(), dir = D.dirFromDrag(dx, e.clientY - start.y, r.width, r.height);
        var pull = Math.min(1, Math.max(Math.abs(dx) / (r.width * 0.28), -dy / (r.height * 0.22)));
        var lean = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy < 0 ? "up" : null);
        ["right", "left", "up"].forEach(function (d) { node.querySelector(".stamp." + d).style.opacity = d === (dir || lean) ? String(dir ? 1 : pull * 0.7) : "0"; });
      });
      function end(e) {
        if (!start) return;
        var s = start; start = null; node.classList.remove("dragging");
        var dx = e.clientX - s.x, dy = e.clientY - s.y, r = node.getBoundingClientRect();
        var dir = s.tapOnly || e.type === "pointercancel" ? null : D.dirFromDrag(dx, dy, r.width, r.height);
        if (dir) return commit(dir, node);
        node.style.transform = ""; node.querySelectorAll(".stamp").forEach(function (x) { x.style.opacity = "0"; });
        if (!moved && Math.abs(dx) + Math.abs(dy) < 8 && e.type === "pointerup" && !(s.tapOnly && root.getSelection && String(root.getSelection()))) {
          uiOf(card.id).expanded = !uiOf(card.id).expanded; render(deck.state);
        }
      }
      node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
    }

    function render(s) {
      var keepFocus = stack.contains(document.activeElement);
      stack.textContent = "";
      var show = s.cards.slice(0, 3);
      for (var i = show.length - 1; i >= 0; i--) { var n = cardEl(show[i], i === 0); n.style.setProperty("--depth", i); stack.appendChild(n); }
      var has = show.length > 0;
      stack.hidden = !has; actions.hidden = !has; empty.hidden = has || s.loading;
      host.classList.toggle("loading", !!s.loading);
      cleared.textContent = s.loading ? "Loading" : s.cards.length + (s.cards.length === 1 ? " card" : " cards") + " left, " + s.cleared + " cleared today";
      if (!has && !s.loading) {
        empty.querySelector("[data-empty-title]").textContent = s.error ? "Could not load the deck" : "Deck clear";
        var next = s.next ? "Next check: " + s.next.name + " at " + new Date(s.next.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "No collectors have reported yet.";
        empty.querySelector("[data-empty-note]").textContent = s.error ? s.error : s.cleared + " cleared today. " + next;
      }
      if (has && keepFocus) { var top = stack.querySelector(".card:last-child"); if (top) top.focus({ preventScroll: true }); }
      clearTimeout(toastTimer);
      if (s.toast) {
        toast.hidden = false; toast.className = "toast " + s.toast.kind;
        toast.querySelector("[data-toast-text]").textContent = s.toast.text;
        toast.querySelector("[data-undo]").hidden = !s.toast.undo;
        var shown = s.toast; toastTimer = setTimeout(function () { if (deck.state.toast === shown) deck.dismissToast(); }, s.toast.kind === "error" ? 8000 : 5000);
      } else toast.hidden = true;
    }

    actions.addEventListener("click", function (e) { var b = e.target.closest("[data-dir]"); if (b) commit(b.dataset.dir); });
    toast.querySelector("[data-undo]").addEventListener("click", function () { deck.undo(); });
    empty.querySelector("[data-reload]").addEventListener("click", function () { deck.load(); });
    document.addEventListener("keydown", function (e) {
      if (host.hidden || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var dir = { ArrowRight: "right", ArrowLeft: "left", ArrowUp: "up" }[e.key];
      if (dir && deck.top()) { e.preventDefault(); commit(dir); }
      else if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("card")) { e.preventDefault(); var c = deck.top(); uiOf(c.id).expanded = !uiOf(c.id).expanded; render(deck.state); stack.querySelector(".card:last-child").focus(); }
      else if (e.key === "z" && deck.state.toast && deck.state.toast.undo) deck.undo();
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && !host.hidden && !Object.keys(deck.busy).length) deck.load(); });

    deck.onChange = render;
    return { render: render };
  }

  root.HQDeckUI = { mount: mount };
})(window);
