// Clarity checks: tagged on the public pages, never on /learn/, and the opt-out works.
//   node tests/clarity.js [siteRoot]
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
var TAGGED = ['index.html', 'game.html', 'booksiveread/index.html', 'demos/web-untangle.html'];
var failed = 0, passed = 0;

function ok(cond, msg) {
  if (cond) { passed++; console.log('  ok ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}
function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function htmlFiles(dir) {
  var out = [];
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(function (e) {
    var rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '.git' && e.name !== 'node_modules') out = out.concat(htmlFiles(rel)); }
    else if (/\.html?$/.test(e.name)) out.push(rel);
  });
  return out;
}
function tagScript(html) {
  var m = html.match(/<script[^>]*>\s*(\(function\(c,l,a,r,i,t,y\)[\s\S]*?)<\/script>/);
  return m && m[1];
}

// Runs the tag against a stub browser; `storage` is the stored value, or 'throw' for blocked storage.
function runTag(js, storage) {
  var inserted = [];
  var win = {
    localStorage: { getItem: function (k) { if (storage === 'throw') throw new Error('blocked'); return k === 'clarity' ? storage : null; } }
  };
  var doc = {
    createElement: function () { return {}; },
    getElementsByTagName: function () { return [{ parentNode: { insertBefore: function (t) { inserted.push(t.src); } } }]; }
  };
  vm.runInNewContext(js, { window: win, document: doc });
  return inserted;
}

// Runs the privacy page script against a stub DOM.
function privacyPage(html, blocked) {
  var js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  var store = {}, cookies = [], click;
  var btn = { hidden: true, textContent: '', addEventListener: function (_, fn) { click = fn; } };
  var status = { textContent: '' };
  var storage = {
    getItem: function (k) { if (blocked) throw new Error('blocked'); return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = v; },
    removeItem: function (k) { delete store[k]; }
  };
  var doc = { getElementById: function (id) { return id === 'clarity-toggle' ? btn : status; } };
  Object.defineProperty(doc, 'cookie', { set: function (c) { cookies.push(c); } });
  vm.runInNewContext(js, { document: doc, localStorage: storage, location: { hostname: 'bitzyspider.com' } });
  return { btn: btn, status: status, store: store, cookies: cookies, click: function () { click(); } };
}

console.log('tag placement');
TAGGED.forEach(function (f) {
  var html = read(f);
  ok((html.match(/clarity\.ms\/tag/g) || []).length === 1, f + ' has one tag');
  ok(html.indexOf('"z822wwzxrs"') > -1 && html.indexOf('"z822wwzxrs"') < html.indexOf('</head>'), f + ' has the project ID in <head>');
});
htmlFiles('.').filter(function (f) { return TAGGED.indexOf(f) < 0; }).forEach(function (f) {
  ok(read(f).indexOf('clarity.ms/tag') < 0, f + ' stays untagged');
});

console.log('opt-out in the tag');
TAGGED.forEach(function (f) {
  var js = tagScript(read(f));
  ok(!!js, f + ' tag found');
  if (!js) return;
  ok(runTag(js, null).length === 1, f + ' loads by default');
  ok(runTag(js, 'off').length === 0, f + ' skips loading when opted out');
  ok(runTag(js, 'on').length === 1, f + ' loads for any other stored value');
  ok(runTag(js, 'throw').length === 1, f + ' still runs when storage is blocked');
});

console.log('privacy page');
var privacy = read('privacy.html');
ok(privacy.indexOf('https://privacy.microsoft.com/en-us/privacystatement') > -1, 'links the Microsoft Privacy Statement');
ok(privacy.indexOf('Microsoft Advertising') > -1, 'discloses Microsoft Advertising');
ok(read('index.html').indexOf('href="/privacy.html"') > -1, 'homepage footer links to it');

var page = privacyPage(privacy, false);
ok(!page.btn.hidden && /is on/.test(page.status.textContent), 'starts on, with the switch showing');
page.click();
ok(page.store.clarity === 'off' && /is off/.test(page.status.textContent), 'switching off saves the choice');
ok(page.cookies.join(' ').indexOf('_clck=') > -1 && page.cookies.join(' ').indexOf('_clsk=') > -1, 'switching off clears Clarity cookies');
page.click();
ok(!('clarity' in page.store) && /is on/.test(page.status.textContent), 'switching back on removes the choice');

var blockedPage = privacyPage(privacy, true);
ok(blockedPage.btn.hidden && /blocking site storage/.test(blockedPage.status.textContent), 'blocked storage hides the switch and says why');

if (failed) { console.log('CLARITY FAILED: ' + failed + ' of ' + (failed + passed)); process.exit(1); }
console.log('CLARITY OK: ' + passed + ' checks passed');
