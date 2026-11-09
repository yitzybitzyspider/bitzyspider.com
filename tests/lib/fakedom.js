// A small DOM for driving hq/deck-ui.js in node. Only what the deck uses: elements, a tiny
// selector engine, bubbling events, and an HTML parser good enough for the page's own markup.
"use strict";

function parseCompound(s) {
  const m = /^([a-z0-9]*)((?:\.[\w-]+|\[[^\]]+\]|:last-child)*)$/i.exec(s);
  if (!m) throw new Error("fakedom: unsupported selector " + s);
  const parts = m[2].match(/\.[\w-]+|\[[^\]]+\]|:last-child/g) || [];
  return { tag: m[1].toUpperCase(), parts };
}
function matchCompound(el, c) {
  if (c.tag && el.tagName !== c.tag) return false;
  return c.parts.every(p => {
    if (p[0] === ".") return el.classList.contains(p.slice(1));
    if (p === ":last-child") return el.parent && el.parent.children[el.parent.children.length - 1] === el;
    const a = /^\[([\w-]+)(?:="?([^"\]]*)"?)?\]$/.exec(p);
    return a[2] === undefined ? el.hasAttribute(a[1]) : el.getAttribute(a[1]) === a[2];
  });
}
function matches(el, selector) {
  return selector.split(",").some(one => {
    const chain = one.trim().split(/\s+/).map(parseCompound);
    if (!matchCompound(el, chain[chain.length - 1])) return false;
    let node = el.parent;
    for (let i = chain.length - 2; i >= 0; i--) {
      while (node && !matchCompound(node, chain[i])) node = node.parent;
      if (!node) return false;
      node = node.parent;
    }
    return true;
  });
}

class El {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.parent = null; this.attrs = {};
    this._text = ""; this._html = null; this.listeners = {}; this.value = ""; this.checked = false; this.disabled = false;
    this.open = false; this.rect = { left: 0, top: 0, width: 343, height: 600 }; this.captured = null;
    const self = this, st = { props: {} };
    this.style = new Proxy(st, { get: (t, k) => k === "setProperty" ? (n, v) => { t.props[n] = String(v); } : (k in t ? t[k] : ""), set: (t, k, v) => { t[k] = String(v); return true; } });
    this.dataset = new Proxy({}, { get: (_, k) => self.attrs["data-" + String(k)], set: (_, k, v) => { self.attrs["data-" + String(k)] = String(v); return true; } });
    this.classList = {
      contains: c => self.className.split(/\s+/).includes(c),
      add: c => { if (!self.classList.contains(c)) self.className = (self.className + " " + c).trim(); },
      remove: c => { self.className = self.className.split(/\s+/).filter(x => x && x !== c).join(" "); },
      toggle: (c, force) => { const on = force === undefined ? !self.classList.contains(c) : !!force; on ? self.classList.add(c) : self.classList.remove(c); return on; }
    };
  }
  get className() { return this.attrs.class || ""; }   set className(v) { this.attrs.class = String(v); }
  get id() { return this.attrs.id || ""; }
  get hidden() { return "hidden" in this.attrs; }       set hidden(v) { if (v) this.attrs.hidden = ""; else delete this.attrs.hidden; }
  hasAttribute(n) { return n in this.attrs; }           getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); if (n === "open") this.open = true; }
  removeAttribute(n) { delete this.attrs[n]; if (n === "open") this.open = false; }
  get textContent() { return this._html !== null ? this._html : this._text + this.children.map(c => c.textContent).join(""); }
  set textContent(v) { this.children.forEach(c => { c.parent = null; }); this.children = []; this._html = null; this._text = String(v == null ? "" : v); }
  get innerText() { return this.textContent; }
  get innerHTML() { return this._html === null ? "" : this._html; }
  set innerHTML(v) { this.children = []; this._text = ""; this._html = String(v); this.doc.htmlWrites.push({ el: this, html: this._html }); }
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c); c.parent = this; this.children.push(c); return c; }
  contains(n) { for (; n; n = n.parent) if (n === this) return true; return false; }
  all() { return this.children.reduce((a, c) => a.concat([c], c.all()), []); }
  querySelectorAll(s) { return this.all().filter(e => matches(e, s)); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  closest(s) { for (let n = this; n; n = n.parent) if (matches(n, s)) return n; return null; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  focus() { this.doc.activeElement = this; }
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id) { this.captured = id; }
  showModal() { this.open = true; }                      close() { this.open = false; }
  // Fire an event here and bubble it to the document, like the browser does.
  fire(type, init) {
    const e = Object.assign({ type, target: this, button: 0, clientX: 0, clientY: 0, key: undefined, metaKey: false, ctrlKey: false, altKey: false,
                              defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, init || {});
    for (let n = this; n; n = n.parent) (n.listeners[type] || []).slice().forEach(fn => fn(e));
    (this.doc.listeners[type] || []).slice().forEach(fn => fn(e));
    if (type === "click" && this.tagName === "BUTTON" && this.attrs.type === "submit" && !this.disabled) { const f = this.closest("form"); if (f) f.fire("submit"); }
    if (type === "click" && this.tagName === "INPUT" && this.type === "checkbox") { this.checked = !this.checked; this.fire("change"); }
    return e;
  }
}

function makeDocument() {
  const doc = { listeners: {}, activeElement: null, hidden: false, htmlWrites: [],
    createElement: tag => new El(tag, doc), addEventListener(t, fn) { (doc.listeners[t] = doc.listeners[t] || []).push(fn); } };
  doc.body = new El("body", doc);
  return doc;
}

// Parse a fragment of our own, well-formed markup into fake elements.
function parse(html, doc) {
  const root = new El("div", doc); let cur = root;
  const re = /<!--[\s\S]*?-->|<(\/?)([a-z0-9]+)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>|([^<]+)/gi; let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { if (m[4].trim()) cur.appendChild(Object.assign(new El("#text", doc), { _text: m[4].replace(/\s+/g, " ") })); continue; }
    if (!m[2]) continue;
    if (m[1]) { if (cur.tagName !== m[2].toUpperCase()) throw new Error("fakedom: mismatched </" + m[2] + "> inside <" + cur.tagName + ">"); cur = cur.parent; continue; }
    const el = new El(m[2], doc); let a; const ar = /([\w-]+)(?:="([^"]*)")?/g;
    while ((a = ar.exec(m[3] || ""))) el.attrs[a[1]] = a[2] === undefined ? "" : a[2];
    if ("disabled" in el.attrs) el.disabled = true;
    if (el.attrs.type) el.type = el.attrs.type;
    cur.appendChild(el); cur = el;
  }
  if (cur !== root) throw new Error("fakedom: unclosed <" + cur.tagName + ">");
  return root;
}

// Timers the test advances by hand, so a toast timeout never fires behind its back.
function makeTimers() {
  let seq = 0; const q = new Map();
  return { setTimeout: (fn, ms) => { q.set(++seq, { fn, ms: ms || 0 }); return seq; }, clearTimeout: id => { q.delete(id); }, setInterval: () => 0,
           run(maxMs) { let n = 0; for (const [id, t] of [...q]) if (t.ms <= maxMs) { q.delete(id); t.fn(); n++; } return n; }, pending: () => q.size };
}

module.exports = { El, makeDocument, parse, makeTimers, matches };
