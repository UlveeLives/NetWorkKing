/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Fiber: optical backbone of the building and the campus — fibre cables with TIA-568.3-D loss budget against
// IEEE 802.3 applications, TIA-598-C core colours, splice-box capacity, strand tables and links between buildings.
"use strict";
(function(){
const TIA598 = [["blue","#1f5fd6"],["orange","#f08a24"],["green","#2e9b3a"],["brown","#8b5a2b"],["slate","#7a8590"],["white","#ffffff"],["red","#d0453b"],["black","#1d2433"],["yellow","#f2d32a"],["violet","#8e44ad"],["rose","#f4a6b8"],["aqua","#3fc6d1"]];
const FTYPES = {OS2:"SM", OS1a:"SM", OM5:"MM", OM4:"MM", OM3:"MM", OM2:"MM", OM1:"MM"};
const CONS = ["indoor","outdoor","armored","adss","inout","drop"];
// IEEE 802.3 / ITU-T G.984 channel limits: power budget (dB) and maximum length (m) per fibre type.
const FAPPS = {
  "1000BASE-SX":{wl:850, b:3.56, max:{OM1:275, OM2:550, OM3:550, OM4:550, OM5:550}},
  "1000BASE-LX":{wl:1310, b:4.57, max:{OS2:5000, OS1a:5000}},
  "10GBASE-SR":{wl:850, b:2.6, max:{OM1:33, OM2:82, OM3:300, OM4:400, OM5:400}},
  "10GBASE-LR":{wl:1310, b:6.2, max:{OS2:10000, OS1a:10000}},
  "10GBASE-ER":{wl:1550, b:11, max:{OS2:40000}},
  "25GBASE-SR":{wl:850, b:1.9, max:{OM3:70, OM4:100, OM5:100}},
  "25GBASE-LR":{wl:1310, b:6.3, max:{OS2:10000, OS1a:10000}},
  "40GBASE-SR4":{wl:850, b:1.9, max:{OM3:100, OM4:150, OM5:150}},
  "40GBASE-LR4":{wl:1310, b:6.7, max:{OS2:10000, OS1a:10000}},
  "100GBASE-SR4":{wl:850, b:1.9, max:{OM3:70, OM4:100, OM5:100}},
  "100GBASE-DR":{wl:1310, b:3.0, max:{OS2:500, OS1a:500}},
  "100GBASE-LR4":{wl:1310, b:6.3, max:{OS2:10000, OS1a:10000}},
  "GPON B+":{wl:1310, b:28, max:{OS2:20000}},
  "custom":{wl:1310, b:0, max:{}}
};
const STRAND_USE = ["active","spare","dark","reserved","broken"];
const FK = new Set(["fpp","splice","mediaconv","ont"]);
const lossOf = () => { const p = P(); p.fiberLoss = Object.assign({smIsp:1.0, smOsp:0.5, mm850:3.0, mm1300:1.5, conn:0.75, splice:0.3, margin:0}, p.fiberLoss || {}); return p.fiberLoss; };
function fbOf(l){ if (!l.fb){ const mm = l.media === "fiber_mm"; l.fb = {fno:"", ftype:mm ? "OM4" : "OS2", cores:12, cons:"indoor", conn:2, splices:2, app:mm ? "10GBASE-SR" : "10GBASE-LR", bud:"", meas:"", note:""}; } l.strands = l.strands || []; return l.fb; }
const fiberLink = l => isFiber(l.media);
const strandColor = i => [TIA598[Math.floor(i / 12) % 12], TIA598[i % 12]];
// TIA-568.3-D channel loss: length × attenuation + connector pairs + splices.
function budget(l){
  if (!fiberLink(l)) return null;
  const p = fbOf(l), L = lossOf(), ft = p.ftype || "OS2", sm = FTYPES[ft] !== "MM", A = FAPPS[p.app] || null;
  const wl = A ? A.wl : (sm ? 1310 : 850), len = num(l.len), osp = ["outdoor","armored","adss","drop"].includes(p.cons);
  const att = sm ? (osp ? L.smOsp : L.smIsp) : (wl >= 1300 ? L.mm1300 : L.mm850);
  const loss = len / 1000 * att + num(p.conn, 2) * L.conn + num(p.splices, 2) * L.splice;
  const bud = A ? (p.app === "custom" ? num(p.bud) : A.b) : 0, maxLen = A && p.app !== "custom" ? (A.max[ft] ?? 0) : null;
  const margin = bud - loss, meas = num(p.meas) || 0;
  const typeOk = maxLen !== 0, lenOk = !maxLen || len <= maxLen, budOk = !bud || margin >= num(L.margin), measOk = !meas || !bud || meas <= bud;
  return {loss, budget:bud, margin, maxLen, len, meas, ok:typeOk && lenOk && budOk && measOk, typeOk, lenOk, budOk, measOk, wl, att};
}
// Name of each cable end for lists: "Building · device".
function endName(l, e, campus){ const b = campus ? P().buildings.find(x => x.id === e.b) : B(); if (!b) return "?"; const d = e.d && devById(b, e.d); return (campus ? b.name + (d ? " · " : "") : "") + (d ? devLabel(d) : campus ? "" : "?"); }
function allFiber(){ const b = B(); return [...b.links.filter(fiberLink).map(l => ({l, campus:false})), ...P().links.filter(fiberLink).filter(l => l.a.b === b.id || l.b.b === b.id).map(l => ({l, campus:true}))]; }
function boxCap(b, d){
  const f = d.fbox || {}, mult = {lcd:2, lcq:4, scs:1, scd:2, mpo12:12, mpo24:24}[f.atype || "lcd"] || 2;
  const ports = num(f.adapters) * mult, splCap = num(f.trays) * num(f.perTray);
  let term = 0, spl = 0;
  [...b.links, ...P().links.filter(l => l.a.b === b.id || l.b.b === b.id)].filter(l => fiberLink(l) && (l.a.d === d.id || l.b.d === d.id)).forEach(l => { fbOf(l); term += l.strands.filter(s => s.use === "active").length; spl += num(l.fb.cores); });
  return {ports, splCap, term, spl};
}
function fWarnings(b){
  const W = [];
  allFiber().forEach(({l, campus}) => { const B2 = budget(l), p = l.fb, nm = p.fno || `${endName(l, l.a, campus)} → ${endName(l, l.b, campus)}`;
    if (!p.app) return;
    if (!B2.typeOk) W.push(["err", t("fw_type",{c:nm, a:p.app, f:p.ftype}), null]);
    else if (!B2.lenOk) W.push(["err", t("fw_len",{c:nm, l:B2.len, m:B2.maxLen, a:p.app}), null]);
    if (B2.budget && !B2.budOk) W.push(["err", t("fw_bud",{c:nm, l:B2.loss.toFixed(2), b:B2.budget.toFixed(2)}), null]);
    if (B2.meas && !B2.measOk) W.push(["err", t("fw_meas",{c:nm, m:B2.meas.toFixed(2), b:B2.budget.toFixed(2)}), null]);
    if (l.strands.length && l.strands.length !== num(p.cores)) W.push(["", t("fw_cores",{c:nm, n:l.strands.length, k:p.cores}), null]); });
  b.devices.filter(d => d.fbox).forEach(d => { const C = boxCap(b, d); if (C.ports && C.term > C.ports) W.push(["err", t("fw_ports",{n:devLabel(d), a:C.term, b:C.ports}), d.id]); if (C.splCap && C.spl > C.splCap) W.push(["", t("fw_spl",{n:devLabel(d), a:C.spl, b:C.splCap}), d.id]); });
  return W;
}
/* ---------- diagram config ---------- */
const cfg = {id:"fiber", media:["fiber_sm","fiber_mm","fpatch","isp","cat6","ptp"],
  kinds:["fpp","splice","mediaconv","ont","switch","coresw","firewall","router","modem","internet","server","other"],
  linkFilter:(l, b) => fiberLink(l) || [l.a.d, l.b.d].some(id => FK.has((devById(b, id) || {}).kind)),
  nodeLines(b, d, v){ if (d.fbox){ const C = boxCap(b, d); return [[d.brand, d.model].filter(Boolean).join(" "), `${t("capPorts")} ${C.term}/${C.ports || "—"} · ${t("capSplice")} ${C.spl}/${C.splCap || "—"}`, roomName(b, d.room)]; } return defaultLines(b, d, v); },
  devExtra(b, d){ if (!d.fbox) return ""; const f = d.fbox, C = boxCap(b, d);
    return sec("fbox", t("fbBox"), `<div class="two"><label class="fld"><span>${esc(t("fbAdapters"))}</span><input data-fb="adapters" type="number" min="0" value="${esc(f.adapters)}"></label><label class="fld"><span>${esc(t("fbAtype"))}</span><select data-fb="atype">${[["lcd","LC duplex"],["lcq","LC quad"],["scs","SC simplex"],["scd","SC duplex"],["mpo12","MPO-12"],["mpo24","MPO-24"]].map(([k, l]) => opt(k, l, f.atype)).join("")}</select></label></div>
      <div class="two"><label class="fld"><span>${esc(t("fbTrays"))}</span><input data-fb="trays" type="number" min="0" value="${esc(f.trays)}"></label><label class="fld"><span>${esc(t("fbPerTray"))}</span><input data-fb="perTray" type="number" min="0" value="${esc(f.perTray)}"></label></div>
      <div class="lbox ${C.ports && C.term > C.ports || C.splCap && C.spl > C.splCap ? "bad" : "ok"}">${esc(t("capPorts"))}: <b>${C.term} / ${C.ports || "—"}</b> · ${esc(t("capSplice"))}: <b>${C.spl} / ${C.splCap || "—"}</b></div>`, true); },
  newDefaults(k){ return {}; }
};
function linkExtra(b, l){
  if (!fiberLink(l)) return "";
  const p = fbOf(l), B2 = budget(l);
  return sec("fib", t("fbCable"), `<div class="two"><label class="fld"><span>${esc(t("fbNo"))}</span><input data-fl="fno" value="${esc(p.fno)}" placeholder="F-01"></label><label class="fld"><span>${esc(t("fbType"))}</span><select data-fl="ftype">${Object.keys(FTYPES).map(k => opt(k, `${k} (${FTYPES[k] === "SM" ? "single-mode" : "multimode"})`, p.ftype)).join("")}</select></label></div>
    <div class="two"><label class="fld"><span>${esc(t("fbCores"))}</span><select data-fl="cores">${[2,4,6,8,12,16,24,32,48,72,96,144,288].map(n => opt(n, n + "F", p.cores)).join("")}</select></label><label class="fld"><span>${esc(t("fbCons"))}</span><select data-fl="cons">${CONS.map(c => opt(c, t("cons_" + c), p.cons)).join("")}</select></label></div>
    <div class="two"><label class="fld"><span>${esc(t("fbConn"))}</span><input data-fl="conn" type="number" min="0" value="${esc(p.conn)}"></label><label class="fld"><span>${esc(t("fbSplices"))}</span><input data-fl="splices" type="number" min="0" value="${esc(p.splices)}"></label></div>
    <div class="two"><label class="fld"><span>${esc(t("fbApp"))}</span><select data-fl="app">${opt("", "—", p.app)}${Object.keys(FAPPS).map(k => opt(k, k === "custom" ? t("fbCustom") : k, p.app)).join("")}</select></label>${p.app === "custom" ? `<label class="fld"><span>${esc(t("fbBudget"))} (dB)</span><input data-fl="bud" type="number" step="0.1" value="${esc(p.bud)}"></label>` : "<span></span>"}</div>
    <div class="two"><label class="fld"><span>${esc(t("fbMeas"))} (dB)</span><input data-fl="meas" type="number" step="0.01" value="${esc(p.meas)}"></label><span></span></div>
    ${budgetBox(B2)}<div class="btns"><button class="btn small" data-fa="strands">🎨 ${esc(t("fbStrands"))} (${l.strands.length || 0}/${p.cores})</button></div>`, true);
}
function budgetBox(B2){
  if (!B2) return "";
  return `<div class="lbox ${B2.ok ? "ok" : "bad"}"><div>${esc(t("fbLoss"))}: <b>${B2.loss.toFixed(2)} dB</b> <small class="muted">(${B2.att} dB/km × ${r1(B2.len / 1000 * 1000) / 1000} km)</small></div>
    ${B2.budget ? `<div>${esc(t("fbBudget"))}: <b>${B2.budget.toFixed(2)} dB</b> · ${esc(t("fbMargin"))}: <b>${B2.margin.toFixed(2)} dB</b></div>` : ""}${B2.maxLen ? `<div>${esc(t("fbMaxLen"))}: <b>${B2.maxLen} m</b></div>` : B2.maxLen === 0 ? `<div>⛔ ${esc(t("fbTypeNo"))}</div>` : ""}
    <div><b>${B2.ok ? "✓ " + t("fbPass") : "✕ " + t("fbFail")}</b></div></div>`;
}
/* ---------- strands ---------- */
function fillStrands(l, mode){
  const p = fbOf(l), n = clamp(Math.round(num(p.cores)), 0, 288), st = (l.strands || []).slice(0, n);
  while (st.length < n) st.push({use:"spare", a:"", b:"", svc:"", note:""});
  if (mode === "pair") st.forEach((s, i) => { s.use = i < 2 ? "active" : "spare"; if (i < 2) s.svc = s.svc || "uplink " + (i ? "RX" : "TX"); });
  if (mode === "ports") st.forEach((s, i) => { s.a = "P" + String(i + 1).padStart(2, "0"); s.b = "P" + String(i + 1).padStart(2, "0"); });
  if (mode === "spare") st.forEach(s => s.use = "spare");
  l.strands = st;
}
function openStrands(l, title){
  fbOf(l); if (l.strands.length !== num(l.fb.cores)) fillStrands(l, "");
  const sw = c => `<i class="sw" style="background:${c[1]}"></i>`;
  const draw = () => { modal(`<h3>🎨 ${esc(t("fbStrands"))} — ${esc(title)}</h3><p class="muted small">${esc(t("fbStrandHint"))}</p>
    <div class="btns"><button class="btn small" data-m="fill:pair">1–2 → ${esc(t("su_active"))}</button><button class="btn small" data-m="fill:ports">${esc(t("fbAutoPorts"))}</button><button class="btn small" data-m="fill:spare">${esc(t("fbAllSpare"))}</button></div>
    <div class="scroll" style="max-height:56vh"><table class="t" id="stt"><tr><th>#</th><th>${esc(t("fbTube"))}</th><th>${esc(t("fbColor"))}</th><th>${esc(t("fbUse"))}</th><th>${esc(t("fbA"))}</th><th>${esc(t("fbB"))}</th><th>${esc(t("fbSvc"))}</th><th>${esc(t("f_notes"))}</th></tr>
    ${l.strands.map((s, i) => { const [tb, fc] = strandColor(i); return `<tr data-i="${i}"><td class="c"><b>${i + 1}</b></td><td class="nw">${sw(tb)}${esc(t("fc_" + tb[0]))}</td><td class="nw">${sw(fc)}${esc(t("fc_" + fc[0]))}</td>
      <td><select data-c="use">${STRAND_USE.map(u => opt(u, t("su_" + u), s.use)).join("")}</select></td>${["a","b","svc","note"].map(k => `<td><input data-c="${k}" value="${esc(s[k] || "")}"></td>`).join("")}</tr>`; }).join("")}</table></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="save">${esc(t("save"))}</button></div>`, {
      fill: (bt, e, k) => { read(); fillStrands(l, k); draw(); },
      save: () => { const st = read(); closeModal(); edit(() => { l.strands = st; }); }
    }, {xwide:true}); };
  const read = () => { const st = $$("#stt tr[data-i]").map(tr => { const o = {}; tr.querySelectorAll("[data-c]").forEach(i => o[i.dataset.c] = i.value.trim()); return o; }); l.strands = st; return st; };
  draw();
}
/* ---------- tables ---------- */
function budgetTable(b){
  const R = allFiber(); if (!R.length) return `<div class="empty"><p>${esc(t("fbNoCables"))}</p></div>`;
  return `<div class="scroll"><table class="t"><tr><th>${esc(t("fbNo"))}</th><th>${esc(t("fbRoute"))}</th><th>${esc(t("fbType"))}</th><th>${esc(t("fbCores"))}</th><th>${esc(t("fbUsed"))}</th><th>${esc(t("f_len"))}</th><th>${esc(t("fbApp"))}</th><th>${esc(t("fbLoss"))}</th><th>${esc(t("fbBudget"))}</th><th>${esc(t("fbMargin"))}</th><th>${esc(t("fbMeas"))}</th><th></th></tr>
    ${R.map(({l, campus}) => { const p = fbOf(l), B2 = budget(l); return `<tr class="click" data-fsel="${campus ? "plink" : "link"}:${l.id}"><td><b>${esc(p.fno || "—")}</b>${campus ? ` <span class="pill">${esc(t("fbCampus"))}</span>` : ""}</td><td>${esc(endName(l, l.a, campus))} → ${esc(endName(l, l.b, campus))}</td><td>${esc(p.ftype)}</td><td class="c">${esc(p.cores)}F</td><td class="c">${l.strands.filter(s => s.use === "active").length}</td><td class="r">${esc(l.len || "")}</td><td>${esc(p.app === "custom" ? t("fbCustom") : p.app || "—")}</td>
      <td class="r">${B2.loss.toFixed(2)}</td><td class="r">${B2.budget ? B2.budget.toFixed(2) : "—"}</td><td class="r">${B2.budget ? B2.margin.toFixed(2) : "—"}</td><td class="r">${B2.meas ? B2.meas.toFixed(2) : "—"}</td><td>${p.app ? `<span class="pill ${B2.ok ? "ok" : "bad"}">${esc(B2.ok ? t("fbPass") : t("fbFail"))}</span>` : ""}</td></tr>`; }).join("")}</table></div>
    <div class="card" style="margin-top:12px"><h3>⚙ ${esc(t("fbLossT"))}</h3><div class="lossgrid">${[["smIsp","fbSmIsp"],["smOsp","fbSmOsp"],["mm850","fbMm850"],["mm1300","fbMm1300"],["conn","fbConnL"],["splice","fbSpliceL"],["margin","fbMarginReq"]].map(([k, l]) => `<label class="fld"><span>${esc(t(l))}</span><input data-loss="${k}" type="number" step="0.01" min="0" value="${esc(lossOf()[k])}"></label>`).join("")}</div><p class="muted small">${esc(t("fbLossNote"))}</p></div>`;
}
function strandsView(b){
  const R = allFiber().filter(x => fbOf(x.l) && x.l.strands.length); if (!R.length) return `<div class="empty"><p>${esc(t("fbNoStrands"))}</p></div>`;
  return R.map(({l, campus}) => `<div class="card"><h3>🎨 ${esc(l.fb.fno || "")} ${esc(endName(l, l.a, campus))} → ${esc(endName(l, l.b, campus))} <small class="muted">${esc(l.fb.ftype)} · ${esc(l.fb.cores)}F</small><span class="grow"></span><button class="btn small" data-fstr="${campus ? "plink" : "link"}:${l.id}">✎ ${esc(t("edit"))}</button></h3>
    <div class="scroll"><table class="t"><tr><th>#</th><th>${esc(t("fbTube"))}</th><th>${esc(t("fbColor"))}</th><th>${esc(t("fbUse"))}</th><th>${esc(t("fbA"))}</th><th>${esc(t("fbB"))}</th><th>${esc(t("fbSvc"))}</th><th>${esc(t("f_notes"))}</th></tr>${l.strands.map((s, i) => { const [tb, fc] = strandColor(i);
      return `<tr><td class="c">${i + 1}</td><td class="nw"><i class="sw" style="background:${tb[1]}"></i>${esc(t("fc_" + tb[0]))}</td><td class="nw"><i class="sw" style="background:${fc[1]}"></i>${esc(t("fc_" + fc[0]))}</td><td><span class="pill ${s.use === "active" ? "ok" : s.use === "broken" ? "bad" : s.use === "reserved" ? "warn" : ""}">${esc(t("su_" + (s.use || "spare")))}</span></td><td>${esc(s.a)}</td><td>${esc(s.b)}</td><td>${esc(s.svc)}</td><td>${esc(s.note)}</td></tr>`; }).join("")}</table></div></div>`).join("");
}
/* ---------- campus (links between buildings) ---------- */
function campusPos(){ const p = P(); p.campus = p.campus || {pos:{}}; p.buildings.forEach((b, i) => { if (!p.campus.pos[b.id]) p.campus.pos[b.id] = {x:60 + (i % 4) * 300, y:60 + Math.floor(i / 4) * 200}; }); return p.campus.pos; }
function campusSvg(print){
  const p = P(), pos = campusPos(), W = 220, H = 96, s = UI.sel;
  const xs = Object.values(pos).map(o => o.x), ys = Object.values(pos).map(o => o.y), w = Math.max(1100, Math.max(...xs) + W + 60), h = Math.max(520, Math.max(...ys) + H + 60);
  let o = `<svg xmlns="http://www.w3.org/2000/svg" class="dgsvg" id="campus" viewBox="0 0 ${w} ${h}" width="${print ? "100%" : w}" ${print ? "" : `height="${h}"`} font-family="Segoe UI,Arial,sans-serif"><rect width="${w}" height="${h}" fill="#fff"/>`;
  const pairs = {};
  p.links.forEach(l => { const A = pos[l.a.b], C = pos[l.b.b]; if (!A || !C) return; const k = [l.a.b, l.b.b].sort().join("|"), i = pairs[k] = (pairs[k] || 0) + 1; const off = (i - 1) * 14 - 0;
    const x1 = A.x + W / 2, y1 = A.y + H / 2 + off, x2 = C.x + W / 2, y2 = C.y + H / 2 + off, M = MEDIA[l.media] || MEDIA.fiber_sm, on = s && s.type === "plink" && s.id === l.id, B2 = budget(l);
    o += `<g class="dl" data-cl="${l.id}"><path d="M${x1} ${y1}L${x2} ${y2}" stroke="transparent" stroke-width="14"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${B2 && B2.ok === false && l.fb && l.fb.app ? "#d63a3a" : M.c}" stroke-width="${M.w + 1 + (on ? 2 : 0)}"${M.dash ? ` stroke-dasharray="${M.dash}"` : ""}/>`
      + svgt((x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6, [l.fb && l.fb.fno, l.fb ? l.fb.cores + "F " + l.fb.ftype : mediaName(l.media), l.len ? l.len + " m" : ""].filter(Boolean).join(" · "), {size:10.5, weight:700, fill:M.c, halo:true}) + `</g>`; });
  p.buildings.forEach(b => { const q = pos[b.id], on = b.id === p.cur.b;
    o += `<g class="dn" data-cb="${b.id}"><rect x="${q.x}" y="${q.y}" width="${W}" height="${H}" rx="10" fill="${on ? "#eef3ff" : "#fff"}" stroke="${on ? "#2448a8" : "#33415f"}" stroke-width="${on ? 2.4 : 1.6}"/>${icn("building", q.x + 10, q.y + 22, 46)}`
      + svgt(q.x + 66, q.y + 30, b.name, {size:14, weight:800}) + svgt(q.x + 66, q.y + 48, b.address || "", {size:10, fill:"#59607a"})
      + svgt(q.x + 66, q.y + 66, t("bldInfo",{d:b.devices.length, r:b.racks.length, l:b.links.length}), {size:10, fill:"#59607a"}) + `</g>`; });
  return o + `</svg>`;
}
let CD = null;
function wireCampus(){
  const host = $("#view");
  host.addEventListener("pointerdown", e => { if (UI.app !== "fiber" || curTab().id !== "campus") return; const g = e.target.closest("[data-cb]"); if (!g) return; const svg = $("#campus"), m = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(m), pos = campusPos()[g.dataset.cb];
    CD = {id:g.dataset.cb, dx:q.x - pos.x, dy:q.y - pos.y, moved:false, snap:snapshot(), svg}; e.preventDefault(); });
  document.addEventListener("pointermove", e => { if (!CD) return; const pt = CD.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(CD.svg.getScreenCTM().inverse()), pos = campusPos()[CD.id];
    const nx = Math.max(0, Math.round((q.x - CD.dx) / 10) * 10), ny = Math.max(0, Math.round((q.y - CD.dy) / 10) * 10); if (nx === pos.x && ny === pos.y) return; pos.x = nx; pos.y = ny; CD.moved = true; const w = $("#cwrap"); if (w){ w.innerHTML = campusSvg(); CD.svg = $("#campus"); } });
  const up = () => { if (!CD) return; const D = CD; CD = null; if (D.moved){ pushUndo(D.snap); persist(); render(); } else { UI.sel = {type:"bld", id:D.id}; render(); } };
  document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
  host.addEventListener("click", e => { if (UI.app !== "fiber") return; const l = e.target.closest("[data-cl]"); if (l){ UI.sel = {type:"plink", id:l.dataset.cl}; render(); return; }
    const fs = e.target.closest("[data-fsel]"); if (fs){ const [type, id] = fs.dataset.fsel.split(":"); UI.sel = {type, id}; render(); return; }
    const st = e.target.closest("[data-fstr]"); if (st){ const [type, id] = st.dataset.fstr.split(":"), l = type === "plink" ? P().links.find(x => x.id === id) : linkById(B(), id); if (l) openStrands(l, l.fb.fno || ""); return; }
    if (e.target.closest('[data-fa2="newCampus"]')) newCampusLink(); });
  host.addEventListener("change", e => { if (UI.app !== "fiber") return; const el = e.target.closest("[data-loss]"); if (!el) return; edit(() => { lossOf()[el.dataset.loss] = num(el.value, 0); }); });
}
function bldDevOpts(bid, cur){ const b = P().buildings.find(x => x.id === bid); if (!b) return opt("", "—", cur); const L = b.devices.filter(d => FK.has(d.kind) || KINDS[d.kind].sw || ["firewall","router"].includes(d.kind)).sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true})); return opt("", "— " + t("fbNoDev") + " —", cur) + L.map(d => opt(d.id, devFull(b, d), cur)).join(""); }
function newCampusLink(){
  const p = P(); if (p.buildings.length < 2) return toast("⚠ " + t("fbNeed2"));
  const b0 = B().id, b1 = p.buildings.find(x => x.id !== b0).id;
  modal(`<h3>＋ ${esc(t("fbNewCampus"))}</h3>
    <div class="two"><label class="fld"><span>${esc(t("linkA"))}: ${esc(t("building"))}</span><select id="nc-ba">${p.buildings.map(b => opt(b.id, b.name, b0)).join("")}</select></label><label class="fld"><span>${esc(t("pmDevice"))}</span><select id="nc-da">${bldDevOpts(b0, "")}</select></label></div>
    <div class="two"><label class="fld"><span>${esc(t("linkB"))}: ${esc(t("building"))}</span><select id="nc-bb">${p.buildings.map(b => opt(b.id, b.name, b1)).join("")}</select></label><label class="fld"><span>${esc(t("pmDevice"))}</span><select id="nc-db">${bldDevOpts(b1, "")}</select></label></div>
    <div class="two"><label class="fld"><span>${esc(t("f_media"))}</span><select id="nc-m">${["fiber_sm","fiber_mm","ptp","vpn","isp"].map(m => opt(m, mediaName(m), "fiber_sm")).join("")}</select></label><label class="fld"><span>${esc(t("f_len"))}</span><input id="nc-len" type="number" min="0" step="1"></label></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="ok">${esc(t("add"))}</button></div>`, {
    ok: () => { const v = {ba:$("#nc-ba").value, da:$("#nc-da").value, bb:$("#nc-bb").value, db:$("#nc-db").value, m:$("#nc-m").value, len:$("#nc-len").value};
      if (v.ba === v.bb) return toast("⚠ " + t("fbSameBld")); closeModal();
      edit(() => { const l = normLink({id:uid("L"), a:{b:v.ba, d:v.da, p:""}, b:{b:v.bb, d:v.db, p:""}, media:v.m, len:v.len === "" ? "" : num(v.len)}); if (fiberLink(l)) fbOf(l); p.links.push(l); UI.sel = {type:"plink", id:l.id}; }); }
  });
  ["a","b"].forEach(k => $("#nc-b" + k).addEventListener("change", e => { $("#nc-d" + k).innerHTML = bldDevOpts(e.target.value, ""); }));
}
function plinkEditor(l){
  const p = P(), ba = p.buildings.find(b => b.id === l.a.b), bb = p.buildings.find(b => b.id === l.b.b);
  return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.cable}</svg><div><h3>${esc(t("fbCampusLink"))}</h3><div class="muted small">${esc(endName(l, l.a, true))} → ${esc(endName(l, l.b, true))}</div></div><button class="x" data-dr="close">×</button></div>
    ${sec("gen", t("sec_general"), `<label class="fld"><span>${esc(t("f_media"))}</span><select data-cf="media">${["fiber_sm","fiber_mm","ptp","vpn","isp"].map(m => opt(m, mediaName(m), l.media)).join("")}</select></label>
      <div class="two"><label class="fld"><span>${esc(ba ? ba.name : "?")}</span><select data-cf="a.d">${bldDevOpts(l.a.b, l.a.d)}</select></label><label class="fld"><span>${esc(t("f_port"))}</span><input data-cf="a.p" value="${esc(l.a.p)}"></label></div>
      <div class="two"><label class="fld"><span>${esc(bb ? bb.name : "?")}</span><select data-cf="b.d">${bldDevOpts(l.b.b, l.b.d)}</select></label><label class="fld"><span>${esc(t("f_port"))}</span><input data-cf="b.p" value="${esc(l.b.p)}"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_cid"))}</span><input data-cf="cid" value="${esc(l.cid)}"></label><label class="fld"><span>${esc(t("f_len"))}</span><input data-cf="len" type="number" min="0" value="${esc(l.len)}"></label></div>`, true)}
    ${linkExtra(B(), l)}<div class="btns"><button class="btn dan" data-fa="delPlink">🗑 ${esc(t("delete"))}</button></div>`;
}
/* ---------- document ---------- */
function docBody(b){
  const v = view(b, cfg.id), hasMap = Object.keys(v.nodes).length || v.boxes.length;
  return `${hasMap ? `<div style="border:1px solid #c7d1e6;border-radius:6px;overflow:hidden">${dgSvg(b, cfg, {print:true}).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}</div>` : ""}
    ${P().links.some(l => l.a.b === b.id || l.b.b === b.id) ? `<h3>${esc(t("tabCampus"))}</h3><div style="border:1px solid #c7d1e6;border-radius:6px;overflow:hidden">${campusSvg(true)}</div>` : ""}
    <h3>${esc(t("tabBudget"))}</h3>${budgetTable(b).replace(/<div class="card"[\s\S]*$/, "")}`;
}
registerApp({
  id:"fiber", name:"app_fiber", desc:"app_fiber_d", docName:"doc_fiber", color:"#7a3fb5", dg:cfg, linkExtra,
  glyph:`<circle cx="24" cy="24" r="12" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M15 33l18-18" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="24" r="3" fill="#ffb703"/>`,
  tabs:[
    {id:"map", label:"tabMap", icon:"🗺", palette:() => dgPalette(B(), cfg),
      render(){ const b = B(), v = view(b, cfg.id); document.body.classList.toggle("linkmode", DG.mode === "link"); return `${warnBox(fWarnings(b))}${!Object.keys(v.nodes).length && !v.boxes.length ? `<div class="empty"><h3>${esc(t("fbEmptyT"))}</h3><p>${esc(t("fbEmpty"))}</p></div>` : ""}<div id="dgwrap">${dgSvg(b, cfg)}</div><p class="dghint">${esc(DG.mode === "link" ? t("hintLink") : t("hintMap"))}</p>`; },
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:"#pal .pgrid", title:t("tFbT1"), text:t("tFb1")}, {sel:"#pal .plink", title:t("tFbT2"), text:t("tFb2")}, {sel:'[data-tab="budget"]', title:t("tFbT3"), text:t("tFb3")}, {sel:'[data-tab="campus"]', title:t("tFbT4"), text:t("tFb4")}]},
    {id:"budget", label:"tabBudget", icon:"📉", render(){ return `${warnBox(fWarnings(B()))}${budgetTable(B())}`; }},
    {id:"strands", label:"tabStrands", icon:"🎨", render(){ return strandsView(B()); }},
    {id:"campus", label:"tabCampus", icon:"🏙", render(){ const p = P(); return `<div class="row" style="margin-bottom:10px"><button class="btn pri small" data-fa2="newCampus">＋ ${esc(t("fbNewCampus"))}</button><span class="muted small">${esc(t("fbCampusHint"))}</span></div><div id="cwrap" class="dgbox">${campusSvg()}</div>
      ${p.links.length ? `<div class="card" style="margin-top:12px"><h3>${esc(t("fbCampusList"))}</h3><div class="scroll"><table class="t"><tr><th>${esc(t("fbNo"))}</th><th>${esc(t("linkA"))}</th><th>${esc(t("linkB"))}</th><th>${esc(t("f_media"))}</th><th>${esc(t("f_len"))}</th><th></th></tr>${p.links.map(l => { const B2 = budget(l); return `<tr class="click" data-fsel="plink:${l.id}"><td>${esc(l.fb ? l.fb.fno : l.cid)}</td><td>${esc(endName(l, l.a, true))}</td><td>${esc(endName(l, l.b, true))}</td><td>${esc(mediaName(l.media))}</td><td class="r">${esc(l.len)}</td><td>${B2 && l.fb.app ? `<span class="pill ${B2.ok ? "ok" : "bad"}">${esc(B2.ok ? t("fbPass") : t("fbFail"))}</span>` : ""}</td></tr>`; }).join("")}</table></div></div>` : ""}`; },
      tour:() => [{sel:'[data-fa2="newCampus"]', title:t("tFbT4"), text:t("tFb4b")}]},
    docTab("fiber", docBody)
  ],
  actions(tab){ const a = [{id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; if (tab.id === "map") a.unshift({id:"link", icon:"🔗", label:"linkMode", on:DG.mode === "link", fn:() => { DG.mode = DG.mode === "link" ? "select" : "link"; DG.media = DG.media || "fiber_sm"; DG.linkFrom = null; render(); }}); return a; },
  drawer(tab){ const b = B(), s = UI.sel; if (!s) return "";
    if (s.type === "plink"){ const l = P().links.find(x => x.id === s.id); return l ? plinkEditor(l) : ""; }
    if (s.type === "bld"){ const x = P().buildings.find(y => y.id === s.id); return x ? `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.building || ICO.box}</svg><div><h3>${esc(x.name)}</h3><div class="muted small">${esc(x.address || "")}</div></div><button class="x" data-dr="close">×</button></div><div class="btns"><button class="btn pri" data-fa="openBld">${esc(t("fbOpenBld"))}</button></div>` : ""; }
    if (tab.id === "map") return dgDrawer(b, cfg);
    if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d, {extra:cfg.devExtra}) : ""; }
    if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; } return ""; },
  onDrawerAct:async (k, el) => { const s = UI.sel, b = B();
    if (k === "strands"){ const l = s.type === "plink" ? P().links.find(x => x.id === s.id) : linkById(b, s.id); if (l) openStrands(l, l.fb.fno || linkText(b, l)); return; }
    if (k === "delPlink"){ if (!await uiConfirm(t("fbDelCampus"), t("delete"), true)) return; edit(() => { P().links = P().links.filter(x => x.id !== s.id); UI.sel = null; }); return; }
    if (k === "openBld"){ P().cur.b = s.id; UI.sel = null; persist(); render(); return; }
    return dgDrawerAct(cfg, k, el); },
  onField:(p, v, el) => dgField(cfg, p, v, el),
  onKey(e, tab){ if (tab.id === "map") dgKey(cfg, e); }, onEsc(){ return dgEsc(); },
  exports(){ const b = B(); return [{icon:"🖼", label:t("exPng"), fn:() => exportDiagram(cfg, "png")}, {icon:"◇", label:t("exSvg"), fn:() => exportDiagram(cfg, "svg")}, {icon:"▦", label:t("fbCsv"), fn:() => fiberCsv()}, {icon:"▦", label:t("fbStrCsv"), fn:() => strandCsv()}]; },
  reveal(s){ if (s && (s.type === "dev" || s.type === "rack")){ UI.tabs.fiber = "map"; render(); } },
  guide:() => [[t("gFb1h"), t("gFb1")], [t("gFb2h"), t("gFb2")], [t("gFb3h"), t("gFb3")], [t("gFb4h"), t("gFb4")]]
});
// fiber fields in the drawer (data-fl = cable, data-fb = splice box, data-cf = campus link)
document.addEventListener("change", e => {
  if (UI.app !== "fiber" || !e.target.closest("#drawer")) return; const el = e.target, s = UI.sel, b = B(); if (!s) return;
  if (el.dataset.fl){ const l = s.type === "plink" ? P().links.find(x => x.id === s.id) : linkById(b, s.id); if (!l) return; const k = el.dataset.fl, NUM = ["cores","conn","splices","bud","meas"];
    edit(() => { const p = fbOf(l); p[k] = NUM.includes(k) ? (el.value === "" ? "" : num(el.value, 0)) : el.value.trim(); if (k === "cores" && l.strands.length) fillStrands(l, ""); if (k === "ftype") l.media = FTYPES[p.ftype] === "MM" ? "fiber_mm" : "fiber_sm"; }); return; }
  if (el.dataset.fb){ const d = devById(b, s.id); if (!d || !d.fbox) return; edit(() => { d.fbox[el.dataset.fb] = el.dataset.fb === "atype" ? el.value : num(el.value, 0); }); return; }
  if (el.dataset.cf){ const l = P().links.find(x => x.id === s.id); if (!l) return; edit(() => { setPath(l, el.dataset.cf, el.dataset.cf === "len" ? (el.value === "" ? "" : num(el.value, 0)) : el.value.trim()); if (fiberLink(l)) fbOf(l); }); }
});
document.addEventListener("click", e => { if (UI.app !== "fiber") return; const a = e.target.closest('#drawer [data-fa]'); if (!a) return; e.stopPropagation(); APPS.fiber.onDrawerAct(a.dataset.fa, a); }, true);
function fiberCsv(){ const R = allFiber(); saveText(`${fileSafe(B().name)} - Fiber.csv`, csvText([t("fbNo"), t("linkA"), t("linkB"), t("fbType"), t("fbCores"), t("fbCons"), t("f_len"), t("fbApp"), t("fbLoss"), t("fbBudget"), t("fbMargin"), t("fbMeas"), t("fbResult")],
  R.map(({l, campus}) => { const p = fbOf(l), B2 = budget(l); return [p.fno, endName(l, l.a, campus), endName(l, l.b, campus), p.ftype, p.cores, t("cons_" + p.cons), l.len, p.app, B2.loss.toFixed(2), B2.budget ? B2.budget.toFixed(2) : "", B2.budget ? B2.margin.toFixed(2) : "", B2.meas || "", p.app ? (B2.ok ? t("fbPass") : t("fbFail")) : ""]; })), "csv", "text/csv"); }
function strandCsv(){ const rows = []; allFiber().forEach(({l}) => (l.strands || []).forEach((s, i) => { const [tb, fc] = strandColor(i); rows.push([l.fb.fno, i + 1, t("fc_" + tb[0]), t("fc_" + fc[0]), t("su_" + (s.use || "spare")), s.a, s.b, s.svc, s.note]); }));
  saveText(`${fileSafe(B().name)} - Fiber strands.csv`, csvText([t("fbNo"), "#", t("fbTube"), t("fbColor"), t("fbUse"), t("fbA"), t("fbB"), t("fbSvc"), t("f_notes")], rows), "csv", "text/csv"); }
APPS.fiber.init = () => { dgWire(cfg); wireCampus(); };
window.FIBER = {budget, fbOf, FAPPS};
})();
