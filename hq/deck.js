// HQ deck logic: no DOM here. D-004 swipe semantics, D-022 batch veto.
(function (root) {
  "use strict";

  // Up-swipe: tomorrow 06:00 in the phone's own time zone.
  function snoozeUntil(now) {
    var d = new Date(now.getTime());
    d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0);
    return d;
  }

  // Which way did a drag go? dx, dy in px from the start; w, h the card size.
  // Horizontal wins ties so a sloppy sideways flick never snoozes.
  function dirFromDrag(dx, dy, w, h) {
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax >= w * 0.28 && ax >= ay) return dx > 0 ? "right" : "left";
    if (dy <= -h * 0.22 && ay > ax) return "up";
    return null;
  }

  function hasAction(card) {
    return !!(card.proposed_action && typeof card.proposed_action.type === "string" && card.proposed_action.type);
  }

  // What a swipe will do, in words the buttons and the toast can use.
  function outcome(card, dir) {
    if (dir === "left") return { status: "dismissed", label: "Dismissed", undoable: true };
    if (dir === "up") return { status: "snoozed", label: "Snoozed until tomorrow", undoable: true };
    if (hasAction(card)) return { status: "approved", label: "Approved, sent to an agent", undoable: false };
    return { status: "done", label: "Done", undoable: true };
  }

  function batchRows(card) {
    var rows = card && card.kind === "batch" && card.raw && Array.isArray(card.raw.rows) ? card.raw.rows : [];
    return rows.filter(function (r) { return r && r.id !== undefined && r.id !== null; });
  }

  function dueLabel(due, now) {
    if (!due) return "";
    var d = new Date(due), ms = d - now;
    if (isNaN(d)) return "";
    var day = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var days = Math.round((day(d) - day(now)) / 86400000);
    var time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (ms < 0) return "Overdue";
    if (days === 0) return "Due today " + time;
    if (days === 1) return "Due tomorrow " + time;
    if (days < 7) return "Due " + d.toLocaleDateString([], { weekday: "short" });
    return "Due " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Postgres interval as PostgREST returns it: "00:15:00", "1 day", "1 day 02:00:00".
  function intervalMs(s) {
    if (typeof s !== "string") return null;
    var ms = 0, m, found = false, re = /(-?\d+)\s*(day|days|hour|hours|mon|mons|year|years)/g;
    var unit = { day: 864e5, days: 864e5, hour: 36e5, hours: 36e5, mon: 2592e6, mons: 2592e6, year: 31536e6, years: 31536e6 };
    while ((m = re.exec(s))) { ms += +m[1] * unit[m[2]]; found = true; }
    if ((m = /(\d+):(\d{2}):(\d{2})/.exec(s))) { ms += (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000; found = true; }
    return found ? ms : null;
  }

  // Earliest time any enabled source is expected to run again; null when unknown.
  function nextRun(sources, now) {
    var best = null;
    (sources || []).forEach(function (s) {
      var step = intervalMs(s.expected_interval);
      if (!s.enabled || !s.last_ok_at || !step) return;
      var t = new Date(s.last_ok_at).getTime() + step;
      while (t <= now.getTime()) t += step;
      if (best === null || t < best.at) best = { at: t, name: s.name };
    });
    return best;
  }

  // The controller. api: { deck(), swipe(id, dir, until, veto), unswipe(id), cleared(), sources() }
  // Each returns a promise. onChange(state) is called after every state change.
  function Deck(api, onChange, clock) {
    this.api = api; this.onChange = onChange || function () {};
    this.now = clock || function () { return new Date(); };
    this.state = { loading: true, cards: [], cleared: 0, next: null, error: null, toast: null };
    this.busy = {};
  }
  Deck.prototype.emit = function () { this.onChange(this.state); };
  Deck.prototype.load = async function () {
    this.state.loading = true; this.state.error = null; this.emit();
    try {
      var r = await Promise.all([this.api.deck(), this.api.cleared(), this.api.sources()]);
      this.state.cards = r[0] || []; this.state.cleared = r[1] || 0; this.state.next = nextRun(r[2], this.now());
    } catch (e) { this.state.error = (e && e.message) || String(e); }
    this.state.loading = false; this.emit();
  };
  Deck.prototype.top = function () { return this.state.cards[0] || null; };
  Deck.prototype.swipe = async function (dir, veto) {
    var card = this.top();
    if (!card || this.busy[card.id]) return null;
    if (dir !== "right" && dir !== "left" && dir !== "up") return null;
    var out = outcome(card, dir), self = this, index = 0;
    this.busy[card.id] = true;
    // Optimistic: the card leaves now; it comes back in place if the write fails.
    this.state.cards = this.state.cards.slice(1); this.state.cleared += dir === "up" ? 0 : 1;
    this.state.toast = { text: out.label, undo: out.undoable ? card : null, kind: dir }; this.emit();
    try {
      await this.api.swipe(card.id, dir, dir === "up" ? snoozeUntil(this.now()).toISOString() : null, dir === "right" ? (veto || []) : []);
    } catch (e) {
      var cards = self.state.cards.slice(); cards.splice(index, 0, card);
      self.state.cards = cards; self.state.cleared -= dir === "up" ? 0 : 1;
      self.state.toast = { text: "Not saved: " + ((e && e.message) || e), undo: null, kind: "error" };
    }
    delete this.busy[card.id]; this.emit();
    return out;
  };
  Deck.prototype.undo = async function () {
    var t = this.state.toast, card = t && t.undo;
    if (!card || this.busy[card.id]) return false;
    this.busy[card.id] = true; this.state.toast = null;
    try {
      await this.api.unswipe(card.id);
      this.state.cards = [card].concat(this.state.cards);
      if (t.kind !== "up") this.state.cleared = Math.max(0, this.state.cleared - 1);
    } catch (e) { this.state.toast = { text: "Could not undo: " + ((e && e.message) || e), undo: null, kind: "error" }; }
    delete this.busy[card.id]; this.emit();
    return true;
  };
  Deck.prototype.dismissToast = function () { this.state.toast = null; this.emit(); };

  var api = { snoozeUntil: snoozeUntil, dirFromDrag: dirFromDrag, outcome: outcome, hasAction: hasAction,
              batchRows: batchRows, dueLabel: dueLabel, intervalMs: intervalMs, nextRun: nextRun, Deck: Deck };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HQDeck = api;
})(typeof window !== "undefined" ? window : globalThis);
