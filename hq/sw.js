// HQ service worker. Scope: /hq/. Job: let the app open with no network.
// Network first for everything it handles, so an online phone always runs the newest code;
// the cache is only the fallback. It never touches cross-origin requests, so nothing from
// Supabase (cards, tokens) is ever stored here. The last deck is kept by the page itself.
"use strict";
var CACHE = "hq-shell-v1";
var SHELL = ["./", "config.js", "auth.js", "md.js", "deck.js", "deck-ui.js", "demo.js", "offline.js", "vendor/supabase-2.45.4.js",
             "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-180.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("hq-shell-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.indexOf("/hq/") !== 0) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); }); }
      return res;
    }).catch(function () {
      // Offline: same file regardless of query string; a navigation falls back to the page itself.
      return caches.match(url.pathname).then(function (hit) { return hit || (req.mode === "navigate" ? caches.match("/hq/") : Response.error()); });
    })
  );
});
