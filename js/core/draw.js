/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Drawing parts of the floor plan (Building structure, also shown in CCTV):
//  • symbols — yard, roof / mansard and furniture shapes placed like any structure item (free size and angle);
//  • walls — drawn wall pieces with length, angle, thickness and bend; the same walls Wi-Fi Plan uses for signal loss;
//  • pieces — the drawing read from a DXF file split into movable parts (a room's walls with its doors and windows,
//    each piece of furniture, stairs, columns, yard lines); each part can be moved, turned, resized or deleted;
//  • boundaries — outlines (yard, plot, building edge) reshaped point by point.
"use strict";
const DRAW = (function(){
const c = "#3a4552";
// symbol: [width m, height m, group, drawing (w, h in px)]
const SYM = {
  // yard
  pool:[8, 4, "yard", (w, h) => `<rect width="${w}" height="${h}" rx="${Math.min(w, h) * .12}" fill="#bfe6ff" stroke="#2b7bd0" stroke-width="2"/><rect x="${w * .06}" y="${h * .1}" width="${w * .88}" height="${h * .8}" rx="${Math.min(w, h) * .08}" fill="none" stroke="#7cc3f2" stroke-width="1"/><path d="M${w * .2} ${h * .45}q${w * .05} -${h * .08} ${w * .1} 0t${w * .1} 0t${w * .1} 0M${w * .5} ${h * .62}q${w * .05} -${h * .08} ${w * .1} 0t${w * .1} 0" fill="none" stroke="#2b7bd0" stroke-width="1"/>`],
  pergola:[4, 4, "yard", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#f6efe4" fill-opacity=".5" stroke="#8a6d3b" stroke-width="1.8"/>`; const n = Math.max(3, Math.round(w / 10)); for (let i = 1; i < n; i++) g += `<line x1="${w * i / n}" y1="0" x2="${w * i / n}" y2="${h}" stroke="#8a6d3b" stroke-width=".9"/>`; return g + [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#8a6d3b"/>`).join(""); }],
  tree:[3, 3, "yard", (w, h) => `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" fill="#bfe3b8" fill-opacity=".8" stroke="#2e9d57" stroke-width="1.5"/><path d="M${w / 2} ${h * .15}V${h * .85}M${w * .15} ${h / 2}H${w * .85}M${w * .25} ${h * .25}L${w * .75} ${h * .75}M${w * .75} ${h * .25}L${w * .25} ${h * .75}" stroke="#2e9d57" stroke-width=".8"/><circle cx="${w / 2}" cy="${h / 2}" r="2.5" fill="#6b4a2b"/>`],
  bush:[1.2, 1.2, "yard", (w, h) => `<path d="M${w * .5} ${h * .05}C${w * .9} ${h * .05} ${w} ${h * .4} ${w * .9} ${h * .6}C${w * .95} ${h * .9} ${w * .6} ${h} ${w * .45} ${h * .9}C${w * .2} ${h} 0 ${h * .75} ${w * .1} ${h * .5}C0 ${h * .2} ${w * .25} ${h * .05} ${w * .5} ${h * .05}Z" fill="#cfeac8" stroke="#2e9d57" stroke-width="1.3"/>`],
  lawn:[6, 4, "yard", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#e3f4dd" stroke="#6bbf59" stroke-width="1.2" stroke-dasharray="4 3"/>`; for (let y = 8; y < h; y += 12) for (let x = 6 + (y % 24 ? 6 : 0); x < w - 4; x += 14) g += `<path d="M${x} ${y + 3}l2 -5l2 5" fill="none" stroke="#6bbf59" stroke-width=".9"/>`; return g; }],
  road:[10, 4, "yard", (w, h) => `<rect width="${w}" height="${h}" fill="#d5d8de" stroke="#7b8494" stroke-width="1.5"/><path d="M4 ${h / 2}H${w - 4}" stroke="#fff" stroke-width="2" stroke-dasharray="10 8"/>`],
  path:[6, 1.2, "yard", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#efe7da" stroke="#b39b72" stroke-width="1.2"/>`; for (let x = h; x < w; x += h) g += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#b39b72" stroke-width=".8"/>`; return g; }],
  outstairs:[2, 3, "yard", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#f2f3f5" stroke="${c}" stroke-width="1.5"/>`; const n = Math.max(3, Math.round(h / 8)); for (let i = 1; i < n; i++) g += `<line x1="0" y1="${h * i / n}" x2="${w}" y2="${h * i / n}" stroke="${c}" stroke-width=".8"/>`; return g + `<path d="M${w / 2} ${h - 3}V5M${w / 2 - 4} 11L${w / 2} 4L${w / 2 + 4} 11" stroke="${c}" fill="none" stroke-width="1.2"/>`; }],
  fence:[6, .15, "yard", (w, h) => { const H = Math.max(4, h); let g = `<line x1="0" y1="${H / 2}" x2="${w}" y2="${H / 2}" stroke="#6b4a2b" stroke-width="1.6"/>`; for (let x = 0; x <= w; x += 10) g += `<line x1="${x}" y1="${H / 2 - 4}" x2="${x}" y2="${H / 2 + 4}" stroke="#6b4a2b" stroke-width="1.4"/>`; return g; }],
  gate:[3, .2, "yard", (w, h) => { const H = Math.max(4, h); return `<rect width="${w}" height="${H}" fill="#fff" stroke="#6b4a2b" stroke-width="1.6"/><path d="M0 ${H}A${w / 2} ${w / 2} 0 0 0 ${w / 2} ${H + w / 2}M${w} ${H}A${w / 2} ${w / 2} 0 0 1 ${w / 2} ${H + w / 2}" fill="none" stroke="#6b4a2b" stroke-width=".9" stroke-dasharray="3 2"/>`; }],
  parking:[5, 2.5, "yard", (w, h) => `<rect width="${w}" height="${h}" fill="#eceff3" stroke="#7b8494" stroke-width="1.2"/><text x="${w / 2}" y="${h / 2 + 6}" text-anchor="middle" font-size="${Math.min(18, h * .6)}" font-weight="800" fill="#2f5fc4">P</text>`],
  terrace:[5, 3, "yard", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#f6efe4" stroke="#8a6d3b" stroke-width="1.5"/>`; for (let y = 6; y < h; y += 6) g += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#d8c7a8" stroke-width=".7"/>`; return g; }],
  fountain:[2, 2, "yard", (w, h) => `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" fill="#d6ecff" stroke="#2b7bd0" stroke-width="1.6"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 6}" fill="#fff" stroke="#2b7bd0"/>`],
  // roof / mansard
  roofslope:[6, 4, "roof", (w, h) => { let g = `<rect width="${w}" height="${h}" fill="#fbeee6" fill-opacity=".6" stroke="#8b3a2b" stroke-width="1.6"/>`; for (let x = -h; x < w; x += 9) g += `<line x1="${Math.max(0, x)}" y1="${x < 0 ? -x : 0}" x2="${Math.min(w, x + h)}" y2="${x + h > w ? h - (x + h - w) : h}" stroke="#d9a796" stroke-width=".7"/>`; return g + `<path d="M${w / 2} ${h * .8}V${h * .2}M${w / 2 - 5} ${h * .2 + 8}L${w / 2} ${h * .2}L${w / 2 + 5} ${h * .2 + 8}" stroke="#8b3a2b" fill="none" stroke-width="1.5"/>`; }],
  dormer:[2, 1.5, "roof", (w, h) => `<rect width="${w}" height="${h}" fill="#fff" stroke="#8b3a2b" stroke-width="1.6"/><path d="M0 0L${w / 2} ${h * .55}L${w} 0" fill="none" stroke="#8b3a2b" stroke-width="1.2"/><rect x="${w * .25}" y="${h * .62}" width="${w * .5}" height="${h * .3}" fill="#d6ecff" stroke="#3b82c4"/>`],
  skylight:[1, 1.2, "roof", (w, h) => `<rect width="${w}" height="${h}" fill="#d6ecff" stroke="#3b82c4" stroke-width="1.6"/><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="#3b82c4" stroke-width=".7"/>`],
  chimney:[.8, .8, "roof", (w, h) => `<rect width="${w}" height="${h}" fill="#c9a49a" stroke="#8b3a2b" stroke-width="1.6"/><rect x="${w * .25}" y="${h * .25}" width="${w * .5}" height="${h * .5}" fill="#59607a"/>`],
  balcony:[4, 1.5, "roof", (w, h) => `<rect width="${w}" height="${h}" fill="#f2f3f5" stroke="${c}" stroke-width="1"/><path d="M0 ${h}H${w}M0 0V${h}M${w} 0V${h}" stroke="${c}" stroke-width="2.4" fill="none"/>`],
  // furniture
  bed:[2, 1.6, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="2" fill="#fff" stroke="${c}" stroke-width="1.3"/><rect x="${w * .05}" y="${h * .08}" width="${w * .18}" height="${h * .38}" rx="2" fill="#eceff3" stroke="${c}" stroke-width=".8"/><rect x="${w * .05}" y="${h * .54}" width="${w * .18}" height="${h * .38}" rx="2" fill="#eceff3" stroke="${c}" stroke-width=".8"/><path d="M${w * .3} 0V${h}" stroke="${c}" stroke-width=".8"/>`],
  sofa:[2.2, .9, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="3" fill="#eceff3" stroke="${c}" stroke-width="1.3"/><rect x="${w * .08}" y="${h * .28}" width="${w * .84}" height="${h * .62}" rx="2" fill="#fff" stroke="${c}" stroke-width=".8"/><path d="M${w / 2} ${h * .28}V${h * .9}" stroke="${c}" stroke-width=".8"/>`],
  table:[1.6, .9, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="2" fill="#fff" stroke="${c}" stroke-width="1.3"/>` + [[.25, -.14], [.75, -.14], [.25, 1.02], [.75, 1.02]].map(([x, y]) => `<rect x="${w * x - 5}" y="${h * y}" width="10" height="${Math.max(4, h * .12)}" rx="2" fill="none" stroke="${c}" stroke-width=".9"/>`).join("")],
  chair:[.5, .5, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="2" fill="#fff" stroke="${c}" stroke-width="1.2"/><path d="M0 ${h * .2}H${w}" stroke="${c}" stroke-width="1.5"/>`],
  desk:[1.4, .7, "furn", (w, h) => `<rect width="${w}" height="${h}" fill="#fff" stroke="${c}" stroke-width="1.3"/><rect x="${w * .62}" y="0" width="${w * .38}" height="${h}" fill="none" stroke="${c}" stroke-width=".8"/>`],
  wardrobe:[1.8, .6, "furn", (w, h) => `<rect width="${w}" height="${h}" fill="#fff" stroke="${c}" stroke-width="1.3"/><path d="M${w / 2} 0V${h}M0 0L${w / 2} ${h}M${w / 2} ${h}L${w} 0" stroke="${c}" stroke-width=".7"/>`],
  kitchen:[3, .6, "furn", (w, h) => `<rect width="${w}" height="${h}" fill="#fff" stroke="${c}" stroke-width="1.3"/><rect x="${w * .1}" y="${h * .15}" width="${Math.min(w * .2, h * 1.2)}" height="${h * .7}" rx="2" fill="#eceff3" stroke="${c}" stroke-width=".8"/>` + [0, 1, 2, 3].map(i => `<circle cx="${w * .62 + (i % 2) * h * .38}" cy="${h * (i < 2 ? .3 : .7)}" r="${h * .13}" fill="none" stroke="${c}" stroke-width=".8"/>`).join("")],
  wc:[.4, .7, "furn", (w, h) => `<rect width="${w}" height="${h * .28}" fill="#fff" stroke="${c}" stroke-width="1.2"/><ellipse cx="${w / 2}" cy="${h * .62}" rx="${w * .45}" ry="${h * .34}" fill="#fff" stroke="${c}" stroke-width="1.2"/>`],
  sink:[.6, .45, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="2" fill="#fff" stroke="${c}" stroke-width="1.2"/><ellipse cx="${w / 2}" cy="${h * .55}" rx="${w * .35}" ry="${h * .3}" fill="none" stroke="${c}" stroke-width=".9"/>`],
  bath:[1.7, .75, "furn", (w, h) => `<rect width="${w}" height="${h}" rx="3" fill="#fff" stroke="${c}" stroke-width="1.3"/><rect x="${w * .06}" y="${h * .12}" width="${w * .88}" height="${h * .76}" rx="${h * .3}" fill="#eef6fb" stroke="${c}" stroke-width=".8"/>`],
  shower:[.9, .9, "furn", (w, h) => `<rect width="${w}" height="${h}" fill="#eef6fb" stroke="${c}" stroke-width="1.3"/><path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="${c}" stroke-width=".6"/><circle cx="${w / 2}" cy="${h / 2}" r="2.5" fill="${c}"/>`],
};
const GROUPS = ["yard", "roof", "furn"];
const isSym = k => !!SYM[k];
function symSvg(it, w, h){ const S = SYM[it.type]; return S ? S[3](w, h, it) : ""; }
const icon = k => { const S = SYM[k]; if (!S) return ""; const r = S[0] / S[1], W = r >= 1 ? 40 : 40 * r, H = r >= 1 ? 40 / r : 40; return `<svg viewBox="0 0 48 48"><g transform="translate(${(48 - W) / 2} ${(48 - Math.max(H, 6)) / 2})">${S[3](W, Math.max(H, 6))}</g></svg>`; };

/* ---------- walls ---------- */
// thickness by material (metres) when not set; colours as in Wi-Fi Plan
const WT = {none:.05, cubicle:.06, glass:.06, drywall:.1, wood:.08, door:.08, brick:.2, block:.2, concrete:.3, rcon:.35, lowe:.08, metaldoor:.08, metal:.12, elevator:.25};
const WC = {glass:["#2b7bd0", "#d6ecff"], lowe:["#2e7d6b", "#d8f0ea"], door:["#a8641f", "#f5e6d3"], wood:["#9a6a32", "#f1e2cc"], metaldoor:["#5b6774", "#dfe3e8"], drywall:["#3a3f4b", "#d9dde4"], cubicle:["#7b8494", "#eceff3"], brick:["#7a3426", "#c98c7d"], block:["#4e3f32", "#a8998a"], concrete:["#111722", "#6b7385"], rcon:["#000", "#4b5262"], metal:["#2b3240", "#9aa3b5"], elevator:["#2b3240", "#59607a"], none:["#9aa3b5", "#fff"]};
const wallT = w => clamp(num(w.t, WT[w.mat] || .15), .02, 1.5);
// a wall from (x1,y1) to (x2,y2), bent by an arc of `bend` degrees (0 = straight; + to the left, − to the right)
function wallD(w, s){ const x1 = w.x1 * s, y1 = w.y1 * s, x2 = w.x2 * s, y2 = w.y2 * s, th = clamp(num(w.bend, 0), -300, 300) * Math.PI / 180;
  if (Math.abs(th) < .01) return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  const L = Math.hypot(x2 - x1, y2 - y1), r = L / (2 * Math.sin(Math.abs(th) / 2));
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 ${Math.abs(th) > Math.PI ? 1 : 0} ${th > 0 ? 1 : 0} ${x2.toFixed(1)} ${y2.toFixed(1)}`; }
// a point on the wall (0 … 1 along it), for the middle handle
function wallPt(w, u){ const th = num(w.bend, 0) * Math.PI / 180, mx = w.x1 + (w.x2 - w.x1) * u, my = w.y1 + (w.y2 - w.y1) * u; if (Math.abs(th) < .01) return {x:mx, y:my};
  const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), r = L / (2 * Math.sin(Math.abs(th) / 2)), h = r * Math.cos(th / 2), nx = (w.y2 - w.y1) / L, ny = -(w.x2 - w.x1) / L, sg = th > 0 ? 1 : -1;
  const cx = (w.x1 + w.x2) / 2 - nx * h * sg, cy = (w.y1 + w.y2) / 2 - ny * h * sg, a1 = Math.atan2(w.y1 - cy, w.x1 - cx), a = a1 + th * u;
  return {x:cx + r * Math.cos(a), y:cy + r * Math.sin(a)}; }
const wallLen = w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
const wallArc = w => { const th = Math.abs(num(w.bend, 0)) * Math.PI / 180, L = wallLen(w); return th < .01 ? L : L / (2 * Math.sin(th / 2)) * th; };
// walls shown on the Building plan: drawn ones (not the hidden Wi-Fi lines read from a DXF file)
const shownWalls = p => (p.walls || []).filter(w => !w.src && w.kind !== "survey");
function wallsSvg(p, s, sel, print){
  return shownWalls(p).map(w => { const d = wallD(w, s), T = Math.max(1.5, wallT(w) * s), [st, fl] = WC[w.mat] || WC.drywall, on = sel && sel.type === "bwall" && sel.id === w.id, op = w.kind === "door" || w.kind === "window";
    return `<g class="bwl" data-bwall="${w.id}"><path d="${d}" stroke="${st}" stroke-width="${T.toFixed(1)}" fill="none" stroke-linecap="${op ? "butt" : "square"}"/>${T > 4 ? `<path d="${d}" stroke="${fl}" stroke-width="${(T - 2.4).toFixed(1)}" fill="none" stroke-linecap="${op ? "butt" : "square"}"${op ? ' stroke-dasharray="6 3"' : ""}/>` : ""}${print ? "" : `<path d="${d}" stroke="transparent" stroke-width="${Math.max(12, T + 6).toFixed(0)}" fill="none" pointer-events="stroke"/>`}
      ${on && !print ? `<path d="${d}" stroke="#ffb703" stroke-width="2" fill="none" stroke-dasharray="5 3" pointer-events="none"/>` + [["1", w.x1, w.y1], ["2", w.x2, w.y2]].map(([k, x, y]) => `<circle class="bwh" data-bwh="${w.id}:${k}" cx="${x * s}" cy="${y * s}" r="7" fill="#fff" stroke="#ffb703" stroke-width="2.5"/>`).join("") + (() => { const m = wallPt(w, .5); return `<rect class="bwh" data-bwb="${w.id}" x="${m.x * s - 6}" y="${m.y * s - 6}" width="12" height="12" rx="2" fill="#ffb703" stroke="#7a5600" stroke-width="1.2"><title>${esc(t("dw_bendH"))}</title></rect>`; })() : ""}</g>`; }).join("");
}

/* ---------- pieces of a DXF drawing ---------- */
const PST = {wall:'stroke="#2b3240" stroke-width="1.6"', "wall:f":'stroke="#2b3240" stroke-width="1" fill="#6b7385"', wallExt:'stroke="#111722" stroke-width="2.2"', "wallExt:f":'stroke="#111722" stroke-width="1.2" fill="#3b4354"',
  door:'stroke="#a8641f" stroke-width="1.1"', window:'stroke="#2b7bd0" stroke-width="1.3"', furn:'stroke="#9aa1ad" stroke-width=".8"', stair:'stroke="#59607a" stroke-width="1"', column:'stroke="#1d2433" stroke-width="1"', "column:f":'stroke="#1d2433" stroke-width="1" fill="#59607a"',
  site:'stroke="#2e9d57" stroke-width="1.6" stroke-dasharray="8 4"', other:'stroke="#7b8494" stroke-width=".8"'};
function shapesSvg(p, s, sel, print){
  return (p.shapes || []).map(sh => { const on = sel && sel.type === "bshape" && sel.id === sh.id, W = sh.w * s, H = sh.h * s, kx = (s * sh.w / (sh.w0 || sh.w)).toFixed(4), ky = (s * sh.h / (sh.h0 || sh.h)).toFixed(4);
    const body = sh.p.map(([k, d]) => `<path d="${d}" ${PST[k] || PST.other} fill="${/:f$/.test(k) ? "" : "none"}" vector-effect="non-scaling-stroke"/>`).join("").replace(/fill="" /g, "");
    const hit = print ? "" : sh.p.map(([, d]) => `<path d="${d}" stroke="transparent" stroke-width="9" fill="none" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`).join("");
    return `<g class="bsh" data-bshape="${sh.id}" transform="translate(${(sh.x * s).toFixed(1)} ${(sh.y * s).toFixed(1)})${sh.rot ? ` rotate(${sh.rot} ${(W / 2).toFixed(1)} ${(H / 2).toFixed(1)})` : ""}"><g transform="scale(${kx} ${ky})" stroke-linecap="round" stroke-linejoin="round">${body}${hit}</g>${on && !print ? `<rect width="${W}" height="${H}" fill="rgba(255,183,3,.06)" stroke="#ffb703" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>` : ""}</g>`; }).join("");
}
/* ---------- boundaries (closed outlines reshaped point by point) ---------- */
function boundSvg(it, s, on, print){ const P = it.pts || [], pts = []; for (let i = 0; i + 1 < P.length; i += 2) pts.push((P[i] * s).toFixed(1) + "," + (P[i + 1] * s).toFixed(1));
  const st = it.style === "house" ? 'stroke="#111722" stroke-width="3" fill="none"' : 'stroke="#2e9d57" stroke-width="2.2" stroke-dasharray="10 5" fill="#e6f6ea" fill-opacity=".25"';
  let h = `<g class="bbd" data-bbound="${it.id}"><polygon points="${pts.join(" ")}" ${st}/>${print ? "" : `<polygon points="${pts.join(" ")}" stroke="transparent" stroke-width="12" fill="none" pointer-events="stroke"/>`}`;
  if (it.text && P.length) h += `<text x="${(P[0] * s + 6).toFixed(1)}" y="${(P[1] * s + 16).toFixed(1)}" font-size="12" font-weight="700" fill="${it.style === "house" ? "#111722" : "#2e9d57"}">${esc(it.text)}</text>`;
  if (on && !print){ h += `<polygon points="${pts.join(" ")}" stroke="#ffb703" stroke-width="2" fill="none" stroke-dasharray="5 3" pointer-events="none"/>`; for (let i = 0; i + 1 < P.length; i += 2) h += `<circle class="bwh" data-bvx="${it.id}:${i / 2}" cx="${(P[i] * s).toFixed(1)}" cy="${(P[i + 1] * s).toFixed(1)}" r="6" fill="#fff" stroke="#ffb703" stroke-width="2.5"/>`; }
  return h + "</g>"; }
function boundBox(it){ const P = it.pts || []; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i + 1 < P.length; i += 2){ x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); } if (x0 === Infinity) return; it.x = r1(x0); it.y = r1(y0); it.w = r1(x1 - x0); it.h = r1(y1 - y0); }
// a new point on the edge nearest to (x, y)
function boundInsert(it, x, y){ const P = it.pts, n = P.length / 2; let best = 0, bd = Infinity, bx = x, by = y;
  for (let i = 0; i < n; i++){ const j = (i + 1) % n, ax = P[i * 2], ay = P[i * 2 + 1], ex = P[j * 2] - ax, ey = P[j * 2 + 1] - ay, L2 = ex * ex + ey * ey || 1, u = clamp(((x - ax) * ex + (y - ay) * ey) / L2, 0, 1), qx = ax + ex * u, qy = ay + ey * u, d = Math.hypot(x - qx, y - qy); if (d < bd){ bd = d; best = i; bx = qx; by = qy; } }
  P.splice((best + 1) * 2, 0, r1(bx), r1(by)); boundBox(it); return best + 1; }
// the drawing alone (pieces, outlines, yard / roof / furniture symbols): the background of Wi-Fi Plan for an edited drawing
function bgSvg(p, s){ let h = (p.items || []).filter(it => it.type === "boundary").map(it => boundSvg(it, s, false, true)).join("") + shapesSvg(p, s, null, true);
  (p.items || []).filter(it => isSym(it.type)).forEach(it => { const w = it.w * s, hh = it.h * s; h += `<g transform="translate(${it.x * s} ${it.y * s})${it.rot ? ` rotate(${it.rot} ${w / 2} ${hh / 2})` : ""}">${symSvg(it, w, hh)}</g>`; });
  return h; }
return {bgSvg, SYM, GROUPS, isSym, symSvg, icon, WT, wallT, wallD, wallPt, wallLen, wallArc, shownWalls, wallsSvg, shapesSvg, boundSvg, boundBox, boundInsert};
})();
