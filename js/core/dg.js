/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Diagram engine for Topology, Fiber and CCTV. Devices, racks and cables are building entities;
// the view only stores where each one is drawn, plus free boxes (zones), texts, shapes and images.
"use strict";
const ZC = {blue:"#2448a8", green:"#2a9d3a", orange:"#d9822b", purple:"#7d3cc8", red:"#c0392b", teal:"#16a3a3", gray:"#59607a", black:"#1d2433", yellow:"#c9a227"};
const ZF = {blue:"#eef3ff", green:"#ecf8ee", orange:"#fff3e6", purple:"#f5eefc", red:"#fdeeee", teal:"#e8f7f7", gray:"#f1f3f6", black:"#eceef2", yellow:"#fff9e0"};
const RROW = 22, RHEAD = 28;
const DG = {mode:"select", media:null, linkFrom:null, drag:null, band:null, clip:null};
function view(b, id){
  const v = b.views[id] = b.views[id] || {};
  v.nodes = v.nodes || {}; v.boxes = v.boxes || []; v.anno = v.anno || []; v.routes = v.routes || {};
  v.page = Object.assign({w:1200, h:700}, v.page || {}); v.grid = Object.assign({show:false, snap:true, size:10}, v.grid || {});
  v.show = Object.assign({links:true, ports:true, ip:true, cid:false, speed:false, model:true}, v.show || {});
  for (const k of Object.keys(v.nodes)) if (!devById(b, k) && !rackById(b, k)) delete v.nodes[k];
  return v;
}
const snapv = (v, x) => v.grid.snap ? Math.round(x / v.grid.size) * v.grid.size : Math.round(x);
/* ---------- geometry ---------- */
function rackRows(b, r){ return rackDevices(b, r).sort((a, c) => topU(c) - topU(a)); }
function nodeGeo(b, v, id){
  const n = v.nodes[id]; if (!n) return null;
  const d = devById(b, id), r = !d && rackById(b, id);
  if (r){ const rows = rackRows(b, r); return {x:n.x, y:n.y, w:n.w || 230, h:RHEAD + Math.max(1, rows.length) * RROW + 8, rack:r, rows}; }
  if (!d) return null;
  if (n.boxed) return {x:n.x, y:n.y, w:n.w || 160, h:n.h || 64, d};
  const s = n.size || 52; return {x:n.x, y:n.y, w:s, h:s, d};
}
// Where a device is drawn in this view: its own node, or a row of a placed rack.
function anchorOf(b, v, devId){
  if (v.nodes[devId]){ const g = nodeGeo(b, v, devId); return g && {x:g.x, y:g.y, w:g.w, h:g.h, node:devId}; }
  const d = devById(b, devId); if (!d || !d.rack || !v.nodes[d.rack]) return null;
  const g = nodeGeo(b, v, d.rack), i = g.rows.indexOf(d); if (i < 0) return null;
  return {x:g.x + 6, y:g.y + RHEAD + i * RROW, w:g.w - 12, h:RROW - 2, node:d.rack, row:true};
}
function autoSides(a, c){ const ax = a.x + a.w / 2, ay = a.y + a.h / 2, cx = c.x + c.w / 2, cy = c.y + c.h / 2, dx = cx - ax, dy = cy - ay;
  if (a.row || c.row){ return [a.row ? (dx >= 0 ? "r" : "l") : (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "b" : "t")), c.row ? (dx >= 0 ? "l" : "r") : (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "l" : "r") : (dy > 0 ? "t" : "b"))]; }
  return Math.abs(dx) * 0.8 > Math.abs(dy) ? (dx > 0 ? ["r","l"] : ["l","r"]) : (dy > 0 ? ["b","t"] : ["t","b"]); }
const sidePt = (b, s, f) => s === "l" ? {x:b.x, y:b.y + b.h * f} : s === "r" ? {x:b.x + b.w, y:b.y + b.h * f} : s === "t" ? {x:b.x + b.w * f, y:b.y} : {x:b.x + b.w * f, y:b.y + b.h};
function layoutLinks(b, v, links){
  const out = {}, G = {};
  links.forEach(l => { const A = anchorOf(b, v, l.a.d), C = anchorOf(b, v, l.b.d); if (!A || !C || A.node === C.node && !A.row) return;
    const rt = v.routes[l.id] || {}; let [sa, sb] = autoSides(A, C); if (rt.sa) sa = rt.sa; if (rt.sb) sb = rt.sb;
    out[l.id] = {A, C, sa, sb, rt};
    [["a", A, sa, C], ["b", C, sb, A]].forEach(([e, N, s, O]) => { if (N.row){ out[l.id][e + "f"] = .5; return; } const k = N.node + s; (G[k] = G[k] || []).push({l, e, o:(s === "l" || s === "r") ? O.y + O.h / 2 : O.x + O.w / 2}); });
  });
  Object.values(G).forEach(items => { items.sort((x, y) => x.o - y.o); const n = items.length, span = Math.min(.8, .18 * n); items.forEach((it, i) => { out[it.l.id][it.e + "f"] = n === 1 ? .5 : .5 - span / 2 + span * i / (n - 1); }); });
  Object.values(out).forEach(g => { g.p1 = sidePt(g.A, g.sa, g.af); g.p2 = sidePt(g.C, g.sb, g.bf); });
  return out;
}
function linkPath(g){
  const {p1, p2, sa, sb, rt} = g, H = s => s === "l" || s === "r", R = x => Math.round(x * 10) / 10;
  if (rt.straight) return {d:`M${R(p1.x)} ${R(p1.y)}L${R(p2.x)} ${R(p2.y)}`, mid:{x:(p1.x + p2.x) / 2, y:(p1.y + p2.y) / 2}};
  if (H(sa) && H(sb)){ let mx = rt.mx; if (mx == null) mx = sa === sb ? (sa === "r" ? Math.max(p1.x, p2.x) + 26 : Math.min(p1.x, p2.x) - 26) : (p1.x + p2.x) / 2;
    return {d:`M${R(p1.x)} ${R(p1.y)}H${R(mx)}V${R(p2.y)}H${R(p2.x)}`, mid:{x:mx, y:(p1.y + p2.y) / 2}, ax:"x", hx:mx}; }
  if (!H(sa) && !H(sb)){ let my = rt.my; if (my == null) my = sa === sb ? (sa === "b" ? Math.max(p1.y, p2.y) + 26 : Math.min(p1.y, p2.y) - 26) : (p1.y + p2.y) / 2;
    return {d:`M${R(p1.x)} ${R(p1.y)}V${R(my)}H${R(p2.x)}V${R(p2.y)}`, mid:{x:(p1.x + p2.x) / 2, y:my}, ax:"y", hy:my}; }
  return H(sa) ? {d:`M${R(p1.x)} ${R(p1.y)}H${R(p2.x)}V${R(p2.y)}`, mid:{x:p2.x, y:p1.y}} : {d:`M${R(p1.x)} ${R(p1.y)}V${R(p2.y)}H${R(p2.x)}`, mid:{x:p1.x, y:p2.y}};
}
const svgt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || "start"}" fill="${o.fill || "#1d2433"}"${o.mono ? ' font-family="Consolas,monospace"' : ""}${o.halo ? ' stroke="#fff" stroke-width="3" paint-order="stroke"' : ""}>${esc(s)}</text>`;
const icn = (name, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 48})">${ICO[name] || ICO.box}</g>`;
/* ---------- rendering ---------- */
function dgContent(b, v, cfg){
  let xs = [0, v.page.w], ys = [0, v.page.h];
  const grow = (x, y, w, h) => { xs.push(x, x + w); ys.push(y, y + h); };
  v.boxes.forEach(z => grow(z.x, z.y, z.w, z.h)); v.anno.forEach(a => grow(a.x, a.y, a.w || 100, a.h || 30));
  Object.keys(v.nodes).forEach(id => { const g = nodeGeo(b, v, id); if (g) grow(g.x, g.y, g.w, g.h + (g.d && !v.nodes[id].boxed ? 44 : 0)); });
  return {x:Math.min(...xs, 0) - 20, y:Math.min(...ys, 0) - 20, w:Math.max(...xs) - Math.min(...xs, 0) + 40, h:Math.max(...ys) - Math.min(...ys, 0) + 40};
}
function dgSvg(b, cfg, opts = {}){
  const v = view(b, cfg.id), vb = dgContent(b, v, cfg), print = !!opts.print, S = v.show;
  const sel = !print && UI.sel, isSel = (type, id) => sel && sel.type === type && sel.id === id || UI.multi.has(type + ":" + id);
  const hl0 = cfg.highlight ? cfg.highlight(b, v) : null, fv = dgVisible(b, v), hideF = fv && v.filter.hide;
  const hl = hl0 && fv ? new Set([...hl0].filter(x => fv.has(x))) : hl0 || (fv && !hideF ? fv : null), dim = id => hl && !hl.has(id), gone = id => hideF && !fv.has(id);
  let h = `<svg xmlns="http://www.w3.org/2000/svg" class="dgsvg" id="dg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}" font-family="Segoe UI,Arial,sans-serif" data-app="${cfg.id}">
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5 0 10z" fill="context-stroke"/></marker>
    <pattern id="grid" width="${v.grid.size}" height="${v.grid.size}" patternUnits="userSpaceOnUse"><path d="M${v.grid.size} 0H0V${v.grid.size}" fill="none" stroke="#e6e9f0" stroke-width=".6"/></pattern></defs>
    <rect class="bg" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${!print && v.grid.show ? "url(#grid)" : "#fff"}"/>`;
  if (!print && v.grid.show) h += `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#grid)" pointer-events="none"/>`;
  // boxes (zones)
  v.boxes.forEach(z => { const c = ZC[z.color] || ZC.blue, on = isSel("box", z.id);
    h += `<g class="dz" data-box="${z.id}"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="8" fill="${z.fill ? (ZF[z.color] || "#fff") : "rgba(255,255,255,.01)"}" stroke="${c}" stroke-width="${on ? 2.6 : 1.8}"${z.dash ? ' stroke-dasharray="7 5"' : ""}/>`;
    const tx = z.tpos === "center" ? z.x + z.w / 2 : z.tpos === "right" ? z.x + z.w - 12 : z.x + 12, an = z.tpos === "center" ? "middle" : z.tpos === "right" ? "end" : "start";
    lines(z.label).forEach((ln, i) => h += `<text class="ztitle" data-box="${z.id}" x="${tx}" y="${z.y + 20 + i * 17}" font-size="${z.tsize || 15}" font-weight="800" fill="${c}" text-anchor="${an}">${esc(ln)}</text>`);
    if (z.sub) h += svgt(tx, z.y + 20 + lines(z.label).length * 17, z.sub, {size:11, fill:"#59607a", anchor:an});
    if (on && !print) h += `<rect class="rh" data-rh="box:${z.id}" x="${z.x + z.w - 7}" y="${z.y + z.h - 7}" width="12" height="12" rx="2"/>`;
    h += `</g>`; });
  // annotations
  v.anno.forEach(a => { const on = isSel("anno", a.id); h += `<g class="da" data-anno="${a.id}">`;
    if (a.type === "text") lines(a.text).forEach((ln, i) => h += svgt(a.x, a.y + (i + 1) * (a.size || 13) * 1.25, ln, {size:a.size || 13, weight:a.bold ? 700 : 400, fill:a.color || "#1d2433"}));
    else if (a.type === "image"){ const u = assetURL(a.img); h += u ? `<image href="${u}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" preserveAspectRatio="xMidYMid meet" opacity="${num(a.op, 100) / 100}"/>` : `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="#f1f3f6" stroke="#b9c0cf" stroke-dasharray="4 3"/>`; }
    else { const c = ZC[a.color] || ZC.yellow; h += a.shape === "ellipse" ? `<ellipse cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" rx="${a.w / 2}" ry="${a.h / 2}" fill="${ZF[a.color] || "#fff9e0"}" stroke="${c}" stroke-width="1.6"/>` : `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="${a.shape === "rect" ? 2 : 10}" fill="${ZF[a.color] || "#fff9e0"}" stroke="${c}" stroke-width="1.6"/>`;
      lines(a.text).forEach((ln, i, all) => h += svgt(a.x + a.w / 2, a.y + a.h / 2 + 4 + (i - (all.length - 1) / 2) * 15, ln, {size:12, anchor:"middle", weight:600})); }
    if (on && !print){ const w = a.w || 120, hh = a.h || (lines(a.text).length * (a.size || 13) * 1.3 + 6); h += `<rect class="selbox" x="${a.x - 4}" y="${a.y - 4}" width="${w + 8}" height="${hh + 8}"/>${a.type !== "text" ? `<rect class="rh" data-rh="anno:${a.id}" x="${a.x + w - 6}" y="${a.y + hh - 6}" width="12" height="12" rx="2"/>` : ""}`; }
    h += `</g>`; });
  // cables
  const links = S.links === false ? [] : b.links.filter(l => (!cfg.linkFilter || cfg.linkFilter(l, b)) && !gone(l.a.d) && !gone(l.b.d));
  const G = layoutLinks(b, v, links);
  links.forEach(l => { const g = G[l.id]; if (!g) return; const M = MEDIA[l.media] || MEDIA.cat6, p = linkPath(g), on = isSel("link", l.id), dd = dim(l.a.d) || dim(l.b.d);
    const stc = l.status === "faulty" ? "#d63a3a" : M.c, dash = l.status === "planned" ? "6 4" : M.dash || "";
    h += `<g class="dl${dd ? " dim" : ""}" data-link="${l.id}"><path d="${p.d}" fill="none" stroke="transparent" stroke-width="12"/><path d="${p.d}" fill="none" stroke="${stc}" stroke-width="${M.w + (on ? 1.6 : 0)}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linejoin="round"/>`;
    const lab = [S.cid && l.cid, S.speed && l.speed, l.label].filter(Boolean).join(" · ");
    if (lab) h += svgt(p.mid.x + 4, p.mid.y - 5, lab, {size:9.5, weight:700, fill:stc, halo:true});
    if (S.ports){ [[g.p1, g.sa, l.a.p], [g.p2, g.sb, l.b.p]].forEach(([pt, s, txt]) => { if (!txt) return; const dx = s === "l" ? -4 : s === "r" ? 4 : 4, dy = s === "t" ? -4 : s === "b" ? 11 : -3; h += svgt(pt.x + dx, pt.y + dy, txt, {size:8.5, fill:"#3b4560", anchor:s === "l" ? "end" : "start", halo:true, mono:true}); }); }
    if (on && !print && p.ax) h += `<circle class="lh" data-lh="${l.id}:${p.ax}" cx="${p.mid.x}" cy="${p.mid.y}" r="6"/>`;
    h += `</g>`; });
  // racks and devices
  for (const [id, n] of Object.entries(v.nodes)){
    if (gone(id)) continue; const g = nodeGeo(b, v, id); if (!g) continue;
    if (g.rack){ const r = g.rack, on = isSel("rack", id);
      h += `<g class="dn drk${dim(id) ? " dim" : ""}" data-node="${id}"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="6" fill="#1d2433" stroke="${on ? "#ffb703" : "#0d1220"}" stroke-width="${on ? 3 : 1.5}"/>`
        + svgt(g.x + 10, g.y + 18, r.name, {size:12, weight:800, fill:"#fff"}) + svgt(g.x + g.w - 10, g.y + 18, `${r.u}U`, {size:10, fill:"#9fb0d6", anchor:"end"});
      if (!g.rows.length) h += svgt(g.x + g.w / 2, g.y + RHEAD + 14, t("rackEmpty"), {size:10, fill:"#9fb0d6", anchor:"middle"});
      g.rows.forEach((d, i) => { const y = g.y + RHEAD + i * RROW, son = isSel("dev", d.id);
        h += `<g class="rrow" data-row="${d.id}" data-rack="${id}"><rect x="${g.x + 6}" y="${y}" width="${g.w - 12}" height="${RROW - 2}" rx="2" fill="${son ? "#fff4cf" : d.kind === "pp" || d.kind === "fpp" ? "#e4e7ee" : "#2e3550"}" stroke="${son ? "#ffb703" : "transparent"}" stroke-width="2"/>`
          + svgt(g.x + 12, y + 14, `U${topU(d)}${devH(d) > 1 ? "–" + d.u : ""}`, {size:9, fill:d.kind === "pp" || d.kind === "fpp" ? "#59607a" : "#9fb0d6", mono:true})
          + icn(devIcon(d), g.x + 52, y + 1, 18) + svgt(g.x + 74, y + 14, devLabel(d) + (S.ip && d.ip ? "  " + d.ip.split("/")[0] : ""), {size:10, weight:600, fill:d.kind === "pp" || d.kind === "fpp" ? "#1d2433" : "#fff"}) + `</g>`; });
      if (on && !print) h += `<rect class="rh" data-rh="rack:${id}" x="${g.x + g.w - 6}" y="${g.y + g.h - 6}" width="12" height="12" rx="2"/>`;
      h += `</g>`; continue; }
    const d = g.d, on = isSel("dev", id), st = d.status;
    const sub = (cfg.nodeLines ? cfg.nodeLines(b, d, v) : defaultLines(b, d, v)).filter(Boolean);
    h += `<g class="dn${dim(id) ? " dim" : ""}${st === "planned" ? " planned" : ""}" data-node="${id}">`;
    if (n.boxed){ h += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="8" fill="#fff" stroke="${on ? "#ffb703" : st === "faulty" ? "#d63a3a" : "#33415f"}" stroke-width="${on ? 3 : 1.6}"${st === "planned" ? ' stroke-dasharray="5 3"' : ""}/>`;
      const s = Math.min(g.h - 12, 44); h += icn(devIcon(d), g.x + 8, g.y + (g.h - s) / 2, s);
      const fit = (txt, px, cw) => { const m = Math.max(4, Math.floor((g.w - s - 22) / (px * cw))); return txt.length > m ? txt.slice(0, m - 1) + "…" : txt; };
      h += svgt(g.x + s + 16, g.y + 20, fit(devLabel(d), 12, .62), {size:12, weight:800});
      sub.slice(0, Math.max(1, Math.floor((g.h - 28) / 13))).forEach((ln, i) => h += svgt(g.x + s + 16, g.y + 35 + i * 13, fit(ln, 10, .58), {size:10, fill:"#59607a", mono:/\d+\.\d+\.\d+/.test(ln)}));
      if (on && !print) h += `<rect class="rh" data-rh="dev:${id}" x="${g.x + g.w - 6}" y="${g.y + g.h - 6}" width="12" height="12" rx="2"/>`;
    } else {
      if (on && !print) h += `<rect class="selbox" x="${g.x - 5}" y="${g.y - 5}" width="${g.w + 10}" height="${g.h + 10}"/>`;
      h += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="rgba(255,255,255,.01)"/>` + icn(devIcon(d), g.x, g.y, g.w);
      if (st === "faulty") h += `<circle cx="${g.x + g.w}" cy="${g.y + 4}" r="6" fill="#d63a3a"/>`;
      h += svgt(g.x + g.w / 2, g.y + g.h + 13, devLabel(d), {size:11, weight:700, anchor:"middle", halo:true});
      sub.slice(0, 2).forEach((ln, i) => h += svgt(g.x + g.w / 2, g.y + g.h + 26 + i * 12, ln, {size:9.5, anchor:"middle", fill:"#4b5568", halo:true, mono:/\d+\.\d+\.\d+/.test(ln)}));
    }
    if (cfg.nodeExtra) h += cfg.nodeExtra(b, d, g, v);
    h += `</g>`;
  }
  if (!print && DG.mode === "link" && DG.linkFrom){ const A = anchorOf(b, v, DG.linkFrom); if (A) h += `<rect class="lfrom" x="${A.x - 4}" y="${A.y - 4}" width="${A.w + 8}" height="${A.h + 8}"/>`; }
  // selection band (screen only). hidden="" — a bare «hidden» is not valid XML and broke the PNG / SVG export
  h += `${print ? "" : `<rect id="band" x="0" y="0" width="0" height="0" fill="rgba(36,72,168,.08)" stroke="#2448a8" stroke-dasharray="4 3" hidden=""/>`}</svg>`;
  return h;
}
function defaultLines(b, d, v){ const S = v.show; return [S.model && [d.brand, d.model].filter(Boolean).join(" "), S.ip && d.ip ? d.ip.split("/")[0] : "", roomName(b, d.room)]; }
/* ---------- palette ---------- */
function dgPalette(b, cfg){
  const v = view(b, cfg.id), boxed = store.settings.addBoxed;
  const unplaced = b.devices.filter(d => !v.nodes[d.id] && !(d.rack && v.nodes[d.rack]) && (!cfg.kinds || cfg.kinds.includes(d.kind)));
  const racks = b.racks.filter(r => !v.nodes[r.id]);
  return `<div class="pal">
    ${unplaced.length || racks.length ? `<div class="psec"><h4>${esc(t("palUnplaced"))} <span class="cnt">${unplaced.length + racks.length}</span></h4><p class="muted small">${esc(t("palUnplacedHint"))}</p>
      <div class="ulist">${racks.map(r => `<button class="uitem" data-place="${r.id}"><svg viewBox="0 0 48 48">${ICO.rack}</svg><span>${esc(r.name)}</span></button>`).join("")}${unplaced.slice(0, 60).map(d => `<button class="uitem" data-place="${d.id}"><svg viewBox="0 0 48 48">${ICO[devIcon(d)] || ICO.box}</svg><span>${esc(devLabel(d))}</span></button>`).join("")}</div>
      <button class="btn small" data-pal="placeAll">⤵ ${esc(t("placeAll"))}</button></div>` : ""}
    <div class="psec"><button class="btn small wfull" data-pal="floors" title="${esc(t("dgFloorsH"))}">🏢 ${esc(t("dgFloors"))}</button></div>
    <div class="psec"><h4>${esc(t("palAdd"))}</h4><div class="seg"><button class="${boxed ? "on" : ""}" data-pal="boxed:1" title="${esc(t("addBoxedT"))}">▭ ${esc(t("addBoxed"))}</button><button class="${boxed ? "" : "on"}" data-pal="boxed:0" title="${esc(t("addFreeT"))}">◇ ${esc(t("addFree"))}</button></div>
    <div class="pgrid">${expandKinds(cfg.kinds).map(k => `<button class="pitem" data-add="${k}" draggable="false" title="${esc(variantName(k))}"><svg viewBox="0 0 48 48">${ICO[variantIcon(k)] || ICO.box}</svg><span>${esc(variantName(k))}</span></button>`).join("")}
      ${ukBtn(cfg.id)}<button class="pitem" data-add="__rack"><svg viewBox="0 0 48 48">${ICO.rack}</svg><span>${esc(t("rack"))}</span></button></div></div>
    ${cfg.extraPalette ? cfg.extraPalette(b, v) : ""}
    <div class="psec"><h4>${esc(t("palDraw"))}</h4><div class="pgrid">
      <button class="pitem" data-add="__box"><svg viewBox="0 0 48 48">${ICO.zone}</svg><span>${esc(t("box"))}</span></button>
      <button class="pitem" data-add="__text"><svg viewBox="0 0 48 48">${ICO.text}</svg><span>${esc(t("text"))}</span></button>
      <button class="pitem" data-add="__shape"><svg viewBox="0 0 48 48">${ICO.shape}</svg><span>${esc(t("shape"))}</span></button>
      <button class="pitem" data-add="__image"><svg viewBox="0 0 48 48">${ICO.image}</svg><span>${esc(t("image"))}</span></button></div></div>
    <div class="psec"><h4>${esc(t("palLinks"))}</h4><p class="muted small">${esc(t("palLinksHint"))}</p>${cfg.media.map(m => `<button class="plink${DG.mode === "link" && DG.media === m ? " on" : ""}" data-pal="link:${m}"><i style="border-color:${MEDIA[m].c};${MEDIA[m].dash ? "border-top-style:dashed" : ""}"></i>${esc(mediaName(m))}</button>`).join("")}</div>
    <div class="psec"><h4>${esc(t("palView"))}</h4>${[["show.links", t("vLinks")], ["grid.show", t("vGrid")], ["grid.snap", t("vSnap")], ["show.ports", t("vPorts")], ["show.ip", "IP"], ["show.model", t("vModel")], ["show.cid", t("vCid")], ["show.speed", t("vSpeed")]].map(([k, l]) => `<label class="chk small"><input type="checkbox" data-vopt="${k}"${getPath(v, k) ? " checked" : ""}> ${esc(l)}</label>`).join("")}</div>
    ${dgFilterHtml(b, v)}
  </div>`;
}
/* ---------- adding things ---------- */
function freeSpot(b, v, w, h){ let y = 40, x = 40; const occ = [...Object.keys(v.nodes).map(id => nodeGeo(b, v, id)).filter(Boolean), ...v.boxes];
  for (let tries = 0; tries < 400; tries++){ if (!occ.some(o => x < o.x + o.w + 20 && x + w + 20 > o.x && y < o.y + o.h + 50 && y + h + 50 > o.y)) return {x, y}; x += w + 40; if (x + w > v.page.w - 20){ x = 40; y += h + 70; } }
  return {x:40, y:v.page.h}; }
async function dgAdd(cfg, what, at){
  const b = B(), v = view(b, cfg.id);
  if (what === "__box"){ const z = {id:uid("z"), x:0, y:0, w:340, h:220, label:t("boxNew"), sub:"", color:"blue", dash:false, fill:false, tpos:"left", tsize:15}; const p = at || freeSpot(b, v, z.w, z.h); z.x = snapv(v, p.x); z.y = snapv(v, p.y); edit(() => { v.boxes.push(z); UI.sel = {type:"box", id:z.id}; }); return; }
  if (what === "__text" || what === "__shape"){ const a = what === "__text" ? {id:uid("a"), type:"text", text:t("textNew"), size:14, bold:false, color:"#1d2433", w:140, h:20} : {id:uid("a"), type:"shape", shape:"round", text:t("noteNew"), color:"yellow", w:160, h:70}; const p = at || freeSpot(b, v, a.w, a.h); a.x = snapv(v, p.x); a.y = snapv(v, p.y); edit(() => { v.anno.push(a); UI.sel = {type:"anno", id:a.id}; }); return; }
  if (what === "__image"){ const img = await pickImage(); if (!img) return; const a = {id:uid("a"), type:"image", img, w:320, h:220, op:100}; const p = at || freeSpot(b, v, a.w, a.h); a.x = snapv(v, p.x); a.y = snapv(v, p.y); edit(() => { v.anno.push(a); UI.sel = {type:"anno", id:a.id}; }); return; }
  if (what === "__rack"){ const r = normRack({id:uid("k"), name:nextRackName(b)}); const p = at || freeSpot(b, v, 230, 120); edit(() => { b.racks.push(r); v.nodes[r.id] = {x:snapv(v, p.x), y:snapv(v, p.y), w:230}; UI.sel = {type:"rack", id:r.id}; }); return; }
  const boxed = store.settings.addBoxed, d = newDevice(what, cfg.newDefaults ? cfg.newDefaults(what) : {});
  const w = boxed ? 160 : 52, h = boxed ? 64 : 52, p = at || freeSpot(b, v, w, h);
  // dropped inside a box: take the floor/room from the box name if it matches
  edit(() => { b.devices.push(d); v.nodes[d.id] = boxed ? {x:snapv(v, p.x), y:snapv(v, p.y), boxed:true, w, h} : {x:snapv(v, p.x), y:snapv(v, p.y), size:52}; UI.sel = {type:"dev", id:d.id}; });
}
function dgPlace(cfg, id, at){ const b = B(), v = view(b, cfg.id), r = rackById(b, id), boxed = store.settings.addBoxed; const w = r ? 230 : boxed ? 160 : 52, p = at || freeSpot(b, v, w, 64);
  edit(() => { v.nodes[id] = r ? {x:snapv(v, p.x), y:snapv(v, p.y), w:230} : boxed ? {x:snapv(v, p.x), y:snapv(v, p.y), boxed:true, w:160, h:64} : {x:snapv(v, p.x), y:snapv(v, p.y), size:52}; UI.sel = {type:r ? "rack" : "dev", id}; }); }
function dgPlaceAll(cfg){ const b = B(), v = view(b, cfg.id), boxed = store.settings.addBoxed;
  const L = [...b.racks.filter(r => !v.nodes[r.id]).map(r => ({id:r.id, rack:true})), ...b.devices.filter(d => !v.nodes[d.id] && !(d.rack && (v.nodes[d.rack] || b.racks.some(r => r.id === d.rack))) && (!cfg.kinds || cfg.kinds.includes(d.kind))).map(d => ({id:d.id}))];
  if (!L.length) return;
  edit(() => { L.forEach(it => { const w = it.rack ? 230 : boxed ? 160 : 52, p = freeSpot(b, v, w, it.rack ? 160 : 64); v.nodes[it.id] = it.rack ? {x:p.x, y:p.y, w:230} : boxed ? {x:p.x, y:p.y, boxed:true, w:160, h:64} : {x:p.x, y:p.y, size:52}; }); }); }
/* ---------- floors as bands (like the first Topology / CCTV / Fiber programs) ----------
   On the left, one coloured card per floor, top floor first; to its right the floor's band, with a box for each room and
   the floor's devices (and racks) inside. Places outside the building (yard, guard house, outdoor cameras) get a box of
   their own on the right. "Put all on the diagram" uses this, and it can be run again at any time. */
const FCOL = ["blue", "green", "orange", "purple", "teal", "red", "gray"];
const OUT_RX = /həyət|heyet|bahçe|bahce|yard|garden|çöl|cöl|outdoor|outside|exterior|dış|dis mekan|mühafizə|muhafize|guard|security|post|kpp|darvaza|gate|parking|otopark/i;
function dgFloorLayout(cfg, all){
  const b = B(), v = view(b, cfg.id), boxed = store.settings.addBoxed, inKinds = d => !cfg.kinds || cfg.kinds.includes(d.kind);
  // what goes on: racks holding devices of this app, devices of this app that are not shown inside such a rack
  const racks = b.racks.filter(r => v.nodes[r.id] || (all && rackDevices(b, r).some(inKinds)));
  const rackIds = new Set(racks.map(r => r.id));
  const devs = b.devices.filter(d => inKinds(d) && !(d.rack && rackIds.has(d.rack)) && (v.nodes[d.id] || all) && !(KINDS[d.kind] || {}).acc);
  const outside = (d, rm) => (d && d.kind === "camera" && d.camera && d.camera.loc === "out") || (rm && OUT_RX.test(rm.name)) || (rm && rm.type === "outdoor");
  const floorOf = it => it.r ? it.r.floor : devFloor0(b, it.d);
  const items = [...racks.map(r => ({id:r.id, r, room:r.room})), ...devs.map(d => ({id:d.id, d, room:d.room}))];
  items.forEach(it => { const rm = it.room && roomById(b, it.room); it.out = !it.r && outside(it.d, rm); it.f = it.out ? "__out" : floorOf(it) && floorById(b, floorOf(it)) ? floorOf(it) : "__none";
    it.w = it.r ? 240 : boxed ? 170 : 60; it.h = it.r ? RHEAD + Math.max(1, rackRows(b, it.r).length) * RROW + 8 : boxed ? 64 : 52; it.pad = it.r ? 20 : boxed ? 18 : 46; });
  if (!items.length) return toast(t("dgNothing"));
  // remove the bands made last time (boxes the user drew stay)
  v.boxes = v.boxes.filter(z => !z.auto);
  const LABW = 160, X0 = 0, CX = X0 + LABW + 24, MAXW = 1500, GAP = 24;
  const F = [...b.floors.slice().reverse().map(f => ({id:f.id, name:f.name})), {id:"__none", name:t("sm_noFloor")}];
  let y = 0, maxRight = CX + 600, ci = 0;
  const place = (list, x0, y0, maxW) => { // rooms as boxes flowing left to right, devices in rows inside each room
    const byRoom = new Map(); list.forEach(it => { const k = it.room || ""; (byRoom.get(k) || byRoom.set(k, []).get(k)).push(it); });
    let x = x0, yy = y0, rowH = 0, right = x0;
    [...byRoom.entries()].sort((a, c) => (a[0] ? 1 : 0) - (c[0] ? 1 : 0) || (roomName(b, a[0]) || "").localeCompare(roomName(b, c[0]) || "")).forEach(([rid, L]) => {
      const cols = Math.min(4, L.length), cw = Math.max(...L.map(it => it.w + it.pad)), rows = [];
      for (let i = 0; i < L.length; i += cols) rows.push(L.slice(i, i + cols));
      const bw = cols * cw + 24, bh = 34 + rows.reduce((a, R0) => a + Math.max(...R0.map(it => it.h + (it.r || boxed ? 18 : 40))), 0) + 8;
      if (x > x0 && x + bw > x0 + maxW){ x = x0; yy += rowH + 16; rowH = 0; }
      if (rid) v.boxes.push({id:uid("z"), auto:"room", x, y:yy, w:bw, h:bh, label:roomName(b, rid), sub:"", color:"gray", dash:true, fill:false, tpos:"left", tsize:12});
      let ry = yy + 34; rows.forEach(R0 => { R0.forEach((it, i) => { const nx = x + 12 + i * cw, ny = ry;
          v.nodes[it.id] = it.r ? {x:nx, y:ny, w:240} : boxed ? {x:nx, y:ny, boxed:true, w:170, h:64} : {x:nx + 30, y:ny, size:52}; });
        ry += Math.max(...R0.map(it => it.h + (it.r || boxed ? 18 : 40))); });
      x += bw + 16; rowH = Math.max(rowH, bh); right = Math.max(right, x); });
    return {h:yy - y0 + rowH, right}; };
  F.forEach(f => { const L = items.filter(it => it.f === f.id); if (!L.length && (f.id === "__none" || LINK_FLOOR.test(String(f.name).trim()))) return;
    const col = FCOL[ci++ % FCOL.length], r = L.length ? place(L, CX + 16, y + 16, MAXW) : {h:40, right:CX + 400}, H = Math.max(L.length ? 110 : 70, r.h + 32);
    v.boxes.push({id:uid("z"), auto:"floorlab", floor:f.id, x:X0, y, w:LABW, h:H, label:f.name, sub:t("dgFloorN", {n:L.length}), color:col, dash:false, fill:true, tpos:"left", tsize:15});
    v.boxes.push({id:uid("z"), auto:"floor", floor:f.id, x:CX, y, w:Math.max(r.right - CX, 400) + 8, h:H, label:"", sub:"", color:col, dash:false, fill:false, tpos:"left", tsize:13});
    maxRight = Math.max(maxRight, Math.max(r.right, CX + 400) + 8); y += H + GAP; });
  const O = items.filter(it => it.f === "__out");
  if (O.length){ const ox = maxRight + 40, r = place(O, ox + 16, 46, 600);
    v.boxes.push({id:uid("z"), auto:"out", x:ox, y:0, w:Math.max(r.right - ox, 300) + 8, h:Math.max(140, r.h + 62), label:t("dgOutside"), sub:t("dgOutsideH"), color:"green", dash:true, fill:false, tpos:"left", tsize:15}); }
  // racks / devices of this app that were drawn before but now belong nowhere stay where they are
}
const devFloor0 = (b, d) => d.floor || (d.room && (roomById(b, d.room) || {}).floor) || (d.rack && (rackById(b, d.rack) || {}).floor) || "";
/* ---------- filters: which devices are shown (kind groups, floors, status) ---------- */
const DCATS = ["net", "wifi", "cctv", "end", "compute", "power", "passive", "fiber"];
function dgVisible(b, v){ const F = v.filter || {}; if (!F.on) return null;
  const cats = F.cats && F.cats.length ? new Set(F.cats) : null, fl = F.floors && F.floors.length ? new Set(F.floors) : null, st = F.status || "";
  const ok = d => d && (!cats || cats.has((KINDS[d.kind] || KINDS.other).cat)) && (!fl || fl.has(devFloor0(b, d) || "__none")) && (!st || d.status === st);
  const S = new Set(); b.devices.forEach(d => { if (ok(d)) S.add(d.id); }); b.racks.forEach(r => { if (rackDevices(b, r).some(d => S.has(d.id))) S.add(r.id); }); return S; }
function dgFilterHtml(b, v){ const F = v.filter || {}, cats = DCATS.filter(c => b.devices.some(d => (KINDS[d.kind] || {}).cat === c));
  return `<div class="psec"><h4>${esc(t("dgFilter"))}</h4><label class="chk small"><input type="checkbox" data-dgf="on"${F.on ? " checked" : ""}> ${esc(t("dgFilterOn"))}</label>
    ${F.on ? `<div class="dgfgrp"><small class="muted">${esc(t("dgFCats"))}</small>${cats.map(c => `<label class="chk small"><input type="checkbox" data-dgf="cat:${c}"${(F.cats || []).includes(c) ? " checked" : ""}> ${esc(t("sm_cat_" + c) === "sm_cat_" + c ? c : t("sm_cat_" + c))}</label>`).join("")}</div>
      <div class="dgfgrp"><small class="muted">${esc(t("floors"))}</small>${[...b.floors.slice().reverse().map(f => [f.id, f.name]), ["__none", t("sm_noFloor")]].map(([id, n]) => `<label class="chk small"><input type="checkbox" data-dgf="floor:${id}"${(F.floors || []).includes(id) ? " checked" : ""}> ${esc(n)}</label>`).join("")}</div>
      <label class="fld"><span>${esc(t("f_status"))}</span><select data-dgf="status">${opt("", t("all"), F.status || "")}${STATUSES.map(x => opt(x, t("st_" + x), F.status || "")).join("")}</select></label>
      <label class="chk small"><input type="checkbox" data-dgf="hide"${F.hide ? " checked" : ""}> ${esc(t("dgFHide"))}</label>` : ""}</div>`; }
/* ---------- drawer for non-device selections ---------- */
function dgDrawer(b, cfg){
  const s = UI.sel, v = view(b, cfg.id);
  if (UI.multi.size > 1) return `<h4 class="msub">↔ ${esc(t("alignT"))}</h4><div class="btns wrap">${[["l","⇤"],["c","⇔"],["r","⇥"],["t","⤒"],["m","⇕"],["bt","⤓"],["dh","↔"],["dv","↕"]].map(([k, ic]) => `<button class="btn small" data-dr="align:${k}" title="${esc(t("al_" + k))}">${ic} ${esc(t("al_" + k))}</button>`).join("")}</div>
    <div class="btns"><button class="btn" data-dr="mboxed:1">▭ ${esc(t("addBoxed"))}</button><button class="btn" data-dr="mboxed:0">◇ ${esc(t("addFree"))}</button></div>
    <div class="btns"><button class="btn" data-dr="unplace">⤴ ${esc(t("removeFromView"))}</button><button class="btn dan" data-dr="mdel">🗑 ${esc(t("delete"))}</button></div>`;
  if (!s) return "";
  if (s.type === "dev"){ const d = devById(b, s.id); if (!d) return ""; const n = v.nodes[d.id];
    const viewSec = n ? sec("view", t("sec_view"), `<div class="seg"><button class="${n.boxed ? "on" : ""}" data-dr="boxed:1">▭ ${esc(t("addBoxed"))}</button><button class="${n.boxed ? "" : "on"}" data-dr="boxed:0">◇ ${esc(t("addFree"))}</button></div>
      ${n.boxed ? `<div class="two">${fld(t("f_w"), "v.w", n.w || 160, "number")}${fld(t("f_hgt"), "v.h", n.h || 64, "number")}</div>` : `<div class="two">${fld(t("f_size"), "v.size", n.size || 52, "number")}<span></span></div>`}
      <button class="btn small" data-dr="unplace">⤴ ${esc(t("removeFromView"))}</button>`, true) : d.rack ? `<p class="muted small">${esc(t("inRackHint"))}</p>` : "";
    return deviceEditor(b, d, {extra:(bb, dd) => viewSec + (cfg.devExtra ? cfg.devExtra(bb, dd) : "")}); }
  if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) + `<div class="btns"><button class="btn small" data-dr="route:straight">${esc(t("rStraight"))}</button><button class="btn small" data-dr="route:auto">${esc(t("rAuto"))}</button></div>` : ""; }
  if (s.type === "rack"){ const r = rackById(b, s.id); if (!r) return ""; const rows = rackRows(b, r);
    return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.rack}</svg><div><h3>${esc(r.name)}</h3><div class="muted small">${r.u}U · ${esc(t("rackDevN",{n:rows.length}))}</div></div><button class="x" data-dr="close">×</button></div>
      ${sec("gen", t("sec_general"), `${fld(t("f_name"), "r.name", r.name)}<div class="two">${fld(t("f_rackU"), "r.u", r.u, "number", ' min="1" max="60"')}${fld(t("f_code"), "r.code", r.code)}</div>
        <div class="two"><label class="fld"><span>${esc(t("f_floor"))}</span><select data-f="r.floor">${floorOpts(b, r.floor)}</select></label><label class="fld"><span>${esc(t("f_room"))}</span><select data-f="r.room">${roomOpts(b, r.floor, r.room)}</select></label></div>`, true)}
      <p class="muted small">${esc(t("rackRowsHint"))}</p>
      <div class="btns"><button class="btn pri" data-dr="openRack">🗄 ${esc(t("openInRack"))}</button><button class="btn" data-dr="rackAddDev">＋ ${esc(t("rackAddDev"))}</button></div>
      <div class="btns"><button class="btn" data-dr="unplace">⤴ ${esc(t("removeFromView"))}</button><button class="btn dan" data-dr="delRack">🗑 ${esc(t("delete"))}</button></div>`; }
  if (s.type === "box"){ const z = v.boxes.find(x => x.id === s.id); if (!z) return "";
    return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.zone}</svg><div><h3>${esc(t("box"))}</h3><div class="muted small">${esc(lines(z.label)[0])}</div></div><button class="x" data-dr="close">×</button></div>
      <label class="fld"><span>${esc(t("f_title"))}</span><textarea data-f="z.label" rows="2">${esc(z.label)}</textarea></label>${fld(t("f_sub"), "z.sub", z.sub)}
      <div class="two"><label class="fld"><span>${esc(t("f_color"))}</span><select data-f="z.color">${Object.keys(ZC).map(c => opt(c, t("c_" + c), z.color)).join("")}</select></label><label class="fld"><span>${esc(t("f_tpos"))}</span><select data-f="z.tpos">${[["left", t("tp_left")], ["center", t("tp_center")], ["right", t("tp_right")]].map(([k, l]) => opt(k, l, z.tpos)).join("")}</select></label></div>
      <div class="two">${fld(t("f_tsize"), "z.tsize", z.tsize || 15, "number")}<span></span></div>
      <label class="chk"><input type="checkbox" data-f="z.dash"${z.dash ? " checked" : ""}> ${esc(t("f_dash"))}</label><label class="chk"><input type="checkbox" data-f="z.fill"${z.fill ? " checked" : ""}> ${esc(t("f_fill"))}</label>
      <div class="two">${fld("X", "z.x", z.x, "number")}${fld("Y", "z.y", z.y, "number")}</div><div class="two">${fld(t("f_w"), "z.w", z.w, "number")}${fld(t("f_hgt"), "z.h", z.h, "number")}</div>
      <p class="muted small">${esc(t("boxHint"))}</p><div class="btns"><button class="btn" data-dr="dupBox">⧉ ${esc(t("duplicate"))}</button><button class="btn dan" data-dr="delBox">🗑 ${esc(t("delete"))}</button></div>`; }
  if (s.type === "anno"){ const a = v.anno.find(x => x.id === s.id); if (!a) return "";
    return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO[a.type === "text" ? "text" : a.type === "image" ? "image" : "shape"]}</svg><div><h3>${esc(t(a.type === "text" ? "text" : a.type === "image" ? "image" : "shape"))}</h3></div><button class="x" data-dr="close">×</button></div>
      ${a.type !== "image" ? `<label class="fld"><span>${esc(t("f_text"))}</span><textarea data-f="a.text" rows="3">${esc(a.text)}</textarea></label>` : `<div class="btns"><button class="btn" data-dr="annoImg">🖼 ${esc(t("imgPick"))}</button></div>${fld(t("f_opacity"), "a.op", a.op ?? 100, "number")}`}
      ${a.type === "text" ? `<div class="two">${fld(t("f_tsize"), "a.size", a.size || 14, "number")}${fld(t("f_color"), "a.color", a.color || "#1d2433", "color")}</div><label class="chk"><input type="checkbox" data-f="a.bold"${a.bold ? " checked" : ""}> ${esc(t("f_bold"))}</label>` : ""}
      ${a.type === "shape" ? `<div class="two"><label class="fld"><span>${esc(t("f_shape"))}</span><select data-f="a.shape">${["round","rect","ellipse"].map(k => opt(k, t("sh_" + k), a.shape)).join("")}</select></label><label class="fld"><span>${esc(t("f_color"))}</span><select data-f="a.color">${Object.keys(ZC).map(c => opt(c, t("c_" + c), a.color)).join("")}</select></label></div>` : ""}
      <div class="btns"><button class="btn" data-dr="front">⬆ ${esc(t("toFront"))}</button><button class="btn" data-dr="back">⬇ ${esc(t("toBack"))}</button></div>
      <div class="btns"><button class="btn dan" data-dr="delAnno">🗑 ${esc(t("delete"))}</button></div>`; }
  return "";
}
/* ---------- interaction ---------- */
function svgPt(e){ const svg = $("#dg"); if (!svg) return {x:0, y:0}; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : {x:0, y:0}; }
function selKey(s){ return s ? s.type + ":" + s.id : ""; }
function itemPos(v, b, key){ const [type, id] = key.split(/:(.+)/); if (type === "box") return v.boxes.find(z => z.id === id); if (type === "anno") return v.anno.find(a => a.id === id); return v.nodes[id]; }
async function dgDelete(cfg){
  const b = B(), v = view(b, cfg.id), keys = UI.multi.size ? [...UI.multi] : UI.sel ? [selKey(UI.sel)] : []; if (!keys.length) return;
  const devs = keys.filter(k => k.startsWith("dev:")).map(k => k.slice(4)), racks = keys.filter(k => k.startsWith("rack:")).map(k => k.slice(5));
  let mode = "view";
  if (devs.length || racks.length){ mode = await uiChoice(t("delAsk",{n:devs.length + racks.length}), [["view", t("delView")], ["all", t("delAll"), "dan"]]); if (!mode) return; }
  edit(() => { keys.forEach(k => { const [type, id] = k.split(/:(.+)/);
      if (type === "box") v.boxes = v.boxes.filter(z => z.id !== id); else if (type === "anno") v.anno = v.anno.filter(a => a.id !== id);
      else if (type === "link") b.links = b.links.filter(l => l.id !== id);
      else if (type === "dev" || type === "rack"){ if (mode === "all"){ if (type === "dev") removeDevices(b, [id]); else { b.racks = b.racks.filter(r => r.id !== id); b.devices.forEach(d => { if (d.rack === id){ d.rack = ""; d.u = 0; } }); Object.values(b.views).forEach(x => x && x.nodes && delete x.nodes[id]); } } else delete v.nodes[id]; } });
    UI.sel = null; UI.multi.clear(); });
}
function dgAlign(cfg, k){
  const b = B(), v = view(b, cfg.id), items = [...UI.multi].map(key => { const p = itemPos(v, b, key), [type, id] = key.split(/:(.+)/), g = type === "dev" || type === "rack" ? nodeGeo(b, v, id) : p; return p && g ? {p, w:g.w || 100, h:g.h || 30} : null; }).filter(Boolean);
  if (items.length < 2) return; const minX = Math.min(...items.map(i => i.p.x)), maxX = Math.max(...items.map(i => i.p.x + i.w)), minY = Math.min(...items.map(i => i.p.y)), maxY = Math.max(...items.map(i => i.p.y + i.h));
  edit(() => { if (k === "l") items.forEach(i => i.p.x = minX); if (k === "r") items.forEach(i => i.p.x = maxX - i.w); if (k === "c") items.forEach(i => i.p.x = Math.round((minX + maxX) / 2 - i.w / 2));
    if (k === "t") items.forEach(i => i.p.y = minY); if (k === "bt") items.forEach(i => i.p.y = maxY - i.h); if (k === "m") items.forEach(i => i.p.y = Math.round((minY + maxY) / 2 - i.h / 2));
    if (k === "dh"){ items.sort((a, c) => a.p.x - c.p.x); const tot = items.reduce((s, i) => s + i.w, 0), gap = (maxX - minX - tot) / (items.length - 1); let x = minX; items.forEach(i => { i.p.x = Math.round(x); x += i.w + gap; }); }
    if (k === "dv"){ items.sort((a, c) => a.p.y - c.p.y); const tot = items.reduce((s, i) => s + i.h, 0), gap = (maxY - minY - tot) / (items.length - 1); let y = minY; items.forEach(i => { i.p.y = Math.round(y); y += i.h + gap; }); } });
}
// Swap two devices of the same rack (drag a rack row onto another).
function rackSwap(b, a, c){
  if (a.rack !== c.rack || a === c) return false; const r = rackById(b, a.rack), au = a.u, ah = devH(a), cu = c.u, ch = devH(c);
  const hi = Math.max(topU(a), topU(c)), lo = Math.min(au, cu);
  const aboveA = topU(a) > topU(c);   // a currently above c
  const nu = aboveA ? {c:hi - ch + 1, a:hi - ch - ah + 1} : {a:hi - ah + 1, c:hi - ah - ch + 1};
  const keepA = a.u, keepC = c.u; a.u = 0; c.u = 0;
  const ok = nu.a >= lo && nu.c >= lo && rackFits(b, r, nu.a, ah, c.id) && rackFits(b, r, nu.c, ch, a.id);
  if (ok){ a.u = nu.a; c.u = nu.c; return true; } a.u = keepA; c.u = keepC; return false;
}
// Rename by double click / double tap (detected on pointerdown, because the first click redraws the diagram).
async function dgRename(b, v, key){
  const [type, id] = key.split(/:(.+)/);
  if (type === "dev" || type === "rack"){ const o = type === "dev" ? devById(b, id) : rackById(b, id); if (!o) return; const n = await uiPrompt(t("f_name"), o.name); if (type === "dev" && n && n.trim() && !await nameOk(b, n, o.id)) return; if (n !== null && n.trim()) edit(() => { o.name = n.trim(); UI.sel = {type, id}; }); return; }
  if (type === "box"){ const z = v.boxes.find(x => x.id === id); if (!z) return; const n = await uiPrompt(t("f_title"), z.label); if (n !== null) edit(() => { z.label = n; }); return; }
  if (type === "anno"){ const a = v.anno.find(x => x.id === id); if (!a || a.type === "image") return; const n = await uiPrompt(t("f_text"), a.text); if (n !== null) edit(() => { a.text = n; }); }
}
function dgWire(cfg){
  const host = $("#view");
  const onDown = e => {
    if (e.button !== 0 && e.pointerType !== "touch") return; const svg = e.target.closest("#dg"); if (!svg) return;
    const b = B(), v = view(b, cfg.id), p = svgPt(e);
    const rh = e.target.closest("[data-rh]"), lh = e.target.closest("[data-lh]"), row = e.target.closest("[data-row]"), nd = e.target.closest("[data-node]"), zt = e.target.closest(".dz"), an = e.target.closest("[data-anno]"), lk = e.target.closest("[data-link]");
    if (DG.mode === "link"){ const id = row ? row.dataset.row : nd && devById(b, nd.dataset.node) ? nd.dataset.node : null; if (!id){ if (!nd) { DG.linkFrom = null; render(); } return; }
      if (!DG.linkFrom){ DG.linkFrom = id; render(); return; }
      if (DG.linkFrom === id) return; const from = DG.linkFrom; DG.linkFrom = null;
      edit(() => { const l = addLink(b, from, id, DG.media); UI.sel = {type:"link", id:l.id}; }); return; }
    const base = {x0:p.x, y0:p.y, moved:false, snap:snapshot()};
    if (rh){ const [type, id] = rh.dataset.rh.split(/:(.+)/), o = type === "box" ? v.boxes.find(z => z.id === id) : type === "anno" ? v.anno.find(a => a.id === id) : v.nodes[id]; const g = type === "dev" || type === "rack" ? nodeGeo(b, v, id) : o;
      DG.drag = Object.assign(base, {mode:"resize", o, type, w0:g.w || o.w, h0:g.h || o.h}); e.preventDefault(); return; }
    if (lh){ const [id, ax] = lh.dataset.lh.split(":"); v.routes[id] = v.routes[id] || {}; DG.drag = Object.assign(base, {mode:"route", r:v.routes[id], ax, g:null, id}); e.preventDefault(); return; }
    if (row){ const d = devById(b, row.dataset.row); UI.sel = {type:"dev", id:d.id}; UI.multi.clear(); DG.drag = Object.assign(base, {mode:"row", d, rack:row.dataset.rack}); e.preventDefault(); return; }
    let key = null;
    if (nd) key = (rackById(b, nd.dataset.node) ? "rack:" : "dev:") + nd.dataset.node;
    else if (an) key = "anno:" + an.dataset.anno;
    else if (lk){ UI.sel = {type:"link", id:lk.dataset.link}; UI.multi.clear(); render(); return; }
    else if (zt) key = "box:" + zt.dataset.box;
    if (key){
      const now = Date.now(); if (DG.lastDown && DG.lastDown.key === key && now - DG.lastDown.t < 450 && !e.shiftKey && !e.ctrlKey && !e.metaKey){ DG.lastDown = null; DG.drag = null; e.preventDefault(); dgRename(b, v, key); return; }
      DG.lastDown = {key, t:now};
      if (e.shiftKey || e.ctrlKey || e.metaKey){ if (!UI.multi.size && UI.sel) UI.multi.add(selKey(UI.sel)); UI.multi.has(key) ? UI.multi.delete(key) : UI.multi.add(key); UI.sel = UI.multi.size === 1 ? (([t0, i0]) => ({type:t0, id:i0}))([...UI.multi][0].split(/:(.+)/)) : null; render(); return; }
      if (!UI.multi.has(key)){ UI.multi.clear(); const [type, id] = key.split(/:(.+)/); UI.sel = {type, id}; }
      let keys = UI.multi.size ? [...UI.multi] : [key];
      // dragging a box carries what lies inside it
      keys.slice().forEach(k => { if (!k.startsWith("box:")) return; const z = itemPos(v, b, k); if (!z) return;
        Object.keys(v.nodes).forEach(id => { const g = nodeGeo(b, v, id); if (g && g.x >= z.x && g.y >= z.y && g.x + g.w <= z.x + z.w && g.y + g.h <= z.y + z.h){ const kk = (g.rack ? "rack:" : "dev:") + id; if (!keys.includes(kk)) keys.push(kk); } });
        v.boxes.forEach(o => { if (o !== z && o.x >= z.x && o.y >= z.y && o.x + o.w <= z.x + z.w && o.y + o.h <= z.y + z.h && !keys.includes("box:" + o.id)) keys.push("box:" + o.id); });
        v.anno.forEach(o => { if (o.x >= z.x && o.y >= z.y && o.x + (o.w || 0) <= z.x + z.w && o.y + (o.h || 0) <= z.y + z.h && !keys.includes("anno:" + o.id)) keys.push("anno:" + o.id); }); });
      DG.drag = Object.assign(base, {mode:"move", items:keys.map(k => { const o = itemPos(v, b, k); return o ? {o, x:o.x, y:o.y} : null; }).filter(Boolean)});
      render(); e.preventDefault(); return; }
    // empty area: rubber band selection (with a finger, the empty area scrolls instead)
    if (e.pointerType === "touch"){ if (UI.sel || UI.multi.size){ UI.sel = null; UI.multi.clear(); render(); } return; }
    DG.drag = Object.assign(base, {mode:"band"}); UI.sel = null; UI.multi.clear(); e.preventDefault();
  };
  const onMove = e => {
    const D = DG.drag; if (!D) return; const b = B(), v = view(b, cfg.id), p = svgPt(e), dx = p.x - D.x0, dy = p.y - D.y0;
    if (!D.moved && Math.hypot(dx, dy) < 3) return; D.moved = true;
    if (D.mode === "move"){ D.items.forEach(it => { it.o.x = snapv(v, it.x + dx); it.o.y = snapv(v, it.y + dy); }); quickRedraw(cfg); }
    else if (D.mode === "resize"){ const w = Math.max(D.type === "dev" && !D.o.boxed ? 24 : 40, snapv(v, D.w0 + dx)), h = Math.max(24, snapv(v, D.h0 + dy)); if (D.type === "dev" && !D.o.boxed) D.o.size = w; else { D.o.w = w; if (D.type !== "rack") D.o.h = h; } quickRedraw(cfg); }
    else if (D.mode === "route"){ if (D.ax === "x") D.r.mx = snapv(v, p.x); else D.r.my = snapv(v, p.y); quickRedraw(cfg); }
    else if (D.mode === "band"){ const r = $("#band"); if (r){ r.removeAttribute("hidden"); r.setAttribute("x", Math.min(D.x0, p.x)); r.setAttribute("y", Math.min(D.y0, p.y)); r.setAttribute("width", Math.abs(dx)); r.setAttribute("height", Math.abs(dy)); } }
    else if (D.mode === "row"){ const tgt = document.elementFromPoint(e.clientX, e.clientY), tr = tgt && tgt.closest && tgt.closest("[data-row]"); $$(".rrow.drop").forEach(x => x.classList.remove("drop")); if (tr && tr.dataset.row !== D.d.id) tr.classList.add("drop"); D.target = tr && tr.dataset.row; }
  };
  const onUp = e => {
    const D = DG.drag; if (!D) return; DG.drag = null; const b = B(), v = view(b, cfg.id);
    if (D.mode === "band"){ const r = $("#band"); if (D.moved && r){ const x = +r.getAttribute("x"), y = +r.getAttribute("y"), w = +r.getAttribute("width"), h = +r.getAttribute("height"), inside = g => g.x >= x && g.y >= y && g.x + g.w <= x + w && g.y + g.h <= y + h;
        Object.keys(v.nodes).forEach(id => { const g = nodeGeo(b, v, id); if (g && inside(g)) UI.multi.add((g.rack ? "rack:" : "dev:") + id); });
        v.boxes.forEach(z => { if (inside(z)) UI.multi.add("box:" + z.id); }); v.anno.forEach(a => { if (inside({x:a.x, y:a.y, w:a.w || 100, h:a.h || 20})) UI.multi.add("anno:" + a.id); });
        if (UI.multi.size === 1){ const [type, id] = [...UI.multi][0].split(/:(.+)/); UI.sel = {type, id}; UI.multi.clear(); } }
      render(); return; }
    if (D.mode === "row"){ $$(".rrow.drop").forEach(x => x.classList.remove("drop")); if (D.moved && D.target){ const c = devById(b, D.target); pushUndo(D.snap); if (rackSwap(b, D.d, c)){ persist(); toast("⇅ " + t("rackSwapped")); } else { undoStack.pop(); toast("⚠ " + t("rackSwapFail")); } } render(); return; }
    if (D.moved){ pushUndo(D.snap); persist(); }
    render();
  };
  host.addEventListener("pointerdown", e => { if (curApp().dg === cfg && curTab().id === "map") onDown(e); });
  document.addEventListener("pointermove", e => { if (DG.drag && curApp().dg === cfg) onMove(e); });
  document.addEventListener("pointerup", e => { if (DG.drag && curApp().dg === cfg) onUp(e); });
  document.addEventListener("pointercancel", () => { if (DG.drag && curApp().dg === cfg){ const D = DG.drag; DG.drag = null; if (D.moved && D.mode !== "band" && D.mode !== "row"){ pushUndo(D.snap); persist(); } render(); } });
  host.addEventListener("click", async e => { if (curApp().dg !== cfg) return;
    if (e.target.closest('[data-pal="placeAll"]')) return edit(() => dgFloorLayout(cfg, true));
    if (e.target.closest('[data-pal="floors"]')){ const v = view(B(), cfg.id); if (Object.keys(v.nodes).length && !await uiConfirm(t("dgFloorsQ"), t("dgFloors"))) return; return edit(() => dgFloorLayout(cfg, true)); } });

  host.addEventListener("dblclick", async e => {
    if (curApp().dg !== cfg) return; const b = B(), v = view(b, cfg.id);
    const nd = e.target.closest("[data-node]"), zt = e.target.closest(".ztitle"), an = e.target.closest("[data-anno]"), row = e.target.closest("[data-row]");
    if (row){ const d = devById(b, row.dataset.row), n = await uiPrompt(t("f_name"), d.name); if (n !== null) edit(() => { d.name = n.trim(); }); return; }
    // nodes, boxes and notes: handled as a double click in onDown (dgRename)
  });
  // palette
  $("#pal").addEventListener("click", e => {
    if (curApp().dg !== cfg) return; const b = B(), v = view(b, cfg.id);
    const a = e.target.closest("[data-add]"); if (a){ if (DG.mode === "link"){ DG.mode = "select"; DG.linkFrom = null; } dgAdd(cfg, a.dataset.add); return; }
    const pl = e.target.closest("[data-place]"); if (pl){ dgPlace(cfg, pl.dataset.place); return; }
    const pp = e.target.closest("[data-pal]"); if (!pp) return; const [k, val] = pp.dataset.pal.split(":");
    if (k === "boxed"){ store.settings.addBoxed = val === "1"; persist(); render(); }
    else if (k === "link"){ if (DG.mode === "link" && DG.media === val){ DG.mode = "select"; DG.linkFrom = null; } else { DG.mode = "link"; DG.media = val; DG.linkFrom = null; toast("🔗 " + t("linkModeOn")); } render(); }
    else if (k === "placeAll") edit(() => dgFloorLayout(cfg, true));
    else if (k === "floors"){ const v = view(B(), cfg.id); (Object.keys(v.nodes).length ? uiConfirm(t("dgFloorsQ"), t("dgFloors")) : Promise.resolve(true)).then(ok => { if (ok) edit(() => dgFloorLayout(cfg, true)); }); }
  });
  $("#pal").addEventListener("change", e => { if (curApp().dg !== cfg) return; const el = e.target.closest("[data-dgf]"); if (!el) return; const v = view(B(), cfg.id), F = v.filter = v.filter || {}, k = el.dataset.dgf;
    edit(() => { if (k === "on") F.on = el.checked; else if (k === "hide") F.hide = el.checked; else if (k === "status") F.status = el.value;
      else { const [g, id] = k.split(":"), key = g === "cat" ? "cats" : "floors"; F[key] = (F[key] || []).filter(x => x !== id); if (el.checked) F[key].push(id); } }); });
  $("#pal").addEventListener("change", e => { if (curApp().dg !== cfg) return; const el = e.target.closest("[data-vopt]"); if (!el) return; const v = view(B(), cfg.id); edit(() => { setPath(v, el.dataset.vopt, el.checked); }); });
}
// Fast redraw while dragging (only the SVG).
function quickRedraw(cfg){ const host = $("#dgwrap"); if (host) host.innerHTML = dgSvg(B(), cfg); }
function dgKey(cfg, e){
  const b = B(), v = view(b, cfg.id), mod = e.ctrlKey || e.metaKey;
  if (e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); dgDelete(cfg); return true; }
  if (mod && e.key.toLowerCase() === "a"){ e.preventDefault(); UI.multi.clear(); Object.keys(v.nodes).forEach(id => UI.multi.add((rackById(b, id) ? "rack:" : "dev:") + id)); v.boxes.forEach(z => UI.multi.add("box:" + z.id)); v.anno.forEach(a => UI.multi.add("anno:" + a.id)); UI.sel = null; render(); return true; }
  if (mod && e.key.toLowerCase() === "d" && UI.sel && UI.sel.type === "dev"){ e.preventDefault(); $('[data-dr="dupDev"]') && $('[data-dr="dupDev"]').click(); return true; }
  if (e.key === "l" || e.key === "L"){ DG.mode = DG.mode === "link" ? "select" : "link"; DG.media = DG.media || cfg.media[0]; DG.linkFrom = null; render(); return true; }
  if (e.key.startsWith("Arrow")){ const keys = UI.multi.size ? [...UI.multi] : UI.sel ? [selKey(UI.sel)] : []; if (!keys.length) return false; e.preventDefault(); const st = e.shiftKey ? 1 : v.grid.size;
    const dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
    edit(() => keys.forEach(k => { const o = itemPos(v, b, k); if (o){ o.x += dx; o.y += dy; } })); return true; }
  return false;
}
function dgEsc(){ if (DG.mode === "link"){ DG.mode = "select"; DG.linkFrom = null; render(); return true; } return false; }
// Drawer actions specific to the diagram (shared by all diagram apps).
async function dgDrawerAct(cfg, k, el){
  const b = B(), v = view(b, cfg.id), s = UI.sel;
  if (k.startsWith("align:")) return dgAlign(cfg, k.slice(6));
  if (k.startsWith("mboxed:")){ const on = k.endsWith("1"); return edit(() => UI.multi.forEach(key => { const [type, id] = key.split(/:(.+)/); if (type === "dev" && v.nodes[id]){ const n = v.nodes[id]; n.boxed = on; if (on){ n.w = n.w || 160; n.h = n.h || 64; } } })); }
  if (k === "mdel") return dgDelete(cfg);
  if (k === "unplace"){ const keys = UI.multi.size ? [...UI.multi] : [selKey(s)]; return edit(() => { keys.forEach(key => { const [type, id] = key.split(/:(.+)/); if (type === "dev" || type === "rack") delete v.nodes[id]; }); UI.sel = null; UI.multi.clear(); }); }
  if (!s) return;
  if (k.startsWith("boxed:")){ const n = v.nodes[s.id]; if (!n) return; return edit(() => { n.boxed = k.endsWith("1"); if (n.boxed){ n.w = n.w || 160; n.h = n.h || 64; } else n.size = n.size || 52; }); }
  if (k.startsWith("route:")){ return edit(() => { v.routes[s.id] = k.endsWith("straight") ? {straight:true} : {}; }); }
  if (k === "openRack"){ UI.app = "rack"; UI.rackSel = s.id; UI.sel = {type:"rack", id:s.id}; render(); return; }
  if (k === "rackAddDev"){ const r = rackById(b, s.id); const kind = await uiChoice(t("rackAddWhat"), ["switch","pp","fpp","firewall","router","server","nvr","ups","pdu","cablemgr"].map(x => [x, kindName(x)])); if (!kind) return; const h = KINDS[kind].h || 1, u = rackSpot(b, r, h, 0); if (!u) return toast("⚠ " + t("rackNoSpace")); return edit(() => { const d = newDevice(kind, {rack:r.id, u, floor:r.floor, room:r.room}); b.devices.push(d); UI.sel = {type:"dev", id:d.id}; }); }
  if (k === "delRack"){ if (!await uiConfirm(t("delRackConf",{n:rackById(b, s.id).name}), t("delete"), true)) return; return edit(() => { b.racks = b.racks.filter(r => r.id !== s.id); b.devices.forEach(d => { if (d.rack === s.id){ d.rack = ""; d.u = 0; } }); Object.values(b.views).forEach(x => x && x.nodes && delete x.nodes[s.id]); UI.sel = null; }); }
  if (k === "dupBox"){ const z = v.boxes.find(x => x.id === s.id); return edit(() => { const c = Object.assign(clone(z), {id:uid("z"), x:z.x + 30, y:z.y + 30}); v.boxes.push(c); UI.sel = {type:"box", id:c.id}; }); }
  if (k === "delBox"){ return edit(() => { v.boxes = v.boxes.filter(x => x.id !== s.id); UI.sel = null; }); }
  if (k === "delAnno"){ return edit(() => { v.anno = v.anno.filter(x => x.id !== s.id); UI.sel = null; }); }
  if (k === "front" || k === "back"){ const i = v.anno.findIndex(x => x.id === s.id); return edit(() => { const a = v.anno.splice(i, 1)[0]; k === "front" ? v.anno.push(a) : v.anno.unshift(a); }); }
  if (k === "annoImg"){ const img = await pickImage(); if (img) edit(() => { v.anno.find(x => x.id === s.id).img = img; }); return; }
}
// Non-entity fields in the drawer: v.* (node view), z.* (box), a.* (annotation), r.* (rack).
async function dgField(cfg, path, val, el){
  const b = B(), v = view(b, cfg.id), s = UI.sel; if (!s) return;
  const [p, k] = path.split(/\.(.+)/), NUM = new Set(["w","h","x","y","size","tsize","op","u"]);
  const V = el && el.type === "checkbox" ? el.checked : NUM.has(k) ? num(val, 0) : val;
  if (p === "v"){ const n = v.nodes[s.id]; if (n) edit(() => { n[k] = Math.max(16, V); }); return; }
  if (p === "z"){ const z = v.boxes.find(x => x.id === s.id); if (z) edit(() => { z[k] = V; }); return; }
  if (p === "a"){ const a = v.anno.find(x => x.id === s.id); if (a) edit(() => { a[k] = V; }); return; }
  if (p === "r"){ const r = rackById(b, s.id); if (!r) return; let x = V;
    if (k === "floor" || k === "room"){ x = await resolveNew(k, b, val, {floor:r.floor}); if (x === null) return render(); }
    if (k === "u"){ const hi = rackDevices(b, r).reduce((m, d) => Math.max(m, topU(d)), 0); x = clamp(Math.round(num(val, r.u)), Math.max(4, hi), 60); }
    edit(() => { r[k] = x; if (k === "floor") r.room = ""; }); }
}
async function exportDiagram(cfg, kind){
  const b = B(); let svg = dgSvg(b, cfg, {print:true});
  for (const [id, a] of ASSETS){ if (svg.includes(a.url)) svg = svg.split(a.url).join(await blobToDataURL(a.blob)); }
  const name = `${fileSafe(B().name)} - ${t(curApp().name)}`;
  if (kind === "svg") return saveText(name + ".svg", svg, "svg", "image/svg+xml");
  const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/), w = +m[1], h = +m[2], sc = 2;
  const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = w * sc; c.height = h * sc; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(bl => saveBinary(name + ".png", bl, "png"), "image/png"); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
