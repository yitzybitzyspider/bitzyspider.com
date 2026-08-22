// Ported verbatim from assets/index-ZZwLr-Wf.js (SpiderLayer component + constants)
(function () {
  const BODY_R = 20, HEAD_R = 12, LEG_COUNT = 8, STEP_THRESHOLD = 60,
    STEP_SPEED = 0.25, WEB_LIFE = 5000, IDLE_MS = 2500,
    BUG_MAX_SPEED = 8, BUG_ACCEL = 0.5, BUG_R = 6;
  const HIPS = [{x:15,y:-10},{x:10,y:-15},{x:5,y:-18},{x:0,y:-15},{x:15,y:10},{x:10,y:15},{x:5,y:18},{x:0,y:15}];
  const FEET = [{x:60,y:-30},{x:55,y:-50},{x:35,y:-60},{x:-10,y:-65},{x:60,y:30},{x:55,y:50},{x:35,y:60},{x:-10,y:65}];

  class Leg {
    constructor(i, p) { this.index = i; this.currentFoot = {...p}; this.targetFoot = {...p}; this.stepProgress = 1; this.isStepping = false; }
  }

  class SpiderLayer extends HTMLElement {
    connectedCallback() {
      if (this._started) return;
      this._started = true;
      this.style.cssText = 'display:contents';
      const canvas = document.createElement('canvas');
      canvas.className = 'spider-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50';
      const counter = document.createElement('div');
      const setCounterStyle = (docked) => {
        counter.style.cssText = docked
          ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.12em'
          : 'position:fixed;bottom:1rem;left:1rem;z-index:60;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.2);padding:0.25rem 0.5rem;border-radius:0.25rem;pointer-events:none';
      };
      setCounterStyle(false);
      const countSpan = document.createElement('span');
      countSpan.style.color = '#ef4444';
      countSpan.textContent = '0';
      counter.append(document.createTextNode('BUGS DEBUGGED: '), countSpan);
      this.append(canvas);
      this.append(counter);
      // If the page provides a slot for the counter, dock it there once it exists.
      let dockTries = 0;
      const dock = setInterval(() => {
        const slot = document.getElementById('bug-count-slot');
        if (slot) { clearInterval(dock); setCounterStyle(true); slot.append(counter); }
        else if (++dockTries > 40) clearInterval(dock);
      }, 50);

      let caught = 0;
      const target = { x: innerWidth / 2, y: innerHeight / 2 };
      const pos = { x: innerWidth / 2, y: innerHeight / 2 };
      let angle = 0;
      const legs = []; for (let i = 0; i < LEG_COUNT; i++) legs.push(new Leg(i, { x: innerWidth / 2, y: innerHeight / 2 }));
      let web = [];
      let lastWebPos = { x: innerWidth / 2, y: innerHeight / 2 };
      let lastMove = Date.now();
      const bug = { x: Math.random() * innerWidth, y: Math.random() * innerHeight };
      const bugVel = { x: 0, y: 0 };
      let bugAngle = 0, eating = false, frame = 0;

      if (!('ontouchstart' in window) && !navigator.maxTouchPoints) document.body.style.cursor = 'none';

      const setTarget = (x, y) => { target.x = x; target.y = y; lastMove = Date.now(); };
      const onMouse = e => setTarget(e.clientX, e.clientY);
      const onTouch = e => { if (e.touches.length) setTarget(e.touches[0].clientX, e.touches[0].clientY - 50); };
      addEventListener('mousemove', onMouse);
      addEventListener('touchmove', onTouch, { passive: true });
      addEventListener('touchstart', onTouch, { passive: true });
      const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
      addEventListener('resize', resize); resize();

      const loop = () => {
        frame += 1;
        const c = canvas, ctx = c.getContext('2d'), now = Date.now();
        ctx.clearRect(0, 0, c.width, c.height);
        const idle = now - lastMove > IDLE_MS;
        if (idle && !eating) { target.x = bug.x; target.y = bug.y; }

        if (!eating) {
          bugVel.x += (Math.random() - 0.5) * BUG_ACCEL;
          bugVel.y += (Math.random() - 0.5) * BUG_ACCEL;
          const sp = Math.hypot(bugVel.x, bugVel.y);
          if (sp > BUG_MAX_SPEED) { bugVel.x = bugVel.x / sp * BUG_MAX_SPEED; bugVel.y = bugVel.y / sp * BUG_MAX_SPEED; }
          bug.x += bugVel.x; bug.y += bugVel.y;
          if (bug.x < 0) { bug.x = 0; bugVel.x *= -1; }
          if (bug.x > c.width) { bug.x = c.width; bugVel.x *= -1; }
          if (bug.y < 0) { bug.y = 0; bugVel.y *= -1; }
          if (bug.y > c.height) { bug.y = c.height; bugVel.y *= -1; }
          bugAngle = Math.atan2(bugVel.y, bugVel.x);
          const mx = pos.x + 15 * Math.cos(angle), my = pos.y + 15 * Math.sin(angle);
          if (Math.hypot(mx - bug.x, my - bug.y) < 30) {
            eating = true; caught += 1; countSpan.textContent = String(caught);
            setTimeout(() => { eating = false; bug.x = Math.random() * c.width; bug.y = Math.random() * c.height; bugVel.x = 0; bugVel.y = 0; }, 200);
          }
        }

        if (!eating) {
          ctx.save(); ctx.translate(bug.x, bug.y); ctx.rotate(bugAngle);
          const flap = Math.sin(frame * 0.5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.save(); ctx.scale(1, flap);
          ctx.beginPath(); ctx.ellipse(-2, -6, 4, 8, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-2, 6, 4, 8, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.ellipse(0, 0, BUG_R, BUG_R / 1.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'red';
          ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(3, 2, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        const dx = target.x - pos.x, dy = target.y - pos.y, ease = idle ? 0.03 : 0.1;
        pos.x += dx * ease; pos.y += dy * ease;
        let da = Math.atan2(dy, dx) - angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.hypot(dx, dy) > 1) angle += da * 0.15;
        const ca = Math.cos(angle), sa = Math.sin(angle);

        legs.forEach((leg, i) => {
          const hip = HIPS[i];
          const hx = pos.x + (hip.x * ca - hip.y * sa), hy = pos.y + (hip.x * sa + hip.y * ca);
          const rest = FEET[i];
          const tx = pos.x + (rest.x * ca - rest.y * sa), ty = pos.y + (rest.x * sa + rest.y * ca);
          if (!leg.isStepping && Math.hypot(leg.currentFoot.x - tx, leg.currentFoot.y - ty) > STEP_THRESHOLD) {
            leg.isStepping = true; leg.targetFoot = { x: tx, y: ty }; leg.stepProgress = 0;
          }
          if (leg.isStepping) {
            leg.stepProgress += STEP_SPEED;
            if (leg.stepProgress >= 1) { leg.stepProgress = 1; leg.isStepping = false; leg.currentFoot = {...leg.targetFoot}; }
            else {
              leg.currentFoot.x += (leg.targetFoot.x - leg.currentFoot.x) * STEP_SPEED;
              leg.currentFoot.y += (leg.targetFoot.y - leg.currentFoot.y) * STEP_SPEED;
            }
          }
          const fx = leg.currentFoot.x, fy = leg.currentFoot.y;
          const lx = fx - hx, ly = fy - hy, upper = hip.y < 0;
          const len = Math.hypot(lx, ly), px = -ly / len, py = lx / len, sign = upper ? -1 : 1;
          const k1x = hx + lx * 0.35 + px * 20 * sign, k1y = hy + ly * 0.35 + py * 20 * sign;
          const k2x = hx + lx * 0.7 + px * 15 * sign, k2y = hy + ly * 0.7 + py * 15 * sign;
          ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.moveTo(hx, hy); ctx.lineTo(k1x, k1y); ctx.lineTo(k2x, k2y); ctx.lineTo(fx, fy); ctx.stroke();
          ctx.fillStyle = '#ff4444';
          ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(k1x, k1y, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(k2x, k2y, 1.5, 0, Math.PI * 2); ctx.fill();
        });

        ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(angle);
        ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(-5, 0, BODY_R, BODY_R * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-2, 0); ctx.lineTo(-10, 5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(-4, 0); ctx.lineTo(4, 5); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(15, 0, HEAD_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const bx = bug.x - pos.x, by = bug.y - pos.y;
        let ba = Math.atan2(by, bx) - angle;
        while (ba > Math.PI) ba -= Math.PI * 2;
        while (ba < -Math.PI) ba += Math.PI * 2;
        const ox = Math.cos(ba) * 2.5, oy = Math.sin(ba) * 2.5;
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(19, -5, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(19, 5, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(19 + ox, -5 + oy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(19 + ox, 5 + oy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(20, -6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 4, 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(17, 0, 3, 0.8, -0.8, true); ctx.stroke();
        if (eating) {
          ctx.strokeStyle = '#44ff44'; ctx.beginPath();
          ctx.moveTo(25, -5); ctx.lineTo(30, -8); ctx.moveTo(25, 5); ctx.lineTo(30, 8); ctx.stroke();
        }
        ctx.restore();

        if (Math.hypot(pos.x - lastWebPos.x, pos.y - lastWebPos.y) > 20) {
          web.push({ x: pos.x, y: pos.y, time: now });
          lastWebPos = { x: pos.x, y: pos.y };
        }
        web = web.filter(p => now - p.time < WEB_LIFE);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.lineWidth = 1;
        web.forEach((p, i) => {
          const a1 = 1 - (now - p.time) / WEB_LIFE;
          if (Math.hypot(pos.x - p.x, pos.y - p.y) < 150) {
            ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * a1})`;
            ctx.moveTo(pos.x, pos.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
          for (let j = i + 1; j < web.length; j++) {
            const q = web[j];
            if (j - i > 20) break;
            if (Math.hypot(p.x - q.x, p.y - q.y) < 80) {
              const a2 = 1 - (now - q.time) / WEB_LIFE, avg = (a1 + a2) / 2;
              ctx.beginPath(); ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * avg})`;
              ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        });
        ctx.globalCompositeOperation = 'source-over';
        this._raf = requestAnimationFrame(loop);
      };
      loop();
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); document.body.style.cursor = 'auto'; }
  }
  if (!customElements.get('spider-layer')) customElements.define('spider-layer', SpiderLayer);
})();
