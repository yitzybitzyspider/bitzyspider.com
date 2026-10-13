// The self-untangling orb web. Used as the hero backdrop on index.html and as the
// full-screen lab at demos/web-untangle.html.
//
//   const web = UntangleWeb(canvas, { layout, transparent, onUpdate, ... });
//   web.start(0 | 1 | 2)   // Tutte embedding | curve-shortening flow | ambient isotopy
//
// With comb: true nothing untangles on its own. Moving the mouse (or a finger)
// through the tangle heats the silk under it; only warm silk relaxes, and each
// point's untangle clock only runs while it is warm. Stop moving and it stops.
//
// The web is a planar graph whose edges are strings. Each mode tangles it a
// different way and lets a different piece of math undo it.
(function () {
  'use strict';

  const MODES = [
    { S: 8,
      name: '01 · Tutte embedding',
      short: "Tutte's spring theorem (1963)",
      formula: 'x<sub>i</sub> = Σ<sub>j</sub> λ<sub>ij</sub> x<sub>j</sub>',
      desc: 'Pin the frame. Let every junction slide to a weighted average of its neighbors. Tutte proved the only place this can come to rest is a drawing with zero crossings, so the knot has no choice but to open.',
      cite: 'W. T. Tutte, How to Draw a Graph, 1963 · weights: Floater, 2003' },
    { S: 20,
      name: '02 · Curve-shortening flow',
      short: 'curve-shortening flow (Grayson, 1987)',
      formula: '∂γ/∂t = κ N',
      desc: 'Every point on a thread moves toward its own center of curvature, fastest where it bends hardest. Kinks iron flat and loops shrink to nothing until each strand is taut.',
      cite: 'Gage and Hamilton, 1986 · Grayson, 1987' },
    { S: 12,
      name: '03 · Ambient isotopy',
      short: "ambient isotopy, knot theory's undo button",
      formula: 'web = φ<sup>−1</sup>(tangle)',
      desc: 'The finished web, stirred through 3D space by five vortices. A stir never cuts a thread, so it can always be run backwards. Knot theory calls two tangles the same exactly when a move like this connects them.',
      cite: 'Reidemeister, 1927 · ambient isotopy' },
  ];

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const rot3 = (v, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), kd = dot(k, v) * (1 - c);
    return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
  };

  // Edge kinds: 0 anchor line, 1 frame, 2 radial, 3 hub mesh, 4 capture spiral
  const NK = 5;
  const KW = [1.1, 1.25, 0.95, 0.75, 0.8];
  const KA = [0.45, 0.72, 0.6, 0.5, 0.46];
  const NB = 9; // depth buckets, drawn back to front for over/under crossings
  const MAX_DOTS = 2500;
  const SPIN_AXIS = norm([0.35, 1, 0.15]);

  const defaultLayout = (w, h) => {
    let rx = w * 0.47, ry = h * 0.44;
    rx = Math.min(rx, ry * 1.55); ry = Math.min(ry, rx * 1.5);
    return { cx: w * 0.5, cy: h * 0.5, rx, ry };
  };

  function UntangleWeb(cvs, opts) {
    opts = opts || {};
    const layout = opts.layout || defaultLayout;
    const transparent = !!opts.transparent;
    const grabRadius = opts.grabRadius || 70;
    const grabTouch = opts.grabTouch !== false;
    const onUpdate = opts.onUpdate || null;
    const comb = !!opts.comb;
    const gust = opts.gust !== undefined ? !!opts.gust : comb; // movement over a finished web stirs it like a breeze
    const breezeFrom = opts.breezeFrom || null; // () => {x, y} in client coords: who makes the breeze (default: the pointer)
    const ctx = cvs.getContext('2d');

    let rnd = Math.random;
    const R = (a, b) => a + (b - a) * rnd();
    const randUnit = () => { const z = R(-1, 1), a = R(0, TAU), r = Math.sqrt(1 - z * z); return [r * Math.cos(a), r * Math.sin(a), z]; };

    let W = 0, H = 0, DPR = 1, Rx = 0, Ry = 0, Rm = 0, ZR = 1, FOCAL = 1, glow = null;
    const hub = { x: 0, y: 0 };
    const webSeed = (Math.random() * 2 ** 31) | 0;

    // coarse graph (junctions)
    let poly = [], nNodes = 0, nEdges = 0, Q = 0;
    let NX, NY, NFIX, NODEQ, EA, EB, EK, NBS, NBI, NBW;
    // fine simulation (junctions + the points along every strand)
    let S = 8, N = 0, X, Y, Z, VX, VY, VZ, PX, PY, TX, TY, EGX, EGY, STIFF;

    let mode = 0, T = 0, phys = true, vort = [], stirred = null;
    let grab = -1, gx = 0, gy = 0, dragMax = 0;
    let crossings = 0, nCross = 0, showDots = opts.dots !== false;
    const crossPts = new Float32Array(2 * MAX_DOTS);
    let phase = 'tangle', doneAt = -1, releaseT = 0, wind = 0, doneIn = null, doneHow = '';
    // comb mode: HT = heat (how recently the pointer swept past), PG = untangle time earned
    let HT, PG, combed = 0, lastCX = null, lastCY = null, lastBX = null, lastBY = null;

    // ------------------------------------------------------------------
    // Build the target orb web: frame polygon, radials, hub, capture spiral.
    // ------------------------------------------------------------------
    function convex(p) {
      let sign = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
        const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (Math.abs(cr) < 1e-6) return false;
        const s = Math.sign(cr);
        if (!sign) sign = s; else if (s !== sign) return false;
      }
      return true;
    }

    function rayPoly(dx, dy) {
      let best = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
        const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const wx = ax - hub.x, wy = ay - hub.y;
        const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
      }
      return best;
    }

    function rayRect(px, py, dx, dy) {
      const m = 30;
      const tx = dx > 0 ? (W + m - px) / dx : dx < 0 ? (-m - px) / dx : Infinity;
      const ty = dy > 0 ? (H + m - py) / dy : dy < 0 ? (-m - py) / dy : Infinity;
      return Math.min(tx, ty);
    }

    function distPoly(x, y) {
      let best = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
        const ex = bx - ax, ey = by - ay;
        const t = clamp(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey), 0, 1);
        best = Math.min(best, Math.hypot(ax + ex * t - x, ay + ey * t - y));
      }
      return best;
    }

    // Mean value coordinates: positive weights that make the designed web the
    // exact resting state of the averaging rule (Floater 2003). Tutte/Floater
    // then guarantee that resting state is the only one, and it has no crossings.
    function mvc(i, list) {
      const x0 = NX[i], y0 = NY[i];
      const nb = list.map(j => ({ j, a: Math.atan2(NY[j] - y0, NX[j] - x0), r: Math.hypot(NX[j] - x0, NY[j] - y0) }));
      nb.sort((p, q) => p.a - q.a);
      const n = nb.length, gaps = [];
      for (let s = 0; s < n; s++) {
        const g = (s === n - 1 ? nb[0].a + TAU : nb[s + 1].a) - nb[s].a;
        gaps.push(Math.min(g, Math.PI - 0.06));
      }
      let sum = 0;
      const w = nb.map((p, s) => {
        const v = (Math.tan(gaps[(s - 1 + n) % n] / 2) + Math.tan(gaps[s] / 2)) / Math.max(p.r, 1e-3);
        sum += v; return v;
      });
      return nb.map((p, s) => [p.j, w[s] / sum]);
    }

    function buildWeb() {
      rnd = mulberry32(webSeed);
      const L = layout(W, H);
      hub.x = L.cx; hub.y = L.cy; Rx = L.rx; Ry = L.ry;
      Rm = Math.min(Rx, Ry); ZR = Rm * 0.45; FOCAL = Rm * 3.2;

      const nodes = [], edges = [];
      const node = (x, y, f = 0) => (nodes.push([x, y, f]), nodes.length - 1);
      const edge = (a, b, k) => edges.push([a, b, k]);

      for (let tries = 0; tries < 200; tries++) {
        const F = 7, rot = R(0, TAU);
        poly = [];
        for (let i = 0; i < F; i++) {
          const a = rot + (i + R(-0.3, 0.3)) * TAU / F, s = R(0.84, 1);
          poly.push([hub.x + Math.cos(a) * Rx * s, hub.y + Math.sin(a) * Ry * s]);
        }
        if (convex(poly)) break;
      }

      const m = Rm < 260 ? 17 : 21, rot = R(0, TAU), rad = [];
      for (let k = 0; k < m; k++) {
        const th = rot + (k + R(-0.18, 0.18)) * TAU / m, dx = Math.cos(th), dy = Math.sin(th);
        rad.push({ dx, dy, d: rayPoly(dx, dy) });
      }

      // Boundary: frame corners plus the points where radials meet the frame. All pinned.
      const ring = poly.map(p => ({ x: p[0], y: p[1], a: Math.atan2(p[1] - hub.y, p[0] - hub.x), k: -1 }))
        .concat(rad.map((r, k) => ({ x: hub.x + r.dx * r.d, y: hub.y + r.dy * r.d, a: Math.atan2(r.dy, r.dx), k })));
      ring.sort((p, q) => p.a - q.a);
      ring.forEach(p => (p.id = node(p.x, p.y, 1)));
      ring.forEach((p, i) => edge(p.id, ring[(i + 1) % ring.length].id, 1));
      const B = [];
      ring.forEach(p => {
        if (p.k >= 0) { B[p.k] = p.id; return; }
        const ex = p.x - hub.x, ey = p.y - hub.y, l = Math.hypot(ex, ey);
        const t = rayRect(p.x, p.y, ex / l, ey / l);
        edge(p.id, node(p.x + ex / l * t, p.y + ey / l * t, 1), 0);
      });

      const h0 = node(hub.x, hub.y), h1 = [], h2 = [];
      rad.forEach((r, k) => {
        h1[k] = node(hub.x + r.dx * r.d * 0.045, hub.y + r.dy * r.d * 0.045);
        h2[k] = node(hub.x + r.dx * r.d * 0.105, hub.y + r.dy * r.d * 0.105);
      });
      for (let k = 0; k < m; k++) {
        edge(h0, h1[k], 3); edge(h1[k], h1[(k + 1) % m], 3);
        edge(h1[k], h2[k], 2); edge(h2[k], h2[(k + 1) % m], 3);
      }

      const turns = clamp(Math.round(Rm * 0.66 / 25), 6, 12), f0 = 0.24, f1 = 0.9;
      Q = turns * m;
      const sp = [];
      for (let q = 0; q < Q; q++) {
        const r = rad[q % m], f = f0 + (f1 - f0) * q / (Q - 1) + R(-0.004, 0.004);
        sp[q] = node(hub.x + r.dx * r.d * f, hub.y + r.dy * r.d * f);
        if (q) edge(sp[q - 1], sp[q], 4);
      }
      for (let k = 0; k < m; k++) {
        let prev = h2[k];
        for (let t = 0; t < turns; t++) { edge(prev, sp[t * m + k], 2); prev = sp[t * m + k]; }
        edge(prev, B[k], 2);
      }

      nNodes = nodes.length; nEdges = edges.length;
      NX = new Float32Array(nNodes); NY = new Float32Array(nNodes);
      NFIX = new Uint8Array(nNodes); NODEQ = new Int32Array(nNodes).fill(-1);
      nodes.forEach((n, i) => { NX[i] = n[0]; NY[i] = n[1]; NFIX[i] = n[2]; });
      sp.forEach((id, q) => (NODEQ[id] = q));
      EA = Int32Array.from(edges, e => e[0]);
      EB = Int32Array.from(edges, e => e[1]);
      EK = Uint8Array.from(edges, e => e[2]);

      const adj = nodes.map(() => []);
      edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
      NBS = new Int32Array(nNodes + 1);
      const idx = [], wts = [];
      for (let i = 0; i < nNodes; i++) {
        NBS[i] = idx.length;
        if (!NFIX[i]) mvc(i, adj[i]).forEach(([j, w]) => { idx.push(j); wts.push(w); });
      }
      NBS[nNodes] = idx.length;
      NBI = Int32Array.from(idx); NBW = Float32Array.from(wts);

      glow = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, Math.max(W, H) * 0.7);
      glow.addColorStop(0, 'rgba(220,38,38,0.075)');
      glow.addColorStop(1, 'rgba(220,38,38,0)');
      rnd = Math.random;
    }

    function allocSim(s) {
      S = s; N = nNodes + nEdges * (S - 1);
      X = new Float32Array(N); Y = new Float32Array(N); Z = new Float32Array(N);
      VX = new Float32Array(N); VY = new Float32Array(N); VZ = new Float32Array(N);
      PX = new Float32Array(N); PY = new Float32Array(N);
      TX = new Float32Array(N); TY = new Float32Array(N); HT = new Float32Array(N); PG = new Float32Array(N);
      TX.set(NX); TY.set(NY);
      for (let e = 0; e < nEdges; e++) {
        const a = EA[e], b = EB[e], base = nNodes + e * (S - 1);
        for (let j = 1; j < S; j++) {
          const t = j / S;
          TX[base + j - 1] = NX[a] + (NX[b] - NX[a]) * t;
          TY[base + j - 1] = NY[a] + (NY[b] - NY[a]) * t;
        }
      }
      // Spiral threads sag toward the hub like real capture silk: a constant pull g
      // on every strand point makes the chain's resting shape a parabola of depth gS²/4.
      EGX = new Float32Array(nEdges); EGY = new Float32Array(nEdges);
      for (let e = 0; e < nEdges; e++) {
        if (EK[e] !== 4) continue;
        const a = EA[e], b = EB[e], dx = NX[b] - NX[a], dy = NY[b] - NY[a], L = Math.hypot(dx, dy);
        let nx = -dy / L, ny = dx / L;
        if ((hub.x - (NX[a] + NX[b]) / 2) * nx + (hub.y - (NY[a] + NY[b]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
        const depth = 0.09 * L, g = depth * 4 / (S * S), base = nNodes + e * (S - 1);
        EGX[e] = nx * g; EGY[e] = ny * g;
        for (let j = 1; j < S; j++) {
          const t = j / S;
          TX[base + j - 1] += nx * depth * 4 * t * (1 - t);
          TY[base + j - 1] += ny * depth * 4 * t * (1 - t);
        }
      }
      X.set(TX); Y.set(TY);

      // How much a breeze may move each point: nothing at the dense hub or right at the
      // pinned frame (threads meet there at tight angles), fully free in between.
      STIFF = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const dh = Math.hypot(TX[i] - hub.x, TY[i] - hub.y);
        STIFF[i] = smooth(Rm * 0.1, Rm * 0.35, dh) * smooth(0, Rm * 0.15, distPoly(TX[i], TY[i]));
      }
    }

    // ------------------------------------------------------------------
    // Tangles
    // ------------------------------------------------------------------

    // 01: wind the capture spiral into a ball of yarn and stuff the hub inside it.
    function tangleYarn() {
      const rb = Rm * 0.34, M = 1500;
      const yx = new Float32Array(M), yy = new Float32Array(M), yz = new Float32Array(M);
      let d = randUnit(), ax = norm(cross(d, randUnit()));
      const step = 24 * TAU / M, p1 = R(0, TAU), p2 = R(0, TAU);
      for (let i = 0; i < M; i++) {
        d = rot3(d, ax, step);
        const w = randUnit();
        ax = [ax[0] + w[0] * 0.1, ax[1] + w[1] * 0.1, ax[2] + w[2] * 0.1];
        const k = dot(ax, d);
        ax = norm([ax[0] - d[0] * k, ax[1] - d[1] * k, ax[2] - d[2] * k]);
        const r = rb * (0.8 + 0.2 * Math.sin(i * 0.023 + p1) * Math.cos(i * 0.0071 + p2));
        yx[i] = hub.x + d[0] * r; yy[i] = hub.y + d[1] * r; yz[i] = d[2] * r;
      }
      const at = (u, i) => {
        const f = clamp(u, 0, 1) * (M - 1), s = Math.min(M - 2, f | 0), t = f - s;
        X[i] = yx[s] + (yx[s + 1] - yx[s]) * t; Y[i] = yy[s] + (yy[s + 1] - yy[s]) * t; Z[i] = yz[s] + (yz[s + 1] - yz[s]) * t;
      };
      const uq = q => 0.02 + 0.96 * q / (Q - 1);

      for (let i = 0; i < nNodes; i++) {
        if (NFIX[i]) continue;
        if (NODEQ[i] >= 0) at(uq(NODEQ[i]), i);
        else {
          const v = randUnit(), r = rb * 0.4 * Math.cbrt(rnd());
          X[i] = hub.x + v[0] * r; Y[i] = hub.y + v[1] * r; Z[i] = v[2] * r;
        }
      }
      for (let e = 0; e < nEdges; e++) {
        const a = EA[e], b = EB[e], base = nNodes + e * (S - 1);
        if (NFIX[a] && NFIX[b]) continue; // frame and anchor lines stay taut
        if (EK[e] === 4) {
          const ua = uq(NODEQ[a]), ub = uq(NODEQ[b]);
          for (let j = 1; j < S; j++) at(ua + (ub - ua) * j / S, base + j - 1);
          continue;
        }
        const dx = X[b] - X[a], dy = Y[b] - Y[a], dz = Z[b] - Z[a], L = Math.hypot(dx, dy, dz);
        const n = norm(cross([dx, dy, dz], randUnit()));
        const amp = NFIX[a] || NFIX[b] ? L * 0.02 : Math.min(L * R(0.1, 0.35), rb * 0.5);
        for (let j = 1; j < S; j++) {
          const t = j / S, env = Math.sin(Math.PI * t) * amp, i = base + j - 1;
          X[i] = X[a] + dx * t + n[0] * env; Y[i] = Y[a] + dy * t + n[1] * env; Z[i] = Z[a] + dz * t + n[2] * env;
        }
      }
    }

    // 02: leave the skeleton roughly in place but scribble every thread into loops.
    // (Under comb the frame stays taut, so no loops hide out at the faded edges.)
    function tangleScribble() {
      for (let i = 0; i < nNodes; i++) if (!NFIX[i]) { X[i] += R(-7, 7); Y[i] += R(-7, 7); }
      for (let e = 0; e < nEdges; e++) {
        if (EK[e] === 0 || (comb && EK[e] === 1)) continue;
        const a = EA[e], b = EB[e], base = nNodes + e * (S - 1);
        const ax = X[a], ay = Y[a], dx = X[b] - ax, dy = Y[b] - ay, L = Math.hypot(dx, dy);
        const A1 = R(0.2, 0.42) * L + R(3, 10), f1 = R(0.9, 2.1) * (rnd() < 0.5 ? -1 : 1), p1 = R(0, TAU);
        const A2 = R(0.04, 0.12) * L, f2 = R(2.5, 4.5), p2 = R(0, TAU);
        const Az = R(8, 30) * (rnd() < 0.5 ? -1 : 1), fz = R(0.5, 1.6), pz = R(0, TAU);
        for (let j = 1; j < S; j++) {
          const t = j / S, env = Math.sin(Math.PI * t), a1 = TAU * f1 * t + p1, a2 = TAU * f2 * t + p2, i = base + j - 1;
          X[i] = ax + dx * t + env * (A1 * Math.cos(a1) + A2 * Math.cos(a2));
          Y[i] = ay + dy * t + env * (A1 * Math.sin(a1) + A2 * Math.sin(a2));
          Z[i] = env * Az * Math.sin(TAU * fz * t + pz);
        }
      }
    }

    // 03: stir the finished web with a sequence of 3D twist maps (each a rotation
    // whose angle fades with distance, so it is a smooth invertible map of space).
    function tangleIsotopy() {
      vort = [];
      for (let q = 0; q < 5; q++) {
        const a = R(0, TAU), r = Math.sqrt(rnd()) * 0.42;
        const x = hub.x + Math.cos(a) * Rx * r, y = hub.y + Math.sin(a) * Ry * r;
        const sup = Math.min(Rm * 0.62, distPoly(x, y) - 6);
        const psi = R(0.55, 1.45), phi = R(0, TAU);
        vort.push({ x, y, r2: sup * sup,
          kx: Math.sin(psi) * Math.cos(phi), ky: Math.sin(psi) * Math.sin(phi), kz: Math.cos(psi),
          th: (rnd() < 0.5 ? -1 : 1) * R(1.3, 2.3) * Math.PI, a0: q * 0.17, a1: q * 0.17 + 0.32 });
      }
      applyIsotopy(() => 1);
      // only points the stir actually moved have to be combed back
      stirred = new Uint8Array(N);
      for (let i = 0; i < N; i++) stirred[i] = Math.abs(X[i] - TX[i]) + Math.abs(Y[i] - TY[i]) + Math.abs(Z[i]) > 0.5 ? 1 : 0;
    }

    // sOf(i) is how stirred point i is: 1 = fully tangled, 0 = back in the web.
    function applyIsotopy(sOf) {
      for (let i = 0; i < N; i++) {
        let x = TX[i], y = TY[i], z = 0;
        const s = sOf(i);
        for (let q = 0; q < vort.length; q++) {
          const v = vort[q], pq = smooth(v.a0, v.a1, s);
          if (pq <= 0) continue;
          const dx = x - v.x, dy = y - v.y, dz = z, r2 = dx * dx + dy * dy + dz * dz;
          if (r2 >= v.r2) continue;
          const g = 1 - r2 / v.r2, ang = v.th * pq * g * g * g;
          const c = Math.cos(ang), sn = Math.sin(ang), kx = v.kx, ky = v.ky, kz = v.kz;
          const kd = (kx * dx + ky * dy + kz * dz) * (1 - c);
          const cx = ky * dz - kz * dy, cy = kz * dx - kx * dz, cz = kx * dy - ky * dx;
          x = v.x + dx * c + cx * sn + kx * kd;
          y = v.y + dy * c + cy * sn + ky * kd;
          z = dz * c + cz * sn + kz * kd;
        }
        X[i] = x; Y[i] = y; Z[i] = z;
      }
    }

    // ------------------------------------------------------------------
    // Dynamics: one rule. Junctions move toward their weighted neighbor average
    // (Tutte); strand points move toward the midpoint of their two neighbors
    // (the discrete curve-shortening / heat flow). Momentum adds a silk spring.
    // Don't add forces that pull many junctions toward one point: that acts like an
    // extra vertex wired across faces, the graph stops being planar, and Tutte's
    // no-crossing guarantee is gone.
    // ------------------------------------------------------------------

    // Step sizes (junction, strand, momentum) as a function of how long a point
    // has been untangling. Tutte starts slow and tense while the noise drains
    // out, then the bloom accelerates.
    const tutteN = t => 0.045 * smooth(0.5, 1.4, t) + 0.45 * smooth(4.5, 7.5, t);
    const SCHED = [
      { n: tutteN, s: t => Math.min(0.5, tutteN(t) * 3), b: t => (t < 5 ? 0.6 : 0.6 - 0.1 * smooth(5, 7, t)), iters: 1 },
      { n: () => 0.5, s: t => 0.07 * smooth(0.4, 1.2, t) + 0.7 * smooth(3.2, 6.5, t), b: () => 0.35, iters: 1 },
      { n: () => 0.5, s: () => 0.5, b: () => 0.55, iters: 2 }, // isotopy, once the rewind is over
    ];
    // Once untangled every mode uses one springiness, so junctions and threads sway
    // together in a breeze instead of shearing past each other. A strand's slowest
    // mode decays like 1/S², so finely divided strands get extra passes to keep up.
    const SETTLED = { n: () => 0.5, s: () => 0.5, b: () => 0.5, iters: 1 };
    const COMB_SPEED = 5; // seconds of untangle clock per second of full heat

    function relax(sc) {
      if (comb && phase === 'done') sc = SETTLED;
      const wz = wind * 0.14, ws = wind * 0.05, wt = T * 0.7;
      // Without comb (or once untangled) every point shares one clock and is fully live.
      const uniform = !comb || phase === 'done', tu = comb ? 99 : T;
      const aN0 = sc.n(tu), aS0 = sc.s(tu), b0 = sc.b(tu);
      for (let it = 0; it < sc.iters; it++) {
        for (let i = 0; i < nNodes; i++) {
          if (NFIX[i] || i === grab) continue;
          let a = aN0, beta = b0;
          if (!uniform) {
            const h = HT[i];
            if (!h) continue;
            const t = PG[i] * COMB_SPEED;
            a = sc.n(t) * h; beta = sc.b(t);
          }
          if (!a) continue;
          let tx = 0, ty = 0, tz = 0;
          for (let s = NBS[i], e = NBS[i + 1]; s < e; s++) {
            const j = NBI[s], w = NBW[s];
            tx += w * X[j]; ty += w * Y[j]; tz += w * Z[j];
          }
          if (wz) tz += wz * Math.sin(wt + X[i] * 0.0035 + Y[i] * 0.0021);
          VX[i] = beta * VX[i] + a * (tx - X[i]); X[i] += VX[i];
          VY[i] = beta * VY[i] + a * (ty - Y[i]); Y[i] += VY[i];
          VZ[i] = beta * VZ[i] + a * (tz - Z[i]); Z[i] += VZ[i];
        }
        const passes = sc === SETTLED ? Math.max(1, Math.round((S / 8) ** 2)) : 1;
        for (let pass = 0; pass < passes; pass++) for (let e = 0; e < nEdges; e++) {
          const base = nNodes + e * (S - 1), last = EB[e], gX = EGX[e], gY = EGY[e];
          let p = EA[e];
          for (let j = 1; j < S; j++) {
            const i = base + j - 1, n = j === S - 1 ? last : i + 1;
            let a = aS0, beta = b0;
            if (!uniform) {
              const h = HT[i];
              if (h) { const t = PG[i] * COMB_SPEED; a = sc.s(t) * h; beta = sc.b(t); } else a = 0;
            }
            if (!a) { p = i; continue; }
            let tz = 0.5 * (Z[p] + Z[n]);
            if (ws) tz += ws * Math.sin(wt + X[i] * 0.0035 + Y[i] * 0.0021);
            VX[i] = beta * VX[i] + a * (0.5 * (X[p] + X[n]) + gX - X[i]); X[i] += VX[i];
            VY[i] = beta * VY[i] + a * (0.5 * (Y[p] + Y[n]) + gY - Y[i]); Y[i] += VY[i];
            VZ[i] = beta * VZ[i] + a * (tz - Z[i]); Z[i] += VZ[i];
            p = i;
          }
        }
      }
    }

    function spin(ang) {
      const [kx, ky, kz] = SPIN_AXIS, c = Math.cos(ang), s = Math.sin(ang), r2 = (Rm * 0.42) ** 2;
      for (let i = 0; i < N; i++) {
        if (i < nNodes && NFIX[i]) continue;
        const dx = X[i] - hub.x, dy = Y[i] - hub.y, dz = Z[i];
        if (dx * dx + dy * dy + dz * dz > r2) continue; // only the ball turns, not the taut frame
        const kd = (kx * dx + ky * dy + kz * dz) * (1 - c);
        X[i] = hub.x + dx * c + (ky * dz - kz * dy) * s + kx * kd;
        Y[i] = hub.y + dy * c + (kz * dx - kx * dz) * s + ky * kd;
        Z[i] = dz * c + (kx * dy - ky * dx) * s + kz * kd;
      }
    }

    // The pointer passing (x, y), heading (ux, uy): warm the silk within r (comb), and
    // give it a small push along the heading plus a lift (gust). Every point gets the
    // same smooth push so the web sways as one sheet and springs back; pushing strands
    // harder than their junctions bows them into their neighbors near the dense hub.
    function touchAt(x, y, r, ux, uy, g, warm) {
      const r2 = r * r;
      let n = 0;
      for (let i = 0; i < N; i++) {
        if (i < nNodes && NFIX[i]) continue;
        const dx = PX[i] - x, dy = PY[i] - y, d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        if (warm) {
          const h = Math.min(1, 2 * (1 - Math.sqrt(d2) / r));
          if (h > HT[i]) { HT[i] = h; n++; }
        }
        if (g) {
          const f = 1 - d2 / r2, w = f * f * g * STIFF[i];
          VX[i] += ux * w; VY[i] += uy * w; VZ[i] += w;
        }
      }
      return n;
    }

    // Warm silk earns untangle time and cools off within a fraction of a second.
    function cool() {
      for (let i = 0; i < N; i++) {
        let h = HT[i];
        if (!h) continue;
        PG[i] += h / 60;
        h *= 0.965;
        if (h < 0.02) { h = 0; VX[i] = VY[i] = VZ[i] = 0; }
        HT[i] = h;
      }
    }

    // Sweep from the last pointer position to this one, combing and gusting along the way.
    function combTo(clientX, clientY) {
      if (!X) return;
      const r = cvs.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
      if (lastCX !== null) {
        const dx = x - lastCX, dy = y - lastCY, d = Math.hypot(dx, dy);
        const warm = comb && phase !== 'done';
        if (d > 0.5 && d < 400 && (warm || gust)) { // a bigger jump is the pointer re-entering, not a sweep
          const n = Math.ceil(d / 25), rad = Math.max(80, Rm * 0.45);
          // the breeze only stirs a finished web; while combing it's pure combing
          const g = gust && !breezeFrom && phase === 'done' ? Math.min(0.35, d * 0.03) / n : 0;
          let hit = 0;
          for (let k = 1; k <= n; k++) hit += touchAt(lastCX + dx * k / n, lastCY + dy * k / n, rad, dx / d, dy / d, g, warm);
          if (hit) combed += d / 600;
        }
      }
      lastCX = x; lastCY = y;
    }

    // Breeze from whoever walks across the finished web (the spider): push only, never comb.
    function breezeTo(clientX, clientY) {
      if (!X) return;
      const r = cvs.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
      if (lastBX !== null && phase === 'done') {
        const dx = x - lastBX, dy = y - lastBY, d = Math.hypot(dx, dy);
        if (d > 0.3 && d < 400) {
          const n = Math.ceil(d / 25), rad = Math.max(80, Rm * 0.45), g = Math.min(0.28, d * 0.025) / n;
          for (let k = 1; k <= n; k++) touchAt(lastBX + dx * k / n, lastBY + dy * k / n, rad, dx / d, dy / d, g, false);
        }
      }
      lastBX = x; lastBY = y;
    }

    // Isotopy under comb: each point rewinds only as far as its own earned time.
    function rewindByComb() {
      let left = false;
      applyIsotopy(i => {
        const tau = clamp(PG[i] * COMB_SPEED / 6.5, 0, 1);
        if (tau < 1 && stirred[i]) left = true;
        return 1 - easeInOut(tau);
      });
      if (!left) phys = true;
    }

    function tick() {
      T += 1 / 60;
      if (comb && phase !== 'done') cool();
      if (grab >= 0) { X[grab] = gx; Y[grab] = gy; Z[grab] = 0; VX[grab] = VY[grab] = VZ[grab] = 0; }
      const wTarget = phase === 'done' && T - doneAt > 0.6 ? 1 : 0;
      wind += (wTarget - wind) * 0.01;

      if (mode === 0) {
        // the ball idles in a slow spin until someone starts combing it
        const sp = comb ? 0.35 * (1 - smooth(0, 0.6, combed)) : 0.9 * (1 - smooth(0.2, 1.8, T));
        if (sp > 1e-3 && grab < 0) spin(sp / 60);
        relax(SCHED[0]);
      } else if (mode === 1) {
        relax(SCHED[1]);
      } else if (!phys) {
        // crossing-free already: hand any last stirred threads to the springs to settle
        if (comb && phase === 'done') { phys = true; relax(SCHED[2]); }
        else if (comb) rewindByComb();
        else {
          const tau = (T - 0.6) / 6.5, s = 1 - easeInOut(clamp(tau, 0, 1));
          applyIsotopy(() => s);
          if (tau >= 1) phys = true;
        }
      } else {
        relax(SCHED[2]);
      }
    }

    // ------------------------------------------------------------------
    // Crossing counter: every pair of projected strand segments, bucketed
    // in a uniform grid so it stays cheap.
    // ------------------------------------------------------------------
    let SX0, SY0, SX1, SY1, cellCnt, cellCur, cellItems;
    function countCrossings() {
      const nSeg = nEdges * S;
      if (!SX0 || SX0.length < nSeg) {
        SX0 = new Float32Array(nSeg); SY0 = new Float32Array(nSeg); SX1 = new Float32Array(nSeg); SY1 = new Float32Array(nSeg);
      }
      let s = 0;
      for (let e = 0; e < nEdges; e++) {
        const base = nNodes + e * (S - 1);
        let p = EA[e];
        for (let j = 1; j <= S; j++) {
          const c = j === S ? EB[e] : base + j - 1;
          SX0[s] = PX[p]; SY0[s] = PY[p]; SX1[s] = PX[c]; SY1[s] = PY[c]; s++; p = c;
        }
      }
      const cs = 24, gw = Math.ceil(W / cs) + 1, gh = Math.ceil(H / cs) + 1, nc = gw * gh;
      if (!cellCnt || cellCnt.length < nc + 1) { cellCnt = new Int32Array(nc + 1); cellCur = new Int32Array(nc); }
      else cellCnt.fill(0, 0, nc + 1);
      const cxf = v => { v = Math.floor(v / cs); return v < 0 ? 0 : v >= gw ? gw - 1 : v; };
      const cyf = v => { v = Math.floor(v / cs); return v < 0 ? 0 : v >= gh ? gh - 1 : v; };

      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < nSeg; i++) {
          const x0 = cxf(Math.min(SX0[i], SX1[i])), x1 = cxf(Math.max(SX0[i], SX1[i]));
          const y0 = cyf(Math.min(SY0[i], SY1[i])), y1 = cyf(Math.max(SY0[i], SY1[i]));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if (pass === 0) cellCnt[y * gw + x + 1]++;
            else cellItems[cellCur[y * gw + x]++] = i;
          }
        }
        if (pass === 0) {
          for (let c = 1; c <= nc; c++) cellCnt[c] += cellCnt[c - 1];
          cellCur.set(cellCnt.subarray(0, nc));
          if (!cellItems || cellItems.length < cellCnt[nc]) cellItems = new Int32Array((cellCnt[nc] * 1.5) | 0);
        }
      }

      let cnt = 0, np = 0;
      for (let c = 0; c < nc; c++) {
        const a = cellCnt[c], b = cellCnt[c + 1];
        if (b - a < 2) continue;
        const ccx = c % gw, ccy = (c / gw) | 0;
        for (let i = a; i < b; i++) {
          const s1 = cellItems[i], x0 = SX0[s1], y0 = SY0[s1], d1x = SX1[s1] - x0, d1y = SY1[s1] - y0;
          for (let j = i + 1; j < b; j++) {
            const s2 = cellItems[j], qx = SX0[s2], qy = SY0[s2], d2x = SX1[s2] - qx, d2y = SY1[s2] - qy;
            const den = d1x * d2y - d1y * d2x;
            if (den > -1e-9 && den < 1e-9) continue;
            const ex = qx - x0, ey = qy - y0;
            const t = (ex * d2y - ey * d2x) / den;
            if (t <= 1e-4 || t >= 1 - 1e-4) continue;
            const u = (ex * d1y - ey * d1x) / den;
            if (u <= 1e-4 || u >= 1 - 1e-4) continue;
            const ix = x0 + t * d1x, iy = y0 + t * d1y;
            if (cxf(ix) !== ccx || cyf(iy) !== ccy) continue; // count each crossing once
            cnt++;
            // reservoir sample so the dots stay evenly spread when there are thousands
            const slot = np < MAX_DOTS ? np++ : (Math.random() * cnt) | 0;
            if (slot < MAX_DOTS) { crossPts[2 * slot] = ix; crossPts[2 * slot + 1] = iy; }
          }
        }
      }
      crossings = cnt; nCross = np;
    }

    // ------------------------------------------------------------------
    // Render: perspective project, bucket segments by depth, draw back to
    // front with a halo under each thread so near strands cut gaps in far
    // ones (the over/under look of a knot diagram).
    // ------------------------------------------------------------------
    function render() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (transparent) ctx.clearRect(0, 0, W, H);
      else {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      }

      for (let i = 0; i < N; i++) {
        const s = FOCAL / (FOCAL + Z[i]);
        PX[i] = hub.x + (X[i] - hub.x) * s;
        PY[i] = hub.y + (Y[i] - hub.y) * s;
      }

      const halo = [], thr = [], used = new Uint8Array(NB), inv = 1 / ZR, half = (NB - 1) / 2;
      for (let b = 0; b < NB; b++) { halo.push(new Path2D()); for (let k = 0; k < NK; k++) thr.push(new Path2D()); }
      for (let e = 0; e < nEdges; e++) {
        const k = EK[e], base = nNodes + e * (S - 1);
        let p = EA[e], lb = -1;
        for (let j = 1; j <= S; j++) {
          const c = j === S ? EB[e] : base + j - 1;
          let b = Math.round((1 - (Z[p] + Z[c]) * 0.5 * inv) * half);
          b = b < 0 ? 0 : b >= NB ? NB - 1 : b;
          const hp = halo[b], tp = thr[b * NK + k];
          if (b !== lb) { hp.moveTo(PX[p], PY[p]); tp.moveTo(PX[p], PY[p]); used[b] = 1; lb = b; }
          hp.lineTo(PX[c], PY[c]); tp.lineTo(PX[c], PY[c]);
          p = c;
        }
      }

      let nUsed = 0, only = 0;
      for (let b = 0; b < NB; b++) if (used[b]) { nUsed++; only = b; }
      ctx.lineJoin = 'round';
      for (let b = 0; b < NB; b++) {
        if (!used[b]) continue;
        const d = b / half - 1, am = 1 + 0.68 * Math.min(0, d), wm = 1 + 0.6 * d;
        if (nUsed > 1) {
          // on a transparent canvas the halo erases instead of painting black
          if (transparent) ctx.globalCompositeOperation = 'destination-out';
          ctx.lineCap = 'butt'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3 + 1.5 * wm; ctx.stroke(halo[b]);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.lineCap = 'round';
        for (let k = 0; k < NK; k++) {
          ctx.strokeStyle = `rgba(236,236,242,${(KA[k] * am).toFixed(3)})`;
          ctx.lineWidth = KW[k] * wm;
          ctx.stroke(thr[b * NK + k]);
        }
      }

      // a slow sheen of light across the silk once it is untangled
      if (nUsed === 1 && phase === 'done') {
        const fade = smooth(doneAt + 0.4, doneAt + 2.2, T);
        const ph = ((T - doneAt) * 0.12) % 1.8 - 0.4;
        if (fade > 0) {
          const g = ctx.createLinearGradient(0, 0, W, H);
          const st = (o, a) => { const v = ph + o; if (v >= 0 && v <= 1) g.addColorStop(v, `rgba(255,255,255,${a})`); };
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          st(-0.12, 0); st(0, (0.5 * fade).toFixed(3)); st(0.12, 0);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = g; ctx.lineWidth = 1.2;
          ctx.stroke(thr[only * NK + 4]); ctx.stroke(thr[only * NK + 2]);
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      if (showDots && nCross) {
        // dense tangles get a faint red haze, the last few crossings glow solid
        ctx.fillStyle = `rgba(239,68,68,${clamp(18 / Math.sqrt(crossings), 0.12, 0.9).toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < nCross; i++) {
          const x = crossPts[2 * i], y = crossPts[2 * i + 1];
          ctx.moveTo(x + 1.6, y); ctx.arc(x, y, 1.6, 0, TAU);
        }
        ctx.fill();
      }
    }

    // ------------------------------------------------------------------
    // Status: phase machine + callback for whatever HUD the page has.
    //   tangle -> done            (untangled on its own)
    //   drag -> release -> done   (someone pulled a junction and let go)
    // ------------------------------------------------------------------
    function info() {
      return { mode, T, crossings, phase, doneIn, doneHow, dragging: grab >= 0, N, nEdges };
    }

    function updateStatus() {
      if (grab >= 0) dragMax = Math.max(dragMax, crossings);
      else if (crossings === 0 && ((phase === 'tangle' && T > 0.3) || phase === 'release')) {
        doneHow = phase; doneIn = phase === 'tangle' ? T : T - releaseT;
        phase = 'done'; doneAt = T;
      }
      if (onUpdate) onUpdate(info());
    }

    function start(m) {
      mode = m;
      allocSim(MODES[m].S);
      rnd = Math.random;
      T = 0; phys = m !== 2; grab = -1; phase = 'tangle'; doneAt = -1; wind = 0; doneIn = null; doneHow = '';
      HT.fill(comb ? 0 : 1); PG.fill(0); combed = 0;
      if (m === 0) tangleYarn(); else if (m === 1) tangleScribble(); else tangleIsotopy();
      if (opts.onGrab) opts.onGrab(false);
    }

    function settle() {
      X.set(TX); Y.set(TY); Z.fill(0); VX.fill(0); VY.fill(0); VZ.fill(0);
      HT.fill(1); PG.fill(99);
      phys = true; phase = 'done'; doneAt = T; doneHow = 'settled'; doneIn = 0;
    }

    // ------------------------------------------------------------------
    // Input: grab the nearest junction and drag it; let go and it heals.
    // ------------------------------------------------------------------
    const local = e => { const r = cvs.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onMove = e => { if (grab >= 0) [gx, gy] = local(e); };
    const onUp = () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onUp);
      if (grab < 0) return;
      grab = -1; releaseT = T;
      if (dragMax || crossings) phase = 'release';
      else { phase = 'done'; doneAt = T; doneHow = 'nodrag'; doneIn = 0; }
      if (opts.onGrab) opts.onGrab(false);
    };
    (opts.eventTarget || cvs).addEventListener('pointerdown', e => {
      if (!X || e.button !== 0) return;
      if (e.target.closest && e.target.closest('a, button, input, select, textarea, summary, label')) return;
      if (!grabTouch && e.pointerType !== 'mouse') return;
      if (comb && phase === 'tangle') return; // comb it out first, then pull it into a knot
      const [x, y] = local(e);
      let best = -1, bd = grabRadius * grabRadius;
      for (let i = 0; i < nNodes; i++) {
        if (NFIX[i]) continue;
        const dx = PX[i] - x, dy = PY[i] - y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) return;
      e.preventDefault(); // no text selection while pulling silk
      if (mode === 2 && !phys) phys = true; // grabbing mid-rewind hands the rest to Tutte
      grab = best; gx = x; gy = y; dragMax = 0; phase = 'drag';
      addEventListener('pointermove', onMove);
      addEventListener('pointerup', onUp);
      addEventListener('pointercancel', onUp);
      if (opts.onGrab) opts.onGrab(true);
    });

    if (comb || gust) {
      addEventListener('pointermove', e => { if (e.pointerType !== 'touch') combTo(e.clientX, e.clientY); }, { passive: true });
      addEventListener('touchstart', e => { lastCX = null; if (e.touches.length) combTo(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      addEventListener('touchmove', e => { if (e.touches.length) combTo(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      document.addEventListener('mouseleave', () => { lastCX = null; });
    }

    // ------------------------------------------------------------------
    // Sizing, visibility, main loop
    // ------------------------------------------------------------------
    let lastW = 0, lastH = 0, built = false;
    function resize(force) {
      const w = cvs.clientWidth, h = cvs.clientHeight;
      if (!w || !h) return;
      if (!force && w === lastW && Math.abs(h - lastH) < 120) return; // ignore mobile URL-bar jiggle
      lastW = w; lastH = h;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = w; H = h;
      cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
      buildWeb();
      start(built ? mode : (opts.mode || 0));
      if (!built && opts.respectReducedMotion !== false && matchMedia('(prefers-reduced-motion: reduce)').matches) settle();
      built = true;
    }
    let rt;
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => resize(false), 150); }).observe(cvs);
    else addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => resize(false), 150); });

    // The crossing count is the only expensive step (pairs pile up inside a dense
    // tangle), so it runs on a budget: the slower it was, the longer it waits.
    let last = performance.now(), acc = 0, countWait = 0, visible = true, running = false;
    function loop(now) {
      running = false;
      if (!visible) return;
      acc += Math.min(0.1, (now - last) / 1000) * 60; last = now;
      if (built) {
        if (gust && breezeFrom) { const p = breezeFrom(); if (p) breezeTo(p.x, p.y); }
        let n = 0;
        while (acc >= 1 && n < 4) { tick(); acc -= 1; n++; }
        if (n === 4) acc = 0;
        render();
        if (--countWait <= 0) {
          const t0 = performance.now();
          countCrossings(); updateStatus();
          countWait = clamp(Math.ceil((performance.now() - t0) / 3), 2, 20);
        }
      }
      running = true;
      requestAnimationFrame(loop);
    }
    function wake() { if (!running && visible) { last = performance.now(); running = true; requestAnimationFrame(loop); } }
    if (window.IntersectionObserver) {
      new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        wake();
      }).observe(cvs);
    }

    resize(true);
    wake();

    const api = {
      MODES,
      start(m) { start(m); return api; },
      next() { start((mode + 1) % MODES.length); return api; },
      get mode() { return mode; },
      info,
      origin() { const r = cvs.getBoundingClientRect(); return { x: r.left, y: r.top }; },
      // For snagging the fly: is this client point on the finished web's capture silk
      // (inside the frame, outside the hub)?
      onSilk(x, y) {
        if (!X || phase !== 'done') return false;
        const r = cvs.getBoundingClientRect(), lx = x - r.left, ly = y - r.top;
        if (Math.hypot((lx - hub.x) / Rx, (ly - hub.y) / Ry) < 0.2) return false;
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j];
          if ((yi > ly) !== (yj > ly) && lx < (xj - xi) * (ly - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      },
      // Shake the silk around a client point (a snagged fly struggling). Same smooth,
      // uniform push as the breeze, so it trembles without threads ever crossing.
      tug(x, y, ux, uy, g) {
        if (!X || phase !== 'done') return;
        const r = cvs.getBoundingClientRect();
        touchAt(x - r.left, y - r.top, Math.max(60, Rm * 0.3), ux, uy, g, false);
      },
      // where the web is on screen, for a page that wants the spider to visit it
      focus() {
        const r = cvs.getBoundingClientRect();
        return { x: r.left + hub.x, y: r.top + hub.y, r: Rm, mode, phase,
          sinceDone: phase === 'done' ? T - doneAt : -1 };
      },
      toggleDots() { showDots = !showDots; },
      // test hooks: step the simulation without relying on requestAnimationFrame
      debug: {
        state: () => ({ mode, T: +T.toFixed(2), crossings, phase, N, nEdges }),
        start: m => { start(m); render(); countCrossings(); updateStatus(); return api.debug.state(); },
        advance(sec) { for (let i = 0; i < Math.round(sec * 60); i++) tick(); render(); countCrossings(); updateStatus(); return api.debug.state(); },
        settle: () => { settle(); render(); countCrossings(); updateStatus(); return api.debug.state(); },
        sweep: (x, y) => combTo(x, y),
        breeze: (x, y) => breezeTo(x, y),
        dots() { const r = cvs.getBoundingClientRect(), out = []; for (let i = 0; i < nCross; i++) out.push([Math.round(r.left + crossPts[2 * i]), Math.round(r.top + crossPts[2 * i + 1])]); return out; },
        // where the remaining crossings are (client coords), like a visitor eyeing the red dots
        tangleCenter() {
          if (!nCross) return null;
          let sx = 0, sy = 0;
          for (let i = 0; i < nCross; i++) { sx += crossPts[2 * i]; sy += crossPts[2 * i + 1]; }
          sx /= nCross; sy /= nCross;
          let sp = 0;
          for (let i = 0; i < nCross; i++) sp += Math.hypot(crossPts[2 * i] - sx, crossPts[2 * i + 1] - sy);
          const r = cvs.getBoundingClientRect();
          return { x: r.left + sx, y: r.top + sy, spread: sp / nCross };
        },
        sway() { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.hypot(X[i] - TX[i], Y[i] - TY[i])); return +m.toFixed(1); },
        node: k => { let c = -1; for (let i = 0; i < nNodes; i++) if (!NFIX[i] && ++c === k) return { x: PX[i], y: PY[i] }; return null; },
        bench() {
          const t = f => { const t0 = performance.now(); f(); return +(performance.now() - t0).toFixed(2); };
          return { tick: t(tick), render: t(render), count: t(countCrossings), crossings };
        },
        timeline(step, max) {
          const out = [];
          for (let s = 0; s <= max; s += step) {
            out.push([+T.toFixed(1), crossings, phase]);
            for (let i = 0; i < Math.round(step * 60); i++) tick();
            render(); countCrossings(); updateStatus();
          }
          return out;
        },
      },
    };
    return api;
  }

  UntangleWeb.MODES = MODES;
  window.UntangleWeb = UntangleWeb;
})();
