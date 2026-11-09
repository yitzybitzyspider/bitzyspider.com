// Keeps the last synced deck on this device so HQ opens offline with something to read.
// Stored in localStorage under one key; wiped on sign-out and when access is denied.
(function (root) {
  "use strict";
  var KEY = "hq.lastDeck.v1", MAX_AGE = 7 * 864e5;
  function make(storage) {
    return {
      put: function (cards, cleared, now) {
        try { storage.setItem(KEY, JSON.stringify({ at: (now || new Date()).toISOString(), cards: cards, cleared: cleared })); return true; }
        catch (e) { return false; }                      // private mode or quota: offline copy is a nicety, never a failure
      },
      get: function (now) {
        try {
          var v = JSON.parse(storage.getItem(KEY) || "null");
          if (!v || !Array.isArray(v.cards) || isNaN(new Date(v.at))) return null;
          if ((now || new Date()) - new Date(v.at) > MAX_AGE) { storage.removeItem(KEY); return null; }
          return v;
        } catch (e) { return null; }
      },
      clear: function () { try { storage.removeItem(KEY); } catch (e) {} }
    };
  }
  var api = { make: make, KEY: KEY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.HQOffline = api; }
})(typeof window !== "undefined" ? window : globalThis);
