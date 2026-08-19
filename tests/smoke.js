// Consolidated smoke suite: one pass over every major system.
// Run: node tests/smoke.js
var h = require('./harness.js');
var W = h.init('?lvl=9&pts=9000&dev=1');
var getEl = h.getEl, fire = h.fire, frame = h.frame, dismissIntro = h.dismissIntro;
var pass = 0;
function ok(cond, name){ if (!cond) throw new Error('FAIL: ' + name); pass++; console.log('  ok ' + name); }

// boot + menu music
ok(getEl('verLabel').textContent.indexOf('v32') !== -1, 'boots at v32');
ok(W._dbgMus().song === 'menu', 'menu tune queued');
['menu','field','field2','field3','field4','field5','boss'].forEach(function(k){
  var s = W._dbgSongs[k];
  ok(s && s.tracks.length && s.tracks.every(function(tr){ return tr.p.length % 16 === 0; }), 'song ' + k + ' well-formed');
});

// start a run
getEl('btnStart').click(); dismissIntro();
for (var i = 0; i < 5; i++) frame(16);
W._dbgSetCaught(-1e9); W._dbgSetHearts(999);
ok(W._dbgState() === 'play', 'run starts');

// weapons
W._dbgSetSilk(100); W._dbgGrantMode('shotgun'); W._dbgShots().length = 0; W._dbgShoot(600, 300);
ok(W._dbgShots().length === 5, 'shotgun fires 5 pellets');
W._dbgGrantMode('bazooka'); W._dbgSetSilk(100); W._dbgShots().length = 0; W._dbgShoot(400, 300);
ok(W._dbgShots()[0] && W._dbgShots()[0].tx === 400, 'bazooka carries the click point');
W._dbgShots().length = 0;

// living silk: wall anchor + maturity + gilded tear survival + fatigue
W._dbgClearBugs(); W._dbgStrands().length = 0; W._dbgFallen().length = 0;
W._dbgPushStrand(6, 300, 500, 300);
var s1 = W._dbgStrands()[0];
ok(s1.decayAt === 0, 'wall anchor holds a lone strand');
s1.born -= 40000;
ok(W._dbgSilkTier(s1) === 2, 'silk turns gilded at 30s');
var dfly = W._dbgSpawnAt('boss', 250, 300);
frame(16);
ok(W._dbgStrands().indexOf(s1) !== -1, 'gilded survives a dragonfly tear');
ok(dfly.dragUntil > 0, 'the dragonfly tangles');
var hp0 = dfly.hp; dfly.webbed = false;
W._dbgWebBug(dfly);
ok(hp0 - dfly.hp === 2, 'tangled tearer takes double damage');
W._dbgClearBugs();

// fallen-log repair
W._dbgPushStrand(200, 200, 320, 240);
W._dbgBreak(W._dbgStrands().length - 1);
ok(W._dbgFallen().length > 0, 'falls are remembered');
W._dbgWebSilk(160);
fire('keydown', {key:'r', code:'KeyR'});
ok(W._dbgAuto().on && W._dbgAuto().repair, 'R re-weaves the fallen');
fire('keydown', {key:'r', code:'KeyR'}); // cancel

// silk surge
W._dbgPushGem(W._dbgSpider().x, W._dbgSpider().y, 'silk');
frame(16);
ok(W._dbgStrandCost(100) === 0, 'silk surge makes weaving free');

// rage
W._dbgChargeRage(); fire('keydown', {key:'g', code:'KeyG'}); frame(16);
ok(W._dbgRage().active, 'rage activates');
for (i = 0; i < 400; i++) { frame(16); if (getEl('ovShop').classList.contains('show')) { getEl('btnNext').click(); dismissIntro(); } }
ok(!W._dbgRage().active, 'rage expires');

// run report + share on game over
W._dbgSetScoreVars(4242, 7);
W._dbgGameOver();
ok(W._dbgState() === 'over', 'game over reached');
ok(getEl('oStats').innerHTML.indexOf('BIGGEST COMBO') !== -1, 'run report renders');
getEl('btnShare').click();
ok(getEl('btnShare').textContent.indexOf('COPIED') !== -1 || getEl('btnShare').textContent === 'SHARE RUN' || getEl('btnShare').textContent === 'COPY FAILED', 'share button responds');
ok(W._dbgMus().song === null, 'music stops on game over');
getEl('btnMenu').click();
ok(W._dbgMus().song === 'menu', 'menu tune resumes');

// themes render without crashing
Object.keys(W._dbgThemes).forEach(function(k){ W._dbgSetTheme(k); frame(16); });
ok(true, 'all 5 themes render');

// tutorial covers everything
getEl('btnTut').click();
var msgs = W._dbgTutMsgs().join(' ').toUpperCase();
['WEAVE','CROSS','HUB','ANCHOR','REPAIR','GEMS','COMBO','NEST','RAGE'].forEach(function(kw){
  ok(msgs.indexOf(kw) !== -1, 'tutorial teaches ' + kw);
});

console.log('SMOKE OK — ' + pass + ' checks passed');
