// Animated system diagrams at the top of the home page.
//
// Ported from the melnykov.dev design canvas: four 1040×232 figures for wide
// screens (page v2) and four thin strips for phones (page v4, option A). One of
// the four is picked at random on load. Each figure renders markup from the
// elapsed time T (ms); a timer advances T and the markup is patched into the
// page in place, so the CSS transitions on the elements still run.
(function () {
  'use strict';

  // Keep in sync with $phone in stylesheet.scss.
  const PHONE = '(max-width: 639px)';

  const ACC = 'var(--accent, #2B59E8)';
  const TINT = 'color-mix(in srgb, var(--accent, #2B59E8) 8%, #FFFFFF)';
  const BAND = 'color-mix(in srgb, var(--accent, #2B59E8) 10%, #FFFFFF)';
  const EDGE = '#A3A49F', LINE = '#CFCFC9', HEAD = '#F2F2EE', CARD = '#FFFFFF', GROUND = '#FBFBF9';
  const INK = '#17181A', MUTED = '#63656B', FAINT = '#A3A49F', ZONE = '#F5F5F2';
  const N = 'transparent';

  // Drawing helpers shared by the figures.

  const solid = (c) => `linear-gradient(${c}, ${c})`;
  const dash = (c, vert) => `repeating-linear-gradient(${vert ? '180deg' : '90deg'}, ${c} 0 4px, transparent 4px 7px)`;

  function pathLength(pts) {
    let s = 0;
    for (let i = 0; i < pts.length - 1; i++) s += Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
    return s;
  }

  function pointAt(pts, d) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (d <= L) {
        const f = L ? d / L : 0;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      d -= L;
    }
    return null;
  }

  function arrowHead(heads, x, y, dir, c) {
    if (dir === 'r') heads.push({ x: x - 7, y: y - 3.5, bw: '4px 0 4px 7px', bc: `${N} ${N} ${N} ${c}` });
    if (dir === 'l') heads.push({ x: x, y: y - 3.5, bw: '4px 7px 4px 0', bc: `${N} ${c} ${N} ${N}` });
    if (dir === 'd') heads.push({ x: x - 3.5, y: y - 7, bw: '7px 4px 0 4px', bc: `${c} ${N} ${N} ${N}` });
    if (dir === 'u') heads.push({ x: x - 3.5, y: y, bw: '0 4px 7px 4px', bc: `${N} ${N} ${c} ${N}` });
  }

  // Lines, arrow heads and labels for the box-and-arrow figures.
  function sketch() {
    const k = { lines: [], heads: [], texts: [] };
    k.seg = (x1, y1, x2, y2, c, dashed) => {
      const vert = x1 === x2;
      k.lines.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), w: vert ? 1 : Math.abs(x2 - x1), h: vert ? Math.abs(y2 - y1) : 1, bg: dashed ? dash(c, vert) : solid(c) });
    };
    k.head = (x, y, dir, c) => arrowHead(k.heads, x, y, dir, c);
    k.txt = (x, y, w, a, text, o = {}) => {
      k.texts.push({ x, y, w, a, text, fs: o.fs || 10, fw: o.fw || 400, ls: o.ls || 'normal', c: o.c || MUTED, bg: o.bg || GROUND });
    };
    return k;
  }

  // One layer per repeated list, so every item keeps its element when a list
  // grows or shrinks. The layers are display: contents and draw no box.
  const layer = (items, tpl) => `<div class="fig-layer">${items.map(tpl).join('')}</div>`;

  const frameTpl = (f) => `<div style="position: absolute; left: ${f.x}px; top: ${f.y}px; width: ${f.w}px; height: ${f.h}px; box-sizing: border-box; border: 1px ${f.bs} ${f.bc}; background: ${f.bg}; transition: border-color .3s ease"></div>`;
  const lineTpl = (l) => `<div style="position: absolute; left: ${l.x}px; top: ${l.y}px; width: ${l.w}px; height: ${l.h}px; background-image: ${l.bg}"></div>`;
  const headTpl = (h) => `<div style="position: absolute; left: ${h.x}px; top: ${h.y}px; width: 0; height: 0; border-style: solid; border-width: ${h.bw}; border-color: ${h.bc}"></div>`;
  const packetTpl = (p) => `<div style="position: absolute; left: ${p.x}px; top: ${p.y}px; width: 6px; height: 6px; box-sizing: border-box; border: 1px solid ${ACC}; background: ${p.bg}"></div>`;
  const boxTpl = (b) => `<div style="position: absolute; left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px; box-sizing: border-box; border: 1px ${b.bs} ${b.bc}; background: ${b.bg}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; text-align: center; transition: border-color .25s ease, background-color .25s ease"><span style="color: ${INK}; font-weight: 500">${b.t}</span><span style="font-size: 10px; color: ${b.sc || MUTED}">${b.s}</span></div>`;
  const cylTpl = (c) => `<div style="position: absolute; left: ${c.x}px; top: ${c.y}px; width: ${c.w}px; height: ${c.h}px"><div style="position: absolute; left: 0; top: 6px; right: 0; bottom: 0; box-sizing: border-box; border: 1px solid ${c.bc}; border-top: 0; border-radius: 0 0 50% 50% / 0 0 6px 6px; background: ${CARD}; transition: border-color .25s ease"></div><div style="position: absolute; left: 0; top: 0; right: 0; height: 12px; box-sizing: border-box; border: 1px solid ${c.bc}; border-radius: 50%; background: ${CARD}; transition: border-color .25s ease"></div><div style="position: absolute; left: 0; right: 0; top: ${c.ty}px; text-align: center; color: ${INK}; font-weight: 500">${c.t}</div>${c.s == null ? '' : `<div style="position: absolute; left: 0; right: 0; top: ${c.sy}px; text-align: center; font-size: 10px; color: ${MUTED}">${c.s}</div>`}</div>`;
  const textTpl = (t) => `<div style="position: absolute; left: ${t.x}px; top: ${t.y}px; width: ${t.w}px; text-align: ${t.a}; font-size: ${t.fs}px; line-height: 12px; font-weight: ${t.fw}; letter-spacing: ${t.ls}; color: ${t.c}; white-space: nowrap"><span style="background: ${t.bg}; padding: 0 3px">${t.text}</span></div>`;
  const textFadeTpl = (t) => textTpl(t).replace('white-space: nowrap"', 'white-space: nowrap; transition: color .3s ease"');

  // fig. 1, wide: requests from three clients through one instance.
  function infraFlow(T) {
    const k = sketch();
    const { seg, head, txt } = k;

    const frames = [{ x: 184, y: 6, w: 592, h: 220, bs: 'dashed', bc: LINE, bg: 'transparent' }];

    seg(136, 46, 204, 46, EDGE); head(204, 46, 'r', EDGE);
    seg(136, 116, 204, 116, EDGE); head(204, 116, 'r', EDGE);
    seg(136, 186, 204, 186, EDGE); head(204, 186, 'r', EDGE);
    seg(276, 72, 340, 72, EDGE); head(340, 72, 'r', EDGE);
    seg(428, 108, 428, 140, EDGE); head(428, 140, 'd', EDGE);
    seg(516, 58, 576, 58, EDGE, true); head(576, 58, 'r', EDGE);
    seg(484, 173, 600, 173, EDGE, true); head(600, 173, 'r', EDGE);
    seg(516, 90, 820, 90, EDGE);
    seg(820, 46, 820, 186, EDGE);
    seg(820, 46, 900, 46, EDGE); head(900, 46, 'r', EDGE);
    seg(820, 116, 900, 116, EDGE); head(900, 116, 'r', EDGE);
    seg(820, 186, 900, 186, EDGE); head(900, 186, 'r', EDGE);
    k.lines.push({ x: 818, y: 88, w: 5, h: 5, bg: solid(EDGE) });

    txt(196, 13, 300, 'left', 'ONE INSTANCE · DOCKER', { fw: 500, ls: '0.08em', bg: 'transparent' });
    txt(145, 32, 50, 'center', 'https');
    txt(283, 58, 50, 'center', ':8000');
    txt(432, 118, 40, 'left', 'sql');
    txt(511, 44, 70, 'center', 'events');
    txt(497, 159, 90, 'center', 'replicate');
    txt(608, 95, 120, 'center', 'https · out');

    const SPEED = 0.12;
    const ROUTES = [
      { pts: [[72, 46], [240, 46], [240, 72], [428, 72], [428, 173]], period: 2300, offset: 0 },
      { pts: [[72, 116], [240, 116], [240, 72], [428, 72], [428, 90], [820, 90], [820, 116], [966, 116]], period: 3100, offset: 900 },
      { pts: [[72, 186], [240, 186], [240, 72], [428, 72]], period: 3700, offset: 1700 },
      { pts: [[428, 58], [666, 58]], period: 2300, offset: 1500, hollow: true },
      { pts: [[428, 173], [666, 173]], period: 2300, offset: 600, hollow: true },
      { pts: [[72, 46], [240, 46], [240, 72], [428, 72], [428, 90], [820, 90], [820, 46], [966, 46]], period: 5300, offset: 2600 },
      { pts: [[428, 72], [428, 90], [820, 90], [820, 186], [966, 186]], period: 6100, offset: 4000 }
    ];
    const packets = [];
    for (const R of ROUTES) {
      const dur = pathLength(R.pts) / SPEED;
      let n = Math.floor((T - R.offset) / R.period);
      while (n >= 0) {
        const age = T - (R.offset + n * R.period);
        if (age > dur) break;
        const p = pointAt(R.pts, age * SPEED);
        if (p) packets.push({ x: (p[0] - 3).toFixed(1), y: (p[1] - 3).toFixed(1), cx: p[0], cy: p[1], bg: R.hollow ? GROUND : ACC });
        n--;
      }
    }
    const hot = (x, y, w, h) => packets.some((q) => q.cx >= x && q.cx <= x + w && q.cy >= y && q.cy <= y + h);

    const B = [
      ['browser', '/app · cookie', 8, 26, 128, 40, 'client'],
      ['claude', 'mcp · oauth', 8, 96, 128, 40, 'client'],
      ['script', '/api · token', 8, 166, 128, 40, 'client'],
      ['proxy', 'tls', 204, 36, 72, 170, 'plain'],
      ['service', 'pages · api · mcp', 340, 36, 176, 72, 'hi'],
      ['event store', 'async', 576, 36, 180, 44, 'plain'],
      ['identity', 'oidc', 900, 26, 132, 40, 'ext'],
      ['market data', 'prices', 900, 96, 132, 40, 'ext'],
      ['alerts', 'checks', 900, 166, 132, 40, 'ext']
    ];
    const boxes = B.map((b) => {
      const on = hot(b[2], b[3], b[4], b[5]);
      let st;
      if (b[6] === 'client') st = { bs: 'solid', bc: on ? ACC : LINE, bg: HEAD };
      else if (b[6] === 'hi') st = { bs: 'solid', bc: on ? ACC : EDGE, bg: TINT };
      else if (b[6] === 'ext') st = { bs: 'dashed', bc: on ? ACC : EDGE, bg: GROUND };
      else st = { bs: 'solid', bc: on ? ACC : LINE, bg: CARD };
      return { t: b[0], s: b[1], x: b[2], y: b[3], w: b[4], h: b[5], bs: st.bs, bc: st.bc, bg: st.bg };
    });
    const C = [['app.sqlite3', 'wal', 372, 140, 112, 66], ['replica', 'point-in-time', 600, 140, 132, 66]];
    const cyls = C.map((c) => ({ t: c[0], s: c[1], x: c[2], y: c[3], w: c[4], h: c[5], ty: 20, sy: 35, bc: hot(c[2], c[3], c[4], c[5]) ? ACC : LINE }));

    return layer(frames, frameTpl) + layer(k.lines, lineTpl) + layer(k.heads, headTpl) + layer(packets, packetTpl) +
      layer(boxes, boxTpl) + layer(cyls, cylTpl) + layer(k.texts, textTpl);
  }

  // fig. 2, wide: one optimize request as a sequence diagram.
  function infraSequence(T) {
    const STEP = 750;
    const CYCLE = 12;
    const s = Math.floor(T / STEP) % CYCLE;
    const X = [72, 288, 504, 720, 936];
    const P = [['browser', 'client'], ['proxy', 'plain'], ['service', 'hi'], ['sqlite', 'cyl'], ['market data', 'ext']];
    const MSG = [
      [0, 1, 'POST /app/optimize', 0],
      [1, 2, 'forward', 0],
      [2, 3, 'read watchlist', 0],
      [3, 2, 'rows', 1],
      [2, 4, 'end-of-day prices', 0],
      [4, 2, 'prices', 1],
      [2, 3, 'save portfolio v1', 0],
      [2, 0, '303 → report', 1]
    ];
    const cur = s < MSG.length ? MSG[s] : null;

    const lines = X.map((x) => ({ x, y: 40, w: 1, h: 188, bg: `repeating-linear-gradient(180deg, ${LINE} 0 3px, transparent 3px 8px)` }));

    const msgs = MSG.map((m, i) => {
      const shown = i <= s && s < CYCLE - 1;
      const current = i === s;
      const dir = X[m[1]] > X[m[0]] ? 1 : -1;
      const x1 = X[m[0]] + (m[0] === 2 ? 5 * dir : 0);
      const x2 = X[m[1]] - (m[1] === 2 ? 5 * dir : 0);
      const col = current ? ACC : EDGE;
      const y = 58 + i * 21;
      const right = dir === 1;
      return {
        n: i + 1,
        label: m[2],
        left: Math.min(x1, x2),
        w: Math.abs(x2 - x1),
        y,
        ly: y - 14,
        justify: right ? 'flex-start' : 'flex-end',
        fillW: shown ? '100%' : '0%',
        bg: m[3] ? `repeating-linear-gradient(90deg, ${col} 0 4px, transparent 4px 7px)` : solid(col),
        hx: right ? x2 - 7 : x2,
        hy: y - 3.5,
        bw: right ? '4px 0 4px 7px' : '4px 7px 4px 0',
        bc: right ? `${N} ${N} ${N} ${col}` : `${N} ${col} ${N} ${N}`,
        op: shown ? 1 : 0,
        badge: current ? ACC : INK,
        lc: current ? INK : MUTED
      };
    });

    const visible = s >= 1 && s < CYCLE - 1;
    const endY = s >= 7 ? 58 + 7 * 21 + 5 : 58 + s * 21 + 5;
    const acts = [{ x: 500, y: 74, h: visible ? Math.max(0, endY - 74) : 0, op: visible ? 1 : 0, bc: (s >= 1 && s <= 7) ? ACC : EDGE, bg: TINT }];

    const boxes = [];
    const cyls = [];
    P.forEach((p, i) => {
      const on = !!cur && (cur[0] === i || cur[1] === i);
      if (p[1] === 'cyl') {
        cyls.push({ t: p[0], x: X[i] - 50, y: 2, w: 100, h: 36, ty: 17, bc: on ? ACC : LINE });
        return;
      }
      let st;
      if (p[1] === 'client') st = { bs: 'solid', bc: on ? ACC : LINE, bg: HEAD };
      else if (p[1] === 'hi') st = { bs: 'solid', bc: on ? ACC : EDGE, bg: TINT };
      else if (p[1] === 'ext') st = { bs: 'dashed', bc: on ? ACC : EDGE, bg: GROUND };
      else st = { bs: 'solid', bc: on ? ACC : LINE, bg: CARD };
      boxes.push({ t: p[0], x: X[i] - 62, y: 6, w: 124, h: 30, bs: st.bs, bc: st.bc, bg: st.bg });
    });

    const actTpl = (a) => `<div style="position: absolute; left: ${a.x}px; top: ${a.y}px; width: 9px; height: ${a.h}px; box-sizing: border-box; border: 1px solid ${a.bc}; background: ${a.bg}; opacity: ${a.op}; transition: height .4s ease-out, opacity .3s ease, border-color .25s ease"></div>`;
    const msgTpl = (m) => `<div style="position: absolute; left: 0; top: 0; width: 0; height: 0">` +
      `<div style="position: absolute; left: ${m.left}px; top: ${m.y}px; width: ${m.w}px; height: 1px; display: flex; justify-content: ${m.justify}"><div style="width: ${m.fillW}; height: 1px; background-image: ${m.bg}; transition: width .45s ease-out"></div></div>` +
      `<div style="position: absolute; left: ${m.hx}px; top: ${m.hy}px; width: 0; height: 0; border-style: solid; border-width: ${m.bw}; border-color: ${m.bc}; opacity: ${m.op}; transition: opacity .2s ease .35s"></div>` +
      `<div style="position: absolute; left: ${m.left}px; top: ${m.ly}px; width: ${m.w}px; display: flex; justify-content: center; opacity: ${m.op}; transition: opacity .3s ease .15s"><span style="display: inline-flex; align-items: center; gap: 5px; padding: 0 4px; background: ${GROUND}; white-space: nowrap"><span style="display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; background: ${m.badge}; color: ${GROUND}; font-size: 8px; line-height: 12px; font-weight: 500; transition: background-color .25s ease">${m.n}</span><span style="font-size: 10px; line-height: 12px; color: ${m.lc}; transition: color .25s ease">${m.label}</span></span></div>` +
      `</div>`;
    const seqBoxTpl = (b) => `<div style="position: absolute; left: ${b.x}px; top: ${b.y}px; width: ${b.w}px; height: ${b.h}px; box-sizing: border-box; border: 1px ${b.bs} ${b.bc}; background: ${b.bg}; display: flex; align-items: center; justify-content: center; color: ${INK}; font-weight: 500; transition: border-color .25s ease">${b.t}</div>`;

    return layer(lines, lineTpl) + layer(acts, actTpl) + layer(msgs, msgTpl) + layer(boxes, seqBoxTpl) + layer(cyls, cylTpl);
  }

  // fig. 3, wide: a release rolls across three instances, one at a time.
  function infraFleet(T) {
    const k = sketch();
    const { seg, head, txt } = k;
    const packets = [], boxes = [], cyls = [], frames = [];
    const box = (t, s, x, y, w, h, bs, bc, bg, sc) => boxes.push({ t, s, x, y, w, h, bs, bc, bg, sc: sc || MUTED });

    const CYCLE = 11200;
    const round = Math.floor(T / CYCLE);
    const tt = T - round * CYCLE;
    const OLD = 'v' + (41 + (round % 50));
    const NEW = 'v' + (42 + (round % 50));

    box('laptop', 'bin/deploy', 8, 30, 120, 44, 'solid', LINE, HEAD);
    box('registry', 'images', 8, 150, 120, 44, 'dashed', EDGE, GROUND);
    seg(68, 74, 68, 150, EDGE, true); head(68, 150, 'd', EDGE);
    txt(72, 106, 50, 'left', 'push');
    seg(128, 172, 164, 172, EDGE, true); head(164, 172, 'r', EDGE);
    txt(121, 158, 50, 'center', 'pull');

    if (tt < 900) packets.push({ x: 65, y: (52 + 120 * tt / 900 - 3).toFixed(1), bg: GROUND });

    const phase = (t0) => {
      if (tt < t0) return 0;
      if (tt < t0 + 800) return 1;
      if (tt < t0 + 1300) return 2;
      return 3;
    };
    const unit = (name, idle, ph, x, y) => {
      if (ph === 0) box(name + ' ' + OLD, idle, x, y, 124, 44, 'solid', LINE, CARD);
      else if (ph === 1) box(name + ' ' + NEW, 'booting', x, y, 124, 44, 'dashed', ACC, CARD, ACC);
      else if (ph === 2) box(name + ' ' + NEW, '/up 200', x, y, 124, 44, 'solid', ACC, TINT, ACC);
      else box(name + ' ' + NEW, idle, x, y, 124, 44, 'solid', EDGE, CARD);
    };

    const FX = [164, 456, 748];
    const NAMES = ['INSTANCE A', 'INSTANCE B', 'INSTANCE C'];
    for (let i = 0; i < 3; i++) {
      const x0 = FX[i];
      const start = 1000 + i * 2600;
      const deploying = tt >= start + 500 && tt < start + 2200;
      const done = tt >= start + 2200;
      frames.push({ x: x0, y: 6, w: 284, h: 220, bs: 'dashed', bc: deploying ? ACC : LINE, bg: 'transparent' });
      txt(x0 + 8, 13, 160, 'left', NAMES[i], { fw: 500, ls: '0.08em', bg: 'transparent' });
      txt(x0 + 172, 13, 104, 'right', deploying ? OLD + ' → ' + NEW : (done ? NEW : OLD), { fw: 500, c: deploying ? ACC : (done ? INK : FAINT), bg: 'transparent' });

      box('proxy', '', x0 + 12, 30, 260, 26, 'solid', LINE, CARD);
      seg(x0 + 74, 56, x0 + 74, 84, EDGE); head(x0 + 74, 84, 'd', EDGE);
      seg(x0 + 74, 128, x0 + 74, 150, EDGE); head(x0 + 74, 150, 'd', EDGE);
      seg(x0 + 210, 128, x0 + 210, 179, EDGE, true);
      seg(x0 + 136, 179, x0 + 210, 179, EDGE, true); head(x0 + 136, 179, 'l', EDGE);
      txt(x0 + 216, 150, 50, 'left', 'jobs');

      unit('web', 'serving', phase(start + 500), x0 + 12, 84);
      unit('worker', 'queue', phase(start + 900), x0 + 148, 84);
      cyls.push({ t: 'sqlite', s: 'volume', x: x0 + 12, y: 150, w: 124, h: 58, ty: 18, sy: 33, bc: LINE });

      if (tt >= start && tt < start + 500) {
        packets.push({ x: (68 + 96 * (tt - start) / 500 - 3).toFixed(1), y: 169, bg: GROUND });
      }
      const period = 1700, offset = i * 560, dur = 1500;
      let n = Math.floor((T - offset) / period);
      while (n >= 0) {
        const age = T - (offset + n * period);
        if (age > dur) break;
        const d = age / dur * 136;
        const py = d <= 63 ? 43 + d : 106 + (d - 63);
        packets.push({ x: x0 + 71, y: (py - 3).toFixed(1), bg: ACC });
        n--;
      }
    }

    return layer(frames, frameTpl) + layer(k.lines, lineTpl) + layer(k.heads, headTpl) + layer(packets, packetTpl) +
      layer(boxes, boxTpl) + layer(cyls, cylTpl) + layer(k.texts, textFadeTpl);
  }

  // fig. 4, wide: a join walks the data model, key by key.
  function infraSchema(T) {
    const lines = [], rots = [], dots = [], texts = [], packets = [];
    const seg = (x1, y1, x2, y2, c, t = 1) => {
      const vert = x1 === x2;
      lines.push({
        x: vert ? x1 - (t - 1) / 2 : Math.min(x1, x2),
        y: vert ? Math.min(y1, y2) : y1 - (t - 1) / 2,
        w: vert ? t : Math.abs(x2 - x1) + (t - 1),
        h: vert ? Math.abs(y2 - y1) + (t - 1) : t,
        bg: solid(c)
      });
    };
    const one = (ex, ey, d, c) => {
      seg(ex + d * 5, ey - 5, ex + d * 5, ey + 6, c);
      seg(ex + d * 8, ey - 5, ex + d * 8, ey + 6, c);
    };
    const many = (ex, ey, d, c) => {
      const ax = ex + d * 10;
      [-5, 0, 5].forEach((dy) => {
        const dx = ex - ax;
        rots.push({ x: ax, y: ey, w: Math.sqrt(dx * dx + dy * dy).toFixed(2), rot: (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), c });
      });
      dots.push({ x: ex + d * 14 - 3.5, y: ey - 3, c });
    };
    const txt = (x, y, w, a, text, o = {}) => {
      texts.push({ x, y, w, a, text, fs: o.fs || 10, fw: o.fw || 400, ls: o.ls || 'normal', c: o.c || MUTED, bg: o.bg || ZONE });
    };

    const STEP = 600;
    const CYCLE = 16;
    const raw = T / STEP;
    const s = Math.floor(raw) % CYCLE;
    const frac = raw - Math.floor(raw);
    const live = s < 15;

    const frames = [
      { x: 8, y: 6, w: 816, h: 172, bs: 'dashed', bc: LINE, bg: ZONE },
      { x: 836, y: 6, w: 196, h: 172, bs: 'solid', bc: '#E8E8E4', bg: ZONE }
    ];
    txt(17, 14, 320, 'left', 'PRIVATE · OWNED BY ONE USER', { fw: 500, ls: '0.08em', bg: 'transparent' });
    txt(845, 14, 180, 'left', 'SHARED · ONE COPY', { fw: 500, ls: '0.08em', bg: 'transparent' });

    const CARDS = [
      ['user_account', 20, [['PK', 'user_id', 'id'], ['UQ', 'email', 'text'], ['', 'created_at', 'instant'], ['ID', 'public_id', 'uuid']]],
      ['portfolio', 228, [['PK', 'portfolio_id', 'id'], ['FK', 'user_id', 'id'], ['', 'name', 'text'], ['', 'currency', 'iso']]],
      ['portfolio_version', 436, [['PK', 'version_id', 'id'], ['FK', 'portfolio_id', 'id'], ['UQ', 'number', 'int'], ['', 'created_at', 'instant']]],
      ['position', 644, [['PK', 'position_id', 'id'], ['FK', 'version_id', 'id'], ['FK', 'instrument_id', 'id'], ['', 'weight', 'decimal']]],
      ['instrument', 852, [['PK', 'instrument_id', 'id'], ['UQ', 'ticker', 'text'], ['', 'name', 'text'], ['', 'currency', 'iso']]]
    ];
    const SPAN = [[0, 1], [2, 4], [5, 7], [8, 10], [11, 11]];
    const ROWSTEP = [[0, -1, -1, -1], [3, 2, -1, -1], [6, 5, -1, -1], [-1, 8, 9, -1], [11, -1, -1, -1]];

    const cards = [], rows = [], parts = [];
    CARDS.forEach((c, ci) => {
      const active = live && s >= SPAN[ci][0] && s <= SPAN[ci][1];
      const visited = live && s > SPAN[ci][1];
      cards.push({ x: c[1], name: c[0], bc: active ? ACC : (visited ? EDGE : LINE) });
      c[2].forEach((f, ri) => {
        const st = ROWSTEP[ci][ri];
        const cur = live && st === s;
        const seen = live && st >= 0 && st < s;
        rows.push({
          x: c[1] + 1, y: 66 + ri * 20,
          band: cur ? BAND : (seen ? '#F2F2EE' : 'transparent'),
          key: f[0], keyC: cur ? ACC : MUTED,
          name: f[1], nameC: (cur || seen) ? INK : MUTED,
          type: f[2]
        });
      });
      parts.push({ text: c[0], c: active ? ACC : (visited ? INK : FAINT), arrow: ci < CARDS.length - 1 ? '→' : '' });
    });

    const LINKS = [
      { step: 1, path: [[188, 76], [208, 76], [208, 96], [228, 96]], one: [188, 76, 1], many: [228, 96, -1], label: 'owns', lx: 208 },
      { step: 4, path: [[396, 76], [416, 76], [416, 96], [436, 96]], one: [396, 76, 1], many: [436, 96, -1], label: 'holds', lx: 416 },
      { step: 7, path: [[604, 76], [624, 76], [624, 96], [644, 96]], one: [604, 76, 1], many: [644, 96, -1], label: 'holds', lx: 624 },
      { step: 10, path: [[812, 116], [832, 116], [832, 76], [852, 76]], one: [852, 76, -1], many: [812, 116, 1], label: 'is held in', lx: 830 }
    ];
    LINKS.forEach((L) => {
      const on = live && s === L.step;
      const c = on ? ACC : EDGE;
      for (let i = 0; i < L.path.length - 1; i++) seg(L.path[i][0], L.path[i][1], L.path[i + 1][0], L.path[i + 1][1], EDGE);
      if (on) for (let i = 0; i < L.path.length - 1; i++) seg(L.path[i][0], L.path[i][1], L.path[i + 1][0], L.path[i + 1][1], ACC, 2);
      one(L.one[0], L.one[1], L.one[2], c);
      many(L.many[0], L.many[1], L.many[2], c);
      txt(L.lx - 45, 154, 90, 'center', L.label, { c: on ? INK : MUTED });
      if (on) {
        const e = frac < 0.5 ? 2 * frac * frac : 1 - 2 * (1 - frac) * (1 - frac);
        const p = pointAt(L.path, e * pathLength(L.path));
        if (p) packets.push({ x: (p[0] - 3).toFixed(1), y: (p[1] - 2.5).toFixed(1) });
      }
    });

    const zoneTpl = (f) => `<div style="position: absolute; left: ${f.x}px; top: ${f.y}px; width: ${f.w}px; height: ${f.h}px; box-sizing: border-box; border: 1px ${f.bs} ${f.bc}; background: ${f.bg}"></div>`;
    const rotTpl = (r) => `<div style="position: absolute; left: ${r.x}px; top: ${r.y}px; width: ${r.w}px; height: 1px; background: ${r.c}; transform-origin: 0 0; transform: rotate(${r.rot}deg)"></div>`;
    const dotTpl = (d) => `<div style="position: absolute; left: ${d.x}px; top: ${d.y}px; width: 7px; height: 7px; box-sizing: border-box; border: 1px solid ${d.c}; border-radius: 50%; background: ${CARD}"></div>`;
    const keyTpl = (p) => `<div style="position: absolute; left: ${p.x}px; top: ${p.y}px; width: 6px; height: 6px; background: ${ACC}"></div>`;
    const cardTpl = (c) => `<div style="position: absolute; left: ${c.x}px; top: 40px; width: 168px; height: 106px; box-sizing: border-box; border: 1px solid ${c.bc}; background: ${CARD}; transition: border-color .25s ease"><div style="height: 26px; box-sizing: border-box; padding: 0 8px; display: flex; align-items: center; background: #F2F2EE; border-bottom: 1px solid #E8E8E4; color: ${INK}; font-weight: 500">${c.name}</div></div>`;
    const rowTpl = (w) => `<div style="position: absolute; left: ${w.x}px; top: ${w.y}px; width: 166px; height: 20px; box-sizing: border-box; padding: 0 8px; display: flex; align-items: center; gap: 6px; background: ${w.band}; transition: background-color .25s ease"><span style="flex: 0 0 18px; font-size: 9px; font-weight: 500; color: ${w.keyC}; transition: color .25s ease">${w.key}</span><span style="flex: 1 1 auto; color: ${w.nameC}; transition: color .25s ease">${w.name}</span><span style="font-size: 10px; color: ${FAINT}">${w.type}</span></div>`;
    const partTpl = (q) => `<span style="display: inline-flex; gap: 8px"><span style="color: ${q.c}; transition: color .25s ease">${q.text}</span><span style="color: ${FAINT}">${q.arrow}</span></span>`;

    return layer(frames, zoneTpl) + layer(lines, lineTpl) + layer(rots, rotTpl) + layer(dots, dotTpl) + layer(packets, keyTpl) +
      layer(cards, cardTpl) + layer(rows, rowTpl) + layer(texts, textTpl) +
      `<div style="position: absolute; left: 20px; top: 194px; display: flex; align-items: center; gap: 8px; white-space: nowrap"><span style="color: ${MUTED}">join</span>${parts.map(partTpl).join('')}</div>`;
  }

  // fig. 1, phone: one request moves along browser, proxy, service and sqlite.
  function stripFlow(T, W) {
    const narrow = W < 500;
    const SOFT = '#E2E2DE';
    const NAMES = narrow ? ['browser', 'proxy', 'service', 'sqlite'] : ['browser', 'proxy', 'service', 'sqlite', 'replica'];
    const n = NAMES.length;
    const widths = NAMES.map((nm) => Math.round(nm.length * 6.6 + 18));
    const first = widths[0] / 2;
    const lastHalf = widths[n - 1] / 2;
    const step = (W - first - lastHalf) / (n - 1);
    const cxs = NAMES.map((nm, i) => first + i * step);
    const RUN = 4200, PAUSE = 3200;
    const tt = T % (RUN + PAUSE);
    const moving = tt < RUN;
    const px = moving ? cxs[0] + (cxs[n - 1] - cxs[0]) * (tt / RUN) : -100;
    const lines = [], heads = [];
    for (let i = 0; i < n - 1; i++) {
      const x1 = cxs[i] + widths[i] / 2;
      const x2 = cxs[i + 1] - widths[i + 1] / 2;
      lines.push({ x: x1.toFixed(1), w: (x2 - x1).toFixed(1) });
      heads.push({ x: (x2 - 6).toFixed(1) });
    }
    const nodes = NAMES.map((nm, i) => {
      const on = moving && Math.abs(px - cxs[i]) <= widths[i] / 2;
      return { t: nm, x: (cxs[i] - widths[i] / 2).toFixed(1), w: widths[i], bc: on ? EDGE : SOFT, c: on ? INK : MUTED };
    });
    const packets = moving ? [{ x: (px - 2.5).toFixed(1) }] : [];

    return layer(lines, (l) => `<div style="position: absolute; left: ${l.x}px; top: 22px; width: ${l.w}px; height: 1px; background-image: repeating-linear-gradient(90deg, #C9CAC5 0 2px, transparent 2px 5px)"></div>`) +
      layer(heads, (h) => `<div style="position: absolute; left: ${h.x}px; top: 19px; width: 0; height: 0; border-style: solid; border-width: 3.5px 0 3.5px 6px; border-color: transparent transparent transparent #C9CAC5"></div>`) +
      layer(packets, (p) => `<div style="position: absolute; left: ${p.x}px; top: 20px; width: 5px; height: 5px; background: ${ACC}"></div>`) +
      layer(nodes, (b) => `<div style="position: absolute; left: ${b.x}px; top: 11px; width: ${b.w}px; height: 23px; box-sizing: border-box; border: 1px solid ${b.bc}; background: ${GROUND}; display: flex; align-items: center; justify-content: center; color: ${b.c}; transition: border-color .3s ease, color .3s ease">${b.t}</div>`);
  }

  // fig. 2, phone: a playhead sweeps across the spans of one request trace.
  function stripTrace(T, W) {
    const SPANS = [
      ['sqlite', 'read watchlist', 0.07, 0.17],
      ['vendor', 'end-of-day prices', 0.19, 0.60],
      ['service', 'run optimizer', 0.61, 0.79],
      ['sqlite', 'save portfolio v1', 0.80, 0.90],
      ['service', '303 → report', 0.91, 0.96]
    ];
    const RUN = 6400, HOLD = 2600, GAP = 400;
    const tt = T % (RUN + HOLD + GAP);
    const running = tt < RUN;
    const holding = tt >= RUN && tt < RUN + HOLD;
    const ph = running ? tt / RUN : (holding ? 1 : 0);
    const segs = [], fills = [];
    let cur = null;
    SPANS.forEach((sp, i) => {
      const x = sp[2] * W;
      const w = (sp[3] - sp[2]) * W;
      segs.push({ x: x.toFixed(1), w: w.toFixed(1) });
      const f = Math.max(0, Math.min(1, (ph - sp[2]) / (sp[3] - sp[2])));
      if (f > 0) fills.push({ x: x.toFixed(1), w: (w * f).toFixed(1) });
      if (ph >= sp[2] && ph < sp[3]) cur = { num: String(i + 1), svc: sp[0], op: '· ' + sp[1] };
    });
    let label;
    if (holding) label = { num: '', svc: 'POST /app/optimize', op: '· done' };
    else if (cur) label = cur;
    else label = { num: '', svc: 'service', op: '· optimize' };
    const heads = running && ph > 0 ? [{ x: (ph * W).toFixed(1) }] : [];

    return `<div style="position: absolute; left: 0; top: 4px; display: flex; gap: 8px; white-space: nowrap"><span style="color: ${FAINT}">${label.num}</span><span style="color: ${INK}; font-weight: 500">${label.svc}</span><span style="color: ${MUTED}">${label.op}</span></div>` +
      `<div style="position: absolute; right: 0; top: 5px; font-size: 10px; line-height: 12px; letter-spacing: 0.08em; color: ${FAINT}">TRACE</div>` +
      `<div style="position: absolute; left: 0; top: 28px; width: ${W}px; height: 6px; background: #F2F2EE"></div>` +
      layer(segs, (s) => `<div style="position: absolute; left: ${s.x}px; top: 28px; width: ${s.w}px; height: 6px; background: #E2E2DE"></div>`) +
      layer(fills, (f) => `<div style="position: absolute; left: ${f.x}px; top: 28px; width: ${f.w}px; height: 6px; background: ${FAINT}"></div>`) +
      layer(heads, (h) => `<div style="position: absolute; left: ${h.x}px; top: 23px; width: 1px; height: 16px; background: ${ACC}"></div>`);
  }

  // fig. 3, phone: a release rolls node by node through instances a, b and c.
  function stripFleet(T, W) {
    const narrow = W < 500;
    const COUNT = narrow ? 6 : 12;
    const PER = narrow ? 380 : 220;
    const GW = W / 3;
    const span = COUNT * PER + 500;
    const CYCLE = 600 + 3 * span + 2600;
    const round = Math.floor(T / CYCLE);
    const tt = T - round * CYCLE;
    const OLD = 'v' + (41 + (round % 50));
    const NEW = 'v' + (42 + (round % 50));
    const labels = [], cells = [];
    for (let g = 0; g < 3; g++) {
      const x0 = Math.round(g * GW);
      const start = 600 + g * span;
      const done = tt >= start + COUNT * PER;
      labels.push({ x: x0, t: ['a', 'b', 'c'][g] + ' ' + (done ? NEW : OLD) });
      for (let j = 0; j < COUNT; j++) {
        const t0 = start + j * PER;
        const st = tt < t0 ? 0 : (tt < t0 + PER ? 1 : 2);
        cells.push({
          x: x0 + 42 + j * 12,
          bg: st === 1 ? ACC : (st === 2 ? FAINT : GROUND),
          bc: st === 1 ? ACC : (st === 2 ? FAINT : LINE)
        });
      }
    }

    return layer(labels, (l) => `<div style="position: absolute; left: ${l.x}px; top: 15px; white-space: nowrap; color: ${MUTED}">${l.t}</div>`) +
      layer(cells, (c) => `<div style="position: absolute; left: ${c.x}px; top: 18px; width: 8px; height: 8px; box-sizing: border-box; border: 1px solid ${c.bc}; background: ${c.bg}; transition: background-color .3s ease, border-color .3s ease"></div>`);
  }

  // fig. 4, phone: a join steps from user to instrument, one key at a time.
  function stripSchema(T, W) {
    const narrow = W < 500;
    const NAMES = narrow ? ['user', 'portfolio', 'version', 'position', 'instrument'] : ['user_account', 'portfolio', 'portfolio_version', 'position', 'instrument'];
    const KEYS = ['user_id', 'portfolio_id', 'version_id', 'instrument_id'];
    const n = NAMES.length;
    const CW = 6.6;
    const lens = NAMES.map((nm) => nm.length * CW);
    const S = lens.reduce((a, b) => a + b, 0);
    const gap = (W - S) / (n - 1);
    const xs = [];
    let acc = 0;
    for (let i = 0; i < n; i++) { xs.push(acc); acc += lens[i] + gap; }
    const cs = xs.map((x, i) => x + lens[i] / 2);

    const DW = 700, SL = 650, HOLD = 2400;
    const RUN = n * DW + (n - 1) * SL;
    const tt = T % (RUN + HOLD);
    let pos;
    let sliding = -1;
    let frac = 0;
    if (tt >= RUN) {
      pos = n - 1;
    } else {
      const segT = DW + SL;
      const idx = Math.floor(tt / segT);
      const r = tt - idx * segT;
      if (r < DW || idx >= n - 1) {
        pos = Math.min(idx, n - 1);
      } else {
        const f = (r - DW) / SL;
        frac = f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f);
        sliding = idx;
        pos = idx;
      }
    }
    const px = sliding >= 0 ? cs[sliding] + (cs[sliding + 1] - cs[sliding]) * frac : cs[pos];
    const cur = sliding >= 0 ? sliding : pos;

    const names = NAMES.map((nm, i) => {
      const isCur = i === cur;
      return { t: nm, x: xs[i].toFixed(1), c: isCur ? INK : (i < cur ? MUTED : FAINT), fw: isCur ? 500 : 400 };
    });
    const arrows = [];
    for (let j = 0; j < n - 1; j++) arrows.push({ x: (xs[j] + lens[j] + gap / 2 - 3.3).toFixed(1) });
    const ticks = cs.map((c) => ({ x: c.toFixed(1) }));
    const keys = sliding >= 0 ? [{ x: (px - 60).toFixed(1), t: KEYS[sliding] }] : [];

    return layer(names, (nm) => `<div style="position: absolute; left: ${nm.x}px; top: 4px; white-space: nowrap; color: ${nm.c}; font-weight: ${nm.fw}; transition: color .3s ease">${nm.t}</div>`) +
      layer(arrows, (a) => `<div style="position: absolute; left: ${a.x}px; top: 4px; color: ${LINE}">→</div>`) +
      `<div style="position: absolute; left: ${cs[0].toFixed(1)}px; top: 28px; width: ${(cs[n - 1] - cs[0]).toFixed(1)}px; height: 1px; background-image: repeating-linear-gradient(90deg, #D5D6D1 0 2px, transparent 2px 5px)"></div>` +
      layer(ticks, (t) => `<div style="position: absolute; left: ${t.x}px; top: 25px; width: 1px; height: 7px; background: ${LINE}"></div>`) +
      layer(keys, (k) => `<div style="position: absolute; left: ${k.x}px; top: 32px; width: 120px; text-align: center; font-size: 9px; line-height: 11px; color: ${FAINT}">${k.t}</div>`) +
      `<div style="position: absolute; left: ${(px - 2.5).toFixed(1)}px; top: 26px; width: 5px; height: 5px; background: ${ACC}"></div>`;
  }

  // The same four diagrams, in the same order, for each screen size.
  // t0 is the time each figure starts at; tick and maxDt pace its timer.
  const FIGURES = {
    wide: [
      { render: infraFlow, t0: 6000, tick: 40, maxDt: 200, caption: 'fig. 1 — a request through one instance' },
      { render: infraSequence, t0: 4200, tick: 50, maxDt: 200, caption: 'fig. 2 — one optimize request, step by step' },
      { render: infraFleet, t0: 5200, tick: 50, maxDt: 200, caption: 'fig. 3 — a rolling release across three instances' },
      { render: infraSchema, t0: 5700, tick: 40, maxDt: 200, caption: 'fig. 4 — a join across the data model' }
    ],
    phone: [
      { render: stripFlow, t0: 1800, tick: 40, maxDt: 200, caption: 'fig. 1 — one request, end to end' },
      { render: stripTrace, t0: 2600, tick: 40, maxDt: 200, caption: 'fig. 2 — one request, as a trace' },
      { render: stripFleet, t0: 4200, tick: 60, maxDt: 300, caption: 'fig. 3 — a rolling release' },
      { render: stripSchema, t0: 2000, tick: 40, maxDt: 200, caption: 'fig. 4 — one join, key by key' }
    ]
  };

  // Brings the children of target in line with those of source. Elements of
  // the same tag are updated in place, so a changed style starts a transition.
  function patch(target, source) {
    const want = source.childNodes;
    for (let i = 0; i < want.length; i++) {
      const s = want[i];
      const t = target.childNodes[i];
      if (!t) {
        target.appendChild(s.cloneNode(true));
      } else if (t.nodeName !== s.nodeName) {
        target.replaceChild(s.cloneNode(true), t);
      } else if (s.nodeType === Node.TEXT_NODE) {
        if (t.nodeValue !== s.nodeValue) t.nodeValue = s.nodeValue;
      } else {
        for (const { name, value } of Array.from(s.attributes)) {
          if (t.getAttribute(name) !== value) t.setAttribute(name, value);
        }
        patch(t, s);
      }
    }
    while (target.childNodes.length > want.length) target.removeChild(target.lastChild);
  }

  function start() {
    const root = document.querySelector('[data-figure]');
    if (!root) return;
    const stage = root.querySelector('[data-figure-canvas]');
    const caption = root.querySelector('[data-figure-caption]');
    const next = root.querySelector('[data-figure-next]');
    const phone = window.matchMedia(PHONE);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scratch = document.createElement('template');

    let pick = Math.floor(Math.random() * 4);
    let fig, T, last, timer;
    let onScreen = true;

    const draw = () => {
      scratch.innerHTML = fig.render(T, stage.clientWidth || 342);
      patch(stage, scratch.content);
    };

    const mount = () => {
      clearInterval(timer);
      fig = FIGURES[phone.matches ? 'phone' : 'wide'][pick];
      T = fig.t0;
      last = Date.now();
      caption.textContent = fig.caption;
      stage.textContent = '';
      draw();
      timer = setInterval(() => {
        const now = Date.now();
        const dt = Math.min(now - last, fig.maxDt);
        last = now;
        if (still.matches || !onScreen || document.hidden) return;
        T += dt;
        draw();
      }, fig.tick);
    };

    next.addEventListener('click', () => {
      pick = (pick + 1) % 4;
      mount();
    });
    phone.addEventListener('change', mount);
    window.addEventListener('resize', () => {
      if (phone.matches) draw();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
      }).observe(stage);
    }
    mount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
