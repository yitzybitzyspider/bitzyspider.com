// HQ deck UI: renders HQDeck state and turns pointer, button and key input into
// approve, dismiss, snooze, revise (send back with a note) and edit-then-approve.
(function (root) {
  "use strict";
  var D = root.HQDeck, MD = root.HQMarkdown;
  var BUCKET = { startup: "Startup", hackathon: "Hackathon", community: "Community", inputs: "Input", other: "Other" };
  var STAMP = { right: "Approve", left: "Dismiss", up: "Snooze", down: "Revise" };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function mount(host, deck) {
    var q = function (s) { return host.querySelector(s); };
    var stack = q("[data-stack]"), empty = q("[data-empty]"), actions = q("[data-actions]"), toast = q("[data-toast]"),
        cleared = q("[data-cleared]"), sheet = q("[data-sheet]"), noteBox = q("[data-note]"), approveBtn = q('[data-dir="right"]'),
        ui = {}, toastTimer = null, dragging = false,
        reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function uiOf(id) { return ui[id] || (ui[id] = { expanded: false, veto: {}, editing: false, edits: {} }); }
    function vetoList(card) { var v = uiOf(card.id).veto; return D.batchRows(card).filter(function (r) { return v[r.id]; }).map(function (r) { return r.id; }); }
    function topNode() { return stack.querySelector(".card:last-child"); }
    function interacting() { return dragging || sheet.open || Object.keys(deck.busy).length > 0 || (deck.top() && uiOf(deck.top().id).editing); }

    function draftEl(card, st) {
      var fields = D.draftFields(card);
      if (!fields.length) return null;
      var box = el("div", "draft" + (st.editing ? " editing" : ""));
      fields.forEach(function (f) {
        var val = typeof st.edits[f.key] === "string" ? st.edits[f.key] : f.value;
        if (st.editing) {
          var lab = el("label", f.main ? "field main" : "field");
          if (f.label) lab.appendChild(el("span", "k", f.label));
          var inp = el(f.main ? "textarea" : "input"); inp.value = val; if (f.main) inp.rows = 8; else inp.type = "text";
          inp.setAttribute("aria-label", f.label || "Draft text");
          inp.addEventListener("input", function () { st.edits[f.key] = inp.value; });
          lab.appendChild(inp); box.appendChild(lab);
        } else if (f.main) {
          box.appendChild(el("p", "text", val));
        } else {
          var line = el("p", "line"); line.appendChild(el("span", "k", f.label)); line.appendChild(el("span", "v", val)); box.appendChild(line);
        }
      });
      if (!st.editing && D.editDiff(card, st.edits)) box.appendChild(el("p", "will", "Your edits will be sent."));
      return box;
    }

    function cardEl(card, isTop) {
      var st = uiOf(card.id), todo = card.kind === "todo";
      var a = el("article", "card" + (st.expanded || st.editing ? " expanded" : "") + (card.kind === "alert" ? " alert" : "") + (todo ? " todo" : ""));
      a.dataset.id = card.id; a.dataset.bucket = card.bucket || "other";
      if (!isTop) { a.setAttribute("aria-hidden", "true"); a.inert = true; }
      var chips = el("div", "chips");
      chips.appendChild(el("span", "chip bucket", card.kind === "alert" ? "Alert" : card.kind === "plan" ? "Today's plan" : todo ? "To do" : (BUCKET[card.bucket] || "Other")));
      if (card.source) chips.appendChild(el("span", "chip", card.source));
      var due = D.dueLabel(card.due_at, new Date());
      if (due) chips.appendChild(el("span", "chip" + (due === "Overdue" ? " hot" : ""), due));
      var rev = D.revisedInfo(card);
      if (rev) chips.appendChild(el("span", "chip good", rev.count > 1 ? "Revised x" + rev.count : "Revised"));
      else if (card.changed) chips.appendChild(el("span", "chip hot", "Changed"));
      a.appendChild(chips);
      a.appendChild(el("h2", null, card.title));

      var scroll = el("div", "scroll");
      if (todo && card.raw && card.raw.todo_reason) {
        var why = el("div", "why"); why.appendChild(el("span", "k", "Could not be done for you")); why.appendChild(el("p", null, String(card.raw.todo_reason))); scroll.appendChild(why);
      }
      if (rev && (rev.note || rev.summary)) {
        var rv = el("div", "revnote");
        if (rev.note) { rv.appendChild(el("span", "k", "Your note")); rv.appendChild(el("p", null, rev.note)); }
        if (rev.summary) { rv.appendChild(el("span", "k", "What changed")); rv.appendChild(el("p", null, rev.summary)); }
        scroll.appendChild(rv);
      }
      var draft = draftEl(card, st); if (draft) scroll.appendChild(draft);
      if (card.body_md) {
        if (draft) scroll.appendChild(el("span", "k ctx", "Context"));
        var body = el("div", "body md"); body.innerHTML = MD.render(card.body_md); scroll.appendChild(body);
      }
      var rows = D.batchRows(card);
      if (rows.length) {
        var summary = function () { var off = vetoList(card).length; return (rows.length - off) + " of " + rows.length + " selected. Tap to review."; };
        var count = el("p", "will", summary()), list = el("ul", "rows");
        rows.forEach(function (r) {
          var li = el("li"), lab = el("label"), box = el("input"); box.type = "checkbox"; box.checked = !st.veto[r.id];
          box.addEventListener("change", function () { st.veto[r.id] = !box.checked; count.textContent = summary(); });
          lab.appendChild(box); lab.appendChild(el("span", null, r.label != null ? String(r.label) : String(r.id)));
          if (r.detail) lab.appendChild(el("small", null, String(r.detail)));
          li.appendChild(lab); list.appendChild(li);
        });
        scroll.appendChild(count); scroll.appendChild(list);
      }
      if (card.url && /^https?:\/\//i.test(card.url)) {
        var link = el("a", "open", "Open source"); link.href = card.url; link.target = "_blank"; link.rel = "noopener noreferrer"; scroll.appendChild(link);
      }
      a.appendChild(scroll);

      var foot = el("div", "foot");
      foot.appendChild(el("p", "will", D.hasAction(card) ? "Approve sends this as shown: " + card.proposed_action.type.replace(/_/g, " ") : todo ? "Right means you did it yourself." : ""));
      if (isTop && draft) {
        var eb = el("button", "mini", st.editing ? "Done editing" : "Edit"); eb.type = "button";
        eb.addEventListener("click", function () { st.editing = !st.editing; if (st.editing) st.expanded = true; render(deck.state); if (st.editing) { var t = topNode().querySelector("textarea, input"); if (t) t.focus(); } });
        foot.appendChild(eb);
      }
      a.appendChild(foot);
      ["right", "left", "up", "down"].forEach(function (d) { var s = el("span", "stamp " + d, STAMP[d]); s.setAttribute("aria-hidden", "true"); a.appendChild(s); });
      if (isTop) { a.tabIndex = 0; a.setAttribute("aria-label", card.title + ". Right approve, left dismiss, up snooze, down or R to send back with a note, Enter to expand."); bindDrag(a, card); }
      return a;
    }

    function fly(node, dir, then) {
      if (!node || reduce) return then();
      node.classList.add("leaving");
      node.style.transform = dir === "up" ? "translate(0,-130%)" : dir === "down" ? "translate(0,40%) scale(0.9)" : "translate(" + (dir === "right" ? 140 : -140) + "%, 8%) rotate(" + (dir === "right" ? 18 : -18) + "deg)";
      node.style.opacity = "0";
      setTimeout(then, 190);
    }
    function commit(dir, node) {
      var card = deck.top(); if (!card) return;
      if (dir === "down") return openSheet();
      var st = uiOf(card.id), veto = vetoList(card), edits = st.edits;
      fly(node || topNode(), dir, function () { deck.swipe(dir, veto, edits); });
    }

    function openSheet(prefill) {
      var card = deck.top(); if (!card || sheet.open) return;
      q("[data-sheet-title]").textContent = card.kind === "todo" ? "What should the agent try?" : "What should change?";
      noteBox.value = prefill || ""; q("[data-send]").disabled = !noteBox.value.trim();
      if (sheet.showModal) sheet.showModal(); else sheet.setAttribute("open", "");
      noteBox.focus();
    }
    function closeSheet() { if (sheet.open) { if (sheet.close) sheet.close(); else sheet.removeAttribute("open"); } }
    noteBox.addEventListener("input", function () { q("[data-send]").disabled = !noteBox.value.trim(); });
    noteBox.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendNote(); } });
    q("[data-cancel]").addEventListener("click", closeSheet);
    q("[data-sheet-form]").addEventListener("submit", function (e) { e.preventDefault(); sendNote(); });
    function sendNote() {
      var note = noteBox.value.trim(); if (!note) return;
      closeSheet();
      fly(topNode(), "down", function () { deck.revise(note); });
    }

    function bindDrag(node, card) {
      var start = null, moved = false;
      node.addEventListener("pointerdown", function (e) {
        if (e.button > 0 || e.target.closest("a, input, textarea, label, button")) return;
        var st = uiOf(card.id);
        if ((st.expanded || st.editing) && e.target.closest(".scroll")) { start = { x: e.clientX, y: e.clientY, tapOnly: true }; return; }
        start = { x: e.clientX, y: e.clientY }; moved = false; dragging = true;
        node.setPointerCapture(e.pointerId); node.classList.add("dragging");
      });
      node.addEventListener("pointermove", function (e) {
        if (!start || start.tapOnly) return;
        var dx = e.clientX - start.x, rawDy = e.clientY - start.y, dy = rawDy < 0 ? rawDy : rawDy * 0.6;
        if (Math.abs(dx) + Math.abs(rawDy) > 8) moved = true;
        node.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx * 0.04 + "deg)";
        var r = node.getBoundingClientRect(), dir = D.dirFromDrag(dx, rawDy, r.width, r.height);
        var pull = Math.min(1, Math.max(Math.abs(dx) / (r.width * 0.28), Math.abs(rawDy) / (r.height * 0.22)));
        var lean = Math.abs(dx) >= Math.abs(rawDy) ? (dx > 0 ? "right" : "left") : (rawDy < 0 ? "up" : "down");
        ["right", "left", "up", "down"].forEach(function (d) { node.querySelector(".stamp." + d).style.opacity = d === (dir || lean) ? String(dir ? 1 : pull * 0.7) : "0"; });
      });
      function end(e) {
        if (!start) return;
        var s = start; start = null; dragging = false; node.classList.remove("dragging");
        var dx = e.clientX - s.x, dy = e.clientY - s.y, r = node.getBoundingClientRect();
        var dir = s.tapOnly || e.type === "pointercancel" ? null : D.dirFromDrag(dx, dy, r.width, r.height);
        if (dir && dir !== "down") return commit(dir, node);
        node.style.transform = ""; node.querySelectorAll(".stamp").forEach(function (x) { x.style.opacity = "0"; });
        if (dir === "down") return openSheet();
        var st = uiOf(card.id);
        if (!moved && Math.abs(dx) + Math.abs(dy) < 8 && e.type === "pointerup" && !st.editing && !(s.tapOnly && root.getSelection && String(root.getSelection()))) {
          st.expanded = !st.expanded; render(deck.state);
        }
      }
      node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
    }

    function render(s) {
      var active = document.activeElement, keepFocus = stack.contains(active) && !/^(INPUT|TEXTAREA)$/.test(active.tagName);
      stack.textContent = "";
      var show = s.cards.slice(0, 3);
      for (var i = show.length - 1; i >= 0; i--) { var n = cardEl(show[i], i === 0); n.style.setProperty("--depth", i); stack.appendChild(n); }
      var has = show.length > 0;
      stack.hidden = !has; actions.hidden = !has; empty.hidden = has || s.loading;
      host.classList.toggle("loading", !!s.loading);
      if (has) approveBtn.textContent = D.approveLabel(show[0]);
      cleared.textContent = s.loading && !has ? "Loading" : s.cards.length + (s.cards.length === 1 ? " card" : " cards") + " left, " + s.cleared + " cleared today";
      if (!has && !s.loading) {
        q("[data-empty-title]").textContent = s.error ? "Could not load the deck" : "Deck clear";
        var next = s.next ? "Next check: " + s.next.name + " at " + new Date(s.next.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "No collectors have reported yet.";
        q("[data-empty-note]").textContent = s.error ? s.error : s.cleared + " cleared today. " + next;
      }
      if (has && keepFocus) { var top = topNode(); if (top) top.focus({ preventScroll: true }); }
      clearTimeout(toastTimer);
      if (s.toast) {
        toast.hidden = false; toast.className = "toast " + s.toast.kind;
        q("[data-toast-text]").textContent = s.toast.text;
        q("[data-undo]").hidden = !s.toast.undo;
        var shown = s.toast;
        if (shown.keepNote) { delete shown.keepNote; setTimeout(function () { openSheet(shown.keepNoteText); }, 0); }
        toastTimer = setTimeout(function () { if (deck.state.toast === shown) deck.dismissToast(); }, s.toast.kind === "error" ? 8000 : 5000);
      } else toast.hidden = true;
    }

    actions.addEventListener("click", function (e) { var b = e.target.closest("[data-dir]"); if (b) commit(b.dataset.dir); });
    q("[data-undo]").addEventListener("click", function () { deck.undo(); });
    q("[data-reload]").addEventListener("click", function () { deck.load(); });
    document.addEventListener("keydown", function (e) {
      if (host.hidden || sheet.open || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var dir = { ArrowRight: "right", ArrowLeft: "left", ArrowUp: "up", ArrowDown: "down", r: "down" }[e.key];
      if (dir && deck.top()) { e.preventDefault(); commit(dir); }
      else if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("card")) { e.preventDefault(); var c = deck.top(); uiOf(c.id).expanded = !uiOf(c.id).expanded; render(deck.state); topNode().focus(); }
      else if (e.key === "z" && deck.state.toast && deck.state.toast.undo) deck.undo();
    });
    // Revised cards come back on their own schedule: refresh when idle, on return to the tab, and on demand.
    function refresh() { if (!host.hidden && !document.hidden && !interacting()) deck.load(); }
    document.addEventListener("visibilitychange", refresh);
    root.addEventListener("hq-refresh", refresh);
    setInterval(refresh, 30000);

    deck.onChange = function (s) {
      if (s.toast && s.toast.keepNote) s.toast.keepNoteText = s.toast.keepNote;
      render(s);
    };
    return { render: render };
  }

  root.HQDeckUI = { mount: mount };
})(window);
