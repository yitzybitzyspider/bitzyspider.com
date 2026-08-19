// Headless test harness for game.html: stubs window/document/canvas,
// injects debug hooks, and loads the game. Lives in the repo so container
// recycles can't destroy it. Usage: const h = require('./harness'); h.init('')
var fs = require('fs');
var path = require('path');
var listeners = {}, rafCbs = [], T = 0;
function makeCtx(){
  var grad = { addColorStop: function(){} };
  return { canvas:{}, setTransform:function(){}, scale:function(){}, translate:function(){}, rotate:function(){},
    clearRect:function(){}, fillRect:function(){}, drawImage:function(){}, beginPath:function(){}, moveTo:function(){},
    lineTo:function(){}, arc:function(){}, ellipse:function(){}, stroke:function(){}, fill:function(){}, save:function(){},
    restore:function(){}, setLineDash:function(){}, fillText:function(){}, createRadialGradient:function(){ return grad; },
    createLinearGradient:function(){ return grad; }, bezierCurveTo:function(){}, clip:function(){}, rect:function(){},
    closePath:function(){}, quadraticCurveTo:function(){}, globalAlpha:1, globalCompositeOperation:'source-over' };
}
function makeEl(tag){
  var el = { tag:tag||'div', style:{}, dataset:{}, children:[], listeners:{}, value:'',
    classList:{ cls:{}, toggle:function(c,v){ this.cls[c]=v===undefined?!this.cls[c]:v; }, add:function(c){ this.cls[c]=true; },
      remove:function(c){ this.cls[c]=false; }, contains:function(c){ return !!this.cls[c]; } },
    textContent:'', innerHTML:'', disabled:false, cssText:'', width:0, height:0,
    getContext:function(){ return makeCtx(); }, appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(ev,fn){ (this.listeners[ev]=this.listeners[ev]||[]).push(fn); },
    click:function(){ var e={ stopPropagation:function(){}, preventDefault:function(){}, target:el, clientX:0, clientY:0 };
      (this.listeners.click||[]).forEach(function(f){ f(e); }); },
    closest:function(){ return null; }, querySelectorAll:function(){ return []; }, getAttribute:function(k){ return this.dataset[k]||null; } };
  return el;
}
var elements = {};
function getEl(id){ if (!elements[id]) elements[id]=makeEl('div'); return elements[id]; }
function fire(ev,e){ e=e||{}; e.stopPropagation=e.stopPropagation||function(){}; e.preventDefault=e.preventDefault||function(){};
  e.target=e.target||{ closest:function(){ return null; } }; (listeners[ev]||[]).forEach(function(f){ f(e); }); }
function frame(ms){ T+=ms; var cbs=rafCbs; rafCbs=[]; cbs.forEach(function(cb){ cb(T); }); }
function dismissIntro(){ var g=0; while(getEl('ovIntro').classList.contains('show') && g++<30){ getEl('btnIntro').click(); } }

// hooks appended inside the game IIFE — everything a test might need
var HOOKS = fs.readFileSync(path.join(__dirname, 'hooks.js'), 'utf8');

function init(search){
  global.window = { innerWidth:800, innerHeight:600, devicePixelRatio:1, location:{ search: search || '' },
    addEventListener:function(ev,fn){ (listeners[ev]=listeners[ev]||[]).push(fn); }, AudioContext:null, webkitAudioContext:null };
  global.document = { hidden:false, getElementById:getEl, createElement:makeEl, documentElement:makeEl('html'),
    addEventListener:function(ev,fn){ (listeners['doc:'+ev]=listeners['doc:'+ev]||[]).push(fn); }, body:makeEl('body') };
  global.document.documentElement.style.setProperty = function(k,v){ this[k]=v; };
  global.navigator = { maxTouchPoints:0 };
  global.localStorage = { store:{}, getItem:function(k){ return this.store[k]||null; }, setItem:function(k,v){ this.store[k]=String(v); } };
  global.performance = { now:function(){ return T; } };
  global.requestAnimationFrame = function(cb){ rafCbs.push(cb); };
  // the music scheduler's setInterval would keep node's event loop alive forever
  global.setInterval = function(){ return 0; };
  global.clearInterval = function(){};
  elements['game'] = makeEl('canvas');
  elements['glossTabs'] = makeEl('div');
  var html = fs.readFileSync(path.join(__dirname, '..', 'game.html'), 'utf8');
  var js = html.split('<script id="game-js">')[1].split('<\/script>')[0];
  var idx = js.lastIndexOf('})();');
  js = js.slice(0, idx) + HOOKS + '\n' + js.slice(idx);
  eval(js); // eslint-disable-line no-eval
  return global.window;
}
module.exports = { init: init, getEl: getEl, fire: fire, frame: frame, dismissIntro: dismissIntro, elements: elements };
