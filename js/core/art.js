/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Device pictures (3.7): every device kind drawn as a small product view in one style — three-quarter view, three tones per
// body (top / front / side), a thin outline so dark and light devices both read on light and dark backgrounds, nothing
// drawn outside the device itself (no background, no shadow). 48×48 box; devices of the same family use the same size.
// They replace the older flat icons of the same name in ICO, so every place that shows ICO gets them.
"use strict";
const ART = (function(){
const C = {
  dk:{f:"#2e3546", t:"#4d586f", s:"#1e2330", o:"#5d6880"},      // dark metal (rack gear)
  lt:{f:"#e8ecf2", t:"#ffffff", s:"#c3cad6", o:"#6f7a8f"},      // white / light plastic
  sv:{f:"#cdd2da", t:"#eceff3", s:"#a7aebb", o:"#5f687a"},      // silver (patch panels, brackets)
  gy:{f:"#5b6478", t:"#79849b", s:"#434b5c", o:"#1c212c"}       // mid grey
};
const f1 = n => +n.toFixed(2);
// a box seen from the front-right-top: front rectangle + top + right side
function box(x, y, w, h, d, c, extra){ const dx = f1(d * .8), dy = f1(-d * .55), sw = (extra && extra.sw) || .7;
  return `<path d="M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}z" fill="${c.t}" stroke="${c.o}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<path d="M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}z" fill="${c.s}" stroke="${c.o}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.f}" stroke="${c.o}" stroke-width="${sw}" stroke-linejoin="round"/>`; }
// a row of small ports
function ports(x, y, n, opt){ const o = Object.assign({w:1.6, h:1.5, g:.55, grp:0, gg:.7, fill:"#0b0e14", rim:"#8f9ab0", rows:1, rg:.5}, opt || {}); let s = "";
  for (let r = 0; r < o.rows; r++){ let xx = x; for (let i = 0; i < n; i++){ if (o.grp && i && i % o.grp === 0) xx += o.gg; s += `<rect x="${f1(xx)}" y="${f1(y + r * (o.h + o.rg))}" width="${o.w}" height="${o.h}" fill="${o.fill}" stroke="${o.rim}" stroke-width=".3"/>`; xx += o.w + o.g; } }
  return s; }
const led = (x, y, c) => `<circle cx="${x}" cy="${y}" r=".75" fill="${c || "#3fe07c"}"/>`;
const leds = (x, y, n, c, gap) => Array.from({length:n}, (_, i) => led(f1(x + i * (gap || 2)), y, c)).join("");
// 19" rack device, n units high (1U ≈ 6 px on the front)
const RK = {x:4, w:34, d:10, uh:7.4, top:(u) => f1(27 - u * 3.7)};
function rack(u, c, inner){ const h = f1(u * RK.uh), y = RK.top(u); return box(RK.x, y, RK.w, h, RK.d, c) + (inner ? `<g transform="translate(0 ${f1((RK.uh - 6) / 2)})">${inner(RK.x, y, RK.w, h)}</g>` : "")
  + `<rect x="${RK.x}" y="${y}" width="1.6" height="${h}" fill="${c === C.sv ? "#b6bcc7" : "#3a4255"}" stroke="${c.o}" stroke-width=".4"/><rect x="${RK.x + RK.w - 1.6}" y="${y}" width="1.6" height="${h}" fill="${c === C.sv ? "#b6bcc7" : "#3a4255"}" stroke="${c.o}" stroke-width=".4"/>`; }

const A = {};
/* ---------- rack: network ---------- */
A.sw = rack(1, C.dk, (x, y) => led(x + 3.2, y + 3) + ports(x + 6, y + 1.2, 12, {rows:2, grp:6, w:1.45, h:1.35, g:.45, fill:"#18140a", rim:"#d9b13c"}) + ports(x + 27.3, y + 1.6, 2, {rows:2, w:1.6, h:1.2, rim:"#9fb0d6"}));
A.coresw = rack(1, C.dk, (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="#2f6fd6"/>` + led(x + 3.2, y + 3.4) + ports(x + 5.6, y + 2, 8, {rows:2, grp:4, w:1.7, h:1.2, rg:.4, rim:"#9fb0d6"}) + ports(x + 22, y + 2, 4, {rows:2, w:1.7, h:1.2, rg:.4, rim:"#5ac8fa", fill:"#0b2233"}));
A.fw = rack(1, C.dk, (x, y, w) => `<rect x="${x + 2}" y="${y + 1}" width="5" height="4" rx=".6" fill="#d9483b"/><path d="M${x + 4.5} ${y + 1.8}l1.4.6v1c0 .9-.6 1.4-1.4 1.8-.8-.4-1.4-.9-1.4-1.8v-1z" fill="#fff"/>` + ports(x + 9.5, y + 1.6, 8, {rows:2, grp:4, w:1.5, h:1.2, rg:.4}) + ports(x + 25, y + 1.6, 2, {rows:2, w:1.6, h:1.2, rim:"#5ac8fa", fill:"#0b2233"}) + leds(x + 29.5, y + 3, 1));
A.router = rack(1, C.dk, (x, y) => led(x + 3.2, y + 3) + `<rect x="${x + 5.5}" y="${y + 1.5}" width="7" height="3" rx=".4" fill="#4a5470"/>` + ports(x + 15, y + 2.1, 6, {w:1.6, h:1.6}) + ports(x + 26, y + 2.1, 2, {w:1.7, h:1.6, rim:"#5ac8fa", fill:"#0b2233"}));
A.wlc = rack(1, C.dk, (x, y) => `<path d="M${x + 3} ${y + 4}a3 3 0 0 1 4.6 0M${x + 4.1} ${y + 4.8}a1.6 1.6 0 0 1 2.4 0" stroke="#5ac8fa" stroke-width=".7" fill="none"/>` + ports(x + 11, y + 2.1, 4, {w:1.7, h:1.6}) + ports(x + 22, y + 2.1, 2, {w:1.7, h:1.6, rim:"#5ac8fa", fill:"#0b2233"}) + leds(x + 28.5, y + 3, 1));
A.pp = rack(1, C.sv, (x, y) => ports(x + 3.5, y + 1.6, 12, {rows:2, grp:6, w:1.5, h:1.25, g:.55, fill:"#202530", rim:"#5f687a", rg:.45}) + `<rect x="${x + 2}" y="${y + 1}" width=".9" height="4" fill="#fff"/><rect x="${x + 30}" y="${y + 1}" width=".9" height="4" fill="#fff"/>`);
A.fpp = rack(1, C.dk, (x, y) => ports(x + 4, y + 1.7, 10, {rows:2, grp:5, w:1.6, h:1.2, g:.7, fill:"#1d8ff0", rim:"#0c4f94", rg:.5}));
A.odf = rack(2, C.dk, (x, y) => ports(x + 4, y + 2, 10, {rows:4, grp:5, w:1.6, h:1.4, g:.7, fill:"#1d8ff0", rim:"#0c4f94", rg:1.2}));
A.cm = rack(1, C.dk, (x, y) => Array.from({length:5}, (_, i) => `<path d="M${x + 4.5 + i * 5.6} ${y + 1.2}v3.2h3.2v-3.2" fill="none" stroke="#c9ced8" stroke-width=".8"/>`).join(""));
A.blank = rack(1, C.dk);
A.vent = rack(1, C.dk, (x, y) => Array.from({length:12}, (_, i) => `<rect x="${x + 4 + i * 2.2}" y="${y + 1.5}" width="1.1" height="3" rx=".4" fill="#141821"/>`).join(""));
A.shelf = box(5, 22, 33, 1.6, 12, C.sv) + box(11, 15.5, 16, 6.5, 8, C.lt) + `<rect x="13" y="17.5" width="5" height="2" fill="#5ac8fa"/>`;
A.fan = rack(1, C.dk, (x, y) => [9, 17, 25].map(cx => `<circle cx="${x + cx}" cy="${y + 3}" r="2.3" fill="#141821" stroke="#9fb0d6" stroke-width=".5"/><path d="M${x + cx} ${y + 3}l1.4-1.2M${x + cx} ${y + 3}l-1.4 1.2M${x + cx} ${y + 3}l1.2 1.4M${x + cx} ${y + 3}l-1.2-1.4" stroke="#9fb0d6" stroke-width=".5"/>`).join(""));
/* ---------- rack: power ---------- */
A.upsRack = rack(2, C.dk, (x, y) => `<rect x="${x + 4}" y="${y + 2.5}" width="8" height="5" rx=".6" fill="#8fc0ff"/><text x="${x + 8}" y="${y + 6.2}" font-size="3.3" font-family="Arial" font-weight="700" text-anchor="middle" fill="#1d2433">UPS</text>` + leds(x + 15, y + 5, 3, "#3fe07c", 2.2) + Array.from({length:8}, (_, i) => `<rect x="${x + 22 + i * 1.2}" y="${y + 2}" width=".6" height="8" fill="#141821"/>`).join(""));
A.pdu = box(3, 22, 39, 4.5, 6, C.dk) + Array.from({length:8}, (_, i) => `<rect x="${6 + i * 4.1}" y="23" width="2.8" height="2.6" rx=".5" fill="#0b0e14" stroke="#6b7591" stroke-width=".4"/>`).join("") + `<rect x="38.5" y="23" width="2" height="2.6" rx=".4" fill="#d32424"/>`;
/* ---------- rack: compute / CCTV ---------- */
A.server = rack(2, C.dk, (x, y) => Array.from({length:8}, (_, i) => `<rect x="${x + 3 + i * 2.9}" y="${y + 1.6}" width="2.4" height="8.8" rx=".3" fill="#454d66" stroke="#141821" stroke-width=".3"/><rect x="${x + 3.5 + i * 2.9}" y="${y + 2.4}" width="1.4" height=".5" fill="#8d97b5"/>`).join("") + led(x + 29, y + 3) + led(x + 29, y + 6, "#5ac8fa"));
A.storage = rack(2, C.dk, (x, y) => Array.from({length:12}, (_, i) => `<rect x="${x + 2.8 + i * 2.3}" y="${y + 1.6}" width="1.9" height="8.8" rx=".3" fill="#565f7a" stroke="#141821" stroke-width=".3"/>` + led(x + 3.75 + i * 2.3, y + 9.2, "#3fe07c")).join(""));
A.nvr = rack(1, C.dk, (x, y) => `<rect x="${x + 3}" y="${y + 1.5}" width="11" height="3" rx=".4" fill="#3a4257"/>` + `<text x="${x + 8.5}" y="${y + 3.85}" font-size="2.2" font-family="Arial" font-weight="700" text-anchor="middle" fill="#c9d3ea">NVR</text>` + leds(x + 17, y + 3, 4, "#3fe07c", 1.9) + `<rect x="${x + 26}" y="${y + 2}" width="3" height="2" rx=".3" fill="#0b0e14" stroke="#8f9ab0" stroke-width=".3"/>`);
A.nvr2 = rack(2, C.dk, (x, y) => Array.from({length:4}, (_, i) => `<rect x="${x + 3 + i * 4.6}" y="${y + 2}" width="4" height="8" rx=".4" fill="#454d66" stroke="#141821" stroke-width=".3"/>`).join("") + `<text x="${x + 25}" y="${y + 5}" font-size="2.4" font-family="Arial" font-weight="700" text-anchor="middle" fill="#c9d3ea">NVR</text>` + leds(x + 22, y + 8, 4, "#3fe07c", 1.9));
A.dvr = A.nvr;
A.decoder = rack(1, C.dk, (x, y) => `<rect x="${x + 3}" y="${y + 1.5}" width="7" height="3" rx=".3" fill="#5ac8fa"/><path d="M${x + 12} ${y + 3}h4m-1.3-1.3 1.3 1.3-1.3 1.3" stroke="#ffb703" stroke-width=".7" fill="none"/>` + Array.from({length:4}, (_, i) => `<rect x="${x + 18.5 + i * 2.6}" y="${y + 2}" width="2" height="2" rx=".3" fill="#0b0e14" stroke="#c9a227" stroke-width=".35"/>`).join("") + led(x + 29.5, y + 3));
A.encoder = rack(1, C.dk, (x, y) => `<circle cx="${x + 5}" cy="${y + 3}" r="1.6" fill="#e0661b"/><path d="M${x + 8} ${y + 3}h4m-1.3-1.3 1.3 1.3-1.3 1.3" stroke="#ffb703" stroke-width=".7" fill="none"/><rect x="${x + 14}" y="${y + 1.5}" width="7" height="3" rx=".3" fill="#5ac8fa"/>` + ports(x + 23.5, y + 2.2, 2, {w:1.7, h:1.6}) + led(x + 29.5, y + 3));
A.kvm = rack(1, C.dk, (x, y) => Array.from({length:8}, (_, i) => `<rect x="${x + 3.5 + i * 2.6}" y="${y + 1.8}" width="1.8" height="2.4" rx=".3" fill="#7fd1ff"/>`).join("") + `<rect x="${x + 25}" y="${y + 1.8}" width="3" height="2.4" rx=".3" fill="#0b0e14" stroke="#8f9ab0" stroke-width=".3"/>` + led(x + 30, y + 3));
/* ---------- cameras (white housings, smoked lens) ---------- */
const W = C.lt, LENS = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#141a26" stroke="#0b0e14" stroke-width=".5"/><circle cx="${cx}" cy="${cy}" r="${f1(r * .55)}" fill="#26324a"/><circle cx="${f1(cx - r * .3)}" cy="${f1(cy - r * .3)}" r="${f1(r * .22)}" fill="#9fc3ff" opacity=".85"/>`;
const ol = `stroke="${W.o}" stroke-width=".7" stroke-linejoin="round"`;
// bullet: tube on a wall arm, sun shield over the top
A.camBullet = `<path d="M33 9h6v15h-6z" fill="${W.s}" ${ol}/><path d="M33 9l2-1.5h6L39 9z" fill="${W.t}" ${ol}/><path d="M35 15.5c0 3-1 5-4 6.5" fill="none" stroke="${W.o}" stroke-width="2.6"/><path d="M35 15.5c0 3-1 5-4 6.5" fill="none" stroke="${W.f}" stroke-width="1.6"/>`
  + `<path d="M9 17.5c0-3 2-5 5-5h16c2.8 0 4.5 2 4.5 5v2c0 3-1.7 5-4.5 5H14c-3 0-5-2-5-5z" fill="${W.f}" ${ol}/><path d="M11 17c0-2.2 1.5-3.6 3.6-3.6h15.6c1.8 0 3 .9 3.5 2.3" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M10 22.6c1 1.5 2.4 2 4 2h16c1.8 0 3.2-.8 4-2.2" fill="none" stroke="${W.s}" stroke-width="1.6"/>`
  + `<path d="M6.5 13.5c0-1.4 1-2.4 2.4-2.4h22.5l-1.5 2.6H9.6c-.8 0-1.3.4-1.3 1.2v2.4H6.5z" fill="${W.t}" ${ol}/>`
  + `<ellipse cx="10" cy="18.6" rx="2.6" ry="5" fill="${W.s}" ${ol}/>` + `<ellipse cx="9.8" cy="18.6" rx="1.7" ry="3.6" fill="#141a26"/><circle cx="9.4" cy="17.6" r=".8" fill="#9fc3ff"/>`;
// turret: eyeball in a ring on a round base
A.turret = `<path d="M10 33c0-2.5 6.3-4.5 14-4.5s14 2 14 4.5v2.4c0 2.5-6.3 4.5-14 4.5s-14-2-14-4.5z" fill="${W.s}" ${ol}/><ellipse cx="24" cy="33" rx="14" ry="4.5" fill="${W.t}" ${ol}/>`
  + `<circle cx="24" cy="21" r="11" fill="${W.f}" ${ol}/><path d="M15 17a10 10 0 0 1 15-5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`
  + `<path d="M13 22.5c2.5 3.4 6.3 5.5 11 5.5s8.5-2.1 11-5.5" fill="none" stroke="${W.s}" stroke-width="2.2"/>` + LENS(21.5, 22.5, 5) + `<circle cx="29.5" cy="25.5" r="1" fill="#3a1d1d"/>`;
// dome: smoked half sphere in a round housing
A.camDome = `<path d="M7 25.5c0-2.6 7.6-4.6 17-4.6s17 2 17 4.6v2c0 2.6-7.6 4.6-17 4.6S7 30.1 7 27.5z" fill="${W.s}" ${ol}/><ellipse cx="24" cy="25.5" rx="17" ry="4.6" fill="${W.t}" ${ol}/>`
  + `<path d="M12 25.6c0-6.8 5.4-11.4 12-11.4s12 4.6 12 11.4c-3 1.4-7.2 2-12 2s-9-.6-12-2z" fill="#3a4357" stroke="#0e1219" stroke-width=".7"/><path d="M15 21c1.5-3 4.6-5 8-5.2" fill="none" stroke="#9aa7c4" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>` + LENS(25, 21.5, 3.6);
// PTZ: pendant mount, motor head, dome
A.ptz = `<path d="M20 3h8v7h-8z" fill="${W.s}" ${ol}/><path d="M22 10h4v3h-4z" fill="${W.f}" ${ol}/>`
  + `<path d="M12 18c0-3 5.4-5.2 12-5.2s12 2.2 12 5.2v6H12z" fill="${W.f}" ${ol}/><ellipse cx="24" cy="18" rx="12" ry="5" fill="${W.t}" ${ol}/>`
  + `<path d="M12 24c0 7 5.4 12 12 12s12-5 12-12z" fill="#3a4357" stroke="#0e1219" stroke-width=".7"/><path d="M15.5 27c1 3 3.6 5.4 7 6" fill="none" stroke="#9aa7c4" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>` + LENS(26, 28.5, 3.8);
// fisheye: flat disc with a small centre dome
A.fisheye = `<path d="M5 26c0-3 8.5-5.4 19-5.4S43 23 43 26v2.4c0 3-8.5 5.4-19 5.4S5 31.4 5 28.4z" fill="${W.s}" ${ol}/><ellipse cx="24" cy="26" rx="19" ry="5.4" fill="${W.t}" ${ol}/>`
  + `<path d="M17 25.6a7 5.5 0 0 1 14 0c-2 .8-4.4 1.2-7 1.2s-5-.4-7-1.2z" fill="#3a4357" stroke="#0e1219" stroke-width=".6"/><circle cx="24" cy="23.4" r="2.2" fill="#141a26"/><circle cx="23.3" cy="22.7" r=".7" fill="#9fc3ff"/>`;
// box camera: rectangular body + lens on a bracket
A.camBox = box(13, 14, 20, 9, 7, C.dk) + `<path d="M7 15.2h6v6.6H7z" fill="#26324a" stroke="#0e1219" stroke-width=".6"/><ellipse cx="7" cy="18.5" rx="1.6" ry="3.3" fill="#141a26" stroke="#0e1219" stroke-width=".5"/><circle cx="6.7" cy="17.6" r=".7" fill="#9fc3ff"/>`
  + `<path d="M23 23v7" stroke="${C.sv.o}" stroke-width="2.6"/><path d="M23 23v7" stroke="${C.sv.f}" stroke-width="1.6"/>` + box(17, 30, 12, 2.4, 6, C.sv);
// cube: small indoor camera on a stand
A.camCube = box(14, 13, 16, 15, 7, W) + `<rect x="16" y="15" width="12" height="11" rx="2" fill="#2a3346"/>` + LENS(22, 20.5, 3.8) + led(26.6, 16.6, "#5ac8fa")
  + `<path d="M22 28v5" stroke="${W.o}" stroke-width="2.6"/><path d="M22 28v5" stroke="${W.f}" stroke-width="1.6"/>` + `<ellipse cx="22" cy="34.5" rx="8" ry="2.4" fill="${W.t}" ${ol}/>`;
A.camBullet = `<g transform="translate(-3.5 4) scale(1.15)">${A.camBullet}</g>`;
A.camBox = `<g transform="translate(0 5)">${A.camBox}</g>`;
A.camgrid = ["camBullet", "turret", "camDome", "ptz", "fisheye", "camBox"].map((k, i) => `<g transform="translate(${(i % 3) * 16} ${Math.floor(i / 3) * 22 + 2}) scale(.34)">${A[k]}</g>`).join("");
// outdoor badge (shown on cameras / APs placed outside): blue circle with a rain drop
A._out = `<circle cx="41" cy="7" r="5.2" fill="#1f6fd6" stroke="#fff" stroke-width="1"/><path d="M41 3.6c1.6 2.2 2.4 3.4 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1.1.8-2.3 2.4-4.5z" fill="#fff"/>`;
/* ---------- Wi-Fi ---------- */
A.ap = `<path d="M6 25c0-3.4 8-6 18-6s18 2.6 18 6v2.6c0 3.4-8 6-18 6S6 31 6 27.6z" fill="${W.s}" ${ol}/><ellipse cx="24" cy="25" rx="18" ry="6" fill="${W.t}" ${ol}/><ellipse cx="24" cy="25" rx="12.5" ry="3.9" fill="none" stroke="#e1e6ee" stroke-width="1"/><ellipse cx="24" cy="25" rx="3" ry="1" fill="#5ac8fa"/>`
  + `<path d="M17 12.5a10 10 0 0 1 14 0M19.6 15a6 6 0 0 1 8.8 0" fill="none" stroke="#1f6fd6" stroke-width="1.6" stroke-linecap="round"/>`;
A.apDisk = A.ap;
A.apWall = box(15, 8, 16, 30, 4, W) + `<rect x="17.5" y="11" width="11" height="10" rx="1.4" fill="#f6f8fb" stroke="#d4dae4" stroke-width=".6"/><path d="M19.8 15.4a4.5 4.5 0 0 1 6.4 0M21.3 17.1a2.4 2.4 0 0 1 3.4 0" fill="none" stroke="#1f6fd6" stroke-width="1" stroke-linecap="round"/>` + led(23, 24.5, "#5ac8fa") + ports(18.2, 31, 3, {w:2.6, h:2.2, g:.8});
A.apOut = `<path d="M18 4v9M30 4v9" stroke="${W.o}" stroke-width="2.6" stroke-linecap="round"/><path d="M18 4v9M30 4v9" stroke="${W.f}" stroke-width="1.5" stroke-linecap="round"/>` + box(15, 12, 18, 22, 5, W) + `<rect x="18" y="15.5" width="12" height="2.4" rx=".6" fill="#d4dae4"/>` + leds(20, 30.5, 4, "#3fe07c", 2.6)
  + `<path d="M37 9v32" stroke="#59607a" stroke-width="3"/><path d="M33 18h4M33 30h4" stroke="${C.sv.o}" stroke-width="2"/>`;
/* ---------- small network boxes ---------- */
A.modem = `<path d="M13 21l-2-13M35 21l2-13" stroke="#1d2433" stroke-width="2" stroke-linecap="round"/>` + box(7, 21, 30, 9, 8, W) + leds(11, 25.5, 5, "#3fe07c", 2.6) + led(26, 25.5, "#5ac8fa") + `<rect x="29" y="23.6" width="5" height="3.8" rx=".6" fill="#d4dae4"/>`;
A.ont = box(9, 21, 26, 8, 7, W) + leds(12.5, 25, 4, "#3fe07c", 2.6) + led(23.5, 25, "#ffb703") + `<rect x="27.5" y="22.6" width="4.6" height="4.6" rx=".6" fill="#2fbf71" stroke="#167a45" stroke-width=".5"/><path d="M35 25h6" stroke="#7d3cc8" stroke-width="1.8" stroke-linecap="round"/>`;
A.swDesk = box(7, 22, 30, 7, 9, C.gy) + led(9.8, 25.5) + ports(12.5, 23.6, 8, {w:2.3, h:2.4, g:.55, grp:4, gg:.9, fill:"#0b0e14", rim:"#c9ced8"});
A.mediaconv = box(12, 21, 20, 8, 8, C.dk) + ports(15, 23.4, 1, {w:2.8, h:2.8}) + `<rect x="21" y="23.4" width="2" height="3" fill="#1d8ff0"/><rect x="23.5" y="23.4" width="2" height="3" fill="#1d8ff0"/>` + leds(28.5, 25, 1);
A.poeinj = `<path d="M7 34c3 0 4-3 4-6" fill="none" stroke="#1d2433" stroke-width="1.6"/>` + box(11, 22, 22, 9, 7, C.dk) + `<path d="M21.5 23.6l-2.4 3.4h2.4l-1.4 3 4-4.2h-2.4l1.6-2.2z" fill="#ffb703"/>` + ports(13.2, 25, 1, {w:3, h:3}) + ports(28, 25, 1, {w:3, h:3}) + led(26.4, 24.5);
A.adapter = box(8, 22, 13, 7, 6, C.dk) + box(26, 22, 13, 7, 6, C.dk) + `<path d="M21 25.5h5" stroke="#1f6fd6" stroke-width="1.8"/>` + ports(10, 24, 1, {w:3.6, h:2.2, rim:"#c9a227"}) + ports(28, 24, 1, {w:3.6, h:2.2, rim:"#c9a227"}) + led(16.5, 25.2) + led(34.5, 25.2);
A.hdmiext = A.adapter;
A.splice = `<path d="M15 34V16c0-5 4-8 9-8s9 3 9 8v18z" fill="#4d586f" stroke="#0e1219" stroke-width=".7"/><path d="M18 33V16.5c0-3.4 2.6-5.7 6-5.7" fill="none" stroke="#79849b" stroke-width="1.6"/>` + box(12, 34, 24, 4, 6, C.dk) + `<path d="M17 38v4M21 38v4M27 38v4M31 38v4" stroke="#1d8ff0" stroke-width="1.4"/>`;
/* ---------- power / storage (stand-alone) ---------- */
A.ups = box(15, 9, 14, 30, 9, C.dk) + `<rect x="17.5" y="12" width="9" height="6" rx=".6" fill="#8fc0ff"/><text x="22" y="16.6" font-size="3.6" font-family="Arial" font-weight="700" text-anchor="middle" fill="#1d2433">UPS</text>` + `<circle cx="22" cy="23" r="1.6" fill="#141821" stroke="#9fb0d6" stroke-width=".5"/>` + leds(19, 28, 3, "#3fe07c", 1.5) + Array.from({length:4}, (_, i) => `<rect x="17.5" y="${31 + i * 1.6}" width="9" height=".6" fill="#141821"/>`).join("");
A.nas = box(13, 10, 17, 28, 8, C.dk) + Array.from({length:4}, (_, i) => `<rect x="15" y="${12.5 + i * 5.4}" width="13" height="4.4" rx=".5" fill="#454d66" stroke="#141821" stroke-width=".3"/>` + led(26, 14.7 + i * 5.4)).join("") + `<circle cx="21.5" cy="35" r="1.2" fill="#5ac8fa"/>`;
A.server_t = box(13, 8, 18, 31, 10, C.dk) + Array.from({length:3}, (_, i) => `<rect x="15" y="${11 + i * 5}" width="14" height="4" rx=".4" fill="#454d66"/>`).join("") + Array.from({length:6}, (_, i) => `<rect x="15" y="${27 + i * 1.6}" width="14" height=".6" fill="#141821"/>`).join("") + led(27, 36.5);
/* ---------- computers & screens ---------- */
const screen = (x, y, w, h, bez) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#1d2433" stroke="#0e1219" stroke-width=".6"/><rect x="${x + bez}" y="${y + bez}" width="${w - bez * 2}" height="${h - bez * 2}" fill="#2f7fe0"/><path d="M${x + bez} ${y + bez}l${f1((w - bez * 2) * .7)} 0L${x + bez} ${f1(y + h - bez)}z" fill="#5aa2ef" opacity=".45"/>`;
const stand = (cx, y, w) => `<path d="M${cx - 1.5} ${y}h3l1 4h-5z" fill="#4a5168"/><rect x="${f1(cx - w / 2)}" y="${y + 4}" width="${w}" height="1.6" rx=".8" fill="#2a3042"/>`;
A.pc = box(31, 14, 8, 22, 7, C.dk) + led(35, 17, "#5ac8fa") + `<rect x="32.5" y="20" width="5" height=".6" fill="#141821"/>` + screen(4, 12, 26, 17, 1.5) + stand(17, 29, 12);
A.workstation = screen(3, 13, 19, 13, 1.2) + screen(22, 13, 19, 13, 1.2) + stand(12.5, 26, 9) + stand(31.5, 26, 9);
A.laptop = `<path d="M10 9h28l-1 20H11z" fill="#1d2433" stroke="#0e1219" stroke-width=".6"/><path d="M12 11h24l-.8 16H12.8z" fill="#2f7fe0"/><path d="M12 11h17L12.8 27z" fill="#5aa2ef" opacity=".45"/>` + `<path d="M8 29h32l4 6H4z" fill="${C.sv.f}" stroke="${C.sv.o}" stroke-width=".7" stroke-linejoin="round"/><path d="M19 32h10" stroke="${C.sv.s}" stroke-width="1.4"/>`;
A.monitor = screen(4, 8, 40, 25, 1.6) + stand(24, 33, 16);
A.tv = screen(2, 10, 44, 26, 1) + `<path d="M12 36l-3 5M36 36l3 5" stroke="#2a3042" stroke-width="2" stroke-linecap="round"/>`;
A.wall = [[3, 6], [24, 6], [3, 21], [24, 21]].map(([x, y]) => screen(x, y, 21, 15, .9)).join("") + `<path d="M12 36v5M36 36v5" stroke="#2a3042" stroke-width="2"/>`;
A.touch = box(10, 11, 26, 18, 3, W) + `<rect x="12.5" y="13.2" width="21" height="13.6" rx=".6" fill="#2f7fe0"/><circle cx="29" cy="20" r="2.6" fill="#fff" opacity=".85"/><rect x="15" y="16" width="9" height="2" rx=".5" fill="#fff" opacity=".7"/>`;
A.printer = box(8, 22, 30, 11, 12, W) + `<path d="M13 22l3-6h15l-3 6z" fill="#fff" stroke="${W.o}" stroke-width=".7" stroke-linejoin="round"/><path d="M14 33h20l-1.4 4H15.4z" fill="#f6f8fb" stroke="${W.o}" stroke-width=".6"/><rect x="11" y="24.5" width="7" height="3" rx=".5" fill="#2a3042"/>` + led(33, 26) + `<rect x="10" y="29" width="26" height=".8" fill="${W.s}"/>`;
A.phone = `<path d="M9 33l4-15h24l4 15z" fill="#2c3342" stroke="#0e1219" stroke-width=".7" stroke-linejoin="round"/><path d="M9 33h32v3H9z" fill="#1e2330" stroke="#0e1219" stroke-width=".7"/>`
  + `<path d="M8 32.5l3.5-14.5c.3-1.2 1.2-1.8 2.3-1.8h2.4c1 0 1.6.8 1.3 1.8l-3.9 14.5z" fill="#3d465a" stroke="#0e1219" stroke-width=".7"/>`
  + `<path d="M20 20.5h14l-.8 5.6H19.2z" fill="#5aa2ef" stroke="#0e1219" stroke-width=".5"/>` + Array.from({length:3}, (_, r) => Array.from({length:3}, (_, c) => `<rect x="${f1(21.3 + c * 3.6 - r * .4)}" y="${f1(27.6 + r * 1.75)}" width="2.6" height="1.2" rx=".3" fill="#c4cde3"/>`).join("")).join("") + led(36, 28, "#ff5a4e");
A.joystick = box(5, 28, 36, 7, 10, C.dk) + `<path d="M31 28v-10" stroke="#59607a" stroke-width="2.4"/><circle cx="31" cy="16.5" r="3.2" fill="#d63a3a" stroke="#7a1b1b" stroke-width=".6"/>` + ports(8, 30, 9, {w:1.6, h:1.2, rows:2, g:.6, fill:"#c4cde3", rim:"#c4cde3", rg:.6});
/* ---------- doors & building ---------- */
A.intercom = box(16, 6, 14, 34, 3, C.sv) + `<circle cx="23" cy="11.5" r="2.6" fill="#141a26"/><circle cx="22.4" cy="10.9" r=".8" fill="#9fc3ff"/><rect x="18.5" y="16" width="9" height="6" rx=".6" fill="#1d2433"/>` + Array.from({length:3}, (_, r) => Array.from({length:3}, (_, c) => `<circle cx="${20.2 + c * 2.8}" cy="${26 + r * 2.8}" r=".9" fill="#59607a"/>`).join("")).join("") + `<rect x="19" y="35" width="8" height="2.4" rx="1.2" fill="#1f6fd6"/>`;
A.access = box(17, 7, 12, 32, 3, C.dk) + `<rect x="18.8" y="9.6" width="8.4" height="10" rx=".6" fill="#2f7fe0"/><circle cx="23" cy="13.6" r="2.3" fill="#9fc3ff" opacity=".8"/><circle cx="23" cy="28" r="4" fill="none" stroke="#9fb0d6" stroke-width="1"/><path d="M21.2 28a1.8 1.8 0 0 1 3.6 0M20 28a3 3 0 0 1 6 0" fill="none" stroke="#9fb0d6" stroke-width=".6"/>` + led(23, 35.5);
A.cardReader = A.access;
A.alarm = box(11, 8, 24, 30, 4, W) + `<rect x="14" y="11" width="18" height="6" rx=".6" fill="#1d2433"/><text x="23" y="15.5" font-size="3.4" font-family="Arial" font-weight="700" text-anchor="middle" fill="#7fe0a0">ARMED</text>` + Array.from({length:4}, (_, r) => Array.from({length:3}, (_, c) => `<rect x="${15.2 + c * 5.4}" y="${20 + r * 4}" width="4.2" height="2.8" rx=".5" fill="#d4dae4" stroke="${W.o}" stroke-width=".3"/>`).join("")).join("") + led(30, 36.3, "#ff5a4e");
A.sensor = `<path d="M14 12h20l-2 14c-.6 4-4 7-8 7s-7.4-3-8-7z" fill="${W.f}" ${ol}/><path d="M14 12l3-3h20l-3 3z" fill="${W.t}" ${ol}/><path d="M34 12l3-3-2 14c-.4 2.6-1.5 4.8-3 6.4z" fill="${W.s}" ${ol}/><path d="M18 21c0 4 2.6 6.6 6 6.6s6-2.6 6-6.6z" fill="#3a4357" stroke="#0e1219" stroke-width=".5"/>` + led(30, 15, "#ff5a4e");
A.iot = `<path d="M10 27c0-3 6.3-5.4 14-5.4s14 2.4 14 5.4v3c0 3-6.3 5.4-14 5.4S10 33 10 30z" fill="${W.s}" ${ol}/><ellipse cx="24" cy="27" rx="14" ry="5.4" fill="${W.t}" ${ol}/><ellipse cx="24" cy="27" rx="4" ry="1.4" fill="#2448a8"/>` + `<path d="M15 16a12 12 0 0 1 18 0M18.6 19a7 7 0 0 1 10.8 0" fill="none" stroke="#2448a8" stroke-width="1.6" stroke-linecap="round"/>`;
A.outlet = box(13, 12, 22, 24, 3, W) + `<rect x="16.5" y="15.5" width="15" height="17" rx="1" fill="#f6f8fb" stroke="#d4dae4" stroke-width=".6"/>` + [18.3, 25.7].map(y => `<path d="M20 ${y}h8v4.6h-2v1h-4v-1h-2z" fill="#1d2433"/>`).join("");
A.box = box(9, 15, 26, 18, 8, C.gy) + leds(12.5, 30, 3, "#3fe07c", 2.2) + `<rect x="12" y="18" width="14" height="3" rx=".5" fill="#9fb0d6"/>`;
return {A, C, box, ports, led, leds, rack};
})();
// the pictures replace the older flat icons of the same name; "_out" versions carry the outdoor badge
(function(){ const A = ART.A; Object.keys(A).forEach(k => { if (k[0] !== "_") ICO[k] = A[k]; });
  ["camBullet", "turret", "camDome", "ptz", "fisheye", "camBox", "camCube"].forEach(k => { ICO[k + "_out"] = A[k] + A._out; });
  ["vent", "upsRack", "nvr2", "dvr", "camBox", "camCube", "apWall", "apOut", "swDesk", "hdmiext", "server_t"].forEach(k => { if (!ICON_LIST.includes(k)) ICON_LIST.push(k); }); })();
