/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Rack: front / rear elevations of every rack of the building, drag devices between U positions and racks,
// A/B power feeds, PDU and UPS load, heat, weight, and the rack document.
"use strict";
(function(){
const UH = 20;                                   // pixels per rack unit on screen
const RKINDS = ["switch","coresw","pp","fpp","firewall","router","wlc","modem","ont","server","nas","storage","nvr","dvr","decoder","encoder","kvm","ups","pdu","cablemgr","brush","blank","vent","shelf","fan","other"];
const rackable = d => !!(KINDS[d.kind] && KINDS[d.kind].rack) || !!d.rack;
const loadDev = d => { const K = KINDS[d.kind] || KINDS.other; return !K.passive && d.kind !== "pdu" && d.kind !== "internet" && !(K.acc && d.kind !== "fan"); };
const devW = d => num(d.params.powerW) || num(d.params.maxW) * 0.6 || 0;   // typical draw; without it 60 % of maximum
const zeroU = d => d.kind === "pdu" && d.rack && !d.u;
function curRack(b){ let r = UI.rackSel && rackById(b, UI.rackSel); if (!r && UI.sel){ if (UI.sel.type === "rack") r = rackById(b, UI.sel.id); else if (UI.sel.type === "dev"){ const d = devById(b, UI.sel.id); r = d && d.rack && rackById(b, d.rack); } } return r || b.racks[0] || null; }
function newRack(b){ return normRack({id:uid("k"), name:nextRackName(b)}); }
/* ---------- power model ---------- */
function rackPower(b, r){
  const devs = b.devices.filter(d => d.rack === r.id), feeds = devs.filter(d => d.kind === "pdu" || d.kind === "ups");
  const F = {}; feeds.forEach(f => F[f.id] = {d:f, norm:0, fail:0});
  const loads = devs.filter(loadDev), tot = loads.reduce((s, d) => s + devW(d), 0), max = loads.reduce((s, d) => s + (num(d.params.maxW) || devW(d)), 0);
  const unfed = [];
  loads.forEach(d => { if (d.kind === "ups") return; const w = devW(d), fs = [d.params.feedA, d.params.feedB].filter((x, i, a) => x && F[x] && a.indexOf(x) === i);
    if (!fs.length){ if (w) unfed.push(d); return; }
    fs.forEach(id => { F[id].norm += w / fs.length; F[id].fail += w; }); });
  // a PDU fed from a UPS passes its load on to the UPS
  Object.values(F).forEach(x => { if (x.d.kind !== "pdu") return; const up = x.d.params.feedA && F[x.d.params.feedA]; if (up && up.d.kind === "ups"){ up.norm += x.norm; up.fail += x.fail; } });
  const ups = Object.values(F).filter(x => x.d.kind === "ups");
  ups.forEach(x => { if (!Object.values(F).some(y => y !== x && (y.d.params.feedA === x.d.id)) && !loads.some(d => d.params.feedA === x.d.id || d.params.feedB === x.d.id)){ x.norm = tot; x.fail = tot; x.assumed = true; } });
  const weight = devs.reduce((s, d) => s + num(d.params.weight), 0);
  const used = rackDevices(b, r).reduce((s, d) => s + devH(d), 0);
  return {devs, loads, tot, max, btu:tot * 3.412, weight, used, free:r.u - used, F, unfed, ups};
}
const pduCapW = (r, d) => (num(d.params.amps) || 16) * num(r.volts, 230) * num(r.pf, 0.9);
const upsRuntime = x => { const wh = num(x.d.params.wh), w = x.norm; return wh && w ? wh * 0.9 / w * 60 : null; };
function rackWarnings(b){
  const W = [];
  b.racks.forEach(r => { const p = rackPower(b, r), n = r.name;
    if (num(r.load) && p.weight > num(r.load)) W.push(["err", t("rw_weight",{r:n, w:r1(p.weight), m:r.load}), r.id]);
    rackDevices(b, r).forEach(d => { if (num(d.params.depth) && num(r.udepth) && num(d.params.depth) > num(r.udepth)) W.push(["", t("rw_depth",{n:devLabel(d), d:d.params.depth, r:n, u:r.udepth}), d.id]);
      if (r.airflow === "f2b" && d.params.airflow === "b2f" || r.airflow === "b2f" && d.params.airflow === "f2b") W.push(["", t("rw_air",{n:devLabel(d), r:n}), d.id]);
      if (num(d.params.psu) >= 2 && (p.F[d.params.feedA] || p.F[d.params.feedB]) && (!d.params.feedA || !d.params.feedB || d.params.feedA === d.params.feedB)) W.push(["", t("rw_ab",{n:devLabel(d)}), d.id]); });
    Object.values(p.F).forEach(x => { if (x.d.kind === "pdu"){ const cap = pduCapW(r, x.d); if (!cap) return;
        if (x.fail > cap * 0.8) W.push(["err", t("rw_pduFail",{p:devLabel(x.d), w:Math.round(x.fail), c:Math.round(cap * 0.8)}), x.d.id]);
        else if (x.norm > cap * 0.8) W.push(["", t("rw_pdu",{p:devLabel(x.d), w:Math.round(x.norm), c:Math.round(cap * 0.8)}), x.d.id]); }
      else { const cap = num(x.d.params.upsW) || num(x.d.params.va) * 0.9; if (cap && x.norm > cap) W.push(["err", t("rw_ups",{p:devLabel(x.d), w:Math.round(x.norm), c:Math.round(cap)}), x.d.id]); } });
    if (Object.keys(p.F).length && p.unfed.length) W.push(["info", t("rw_unfed",{r:n, n:p.unfed.length}), p.unfed[0].id]);
    const blanks = rackDevices(b, r).some(d => d.kind === "blank" || d.kind === "brush");
    if (p.free > 0 && p.loads.length && !blanks) W.push(["info", t("rw_blank",{r:n, n:p.free}), r.id]);
  });
  return W;
}
const warnings = b => [...rackWarnings(b), ...commonWarnings(b).filter(w => !w[2] || (devById(b, w[2]) && devById(b, w[2]).rack))];
/* ---------- elevation: drawn like a real cabinet (RackLayout look) ---------- */
// faceplate type of each device kind
const FT = {pp:"pp", fpp:"fiberpp", switch:"sw", coresw:"coresw", firewall:"fw", router:"router", modem:"router", ont:"router", wlc:"router", mediaconv:"router",
  nvr:"nvr", dvr:"nvr", server:"server", nas:"server", storage:"server", ups:"ups", pdu:"pdu", fan:"fan", cablemgr:"cablemgr", brush:"brush", vent:"vent", blank:"blank", shelf:"shelf"};
const ftOf = d => FT[d.kind] || "other";
function portRows(n, rows, grp){ n = Math.max(0, Math.min(96, n)); if (!n) return ""; const per = Math.ceil(n / rows); let h = "";
  for (let r = 0; r < rows; r++){ let row = ""; for (let i = 0; i < per && r * per + i < n; i++) row += `<i${grp && i && i % grp === 0 ? ' class="g"' : ""}></i>`; h += `<div class="prow">${row}</div>`; }
  return `<div class="ports">${h}</div>`; }
function face(d){
  const T = ftOf(d), h = devH(d), n = num(d.ports), brandTxt = (d.brand || d.model || "").toUpperCase(), m = brandTxt ? `<span class="brand${T === "fw" ? " red" : ""}">${esc(brandTxt)}</span>` : "";
  switch (T){
    case "pp": { const rows = n > 24 ? 2 : 1; return `<span class="lab"></span><div class="flex1"></div>${portRows(n || 24, Math.min(rows, h * 2), 6)}<div class="flex1"></div><span class="lab"></span>`; }
    case "fiberpp": { const pr = Math.ceil((n || 24) / 2); let x = ""; for (let i = 0; i < Math.min(pr, 24); i++) x += `<i></i><i style="margin-right:${i < pr - 1 ? 5 : 0}px"></i>`; return `<div class="flex1"></div><div class="prow">${x}</div><div class="flex1"></div>`; }
    case "coresw": case "sw": { const rows = n > 12 ? 2 : 1, sfp = Math.min(4, num(d.params.sfp) || 4); return `<span class="led"></span>${m || `<span class="brand">${T === "coresw" ? "L3" : "SW"}</span>`}<div class="flex1"></div>${portRows(n || 24, Math.min(rows, h * 2), 6)}<div class="sfp">${"<i></i>".repeat(sfp)}</div>`; }
    case "fw": return `<span class="led"></span>${m || '<span class="brand red">FIREWALL</span>'}<div class="flex1"></div>${portRows(n || 8, (n || 8) > 8 ? 2 : 1, 0)}`;
    case "router": return `<span class="led"></span>${m || `<span class="brand">${esc(kindName(d.kind).toUpperCase().slice(0, 12))}</span>`}<div class="flex1"></div>${portRows(n || 4, 1, 0)}`;
    case "nvr": { let x = ""; for (let i = 0; i < Math.min(8, Math.max(2, num(d.nvrp && d.nvrp.bays) || h * 4)); i++) x += `<i style="height:${Math.min(14, h * UH / 2 - 4)}px"></i>`; return `${m || '<span class="brand">NVR</span>'}<div class="flex1"></div><span class="led"></span><span class="led o"></span><div class="bays" style="grid-template-rows:repeat(${h > 1 ? 2 : 1},auto)">${x}</div>`; }
    case "server": { const rows = Math.max(1, Math.min(4, h * 2 - 1)); let x = ""; for (let i = 0; i < rows * 4; i++) x += `<i style="height:${Math.max(5, (h * UH - 8) / rows - 2)}px"></i>`; return `<div class="bays" style="grid-template-rows:repeat(${rows},auto)">${x}</div><div class="flex1"></div>${m}<span class="led"></span>`; }
    case "ups": { const va = num(d.params.va); return `${m || '<span class="brand">UPS</span>'}<div class="lcd">${va ? Math.round(va / 100) / 10 + "kVA" : ""}</div><span class="led"></span><div class="grill"></div>`; }
    case "pdu": return `<div class="outlets">${"<i></i>".repeat(8)}</div><div class="flex1"></div>${m}<span class="sw-red"></span>`;
    case "fan": return `<div class="fans">${"<i></i>".repeat(4)}</div>`;
    case "cablemgr": return `<div class="rings">${"<i></i>".repeat(8)}</div>`;
    case "brush": return `<div class="brushs"></div>`;
    case "shelf": return `<div class="tray"></div><span class="nm">${esc(devLabel(d))}</span>`;
    case "vent": case "blank": return "";
    default: return `${m}<span class="nm">${esc(devLabel(d))}</span>`;
  }
}
function rearFace(d){
  const T = ftOf(d), cab = d.kind === "camera" || d.kind === "nvr" ? "#e0661b" : "#1f6fd6";
  switch (T){
    case "pp": case "fiberpp": case "cablemgr": case "brush": case "vent": case "blank": return "";
    case "shelf": return `<div class="tray"></div>`;
    case "pdu": return `<span class="inlet"></span><span class="cord" style="background:#d32424"></span><div class="flex1"></div>`;
    case "ups": return `<div class="outlets">${"<i></i>".repeat(6)}</div><div class="flex1"></div><span class="inlet"></span><span class="cord" style="background:#d32424"></span>`;
    case "fan": return `<div class="fans">${"<i></i>".repeat(4)}</div>`;
    default: return `<div class="fans" style="gap:6px;margin:0">${"<i style='width:12px;height:12px'></i>".repeat(Math.min(3, devH(d) + 1))}</div><div class="flex1"></div><span class="cord" style="background:${cab}"></span><span class="inlet"></span>`;
  }
}
function devFace(b, d, r, rearSide, other){
  const h = devH(d), sel = UI.sel && UI.sel.type === "dev" && UI.sel.id === d.id;
  return `<div class="rkd dv t-${ftOf(d)} k-${d.kind}${other ? " ghost" : ""}${sel ? " on" : ""}${d.status === "planned" ? " planned" : ""}${d.status === "faulty" ? " faulty" : ""}" data-rd="${d.id}" style="top:${(r.u - topU(d)) * UH}px;height:${h * UH - 1}px" title="${esc(devFull(b, d) + " · U" + d.u + (h > 1 ? "–" + topU(d) : "") + (d.ip ? " · " + d.ip : ""))}">${rearSide ? rearFace(d) : face(d)}</div>`;
}
// right-hand column: what sits in each U (names, model), empty ranges marked
function descCol(b, r){
  const occ = rackOcc(b, r); let h = "", u = r.u;
  while (u >= 1){ const d = occ[u];
    if (d){ const hh = devH(d), on = UI.sel && UI.sel.type === "dev" && UI.sel.id === d.id; h += `<div class="dc${on ? " on" : ""}" data-rdsel="${d.id}" style="height:${(topU(d) - Math.max(1, d.u) + 1) * UH}px" title="${esc(devFull(b, d))}"><span>${esc(devLabel(d))}${d.model || d.brand ? ` <span class="muted">– ${esc([d.brand, d.model].filter(Boolean).join(" "))}</span>` : ""}</span></div>`; u = d.u - 1; void hh; }
    else { let n = 0; while (u - n >= 1 && !occ[u - n]) n++; h += `<div class="dc e" style="height:${n * UH}px">${esc(t("rkEmptyU"))}</div>`; u -= n; } }
  return `<div class="rkdesc"><div class="dch">${esc(t("rkDesc"))}</div>${h}</div>`;
}
function rackHtml(b, r, faces, print){
  const devs = rackDevices(b, r), zero = b.devices.filter(d => d.rack === r.id && zeroU(d)), on = !print && curRack(b) === r;
  const p = rackPower(b, r), nums = side => `<div class="rkn${side ? " r" : ""}"><div class="dch">U</div>${Array.from({length:r.u}, (_, i) => `<i>${r.u - i}</i>`).join("")}</div>`;
  const zcol = (f, ab) => zero.filter((d, i) => (d.params.feed || (i % 2 ? "B" : "A")) === ab).map(d => `<div class="rk0${ab === "B" ? " b" : ""}${UI.sel && UI.sel.id === d.id ? " on" : ""}" data-rd0="${d.id}" title="${esc(devLabel(d))}"><span>${esc(devLabel(d))}</span></div>`).join("");
  const face = f => `<div class="rkf"><div class="rkft">${esc(t(f === "front" ? "sideFront" : "sideRear"))}</div><div class="rkcab">
      ${f === "front" ? nums(false) : ""}
      <div class="rkcase"><div class="rkz">${zcol(f, "A")}</div>
        <div class="rkb ${f}" data-rkb="${r.id}" data-face="${f}" style="height:${r.u * UH}px">${print ? "" : Array.from({length:r.u}, (_, i) => rackFits(b, r, r.u - i, 1) ? `<div class="rku" data-ru="${r.u - i}" style="top:${i * UH}px"></div>` : "").join("")}
          ${devs.map(d => devFace(b, d, r, f === "rear", (d.side || "front") !== f)).join("")}</div>
        <div class="rkz">${zcol(f, "B")}</div></div>
      ${f === "front" ? descCol(b, r) : nums(true)}</div></div>`;
  return `<div class="rk${on ? " on" : ""}" data-rk="${r.id}"><div class="rkh" data-rksel="${r.id}"><b>${esc(r.name)}</b><small>${r.u}U · ${esc([floorName(b, r.floor), roomName(b, r.room)].filter(Boolean).join(" · ") || "—")}</small>
      <span class="rks">${p.used}/${r.u}U · ${Math.round(p.tot)} W · ${r1(p.weight)} kg</span></div><div class="rkfs">${faces.map(face).join("")}</div></div>`;
}
function elevation(b){
  if (!b.racks.length) return `<div class="empty"><h3>${esc(t("rkEmptyT"))}</h3><p>${esc(t("rkEmpty"))}</p><div class="btns" style="justify-content:center"><button class="btn pri" data-rka="addRack">＋ ${esc(t("rkAdd"))}</button></div></div>`;
  const faces = UI.rackFace === "both" ? ["front","rear"] : [UI.rackFace || "front"];
  return `${warnBox(warnings(b))}<div class="rkrow" id="rkrow">${b.racks.map(r => rackHtml(b, r, faces)).join("")}<button class="rkadd" data-rka="addRack">＋<span>${esc(t("rkAdd"))}</span></button></div><p class="dghint">${esc(t("rkHint"))}</p>`;
}
/* ---------- palette ---------- */
function palette(b){
  const r = curRack(b), un = b.devices.filter(d => KINDS[d.kind] && KINDS[d.kind].rack && !d.rack);
  return `<div class="psec"><h4>${esc(t("rkTarget"))}</h4>${b.racks.length ? `<select id="rk-target">${b.racks.map(x => opt(x.id, x.name, r && r.id)).join("")}</select>` : `<p class="muted small">${esc(t("rkNoRack"))}</p>`}
      <div class="btns"><button class="btn small" data-rka="addRack">＋ ${esc(t("rkAdd"))}</button></div></div>
    <div class="psec"><h4>${esc(t("palAdd"))}</h4><div class="pgrid">${RKINDS.map(k => `<button class="pitem" data-rkadd="${k}" title="${esc(kindName(k))}"><svg viewBox="0 0 48 48">${ICO[(KINDS[k] || KINDS.other).icon] || ICO.box}</svg><span>${esc(kindName(k))}</span></button>`).join("")}</div></div>
    ${un.length ? `<div class="psec"><h4>${esc(t("rkUnracked"))} <span class="cnt">${un.length}</span></h4><p class="muted small">${esc(t("rkUnrackedHint"))}</p><div class="ulist">${un.slice(0, 80).map(d => `<button class="uitem" data-rkput="${d.id}"><svg viewBox="0 0 48 48">${ICO[devIcon(d)] || ICO.box}</svg><span>${esc(devLabel(d))}</span></button>`).join("")}</div></div>` : ""}
    <div class="psec"><h4>${esc(t("palView"))}</h4><div class="seg">${["front","rear","both"].map(f => `<button class="${(UI.rackFace || "front") === f ? "on" : ""}" data-rkface="${f}">${esc(t(f === "front" ? "sideFront" : f === "rear" ? "sideRear" : "rkBoth"))}</button>`).join("")}</div></div>`;
}
async function addToRack(kind, rackId, u0){
  const b = B(); let r = rackId ? rackById(b, rackId) : curRack(b);
  if (!r){ const nr = newRack(b); pushUndo(); b.racks.push(nr); r = nr; }
  let zero = false;
  if (kind === "pdu"){ const c = await uiChoice(t("rkPduQ"), [["0", t("rkPdu0")], ["1", t("rkPdu1")]]); if (!c) return; zero = c === "0"; }
  const h = zero ? 0 : (KINDS[kind] && KINDS[kind].h) || 1;
  let u = 0; if (!zero){ u = u0 && rackFits(b, r, u0 - h + 1, h) ? u0 - h + 1 : u0 && rackFits(b, r, u0, h) ? u0 : rackSpot(b, r, h, u0 || 0);
    if (!u){ // no free gap: make room by packing the rack down, or say how much is missing
      const used = rackDevices(b, r).reduce((a, x) => a + devH(x), 0); if (used + h > r.u) return uiAlert(t("fitRackFull",{r:r.name, free:r.u - used, need:h}));
      const R = rackRepack(b, r, r.u - h); if (!R.ok || !await uiConfirm(t("fitMakeRoom",{r:r.name, k:R.moves.length, d:kindName(kind)}) + "\n\n" + moveText(R.moves), t("fitApply"))) return;
      edit(() => { R.moves.forEach(([x, , nu]) => { x.u = nu; }); }); u = r.u - h + 1; } }
  edit(() => { const d = newDevice(kind, {rack:r.id, u, floor:r.floor, room:r.room}); if (zero){ d.params.h = 0; d.params.feed = b.devices.filter(x => x.rack === r.id && zeroU(x)).length % 2 ? "B" : "A"; } else d.params.h = h;
    b.devices.push(d); UI.sel = {type:"dev", id:d.id}; UI.rackSel = r.id; });
}
function putInRack(id, rackId){
  const b = B(), d = devById(b, id), r = rackId ? rackById(b, rackId) : curRack(b); if (!d) return;
  if (!r) return toast("⚠ " + t("rkNoRack"));
  UI.sel = {type:"dev", id:d.id}; UI.rackSel = r.id; putDevInRack(b, d, r);
}
/* ---------- drag devices between U positions and racks ---------- */
let RD = null;
function wire(){
  const host = $("#view");
  host.addEventListener("pointerdown", e => {
    if (UI.app !== "rack" || curTab().id !== "rack" || e.button > 0) return;
    const el = e.target.closest(".rkd:not(.ghost)"); if (!el) return;
    const b = B(), d = devById(b, el.dataset.rd); if (!d) return;
    const r0 = el.getBoundingClientRect();
    RD = {d, el, offY:e.clientY - r0.top, x0:e.clientX, y0:e.clientY, moved:false, tgt:null}; e.preventDefault();
  });
  document.addEventListener("pointermove", e => {
    if (!RD) return; const dx = e.clientX - RD.x0, dy = e.clientY - RD.y0; if (!RD.moved && Math.hypot(dx, dy) < 4) return;
    const b = B(), d = RD.d, h = devH(d);
    if (!RD.moved){ RD.moved = true; RD.el.classList.add("dragging"); }
    RD.el.style.transform = `translate(${dx}px,${dy}px)`;
    $$(".rkghost").forEach(x => x.remove()); RD.tgt = null;
    RD.el.style.pointerEvents = "none"; const under = document.elementFromPoint(e.clientX, e.clientY); RD.el.style.pointerEvents = "";
    const body = under && under.closest && under.closest("[data-rkb]"); if (!body) return;
    const r = rackById(b, body.dataset.rkb), br = body.getBoundingClientRect();
    const top = clamp(Math.round((e.clientY - RD.offY - br.top) / UH), 0, r.u - h), u = r.u - top - h + 1;
    let ok = rackFits(b, r, u, h, d.id), swap = null;
    if (!ok){ const occ = rackOcc(b, r, d.id), hit = new Set(); for (let x = u; x < u + h; x++) if (occ[x]) hit.add(occ[x]);
      if (hit.size === 1){ const o = [...hit][0]; if (o.rack === d.rack && devH(o) === h && o.u === u) swap = o; else if (o.rack !== d.rack && devH(o) === h && o.u === u && rackFits(b, rackById(b, d.rack), d.u, h, d.id)) swap = o; } }
    const g = document.createElement("div"); g.className = "rkghost" + (ok ? " ok" : swap ? " swap" : " bad"); g.style.top = top * UH + "px"; g.style.height = h * UH + "px"; g.textContent = ok ? "U" + u : swap ? "⇅ " + devLabel(swap) : "✕"; body.appendChild(g);
    RD.tgt = {r, u, ok, swap};
  });
  const end = () => {
    if (!RD) return; const D = RD; RD = null; $$(".rkghost").forEach(x => x.remove()); D.el.style.transform = ""; D.el.classList.remove("dragging");
    const b = B(), d = D.d;
    if (!D.moved){ UI.sel = {type:"dev", id:d.id}; UI.rackSel = d.rack; UI.multi.clear(); render(); return; }
    const T = D.tgt; if (!T){ render(); return; }
    if (T.ok){ edit(() => { const moved = d.rack !== T.r.id; d.rack = T.r.id; d.u = T.u; if (moved){ d.floor = T.r.floor || d.floor; d.room = T.r.room || d.room; if (d.params.feedA && !rackById(b, d.rack)) d.params.feedA = ""; } UI.sel = {type:"dev", id:d.id}; UI.rackSel = T.r.id; }); toast("U" + T.u + " · " + T.r.name); return; }
    if (T.swap){ const o = T.swap; edit(() => { const ar = d.rack, au = d.u; d.rack = o.rack; d.u = o.u; o.rack = ar; o.u = au; UI.sel = {type:"dev", id:d.id}; }); toast("⇅ " + t("rackSwapped")); return; }
    toast("⚠ " + t("rackNoSpace")); render();
  };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  host.addEventListener("click", async e => {
    if (UI.app !== "rack") return;
    const a = e.target.closest("[data-rka]"); if (a){ if (a.dataset.rka === "addRack"){ const b = B(); edit(() => { const r = newRack(b); b.racks.push(r); UI.sel = {type:"rack", id:r.id}; UI.rackSel = r.id; }); } return; }
    const z = e.target.closest("[data-rd0]"); if (z){ UI.sel = {type:"dev", id:z.dataset.rd0}; render(); return; }
    const dsel = e.target.closest("[data-rdsel]"); if (dsel){ UI.sel = {type:"dev", id:dsel.dataset.rdsel}; UI.multi.clear(); render(); return; }
    const hd = e.target.closest("[data-rksel]"); if (hd){ UI.sel = {type:"rack", id:hd.dataset.rksel}; UI.rackSel = hd.dataset.rksel; render(); return; }
    const slot = e.target.closest(".rku"); if (slot){ const body = slot.closest("[data-rkb]"), rid = body.dataset.rkb, u = +slot.dataset.ru; UI.rackSel = rid;
      popMenu(slot, [{head:`${rackById(B(), rid).name} · U${u}`}, ...["switch","pp","fpp","firewall","router","server","nvr","ups","pdu","cablemgr","blank","shelf"].map(k => ({icon:`<svg viewBox="0 0 48 48" width="22" height="22">${ICO[KINDS[k].icon] || ICO.box}</svg>`, label:kindName(k), fn:() => addToRack(k, rid, u)}))]); return; }
  });
  $("#pal").addEventListener("click", e => {
    if (UI.app !== "rack") return;
    const a = e.target.closest("[data-rkadd]"); if (a){ addToRack(a.dataset.rkadd, $("#rk-target") && $("#rk-target").value); return; }
    const p = e.target.closest("[data-rkput]"); if (p){ putInRack(p.dataset.rkput, $("#rk-target") && $("#rk-target").value); return; }
    const f = e.target.closest("[data-rkface]"); if (f){ UI.rackFace = f.dataset.rkface; P().cur.rackFace = UI.rackFace; persist(); render(); return; }
    const r = e.target.closest("[data-rka]"); if (r && r.dataset.rka === "addRack"){ const b = B(); edit(() => { const x = newRack(b); b.racks.push(x); UI.sel = {type:"rack", id:x.id}; UI.rackSel = x.id; }); }
  });
  $("#pal").addEventListener("change", e => { if (UI.app === "rack" && e.target.id === "rk-target"){ UI.rackSel = e.target.value; UI.sel = {type:"rack", id:e.target.value}; render(); } });
}
/* ---------- power tab ---------- */
function powerTab(b){
  if (!b.racks.length) return `<div class="empty"><p>${esc(t("rkEmpty"))}</p></div>`;
  return `${warnBox(rackWarnings(b))}` + b.racks.map(r => { const p = rackPower(b, r), feeds = Object.values(p.F);
    const fo = (d, k) => `<select data-pw="${d.id}:${k}">${opt("", "—", d.params[k])}${feeds.filter(x => x.d.id !== d.id).map(x => opt(x.d.id, devLabel(x.d) + (x.d.params.feed ? " (" + x.d.params.feed + ")" : ""), d.params[k])).join("")}</select>`;
    const rows = p.devs.filter(d => loadDev(d) || d.kind === "pdu").sort((a, c) => (c.u || 0) - (a.u || 0)).map(d => `<tr class="click" data-sel="dev:${d.id}"><td><b>${esc(devLabel(d))}</b><br><small class="muted">${esc([d.brand, d.model].filter(Boolean).join(" ") || kindName(d.kind))}</small></td><td class="c">${d.u ? "U" + d.u : "0U"}</td>
      <td><input data-pw="${d.id}:powerW" type="number" min="0" value="${esc(d.params.powerW || "")}" style="width:70px"></td><td><input data-pw="${d.id}:maxW" type="number" min="0" value="${esc(d.params.maxW || "")}" style="width:70px"></td>
      <td class="c">${d.kind === "pdu" ? "—" : `<select data-pw="${d.id}:psu">${[1,2,3,4].map(x => opt(x, x, d.params.psu)).join("")}</select>`}</td><td>${d.kind === "pdu" ? `<select data-pw="${d.id}:feed">${opt("", "—", d.params.feed)}${opt("A", "A", d.params.feed)}${opt("B", "B", d.params.feed)}</select>` : fo(d, "feedA")}</td><td>${d.kind === "pdu" ? fo(d, "feedA") : num(d.params.psu) >= 2 ? fo(d, "feedB") : "—"}</td></tr>`).join("");
    const fc = feeds.map(x => { if (x.d.kind === "pdu"){ const cap = pduCapW(r, x.d), u1 = cap ? x.norm / cap * 100 : 0, u2 = cap ? x.fail / cap * 100 : 0;
        return `<div class="pcard"><b>${esc(devLabel(x.d))}</b> <span class="pill">${esc(x.d.params.feed ? t("rkFeed") + " " + x.d.params.feed : "PDU")}</span><div class="muted small">${(num(x.d.params.amps) || 16)} A × ${num(r.volts, 230)} V × ${num(r.pf, 0.9)} = ${Math.round(cap)} W</div>${bar(t("rkNormal"), x.norm, u1)}${bar(t("rkFailover"), x.fail, u2)}</div>`; }
      const cap = num(x.d.params.upsW) || num(x.d.params.va) * 0.9, rt = upsRuntime(x);
      return `<div class="pcard"><b>${esc(devLabel(x.d))}</b> <span class="pill">UPS</span><div class="muted small">${esc([x.d.params.va ? x.d.params.va + " VA" : "", cap ? Math.round(cap) + " W" : "", x.d.params.wh ? x.d.params.wh + " Wh" : ""].filter(Boolean).join(" · ") || t("rkUpsNoData"))}</div>${bar(t("rkLoad"), x.norm, cap ? x.norm / cap * 100 : 0)}<div class="small">${esc(t("rkRuntime"))}: <b>${rt ? "≈ " + Math.round(rt) + " " + t("min") : "—"}</b>${x.assumed ? ` <span class="muted">(${esc(t("rkAssumed"))})</span>` : ""}</div></div>`; }).join("");
    return `<div class="card"><h3>🗄 ${esc(r.name)}<span class="grow"></span><span class="pill">${Math.round(p.tot)} W</span><span class="pill">${Math.round(p.btu)} BTU/h</span><span class="pill">${r1(p.weight)} / ${esc(r.load || "—")} kg</span><span class="pill">${p.used}/${r.u} U</span></h3>
      ${fc ? `<div class="pcards">${fc}</div>` : `<p class="muted small">${esc(t("rkNoPdu"))}</p>`}
      ${rows ? `<div class="scroll"><table class="t"><tr><th>${esc(t("f_name"))}</th><th>U</th><th>${esc(t("rkTyp"))}</th><th>${esc(t("rkMax"))}</th><th>PSU</th><th>${esc(t("rkFeed"))} A</th><th>${esc(t("rkFeed"))} B</th></tr>${rows}</table></div>` : `<p class="muted">${esc(t("rkNoLoads"))}</p>`}
      <p class="muted small">${esc(t("rkPowerNote"))}</p></div>`; }).join("");
}
const bar = (lab, w, pct) => `<div class="pbar"><span>${esc(lab)}</span><div class="pb"><i class="${pct > 100 ? "bad" : pct > 80 ? "warn" : ""}" style="width:${Math.min(100, pct).toFixed(1)}%"></i></div><b>${Math.round(w)} W · ${Math.round(pct)}%</b></div>`;
document.addEventListener("change", e => { const el = e.target.closest("[data-pw]"); if (!el || UI.app !== "rack") return; const [id, k] = el.dataset.pw.split(":"), d = devById(B(), id); if (!d) return;
  edit(() => { d.params[k] = ["powerW","maxW","psu"].includes(k) ? num(el.value, 0) : el.value; if (k === "psu" && num(el.value) < 2) d.params.feedB = ""; }); });
/* ---------- drawer ---------- */
function rackEditor(b, r){
  const p = rackPower(b, r);
  return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.rack}</svg><div><h3>${esc(r.name)}</h3><div class="muted small">${r.u}U · ${p.used}U ${esc(t("rkUsed"))} · ${p.free}U ${esc(t("rkFree"))}</div></div><button class="x" data-dr="close">×</button></div>
    ${sec("gen", t("sec_general"), `${fld(t("f_name"), "r.name", r.name)}<div class="two">${fld(t("f_rackU"), "r.u", r.u, "number", ' min="4" max="60"')}${fld(t("f_code"), "r.code", r.code)}</div>
      <div class="two"><label class="fld"><span>${esc(t("f_floor"))}</span><select data-f="r.floor">${floorOpts(b, r.floor)}</select></label><label class="fld"><span>${esc(t("f_room"))}</span><select data-f="r.room">${roomOpts(b, r.floor, r.room)}</select></label></div>
      <div class="two">${fld(t("rkRow"), "r.row", r.row)}<label class="fld"><span>${esc(t("f_airflow"))}</span><select data-f="r.airflow">${["f2b","b2f","side"].map(x => opt(x, t("af_" + x), r.airflow)).join("")}</select></label></div>`, true)}
    ${sec("rdim", t("rkDims"), `<div class="two">${fld(t("rkH"), "r.dims.h", r.dims.h, "number")}${fld(t("rkW"), "r.dims.w", r.dims.w, "number")}</div><div class="two">${fld(t("rkD"), "r.dims.d", r.dims.d, "number")}${fld(t("rkUD"), "r.udepth", r.udepth, "number")}</div>
      <div class="two">${fld(t("rkLoadKg"), "r.load", r.load, "number")}${fld(t("rkCool"), "r.coolKw", r.coolKw || "", "number", ' step="0.1"')}</div><div class="two">${fld(t("rkVolts"), "r.volts", r.volts, "number")}${fld("cos φ", "r.pf", r.pf, "number", ' step="0.01" min="0.5" max="1"')}</div>`)}
    <div class="kv"><span>${esc(t("rkTyp"))}</span><b>${Math.round(p.tot)} W</b><span>${esc(t("rkHeat"))}</span><b>${Math.round(p.btu)} BTU/h</b><span>${esc(t("f_weight"))}</span><b>${r1(p.weight)} kg</b></div>
    <div class="btns"><button class="btn" data-dr="rkDup">⧉ ${esc(t("duplicate"))}</button><button class="btn" data-dr="rkLeft">◀</button><button class="btn" data-dr="rkRight">▶</button><button class="btn dan" data-dr="rkDel">🗑 ${esc(t("delete"))}</button></div>`;
}
function devExtra(b, d){
  if (!d.rack) return "";
  const r = rackById(b, d.rack), feeds = b.devices.filter(x => x.rack === d.rack && (x.kind === "pdu" || x.kind === "ups") && x.id !== d.id);
  if (!feeds.length || !loadDev(d) && d.kind !== "pdu") return `<div class="btns"><button class="btn small" data-dr="rkOut">⤴ ${esc(t("rkOut"))}</button></div>`;
  const fo = k => `<label class="fld"><span>${esc(t("rkFeed"))} ${k === "feedA" ? "A" : "B"}</span><select data-f="params.${k}">${opt("", "—", d.params[k])}${feeds.map(x => opt(x.id, devLabel(x), d.params[k])).join("")}</select></label>`;
  return sec("feed", t("rkFeeds"), `<div class="two">${fo("feedA")}${d.kind !== "pdu" && num(d.params.psu) >= 2 ? fo("feedB") : "<span></span>"}</div><p class="muted small">${esc(t("rkFeedHint"))}</p>`, true)
    + `<div class="btns"><button class="btn small" data-dr="rkOut">⤴ ${esc(t("rkOut"))}</button></div>`;
}
/* ---------- document ---------- */
function docBody(b){
  if (!b.racks.length) return `<p>—</p>`;
  return `<div class="rkdoc">${b.racks.map(r => rackHtml(b, r, ["front","rear"], true)).join("")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">${b.racks.map(r => { const p = rackPower(b, r);
      return `<div><h3>${esc(r.name)}</h3><table class="t"><tr><th>U</th><th>${esc(t("f_name"))}</th><th>${esc(t("f_brand"))} / ${esc(t("f_model"))}</th><th>${esc(t("f_serial"))}</th><th>W</th></tr>${rackRows(b, r).map(d => `<tr><td class="c">${d.u}${devH(d) > 1 ? "–" + topU(d) : ""}</td><td>${esc(devLabel(d))}</td><td>${esc([d.brand, d.model].filter(Boolean).join(" "))}</td><td class="mono">${esc(d.serial)}</td><td class="r">${devW(d) ? Math.round(devW(d)) : ""}</td></tr>`).join("")}
        <tr><td colspan="4"><b>${esc(t("total"))}</b> · ${p.used}/${r.u} U · ${r1(p.weight)} kg · ${Math.round(p.btu)} BTU/h</td><td class="r"><b>${Math.round(p.tot)}</b></td></tr></table></div>`; }).join("")}</div>`;
}
registerApp({
  id:"rack", name:"app_rack", desc:"app_rack_d", docName:"doc_rack", color:"#59607a",
  glyph:`<rect x="14" y="7" width="20" height="34" rx="2" fill="#fff"/><rect x="17" y="11" width="14" height="4" fill="#ffb703"/><rect x="17" y="18" width="14" height="4" fill="#59607a"/><rect x="17" y="25" width="14" height="4" fill="#5ac8fa"/><rect x="17" y="32" width="14" height="4" fill="#59607a"/>`,
  tabs:[
    {id:"rack", label:"tabRacks", icon:"🗄", palette:() => palette(B()), render(){ return elevation(B()); },
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:"#rk-target", title:t("tRkT1"), text:t("tRk1")}, {sel:"#pal .pgrid", title:t("tRkT2"), text:t("tRk2")}, {sel:".rkb", title:t("tRkT3"), text:t("tRk3")}, {sel:"[data-rkface]", title:t("tRkT4"), text:t("tRk4")}, {sel:'[data-tab="power"]', title:t("tRkT5"), text:t("tRk5")}]},
    {id:"power", label:"tabPower", icon:"⚡", render(){ return powerTab(B()); }, tour:() => [{sel:".pcards, .card", title:t("tRkT5"), text:t("tRk5b")}]},
    {id:"inv", label:"tabInv", icon:"📋", render(){ const b = B(); return `<div class="row" style="margin-bottom:10px">${searchBox("q-rinv")}<span class="grow"></span><button class="btn small" data-rk2="csv">⤓ CSV</button></div>${invTable(b, RKINDS, UI.q && UI.q["q-rinv"])}`; }},
    {id:"cables", label:"tabCables", icon:"🔌", render(){ const b = B(); return `<div class="row" style="margin-bottom:10px"><button class="btn small" data-rk2="cid"># ${esc(t("autoCid"))}</button><button class="btn small" data-rk2="ccsv">⤓ CSV</button></div>${cableTable(b, rackLink)}`; }},
    docTab("rack", docBody)
  ],
  actions(tab){ return [{id:"addRack", icon:"＋", label:"rkAdd", fn:() => { const b = B(); edit(() => { const r = newRack(b); b.racks.push(r); UI.sel = {type:"rack", id:r.id}; UI.rackSel = r.id; }); }}, {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; },
  drawer(tab){ const b = B(), s = UI.sel; if (!s) return "";
    if (s.type === "rack"){ const r = rackById(b, s.id); return r ? rackEditor(b, r) : ""; }
    if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d, {extra:devExtra}) : ""; }
    if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; } return ""; },
  async onDrawerAct(k){ const b = B(), s = UI.sel; if (!s) return;
    const r = s.type === "rack" && rackById(b, s.id);
    if (k === "rkDel" && r){ if (!await uiConfirm(t("delRackConf",{n:r.name}), t("delete"), true)) return; edit(() => { b.racks = b.racks.filter(x => x !== r); b.devices.forEach(d => { if (d.rack === r.id){ d.rack = ""; d.u = 0; } }); Object.values(b.views).forEach(v => v && v.nodes && delete v.nodes[r.id]); UI.sel = null; UI.rackSel = null; }); }
    if (k === "rkDup" && r){ edit(() => { const c = normRack(Object.assign(clone(r), {id:uid("k"), name:newRack(b).name})); b.racks.splice(b.racks.indexOf(r) + 1, 0, c); UI.sel = {type:"rack", id:c.id}; UI.rackSel = c.id; }); }
    if ((k === "rkLeft" || k === "rkRight") && r){ const i = b.racks.indexOf(r), j = i + (k === "rkLeft" ? -1 : 1); if (j < 0 || j >= b.racks.length) return; edit(() => { b.racks.splice(i, 1); b.racks.splice(j, 0, r); }); }
    if (k === "rkOut" && s.type === "dev"){ const d = devById(b, s.id); edit(() => { d.rack = ""; d.u = 0; d.params.feedA = ""; d.params.feedB = ""; if (d.kind === "pdu" && !d.params.h) d.params.h = 1; }); }
  },
  async onField(path, v, el){ const b = B(), s = UI.sel; if (!s || s.type !== "rack") return; const r = rackById(b, s.id); if (!r) return; const k = path.slice(2);
    if (k === "floor" || k === "room"){ const x = await resolveNew(k, b, v, {floor:r.floor}); if (x === null) return render(); return edit(() => { r[k] = x; if (k === "floor") r.room = ""; b.devices.forEach(d => { if (d.rack === r.id){ if (k === "floor"){ d.floor = x; d.room = ""; } else d.room = x; } }); }); }
    if (k === "u"){ if (!await setRackU(b, r, v)) render(); return; }
    edit(() => { setPath(r, k, ["dims.h","dims.w","dims.d","udepth","load","coolKw","volts","pf"].includes(k) ? num(v, 0) : String(v).trim()); }); },
  onKey(e, tab){ if (tab.id !== "rack" || !UI.sel || UI.sel.type !== "dev") return; const b = B(), d = devById(b, UI.sel.id); if (!d || !d.rack || !d.u) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown"){ e.preventDefault(); const r = rackById(b, d.rack), u = d.u + (e.key === "ArrowUp" ? 1 : -1); if (rackFits(b, r, u, devH(d), d.id)) edit(() => { d.u = u; }); }
    if (e.key === "Delete"){ e.preventDefault(); $('[data-dr="delDev"]') && $('[data-dr="delDev"]').click(); } },
  exports(){ const b = B(); return [{icon:"▦", label:t("exInv"), fn:() => invCsv(b, RKINDS, t("app_rack"))}, {icon:"▦", label:t("exCab"), fn:() => cableCsv(b, rackLink)}]; },
  reveal(s){ if (!s) return; const b = B(); if (s.type === "dev"){ const d = devById(b, s.id); if (d && d.rack){ UI.rackSel = d.rack; UI.tabs.rack = "rack"; render(); const el = $(`[data-rd="${d.id}"]`); el && el.scrollIntoView({block:"center", inline:"center"}); } } },
  afterRender(tab){ if (tab.id === "rack" && UI.sel && UI.sel.type === "dev" && UI.scrollTo){ const el = $(`[data-rd="${UI.scrollTo}"]`); if (el) el.scrollIntoView({block:"nearest", inline:"nearest"}); UI.scrollTo = null; } },
  guide:() => [[t("gRk1h"), t("gRk1")], [t("gRk2h"), t("gRk2")], [t("gRk3h"), t("gRk3")], [t("gRk4h"), t("gRk4")], [t("gRk5h"), t("gRk5")]]
});
function rackLink(l, b){ const A = devById(b, l.a.d), C = devById(b, l.b.d); return !!(A && A.rack || C && C.rack); }
document.addEventListener("click", e => { const a = e.target.closest("[data-rk2]"); if (!a || UI.app !== "rack") return; const b = B(), k = a.dataset.rk2;
  if (k === "csv") invCsv(b, RKINDS, t("app_rack")); else if (k === "ccsv") cableCsv(b, rackLink); else if (k === "cid") autoCableIds(b, rackLink, "C"); });
APPS.rack.init = () => { UI.rackFace = P().cur.rackFace || "front"; wire(); };
window.rackPower = rackPower;
})();
