/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Summary: every device, piece of equipment and accessory of the building in one place — list, counts, models,
// where it is, brand / model, IP, MAC, VLAN, serial, what it is cabled to — editable right here (same data as every
// other app, so a change here is a change everywhere), with what is still missing and a jump to the app that fixes it.
"use strict";
(function(){
const CATS = ["net","wifi","cctv","compute","end","passive","fiber","power","rackacc"];
const catOf = d => (KINDS[d.kind] || KINDS.other).cat || "end";
const NO_IP = new Set(["outlet","pp","fpp","splice","cablemgr","brush","blank","vent","shelf","fan","pdu","monitor","videowall","sensor","tv","internet","mediaconv","poeinj"]);
const needsIp = d => !NO_IP.has(d.kind) && !(KINDS[d.kind] || {}).passive && !(KINDS[d.kind] || {}).acc;
const isAcc = d => !!(KINDS[d.kind] || {}).acc;
const st = () => { UI.sm = UI.sm || {q:"", cat:"", status:"", floor:"", miss:false, acc:false, sort:"name", dir:1}; return UI.sm; };
const up = (b, d) => window.PM ? PM.upstream(b, d) : {};
const linksOf = (b, d) => b.links.filter(l => l.a.d === d.id || l.b.d === d.id);
const onPlan = d => window.BLD ? !!BLD.posOf(d) : false;
/* ---------- what is missing for a device (each with the app that fixes it) ---------- */
// d.na = {field:1} marks data the user declared "not applicable" ("-"): never reported as missing.
const NAK = {model:["brand","model"], ip:["ip"], mac:["mac"], loc:["floor"], room:["room"], rack:["rack"], plan:["plan"], cable:["cable"], nvr:["nvr"]};
const naOf = d => d.na || {}, isNa = (d, k) => (NAK[k] || [k]).some(f => naOf(d)[f]);
const camOut = d => d.kind === "camera" && d.camera && d.camera.loc === "out";
function gaps(b, d){
  const G = [], K = KINDS[d.kind] || KINDS.other;
  if (isAcc(d)) return G;
  if (!d.brand && !d.model && d.kind !== "outlet") G.push(["model", "sm_gModel", "here"]);
  if (needsIp(d) && !d.ip) G.push(["ip", "sm_gIp", "here"]);
  if (needsIp(d) && !d.mac && ["end","wifi","cctv","compute"].includes(K.cat)) G.push(["mac", "sm_gMac", "here"]);
  if (!d.floor && !d.rack) G.push(["loc", "sm_gLoc", "here"]);
  else if (!d.room && !d.rack && !camOut(d) && ["end","wifi","cctv","passive"].includes(K.cat)) G.push(["room", "sm_gRoom", "here"]);
  if (K.rack && !d.rack && !["ups","pdu"].includes(d.kind) && !(d.kind === "nvr" || d.kind === "dvr") ) G.push(["rack", "sm_gRack", "rack"]);
  if ((d.kind === "ap" || d.kind === "camera" || d.kind === "outlet") && !onPlan(d)) G.push(["plan", "sm_gPlan", d.kind === "ap" ? "wifi" : d.kind === "camera" ? "cctv" : "building"]);
  if (num(d.ports) > 0 && !K.passive && d.kind !== "internet" && !linksOf(b, d).length) G.push(["cable", "sm_gCable", "portmap"]);
  if (d.kind === "camera" && !(d.nvrs || []).length && b.devices.filter(x => x.kind === "nvr" || x.kind === "dvr").length !== 1) G.push(["nvr", "sm_gNvr", "cctv"]);
  return G.filter(g => !isNa(d, g[0]));
}
function setNa(d, f, on){ if (on){ d.na = Object.assign({}, d.na, {[f]:1}); } else if (d.na){ delete d.na[f]; if (!Object.keys(d.na).length) delete d.na; } }
/* ---------- going to the app that shows / fixes a device ---------- */
function go(app, id){
  const b = B(), d = devById(b, id); if (!d) return;
  if (app === "portmap"){ const u = up(b, d); UI.tabs.portmap = "ports"; switchApp("portmap"); UI.sel = u.sw && u.p && d.kind !== "switch" && d.kind !== "coresw" ? {type:"port", id:u.sw.id, p:String(u.p)} : {type:"dev", id}; render(); if (APPS.portmap.reveal) APPS.portmap.reveal({type:"dev", id:u.sw && d.kind !== "switch" ? u.sw.id : id}); return; }
  if (app === "rack"){ UI.tabs.rack = "rack"; if (d.rack) UI.rackSel = d.rack; }
  if (app === "cctv") UI.tabs.cctv = window.BLD && BLD.posOf(d) || d.kind === "camera" ? "plan" : "cams";
  if (app === "building") UI.tabs.building = "plan";
  if (app === "topology") UI.tabs.topology = "map";
  switchApp(app); UI.sel = {type:"dev", id}; render(); const a = APPS[app]; if (a && a.reveal) a.reveal(UI.sel);
}
const APPICO = {building:"🏢", portmap:"🔌", rack:"🗄", cctv:"📷", wifi:"📶", topology:"🕸"};
function appsFor(b, d){ const A = ["topology"];
  if (d.floor || onPlan(d)) A.unshift("building");
  if (!isAcc(d) && (num(d.ports) > 0 || linksOf(b, d).length)) A.push("portmap");
  if (d.rack || (KINDS[d.kind] || {}).rack) A.push("rack");
  if (["camera","nvr","dvr","monitor","videowall"].includes(d.kind)) A.push("cctv");
  if (d.kind === "ap") A.push("wifi");
  return A; }
/* ---------- the list ---------- */
function rows(b){
  const S = st(), q = nameKey(S.q || "");
  let L = b.devices.filter(d => (S.acc || !isAcc(d)) && (!S.cat || catOf(d) === S.cat) && (!S.status || d.status === S.status) && (!S.floor || (S.floor === "__none" ? !d.floor : d.floor === S.floor)));
  if (q) L = L.filter(d => nameKey([d.name, kindName(d.kind), d.brand, d.model, d.ip, d.mac, d.serial, floorName(b, d.floor), roomName(b, d.room), d.notes].join(" ")).includes(q));
  if (S.miss) L = L.filter(d => gaps(b, d).length);
  const key = {name:d => devLabel(d), kind:d => kindName(d.kind), brand:d => [d.brand, d.model].join(" "), status:d => d.status, floor:d => floorName(b, d.floor) + " " + roomName(b, d.room), ip:d => d.ip ? String(IP.host(d.ip) ?? d.ip).padStart(12, "0") : "~", mac:d => d.mac || "~", vlan:d => (vlanById(b, d.vlan) || {}).vid || "~", serial:d => d.serial || "~", gaps:d => -gaps(b, d).length}[S.sort] || (d => devLabel(d));
  return L.sort((x, y) => String(key(x)).localeCompare(String(key(y)), undefined, {numeric:true}) * S.dir);
}
const inp = (d, k, v, attrs = "") => `<input data-sm="${d.id}:${k}" value="${esc(naOf(d)[k] ? "-" : v || "")}"${naOf(d)[k] ? ` class="na" title="${esc(t("naT"))}"` : ""}${attrs}>`;
const NAO = (d, f) => `<option value="__na"${naOf(d)[f] ? " selected" : ""}>– ${esc(t("naOpt"))}</option>`;
function listView(){
  const b = B(), S = st(), L = rows(b), all = b.devices.filter(d => !isAcc(d)), gN = all.filter(d => gaps(b, d).length).length;
  const th = (k, l) => `<th class="sortable${S.sort === k ? " on" : ""}" data-smsort="${k}">${esc(l)}${S.sort === k ? (S.dir > 0 ? " ▲" : " ▼") : ""}</th>`;
  const kpi = [[all.length, t("sm_devs")], [all.filter(d => d.status === "planned").length, t("st_planned")], [b.racks.length, "Rack"], [b.links.length, t("sm_cables")], [b.vlans.length, "VLAN"], [gN, t("sm_withGaps")]];
  return `<div class="kpis">${kpi.map(([v, l], i) => `<div class="kpi${i === 5 && v ? " bad" : ""}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    <div class="smbar">${searchBox("q-sm")}
      <select data-smf="cat">${opt("", t("sm_allCats"), S.cat)}${CATS.filter(c => b.devices.some(d => catOf(d) === c)).map(c => opt(c, t("sm_cat_" + c), S.cat)).join("")}</select>
      <select data-smf="status">${opt("", t("sm_allStatus"), S.status)}${STATUSES.map(s => opt(s, t("st_" + s), S.status)).join("")}</select>
      <select data-smf="floor">${opt("", t("sm_allFloors"), S.floor)}${b.floors.slice().reverse().map(f => opt(f.id, f.name, S.floor)).join("")}${opt("__none", t("sm_noFloor"), S.floor)}</select>
      <label class="chk"><input type="checkbox" data-smf="miss"${S.miss ? " checked" : ""}> ⚠ ${esc(t("sm_onlyGaps"))}</label>
      <label class="chk"><input type="checkbox" data-smf="acc"${S.acc ? " checked" : ""}> ${esc(t("sm_showAcc"))}</label>
      <span class="grow"></span><span class="muted small">${L.length} / ${b.devices.length}</span></div>
    ${L.length ? `<div class="scroll smwrap"><table class="t smt"><thead><tr><th></th>${th("name", t("f_name"))}${th("kind", t("f_kind"))}${th("brand", t("f_brand") + " / " + t("f_model"))}${th("status", t("f_status"))}${th("floor", t("f_floor") + " / " + t("f_room"))}<th>${esc(t("sm_where"))}</th>${th("ip", "IP")}${th("mac", "MAC")}${th("vlan", "VLAN")}${th("serial", t("f_serial"))}<th>${esc(t("sm_conn"))}</th>${th("gaps", "⚠")}<th>${esc(t("sm_apps"))}</th><th title="${esc(t("delete"))}">🗑</th></tr></thead><tbody>
      ${L.map(d => { const G = gaps(b, d), gk = new Set(G.map(g => g[0])), u = up(b, d), lk = linksOf(b, d), mc = k => gk.has(k) ? ' class="miss"' : "";
        const where = [d.rack ? `🗄 ${(rackById(b, d.rack) || {}).name} U${d.u}${devH(d) > 1 ? "–" + topU(d) : ""}` : "", onPlan(d) ? "📍" : ""].filter(Boolean).join(" ");
        const conn = u.sw ? `${devLabel(u.sw)}:${u.p}` : lk.length ? lk.map(l => { const o = devById(b, l.a.d === d.id ? l.b.d : l.a.d); return o ? devLabel(o) : "?"; }).slice(0, 2).join(", ") + (lk.length > 2 ? " +" + (lk.length - 2) : "") : "";
        return `<tr class="${UI.sel && UI.sel.id === d.id ? "on" : ""}${d.status === "planned" ? " planned" : ""}"><td class="c"><button class="btn small ghost" data-sel="dev:${d.id}" title="${esc(t("sm_open"))}"><svg viewBox="0 0 48 48" width="18" height="18">${ICO[devIcon(d)] || ICO.box}</svg></button></td>
          <td>${inp(d, "name", d.name, ' style="width:150px"')}</td><td class="small nw">${esc(kindName(d.kind))}</td>
          <td${mc("model")}>${inp(d, "brand", d.brand, ` list="dl-brands" placeholder="${esc(t("f_brand"))}" style="width:90px"`)} ${inp(d, "model", d.model, ` list="dl-m-${d.kind}" placeholder="${esc(t("f_model"))}" style="width:110px"`)}</td>
          <td><select data-sm="${d.id}:status">${STATUSES.map(s => opt(s, t("st_" + s), d.status)).join("")}</select></td>
          <td${mc("loc") || mc("room")}><select data-sm="${d.id}:floor">${opt("", "—", naOf(d).floor ? "x" : d.floor)}${NAO(d, "floor")}${b.floors.slice().reverse().map(f => opt(f.id, f.name, d.floor)).join("")}</select> <select data-sm="${d.id}:room">${opt("", "—", naOf(d).room ? "x" : d.room)}${NAO(d, "room")}${b.rooms.filter(r => !d.floor || r.floor === d.floor).map(r => opt(r.id, r.name, d.room)).join("")}</select></td>
          <td class="small nw${gk.has("rack") || gk.has("plan") ? " miss" : ""}">${esc(where) || "—"}</td>
          <td${mc("ip")}>${needsIp(d) || d.ip || naOf(d).ip ? inp(d, "ip", d.ip, ' data-mask="ip" inputmode="decimal" style="width:118px"') : `<span class="muted">—</span>`}</td>
          <td${mc("mac")}>${needsIp(d) || d.mac || naOf(d).mac ? inp(d, "mac", d.mac, ' data-mask="mac" style="width:128px" class="mono"') : `<span class="muted">—</span>`}</td>
          <td><select data-sm="${d.id}:vlan">${naOf(d).vlan ? vlanOpts(b, "", false).replace(/ selected/g, "") : vlanOpts(b, d.vlan, false)}${NAO(d, "vlan")}</select></td>
          <td>${inp(d, "serial", d.serial, ' placeholder="—" style="width:110px"')}</td>
          <td class="small${gk.has("cable") ? " miss" : ""}">${esc(conn) || "—"}${gk.has("nvr") ? ` <span class="bad">· ${esc(t("sm_gNvr"))}</span>` : ""}</td>
          <td class="c">${G.length ? `<span class="gapn" title="${esc(G.map(g => t(g[1])).join(" · "))}">${G.length}</span>` : `<span class="okc">✓</span>`}</td>
          <td class="nw">${appsFor(b, d).map(a => `<button class="btn small ghost" data-smgo="${a}:${d.id}" title="${esc(t(APPS[a].name))}">${APPICO[a]}</button>`).join("")}</td>
          <td class="c"><button type="button" class="epdel" data-smdel="${d.id}" title="${esc(t("delete"))}">−</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty"><p>${esc(t("invEmpty"))}</p></div>`}
    ${[...new Set(L.map(d => d.kind))].map(k => modelList(k, "").replace('id="dl-models"', `id="dl-m-${k}"`)).join("")}
    <p class="muted small">${esc(t("sm_hint"))}</p>`;
}
/* ---------- counts and models (bill of materials) ---------- */
function bomData(b, inclAcc){
  const M = {}; b.devices.forEach(d => { if (!inclAcc && isAcc(d)) return; const k = d.kind + "|" + (d.brand || "") + "|" + (d.model || ""); const o = M[k] = M[k] || {kind:d.kind, brand:d.brand || "", model:d.model || "", n:0, st:{}, fl:new Set()}; o.n++; o.st[d.status] = (o.st[d.status] || 0) + 1; o.fl.add(floorName(b, d.floor) || (d.rack ? (rackById(b, d.rack) || {}).name : "") || "—"); });
  return Object.values(M).sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || y.n - x.n);
}
function bomView(print){
  const b = B(), L = bomData(b, true), byKind = {}; L.forEach(o => { byKind[o.kind] = (byKind[o.kind] || 0) + o.n; });
  const fl = b.floors.slice().reverse(), topK = Object.keys(byKind).filter(k => !(KINDS[k] || {}).acc).sort((x, y) => byKind[y] - byKind[x]).slice(0, 10);
  return `<div class="card"><h3>📦 ${esc(t("sm_bom"))}${print ? "" : `<span class="grow"></span><button class="btn small" data-smx="bom">⤓ CSV</button>`}</h3><p class="muted small">${esc(t("sm_bomH"))}</p>
    <div class="scroll"><table class="t"><tr><th>${esc(t("f_kind"))}</th><th>${esc(t("f_brand"))}</th><th>${esc(t("f_model"))}</th><th>${esc(t("sm_qty"))}</th><th>${esc(t("st_installed"))}</th><th>${esc(t("st_planned"))}</th><th>${esc(t("sm_other"))}</th><th>${esc(t("sm_where"))}</th></tr>
    ${L.map(o => `<tr${isAcc({kind:o.kind}) ? ' class="muted"' : ""}><td class="nw"><svg viewBox="0 0 48 48" width="16" height="16">${ICO[(KINDS[o.kind] || KINDS.other).icon] || ICO.box}</svg> ${esc(kindName(o.kind))}</td><td>${esc(o.brand) || `<span class="muted">—</span>`}</td><td>${esc(o.model) || `<span class="muted">${esc(t("sm_noModel"))}</span>`}</td><td class="c"><b>${o.n}</b></td><td class="c">${(o.st.installed || 0) + (o.st.active || 0) || ""}</td><td class="c">${o.st.planned || ""}</td><td class="c">${(o.st.faulty || 0) + (o.st.maintenance || 0) + (o.st.removed || 0) || ""}</td><td class="small">${esc([...o.fl].join(", "))}</td></tr>`).join("")}
    <tr class="tot"><td colspan="3">${esc(t("total"))}</td><td class="c">${b.devices.length}</td><td colspan="4"></td></tr></table></div></div>
    ${fl.length && topK.length ? `<div class="card"><h3>🏬 ${esc(t("sm_perFloor"))}</h3><div class="scroll"><table class="t"><tr><th>${esc(t("f_floor"))}</th>${topK.map(k => `<th title="${esc(kindName(k))}"><svg viewBox="0 0 48 48" width="16" height="16">${ICO[(KINDS[k] || KINDS.other).icon] || ICO.box}</svg></th>`).join("")}<th>${esc(t("total"))}</th></tr>
      ${[...fl.map(f => [f.name, b.devices.filter(d => d.floor === f.id)]), [t("sm_noFloor"), b.devices.filter(d => !d.floor)]].map(([n, D]) => `<tr><td>${esc(n)}</td>${topK.map(k => `<td class="c">${D.filter(d => d.kind === k).length || ""}</td>`).join("")}<td class="c"><b>${D.filter(d => !isAcc(d)).length}</b></td></tr>`).join("")}</table></div><p class="muted small">${topK.map(k => kindName(k)).join(" · ")}</p></div>` : ""}
    <div class="card"><h3>🗄 ${esc(t("sm_infra"))}</h3><div class="kpis">${[[b.floors.length, t("floors")], [b.rooms.length, t("rooms")], [b.racks.length, "Rack"], [b.racks.reduce((a, r) => a + r.u, 0) + " U", t("sm_rackU")], [b.links.length, t("sm_cables")], [r1(b.links.reduce((a, l) => a + num(l.len), 0)) + " m", t("sm_cableLen")], [b.vlans.length, "VLAN"]].map(([v, l]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div></div>`;
}
/* ---------- what is missing ---------- */
function gapsView(){
  const b = B(), L = b.devices.map(d => [d, gaps(b, d)]).filter(x => x[1].length), C = {};
  L.forEach(([, G]) => G.forEach(g => { C[g[0]] = (C[g[0]] || 0) + 1; }));
  const W = commonWarnings(b).filter(w => w[0] === "err");
  return `${W.length ? warnBox(W) : ""}<div class="card"><h3>⚠ ${esc(t("sm_gapsT"))} <span class="cnt">${L.length}</span></h3><p class="muted small">${esc(t("sm_gapsH"))}</p>
    <div class="smchips">${Object.entries(C).map(([k, n]) => `<span class="pill">${esc(t({model:"sm_gModel", ip:"sm_gIp", mac:"sm_gMac", loc:"sm_gLoc", room:"sm_gRoom", rack:"sm_gRack", plan:"sm_gPlan", cable:"sm_gCable", nvr:"sm_gNvr"}[k]))}: <b>${n}</b></span>`).join("")}</div>
    ${L.length ? `<div class="scroll"><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_kind"))}</th><th>${esc(t("f_floor"))}</th><th>${esc(t("sm_missing"))}</th></tr>
      ${L.map(([d, G]) => `<tr><td><button class="lnkb" data-sel="dev:${d.id}">${esc(devLabel(d))}</button></td><td class="small">${esc(kindName(d.kind))}</td><td class="small">${esc([floorName(b, d.floor), roomName(b, d.room)].filter(Boolean).join(" · ") || "—")}</td>
        <td>${G.map(g => `<span class="gapw">` + (g[2] === "here" ? `<button class="gapb" data-sel="dev:${d.id}">${esc(t(g[1]))} ✎</button>` : `<button class="gapb go" data-smgo="${g[2]}:${d.id}">${esc(t(g[1]))} → ${APPICO[g[2]]} ${esc(t(APPS[g[2]].name))}</button>`) + `<button class="gapna" data-smna="${d.id}:${g[0]}" title="${esc(t("naT"))}">–</button></span>`).join("")}</td></tr>`).join("")}</table></div>` : `<p class="okc">✓ ${esc(t("sm_noGaps"))}</p>`}${(() => { const n = b.devices.filter(d => d.na && Object.keys(d.na).length).length; return n ? `<p class="muted small">– ${esc(t("naCount", {n}))} <button class="btn small ghost" data-smnaclr="1">↺ ${esc(t("naClr"))}</button></p>` : ""; })()}</div>`;
}
/* ---------- floors (and their rooms): edit, order, add, delete — no drawing needed ---------- */
const RTYPES = ["office","meeting","server","corridor","lobby","kitchen","wc","storage","technical","other"];
function floorsView(){
  const b = B(), F = b.floors.slice().reverse(), devOn = f => b.devices.filter(d => !isAcc(d) && (d.floor === f.id || (d.room && (roomById(b, d.room) || {}).floor === f.id)));
  const cnt = (L, ks) => L.filter(d => ks.includes(d.kind)).length, open = UI.smOpen = UI.smOpen || {};
  return `<div class="card"><h3>🏬 ${esc(t("sm_floorsT"))} <span class="cnt">${b.floors.length}</span><span class="grow"></span><button class="btn small pri" data-smfa="addFloor">＋ ${esc(t("floorNew"))}</button></h3><p class="muted small">${esc(t("sm_floorsH"))}</p>
    ${F.length ? `<div class="scroll"><table class="t smf"><tr><th></th><th>${esc(t("f_floor"))}</th><th>${esc(t("bd_fh"))} (m)</th><th>${esc(t("sm_size"))} (m)</th><th>${esc(t("rooms"))}</th><th>${esc(t("sm_devs"))}</th><th>Rack</th><th title="${esc(kindName("outlet"))}">${ICO.outlet ? `<svg viewBox="0 0 48 48" width="16" height="16">${ICO.outlet}</svg>` : "D"}</th><th title="${esc(kindName("ap"))}"><svg viewBox="0 0 48 48" width="16" height="16">${ICO.ap}</svg></th><th title="${esc(kindName("camera"))}"><svg viewBox="0 0 48 48" width="16" height="16">${ICO.turret}</svg></th><th>${esc(t("sm_plan"))}</th><th></th></tr>
      ${F.map(f => { const i = b.floors.indexOf(f), L = devOn(f), R = b.rooms.filter(r => r.floor === f.id), p = f.plan || {};
        return `<tr><td class="nw"><button class="btn small ghost" data-smfa="up:${f.id}"${i === b.floors.length - 1 ? " disabled" : ""} title="${esc(t("bd_up"))}">▲</button><button class="btn small ghost" data-smfa="down:${f.id}"${i === 0 ? " disabled" : ""} title="${esc(t("bd_down"))}">▼</button></td>
          <td><input data-smfl="${f.id}:name" value="${esc(f.name)}" style="width:170px"></td><td><input data-smfl="${f.id}:h" value="${esc(f.h || 3.2)}" inputmode="decimal" style="width:60px"></td>
          <td class="nw"><input data-smfl="${f.id}:wm" value="${esc(r1(num(p.wm)))}" inputmode="decimal" style="width:58px"> × <input data-smfl="${f.id}:hm" value="${esc(r1(num(p.hm)))}" inputmode="decimal" style="width:58px"></td>
          <td class="c"><button class="lnkb" data-smfa="rooms:${f.id}">${R.length} ${open[f.id] ? "▴" : "▾"}</button></td><td class="c"><b>${L.length}</b></td><td class="c">${b.racks.filter(r => r.floor === f.id).length || ""}</td>
          <td class="c">${cnt(L, ["outlet"]) || ""}</td><td class="c">${cnt(L, ["ap"]) || ""}</td><td class="c">${cnt(L, ["camera"]) || ""}</td>
          <td class="c">${p.img ? "🖼" : "—"}</td>
          <td class="nw"><button class="btn small ghost" data-smfa="plan:${f.id}" title="${esc(t("bd_openPlan"))}">🏢</button><button type="button" class="epdel" data-smfa="del:${f.id}" title="${esc(t("delete"))}">−</button></td></tr>
          ${open[f.id] ? `<tr class="smrooms"><td></td><td colspan="11"><table class="t"><tr><th>${esc(t("f_room"))}</th><th>${esc(t("bd_type"))}</th><th>👤</th><th>${esc(t("sm_devs"))}</th><th></th></tr>
            ${R.map(r => `<tr><td><input data-smrm="${r.id}:name" value="${esc(r.name)}" style="width:180px"></td><td><select data-smrm="${r.id}:type">${RTYPES.map(k => opt(k, t("rt_" + k), r.type || "office")).join("")}</select></td><td><input data-smrm="${r.id}:users" value="${esc(num(r.users) || "")}" inputmode="numeric" style="width:50px"></td><td class="c">${b.devices.filter(d => d.room === r.id).length || ""}</td><td><button type="button" class="epdel" data-smfa="delRoom:${r.id}" title="${esc(t("delete"))}">−</button></td></tr>`).join("")}
            <tr><td colspan="5"><button class="btn small" data-smfa="addRoom:${f.id}">＋ ${esc(t("roomNew"))}</button></td></tr></table></td></tr>` : ""}`; }).join("")}
      <tr class="tot"><td></td><td>${esc(t("total"))}</td><td></td><td></td><td class="c">${b.rooms.length}</td><td class="c">${b.devices.filter(d => !isAcc(d)).length}</td><td class="c">${b.racks.length}</td><td colspan="5"></td></tr></table></div>` : `<div class="empty"><p>${esc(t("bd_emptyT"))}</p></div>`}</div>`;
}
async function floorAct(k){
  const b = B(), [a, id] = k.split(":"), f = id && floorById(b, id);
  if (a === "addFloor"){ const n = await uiPrompt(t("floorNew"), t("floorN",{n:b.floors.length + 1})); if (n === null) return; return edit(() => { const nf = {id:uid("f"), name:n.trim() || t("floorN",{n:b.floors.length + 1}), lvl:b.floors.length, h:3.2}; b.floors.push(nf); normBuilding(b); const pv = b.floors[b.floors.length - 2]; if (pv && pv.plan){ nf.plan.wm = pv.plan.wm; nf.plan.hm = pv.plan.hm; } }); }
  if (a === "rooms"){ UI.smOpen = UI.smOpen || {}; UI.smOpen[id] = !UI.smOpen[id]; return render(); }
  if (a === "plan"){ UI.tabs.building = "plan"; switchApp("building"); UI.bld = UI.bld || {labels:true, grid:true}; UI.bld.floor = id; UI.sel = {type:"bfloor", id}; return render(); }
  if (a === "up" || a === "down"){ const i = b.floors.indexOf(f), j = a === "up" ? i + 1 : i - 1; if (j < 0 || j >= b.floors.length) return; return edit(() => { [b.floors[i], b.floors[j]] = [b.floors[j], b.floors[i]]; b.floors.forEach((x, n) => x.lvl = n); }); }
  if (a === "del" && f){ const R = b.rooms.filter(r => r.floor === f.id), D = b.devices.filter(d => d.floor === f.id);
    if (!await uiConfirm(t("bd_delFloorC",{f:f.name, r:R.length, d:D.length}), t("delete"), true)) return;
    return edit(() => { const rids = new Set(R.map(r => r.id)); b.rooms = b.rooms.filter(r => !rids.has(r.id));
      b.devices.forEach(d => { if (d.floor === f.id || rids.has(d.room)){ d.floor = ""; if (rids.has(d.room)) d.room = ""; if (d.kind === "ap" && d.ap){ d.ap.x = null; d.ap.y = null; } delete d.pos; } });
      b.racks.forEach(r => { if (r.floor === f.id){ r.floor = ""; r.room = ""; delete r.pos; } }); b.floors = b.floors.filter(x => x !== f); b.floors.forEach((x, n) => x.lvl = n); }); }
  if (a === "addRoom" && f){ UI.smOpen = UI.smOpen || {}; UI.smOpen[f.id] = true; const n = await uiPrompt(t("roomNew"), t("roomN",{n:b.rooms.filter(r => r.floor === f.id).length + 1})); if (n === null) return render(); return edit(() => { b.rooms.push({id:uid("r"), name:n.trim() || t("roomN",{n:b.rooms.length + 1}), floor:f.id, users:0, wall:"drywall", type:"office", req:{}}); }); }
  if (a === "delRoom"){ const r = roomById(b, id); if (!r) return; const n = b.devices.filter(d => d.room === r.id).length;
    if (!await uiConfirm(t("sm_delRoomQ",{r:r.name, n}), t("delete"), true)) return;
    return edit(() => { b.devices.forEach(d => { if (d.room === r.id) d.room = ""; }); b.racks.forEach(k => { if (k.room === r.id) k.room = ""; }); b.rooms = b.rooms.filter(x => x !== r); }); }
}
/* ---------- editing in the table ---------- */
document.addEventListener("change", async e => {
  if (UI.app !== "summary") return; const el = e.target, b = B();
  if (el.dataset.smf){ const S = st(), k = el.dataset.smf; S[k] = el.type === "checkbox" ? el.checked : el.value; render(); return; }
  if (el.dataset.smfl){ const [id, k] = el.dataset.smfl.split(":"), f = floorById(b, id); if (!f) return; const v = el.value.trim();
    return edit(() => { if (k === "name") f.name = v || f.name; else if (k === "h") f.h = Math.max(2, num(v.replace(",", "."), f.h || 3.2)); else f.plan[k] = Math.max(2, num(v.replace(",", "."), f.plan[k])); }); }
  if (el.dataset.smrm){ const [id, k] = el.dataset.smrm.split(":"), r = roomById(b, id); if (!r) return; const v = el.value.trim();
    return edit(() => { if (k === "name") r.name = v || r.name; else if (k === "users") r.users = Math.max(0, Math.round(num(v, 0))); else r.type = v; }); }
  if (!el.dataset.sm) return; const [id, k] = el.dataset.sm.split(":"), d = devById(b, id); if (!d) return; let v = el.value.trim();
  // "-" (or the "not applicable" option) = this data does not apply to the device; it is no longer reported as missing
  if ((v === "-" || v === "—" || v === "–" || v === "__na") && k !== "name" && k !== "status") return edit(() => { setNa(d, k, true); if (k === "floor"){ d.floor = ""; d.room = ""; } else d[k] = ""; });
  if (naOf(d)[k]) edit(() => setNa(d, k, false));
  if (k === "name"){ if (!v){ render(); return; } if (nameTaken(b, v, d.id)){ await nameOk(b, v, d.id); render(); return; } }
  if (k === "ip" && v){ v = v.replace(/,/g, "."); if (!IP.valid(v)) toast("⚠ " + t("ipBad")); }
  if (k === "mac" && v && !macValid(v)) toast("⚠ " + t("macBad"));
  edit(() => { if (k === "floor"){ d.floor = v; if (d.room && (roomById(b, d.room) || {}).floor !== v) d.room = ""; }
    else if (k === "room"){ d.room = v; const r = roomById(b, v); if (r && r.floor) d.floor = r.floor; }
    else { d[k] = v; if ((k === "model" || k === "brand") && d.model && d.cat !== CAT.key(d)){ const r = catMatch(d); if (r) applySpec(d, r); else copyTwin(d); } } });
});
document.addEventListener("click", e => {
  if (UI.app !== "summary") return;
  const s = e.target.closest("[data-smsort]"); if (s){ const S = st(), k = s.dataset.smsort; if (S.sort === k) S.dir = -S.dir; else { S.sort = k; S.dir = k === "gaps" ? 1 : 1; } render(); return; }
  const del = e.target.closest("[data-smdel]"); if (del){ const b = B(), d = devById(b, del.dataset.smdel); if (d) delDeviceAsk(b, d); return; }
  const fa = e.target.closest("[data-smfa]"); if (fa){ floorAct(fa.dataset.smfa); return; }
  const na = e.target.closest("[data-smna]"); if (na){ const [id, k] = na.dataset.smna.split(":"), d = devById(B(), id); if (d){ const f = (NAK[k] || [k]).slice(-1)[0]; edit(() => setNa(d, f, true)); toast("– " + t("naDone")); } return; }
  if (e.target.closest("[data-smnaclr]")){ const b = B(), L = b.devices.filter(d => d.na); uiConfirm(t("naClrQ", {n:L.length})).then(ok => { if (ok) edit(() => L.forEach(d => { delete d.na; })); }); return; }
  const g = e.target.closest("[data-smgo]"); if (g){ const [a, id] = g.dataset.smgo.split(":"); go(a, id); return; }
  const x = e.target.closest("[data-smx]"); if (x){ if (x.dataset.smx === "bom") bomCsv(); else listCsv(); }
});
document.addEventListener("input", e => { if (UI.app === "summary" && e.target.id === "q-sm"){ st().q = e.target.value; clearTimeout(st().tm); st().tm = setTimeout(render, 250); } });
/* ---------- exports ---------- */
function listCsv(){ const b = B();
  saveText(`${fileSafe(b.name)} - ${t("app_summary")}.csv`, csvText([t("f_name"), t("f_kind"), t("f_brand"), t("f_model"), t("f_status"), t("f_floor"), t("f_room"), "Rack", "U", "IP", "MAC", "VLAN", t("f_serial"), t("sm_conn"), t("sm_missing"), t("f_notes")],
    b.devices.map(d => { const u = up(b, d); return [d.name, kindName(d.kind), d.brand, d.model, t("st_" + d.status), floorName(b, d.floor), roomName(b, d.room), d.rack ? (rackById(b, d.rack) || {}).name : "", d.u || "", d.ip, d.mac, (vlanById(b, d.vlan) || {}).vid || "", d.serial, u.sw ? devLabel(u.sw) + ":" + u.p : "", gaps(b, d).map(g => t(g[1])).join("; "), d.notes]; })), "csv", "text/csv"); }
function bomCsv(){ const b = B(); saveText(`${fileSafe(b.name)} - ${t("sm_bom")}.csv`, csvText([t("f_kind"), t("f_brand"), t("f_model"), t("sm_qty"), t("st_installed"), t("st_planned"), t("sm_where")], bomData(b, true).map(o => [kindName(o.kind), o.brand, o.model, o.n, (o.st.installed || 0) + (o.st.active || 0), o.st.planned || 0, [...o.fl].join(", ")])), "csv", "text/csv"); }
function docBody(b){
  const L = b.devices.filter(d => !isAcc(d)).sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  return bomView(true).replace(/<button[^>]*>.*?<\/button>/g, "") + `<h3>${esc(t("sm_devList"))}</h3><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_kind"))}</th><th>${esc(t("f_brand"))} / ${esc(t("f_model"))}</th><th>${esc(t("f_floor"))} / ${esc(t("f_room"))}</th><th>Rack</th><th>IP</th><th>MAC</th><th>VLAN</th><th>${esc(t("f_serial"))}</th><th>${esc(t("f_status"))}</th></tr>
    ${L.map(d => `<tr><td>${esc(devLabel(d))}</td><td>${esc(kindName(d.kind))}</td><td>${esc([d.brand, d.model].filter(Boolean).join(" "))}</td><td>${esc([floorName(b, d.floor), roomName(b, d.room)].filter(Boolean).join(" · "))}</td><td>${esc(d.rack ? (rackById(b, d.rack) || {}).name + " U" + d.u : "")}</td><td class="mono">${esc(d.ip)}</td><td class="mono">${esc(d.mac)}</td><td>${esc((vlanById(b, d.vlan) || {}).vid || "")}</td><td>${esc(d.serial)}</td><td>${esc(t("st_" + d.status))}</td></tr>`).join("")}</table>`;
}
registerApp({
  id:"summary", name:"app_summary", desc:"app_summary_d", docName:"doc_summary", color:"#0e7c86",
  glyph:`<rect x="11" y="9" width="26" height="31" rx="3" fill="#fff"/><path d="M16 17h16M16 23h16M16 29h10" stroke="#0e7c86" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="33" r="6" fill="#ffb703"/><path d="M30.5 33l2 2 3.5-4" stroke="#fff" stroke-width="2" fill="none"/>`,
  tabs:[
    {id:"list", label:"sm_tabList", icon:"📋", render:listView, tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:".smbar", title:t("sm_tT1"), text:t("sm_t1")}, {sel:".smt", title:t("sm_tT2"), text:t("sm_t2")}]},
    {id:"floors", label:"sm_tabFloors", icon:"🏬", render:floorsView},
    {id:"bom", label:"sm_tabBom", icon:"📦", render:() => bomView(false)},
    {id:"gaps", label:"sm_tabGaps", icon:"⚠", render:gapsView},
    docTab("summary", docBody)
  ],
  actions(){ return [{id:"timp", icon:"⤓", label:"tiBtn", fn:() => TIMP.open()}, {id:"labels", icon:"🏷", label:"lbBtn", fn:() => LABELS.open("devices")}, {id:"csv", icon:"⤒", label:"sm_csv", fn:listCsv}, {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; },
  drawer(){ const b = B(), s = UI.sel; if (!s) return ""; if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d) : ""; } if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; } return ""; },
  exports(){ return [{icon:"▦", label:t("app_summary") + " (CSV)", fn:listCsv}, {icon:"▦", label:t("sm_bom") + " (CSV)", fn:bomCsv}]; },
  reveal(s){ if (s && s.type === "dev"){ UI.tabs.summary = "list"; render(); } },
  guide:() => [[t("sm_g1h"), t("sm_g1")], [t("sm_g2h"), t("sm_g2")], [t("sm_g3h"), t("sm_g3")]]
});
window.SUM = {gaps};
})();
