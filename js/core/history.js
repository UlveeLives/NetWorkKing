/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Change history: every saved change of the open project is compared with the state before it and written down line by
// line ("PC-01: IP 10.0.0.5 → 10.0.0.9", "＋ cable SW-01:5 ⇄ PP-01:5" …) with the time and the app it was made in.
// Kept on this device per project (not inside the project file, so undo / versions stay small); newest 1500 entries.
"use strict";
const HIST = (function(){
let base = null, baseId = null, timer = null;
const FIELDS = ["name", "kind", "brand", "model", "status", "host", "ip", "mac", "serial", "asset", "fw", "owner", "notes", "ports", "rack", "u", "floor", "room", "vlan"];
const keyOf = arr => Object.fromEntries((arr || []).map(x => [x.id, x]));
function diff(A, Bp){
  const out = [], bl = (x, b) => x === undefined || x === null || x === "" ? "—" : String(x);
  const bA = keyOf(A.buildings), bB = keyOf(Bp.buildings);
  Object.values(bB).forEach(b => { const a = bA[b.id]; if (!a){ out.push("＋ " + t("hBld") + " " + b.name); return; }
    if (a.name !== b.name) out.push(`${t("hBld")}: ${a.name} → ${b.name}`);
    const nm = (bb, id, kind) => { const x = (bb[kind] || []).find(o => o.id === id); return x ? x.name || x.vid || id : ""; };
    const dev = (bb, id) => { const d = (bb.devices || []).find(o => o.id === id); return d ? d.name || kindName(d.kind) : "?"; };
    const val = (bb, k, v) => k === "floor" ? nm(bb, v, "floors") : k === "room" ? nm(bb, v, "rooms") : k === "rack" ? nm(bb, v, "racks") : k === "vlan" ? nm(bb, v, "vlans") : k === "kind" ? kindName(v) : k === "status" ? t("st_" + v) : v;
    const dA = keyOf(a.devices), dB = keyOf(b.devices);
    Object.values(dB).forEach(d => { const o = dA[d.id]; if (!o){ out.push(`＋ ${kindName(d.kind)} ${d.name || ""}`.trim()); return; }
      FIELDS.forEach(k => { if (String(o[k] ?? "") !== String(d[k] ?? "")) out.push(`${d.name || o.name}: ${t("hf_" + k) === "hf_" + k ? k : t("hf_" + k)} ${bl(val(a, k, o[k]))} → ${bl(val(b, k, d[k]))}`); });
      const pc = JSON.stringify(o.pcfg || {}) !== JSON.stringify(d.pcfg || {}); if (pc){ const ks = new Set([...Object.keys(o.pcfg || {}), ...Object.keys(d.pcfg || {})]); const ch = [...ks].filter(p => JSON.stringify((o.pcfg || {})[p]) !== JSON.stringify((d.pcfg || {})[p])); out.push(`${d.name}: ${t("hPorts")} ${ch.slice(0, 12).join(", ")}${ch.length > 12 ? " …" : ""}`); }
      if (JSON.stringify(o.params || {}) !== JSON.stringify(d.params || {})) out.push(`${d.name}: ${t("hParams")}`); });
    Object.values(dA).forEach(o => { if (!dB[o.id]) out.push(`− ${kindName(o.kind)} ${o.name || ""}`.trim()); });
    const lk = (bb, l) => `${dev(bb, l.a.d)}${l.a.p ? ":" + l.a.p : ""} ⇄ ${dev(bb, l.b.d)}${l.b.p ? ":" + l.b.p : ""}`;
    const lA = keyOf(a.links), lB = keyOf(b.links);
    Object.values(lB).forEach(l => { const o = lA[l.id]; if (!o) out.push(`＋ ${t("hCable")} ${lk(b, l)}`); else if (o.a.d !== l.a.d || o.b.d !== l.b.d || o.a.p !== l.a.p || o.b.p !== l.b.p) out.push(`${t("hCable")}: ${lk(a, o)} → ${lk(b, l)}`); else if (o.cid !== l.cid || o.media !== l.media || String(o.len) !== String(l.len)) out.push(`${t("hCable")} ${lk(b, l)}: ${[o.cid !== l.cid && `${bl(o.cid)} → ${bl(l.cid)}`, o.media !== l.media && `${mediaName(o.media)} → ${mediaName(l.media)}`, String(o.len) !== String(l.len) && `${bl(o.len)} → ${bl(l.len)} m`].filter(Boolean).join(", ")}`); });
    Object.values(lA).forEach(o => { if (!lB[o.id]) out.push(`− ${t("hCable")} ${lk(a, o)}`); });
    [["floors", "hFloor"], ["rooms", "hRoom"], ["racks", "hRack"], ["vlans", "VLAN"]].forEach(([k, lab]) => { const X = keyOf(a[k]), Y = keyOf(b[k]), L = lab === "VLAN" ? "VLAN" : t(lab), n = o => o.vid ? o.vid + " " + o.name : o.name;
      Object.values(Y).forEach(o => { const p = X[o.id]; if (!p) out.push(`＋ ${L} ${n(o)}`); else if (n(p) !== n(o)) out.push(`${L}: ${n(p)} → ${n(o)}`); else if (k === "rooms" && JSON.stringify(p.geo) !== JSON.stringify(o.geo)) out.push(`${L} ${o.name}: ${t("hMoved")}`); else if (k === "floors" && JSON.stringify(p.plan) !== JSON.stringify(o.plan)) out.push(`${L} ${o.name}: ${t("hPlan")}`); });
      Object.values(X).forEach(o => { if (!Y[o.id]) out.push(`− ${L} ${n(o)}`); }); });
  });
  Object.values(bA).forEach(a => { if (!bB[a.id]) out.push("− " + t("hBld") + " " + a.name); });
  return out;
}
// called after every save request; compares a moment later, so a drag or typing is one entry
function note(){ clearTimeout(timer); timer = setTimeout(rec, 1200); }
function rec(){ try { const p = P(); if (!p) return; const now = JSON.stringify(p);
    if (baseId !== p.id || !base){ base = now; baseId = p.id; return; }
    if (now === base) return; const L = diff(JSON.parse(base), p); base = now; if (!L.length) return;
    store.hist = store.hist || {}; const H = store.hist[p.id] = store.hist[p.id] || [];
    const app = APPS[UI.app] ? t(APPS[UI.app].name) : "";
    H.push({t:Date.now(), app, l:L.slice(0, 60).concat(L.length > 60 ? ["… +" + (L.length - 60)] : [])});
    if (H.length > 1500) H.splice(0, H.length - 1500);
  } catch(e){ console.warn("history", e); } }
function reset(){ try { const p = P(); base = p ? JSON.stringify(p) : null; baseId = p ? p.id : null; } catch(e){ base = null; } }
function open(){
  const p = P(), H = ((store.hist || {})[p.id] || []).slice().reverse(); let q = "";
  const draw = () => { const qq = q.toLowerCase(), L = qq ? H.filter(h => h.l.some(x => x.toLowerCase().includes(qq)) || h.app.toLowerCase().includes(qq)) : H;
    $("#hist-l").innerHTML = L.length ? L.slice(0, 400).map(h => `<div class="hrow"><div class="hh"><b>${esc(new Date(h.t).toLocaleString())}</b> <small class="muted">${esc(h.app)}</small></div><ul>${h.l.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("") : `<p class="muted">${esc(t("hEmpty"))}</p>`; };
  modal(`<h3>📜 ${esc(t("hT"))} <small class="muted">${esc(p.name)}</small></h3><p class="muted small">${esc(t("hH"))}</p>
    <div class="row"><input id="hist-q" placeholder="🔍 ${esc(t("search"))}…"><span class="grow"></span><button class="btn small" data-m="csv">⤓ CSV</button></div>
    <div id="hist-l" class="scroll" style="max-height:58vh;margin-top:8px"></div>
    <div class="mfoot"><button class="btn dan" data-m="clear">🗑 ${esc(t("hClear"))}</button><span class="grow"></span><button class="btn" data-m="close">${esc(t("close"))}</button></div>`, {
    csv:() => saveText(`${fileSafe(p.name)} - ${t("hT")}.csv`, csvText([t("hTime"), t("hApp"), t("hChange")], H.flatMap(h => h.l.map(x => [new Date(h.t).toLocaleString(), h.app, x]))), "csv", "text/csv"),
    clear:async () => { if (!await uiConfirm(t("hClearQ"), t("delete"), true)) return; store.hist[p.id] = []; persist(); closeModal(); } }, {wide:true});
  $("#hist-q").addEventListener("input", e => { q = e.target.value; draw(); }); draw();
}
return {note, reset, diff, open};
})();
