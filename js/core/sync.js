/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// «Sync apps» (title bar): every app works on the same building data, but each one also keeps references of its own —
// a cable points at two devices and their ports, a device at its rack, U, floor, room and VLAN, a camera at its NVR, a
// port at a VLAN, a fibre cable at its strand table, a link between buildings at both buildings. This window
//   1) shows what changed since the last check, grouped by the apps it touches,
//   2) finds every place where the apps no longer agree (a «conflict») and says which apps are involved,
//   3) offers ways to fix each one (one Undo step per fix), plus «fix all with the recommended option».
"use strict";
const SYNC = (function(){
  const ALL_APPS = () => APP_ORDER.filter(a => APPS[a]);
  const appsOfDev = d => { if (!d) return []; const k = d.kind, A = new Set(["topology", "summary"]);
    const K = KINDS[k] || {}; if (K.rack) A.add("rack"); if (K.sw || ["pp","fpp","firewall","router","coresw"].includes(k)) A.add("portmap");
    const x = appForKind(k); if (x && APPS[x]) A.add(x); if (d.room || d.floor) A.add("building"); return [...A].filter(a => APPS[a]); };
  const appChip = a => APPS[a] ? `<span class="syapp" style="--c:${APPS[a].color}">${esc(t(APPS[a].name))}</span>` : "";
  const devName = (b, id) => { const d = devById(b, id); return d ? devLabel(d) : "?"; };
  const portsOf = d => Math.round(num(d && d.ports));
  /* ---------- 1. conflicts ---------- */
  function conflicts(b){
    const C = [], P0 = P();
    const add = (o) => C.push(o);
    const fix = (label, fn, rec) => ({label, fn, rec:!!rec});
    // cables whose device is gone
    b.links.forEach(l => { const miss = [l.a, l.b].filter(e => e.d && !devById(b, e.d));
      if (miss.length) add({sev:"err", apps:["topology","portmap","rack"], title:t("sy_linkGone"), text:t("sy_linkGoneT", {c:l.cid || linkText(b, l)}),
        fixes:[fix(t("sy_delCable"), () => { b.links = b.links.filter(x => x !== l); }, true)]}); });
    // two cables on one port (a patch panel's front and rear are separate sides, so panels may have two)
    const used = {};
    b.links.forEach(l => [l.a, l.b].forEach(e => { const d = devById(b, e.d), p = String(e.p || "").trim(); if (!d || !p) return; const K = KINDS[d.kind] || {}; if (K.passive) return;
      const k = d.id + "|" + p; (used[k] = used[k] || []).push(l); }));
    Object.entries(used).forEach(([k, L]) => { if (L.length < 2) return; const [id, p] = k.split("|"), d = devById(b, id);
      add({sev:"err", apps:["portmap","topology","rack"], dev:id, title:t("sy_portTwice"), text:t("sy_portTwiceT", {d:devLabel(d), p, n:L.length, c:L.map(l => l.cid || linkText(b, l)).join(" · ")}),
        fixes:[fix(t("sy_keepFirst"), () => { L.slice(1).forEach(l => { const e = l.a.d === id && String(l.a.p) === p ? l.a : l.b; e.p = ""; }); }, true),
               fix(t("sy_delOthers"), () => { const drop = new Set(L.slice(1)); b.links = b.links.filter(x => !drop.has(x)); })]}); });
    // port number bigger than the device has
    b.links.forEach(l => [l.a, l.b].forEach(e => { const d = devById(b, e.d), p = String(e.p || "").trim(); if (!d || !/^\d+$/.test(p)) return; const n = portsOf(d); if (!n || +p <= n) return;
      add({sev:"err", apps:["portmap","rack"], dev:d.id, title:t("sy_portRange"), text:t("sy_portRangeT", {d:devLabel(d), p, n}),
        fixes:[fix(t("sy_growPorts", {n:p}), () => { d.ports = +p; }, true), fix(t("sy_clearPort"), () => { e.p = ""; })]}); }));
    // devices and their rack
    b.devices.forEach(d => {
      if (d.rack && !rackById(b, d.rack)) add({sev:"err", apps:["rack","portmap"], dev:d.id, title:t("sy_rackGone"), text:t("sy_rackGoneT", {d:devLabel(d)}),
        fixes:[fix(t("sy_unrack"), () => { d.rack = ""; d.u = 0; }, true), ...(b.racks.length ? [fix(t("sy_toRack", {r:b.racks[0].name}), () => { const r = b.racks[0]; d.rack = r.id; d.u = rackSpot(b, r, devH(d), 0, d.id) || 0; })] : [])]});
      const r = d.rack && rackById(b, d.rack);
      if (r && d.u > 0 && d.u + devH(d) - 1 > r.u) add({sev:"err", apps:["rack"], dev:d.id, title:t("sy_uOut"), text:t("sy_uOutT", {d:devLabel(d), u:d.u, r:r.name, n:r.u}),
        fixes:[fix(t("sy_freeU"), () => { d.u = rackSpot(b, r, devH(d), 0, d.id) || 0; }, true), fix(t("sy_growRack", {n:d.u + devH(d) - 1}), () => { r.u = d.u + devH(d) - 1; })]});
      // floor / room / VLAN / NVR references
      const room = d.room && d.room !== "__later" && roomById(b, d.room);
      if (d.room && d.room !== "__later" && !room) add({sev:"", apps:appsOfDev(d), dev:d.id, title:t("sy_roomGone"), text:t("sy_roomGoneT", {d:devLabel(d)}), fixes:[fix(t("sy_clearRoom"), () => { d.room = ""; }, true)]});
      if (room && d.floor && d.floor !== "__later" && room.floor && room.floor !== d.floor) add({sev:"", apps:["building", ...appsOfDev(d)], dev:d.id, title:t("sy_floorRoom"), text:t("sy_floorRoomT", {d:devLabel(d), r:room.name, f:floorName(b, room.floor), g:floorName(b, d.floor)}),
        fixes:[fix(t("sy_floorByRoom"), () => { d.floor = room.floor; }, true), fix(t("sy_clearRoom"), () => { d.room = ""; })]});
      if (room && !d.floor && room.floor) add({sev:"info", apps:["building"], dev:d.id, title:t("sy_noFloor"), text:t("sy_noFloorT", {d:devLabel(d), f:floorName(b, room.floor)}), fixes:[fix(t("sy_floorByRoom"), () => { d.floor = room.floor; }, true)]});
      if (d.floor && d.floor !== "__later" && !b.floors.some(f => f.id === d.floor)) add({sev:"", apps:appsOfDev(d), dev:d.id, title:t("sy_floorGone"), text:t("sy_floorGoneT", {d:devLabel(d)}), fixes:[fix(t("sy_clearFloor"), () => { d.floor = ""; d.room = ""; }, true)]});
      if (d.vlan && !vlanById(b, d.vlan)) add({sev:"", apps:["topology","portmap"], dev:d.id, title:t("sy_vlanGone"), text:t("sy_vlanGoneT", {d:devLabel(d)}), fixes:[fix(t("sy_clearVlan"), () => { d.vlan = ""; }, true)]});
      if (d.nvr && !devById(b, d.nvr)) add({sev:"", apps:["cctv"], dev:d.id, title:t("sy_nvrGone"), text:t("sy_nvrGoneT", {d:devLabel(d)}), fixes:[fix(t("sy_clearNvr"), () => { d.nvr = ""; }, true)]});
      // port settings pointing at a VLAN that was deleted
      const bad = Object.entries(d.pcfg || {}).filter(([, c]) => c && ((c.vlan && !vlanById(b, c.vlan)) || (c.native && !vlanById(b, c.native))));
      if (bad.length) add({sev:"", apps:["portmap"], dev:d.id, title:t("sy_pvlanGone"), text:t("sy_pvlanGoneT", {d:devLabel(d), p:bad.map(x => x[0]).join(", ")}),
        fixes:[fix(t("sy_clearVlan"), () => { bad.forEach(([, c]) => { if (c.vlan && !vlanById(b, c.vlan)) c.vlan = ""; if (c.native && !vlanById(b, c.native)) c.native = ""; }); }, true)]});
    });
    // two devices on the same U of one rack (same side)
    b.racks.forEach(r => { const occ = {};
      rackDevices(b, r).forEach(d => { for (let u = d.u; u < d.u + devH(d); u++){ const k = u + "|" + (d.side || "front") + (num(d.params.depth) > 450 ? "" : ""); (occ[k] = occ[k] || new Set()).add(d); } });
      const pairs = new Map(); Object.values(occ).forEach(S => { if (S.size < 2) return; const L = [...S]; const key = L.map(x => x.id).sort().join("|"); pairs.set(key, L); });
      pairs.forEach(L => { const mv = L[L.length - 1];
        add({sev:"err", apps:["rack","portmap"], dev:mv.id, title:t("sy_uClash"), text:t("sy_uClashT", {r:r.name, d:L.map(devLabel).join(" ⇄ ")}),
          fixes:[fix(t("sy_moveFree", {d:devLabel(mv)}), () => { mv.u = rackSpot(b, r, devH(mv), 0, mv.id) || 0; if (!mv.u) mv.rack = ""; }, true), fix(t("sy_toRear", {d:devLabel(mv)}), () => { mv.side = mv.side === "rear" ? "front" : "rear"; })]}); }); });
    // fibre cables whose strand table does not match the core count
    b.links.forEach(l => { if (!l.fb || !Array.isArray(l.strands) || !l.strands.length) return; const n = Math.round(num(l.fb.cores)); if (!n || l.strands.length === n) return;
      add({sev:"", apps:["fiber"], title:t("sy_strands"), text:t("sy_strandsT", {c:l.fb.fno || linkText(b, l), a:l.strands.length, n}),
        fixes:[fix(t("sy_strFit", {n}), () => { const st = l.strands.slice(0, n); while (st.length < n) st.push({use:"spare", a:"", b:"", svc:"", note:""}); l.strands = st; }, true), fix(t("sy_coresFit", {n:l.strands.length}), () => { l.fb.cores = l.strands.length; })]}); });
    // links between buildings
    (P0.links || []).forEach(l => { const ba = P0.buildings.find(x => x.id === l.a.b), bb = P0.buildings.find(x => x.id === l.b.b);
      if (!ba || !bb) add({sev:"err", apps:["fiber"], title:t("sy_campusGone"), text:t("sy_campusGoneT", {c:l.cid || (l.fb && l.fb.fno) || "—"}), fixes:[fix(t("sy_delCable"), () => { P0.links = P0.links.filter(x => x !== l); }, true)]});
      else [[l.a, ba], [l.b, bb]].forEach(([e, bx]) => { if (e.d && !devById(bx, e.d)) add({sev:"", apps:["fiber"], title:t("sy_campusDev"), text:t("sy_campusDevT", {b:bx.name}), fixes:[fix(t("sy_clearEnd"), () => { e.d = ""; e.p = ""; }, true)]}); }); });
    // the same name twice (usually one device made twice in two apps)
    dupGroups(b).forEach(g => add({sev:"", apps:[...new Set(g.flatMap(appsOfDev))], dev:g[0].id, title:t("sy_dupName"), text:t("sy_dupNameT", {n:g[0].name, k:g.length, a:g.map(d => kindName(d.kind)).join(", ")}),
      fixes:[fix(t("sy_openDup"), () => "dup", true)]}));
    // devices made in other apps that are not on the network diagram yet (information only)
    const tv = view(b, "topology"), off = b.devices.filter(d => !tv.nodes[d.id] && !(KINDS[d.kind] || {}).acc && !(d.rack && tv.nodes[d.rack]));
    if (off.length) add({sev:"info", apps:["topology"], title:t("sy_offMap"), text:t("sy_offMapT", {n:off.length, d:off.slice(0, 6).map(devLabel).join(", ") + (off.length > 6 ? " …" : "")}),
      fixes:[fix(t("sy_placeAll"), () => { if (APPS.topology && APPS.topology.dg && typeof dgFloorLayout === "function") dgFloorLayout(APPS.topology.dg, true); }, false), fix(t("sy_later"), null, true)]});
    return C;
  }
  /* ---------- 2. what changed since the last check ---------- */
  const STRIP = new Set(["_t"]);
  const sig = o => { try { return JSON.stringify(o, (k, v) => STRIP.has(k) ? undefined : v); } catch(e){ return ""; } };
  function snapshot(b){ const S = {at:Date.now(), dev:{}, link:{}, rack:{}, vlan:{}, room:{}, floor:{}};
    b.devices.forEach(d => S.dev[d.id] = [devLabel(d), d.kind, sig(d)]); b.links.forEach(l => S.link[l.id] = [l.cid || linkText(b, l), l.media, sig(l)]);
    b.racks.forEach(r => S.rack[r.id] = [r.name, "", sig(r)]); b.vlans.forEach(v => S.vlan[v.id] = ["VLAN " + v.vid + (v.name ? " " + v.name : ""), "", sig(v)]);
    b.rooms.forEach(r => S.room[r.id] = [r.name, "", sig(r)]); b.floors.forEach(f => S.floor[f.id] = [f.name, "", sig(Object.assign({}, f, {plan:{walls:(f.plan || {}).walls, survey:(f.plan || {}).survey, cal:(f.plan || {}).cal}}))]);
    return S; }
  const fieldNames = {name:"f_name", kind:"f_kind", brand:"f_brand", model:"f_model", status:"f_status", floor:"f_floor", room:"f_room", rack:"f_rack", u:"f_u", side:"f_side", ip:"IP", mac:"MAC", vlan:"VLAN", ports:"f_ports", serial:"f_serial", host:"f_host", nvr:"NVR", pcfg:"sy_fPorts", params:"sy_fParams", camera:"camSec", ap:"AP", notes:"f_notes", mount:"f_mount", len:"f_len", cid:"f_cid", media:"f_media", a:"sy_fEnds", b:"sy_fEnds", fb:"fbCable", strands:"fbStrands"};
  const fname = k => { const x = fieldNames[k]; if (!x) return k; const s = t(x); return s === x ? x : s; };
  function diff(old, cur){
    const out = [];
    if (!old) return out;
    ["dev","link","rack","vlan","room","floor"].forEach(kind => { const A = old[kind] || {}, B = cur[kind];
      Object.keys(B).forEach(id => { if (!A[id]) out.push({kind, op:"add", id, name:B[id][0], sub:B[id][1]}); else if (A[id][2] !== B[id][2]){
        let keys = []; try { const x = JSON.parse(A[id][2]), y = JSON.parse(B[id][2]); keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])); } catch(e){}
        out.push({kind, op:"chg", id, name:B[id][0], sub:B[id][1], keys:[...new Set(keys.map(fname))]}); } });
      Object.keys(A).forEach(id => { if (!B[id]) out.push({kind, op:"del", id, name:A[id][0], sub:A[id][1]}); }); });
    return out;
  }
  const changeApps = (b, c) => c.kind === "dev" ? appsOfDev(devById(b, c.id) || {kind:c.sub}) : c.kind === "link" ? (["fiber_sm","fiber_mm","fpatch"].includes(c.sub) ? ["fiber","topology","portmap"] : ["topology","portmap","rack"]) :
    c.kind === "rack" ? ["rack","portmap","topology"] : c.kind === "vlan" ? ["topology","portmap","wifi"] : ["building","wifi","cctv","summary"];
  /* ---------- 3. the window ---------- */
  const store0 = () => { const b = B(); b.sync = b.sync && typeof b.sync === "object" ? b.sync : {}; return b.sync; };
  function open(){
    const b = B(), S = store0(), C = conflicts(b), cur = snapshot(b), D = diff(S.snap, cur);
    const sevIc = s => s === "err" ? "⛔" : s === "info" ? "ⓘ" : "⚠";
    const nErr = C.filter(c => c.sev !== "info").length;
    const kindIc = {dev:"🖥", link:"🔌", rack:"🗄", vlan:"🌐", room:"🚪", floor:"🏢"}, opIc = {add:"＋", chg:"✎", del:"−"};
    const byApp = {}; D.forEach(c => changeApps(b, c).forEach(a => (byApp[a] = byApp[a] || []).push(c)));
    const changes = !S.snap ? `<p class="muted small">${esc(t("sy_firstRun"))}</p>` : !D.length ? `<p class="small">✓ ${esc(t("sy_noChanges", {d:new Date(S.snap.at).toLocaleString(store.settings.lang)}))}</p>`
      : `<p class="small muted">${esc(t("sy_since", {d:new Date(S.snap.at).toLocaleString(store.settings.lang), a:D.filter(x => x.op === "add").length, c:D.filter(x => x.op === "chg").length, r:D.filter(x => x.op === "del").length}))}</p>
        <div class="sychg">${ALL_APPS().filter(a => byApp[a]).map(a => `<details><summary>${appChip(a)} <b>${byApp[a].length}</b></summary><ul>${byApp[a].slice(0, 60).map(c => `<li class="${c.op}"><span class="op">${opIc[c.op]}</span> ${kindIc[c.kind]} <b>${esc(c.name)}</b>${c.op === "chg" && c.keys && c.keys.length ? ` <small class="muted">— ${esc(c.keys.slice(0, 6).join(", "))}</small>` : ""}${c.op === "del" ? ` <small class="muted">(${esc(t("sy_deleted"))})</small>` : ""}</li>`).join("")}</ul></details>`).join("")}</div>`;
    const cards = C.map((c, i) => `<div class="sycard ${c.sev || "warn"}"><div class="syh">${sevIc(c.sev)} <b>${esc(c.title)}</b><span class="grow"></span>${c.apps.map(appChip).join("")}</div>
      <div class="small">${esc(c.text)}</div><div class="btns">${c.fixes.map((f, j) => `<button class="btn small${f.rec ? " pri" : ""}" data-m="fix:${i}:${j}">${f.rec ? "★ " : ""}${esc(f.label)}</button>`).join("")}${c.dev ? `<button class="btn small ghost" data-m="show:${i}">👁 ${esc(t("sy_show"))}</button>` : ""}</div></div>`).join("");
    modal(`<h3>⇄ ${esc(t("sy_title"))}</h3>
      <div class="sysum ${nErr ? "bad" : "ok"}">${nErr ? `⚠ ${esc(t("sy_nIssues", {n:nErr}))}` : `✓ ${esc(t("sy_allOk"))}`}<small class="muted"> · ${esc(t("sy_checked", {d:b.devices.length, l:b.links.length, r:b.racks.length}))}</small></div>
      <h4>📝 ${esc(t("sy_changesT"))}</h4>${changes}
      <h4>⚡ ${esc(t("sy_conflictsT"))} <span class="cnt">${C.length}</span></h4>${C.length ? `<p class="muted small">${esc(t("sy_conflictsH"))}</p><div class="sylist scroll">${cards}</div>` : `<p class="small">✓ ${esc(t("sy_noConflicts"))}</p>`}
      <div class="mfoot">${C.some(c => c.fixes.some(f => f.rec && f.fn)) ? `<button class="btn" data-m="fixAll">★ ${esc(t("sy_fixAll"))}</button>` : ""}<span class="grow"></span><button class="btn" data-m="close">${esc(t("close"))}</button><button class="btn pri" data-m="ack">✓ ${esc(t("sy_ack"))}</button></div>`, {
      fix:(bt, e, k) => { const [i, j] = k.split(":").map(Number), f = C[i] && C[i].fixes[j]; if (!f) return; if (!f.fn){ C.splice(i, 1); refresh(); return; }
        let r; edit(() => { r = f.fn(); }); if (r === "dup"){ closeModal(); dupTool(); return; } refresh(); },
      show:(bt, e, k) => { const c = C[+k]; if (!c || !c.dev) return; closeModal(); const d = devById(B(), c.dev); if (!d) return; const ap = c.apps.find(a => a !== "summary" && a !== "topology") || "topology";
        if (APPS[ap] && UI.app !== ap) switchApp(ap); UI.sel = {type:"dev", id:d.id}; render(); const a = curApp(); if (a.reveal) a.reveal(UI.sel); },
      fixAll:() => { edit(() => { C.forEach(c => { const f = c.fixes.find(x => x.rec && x.fn); if (f){ const r = f.fn(); } }); }); refresh(); toast("✓ " + t("sy_fixedAll")); },
      ack:() => { store0().snap = snapshot(B()); persist(); closeModal(); toast("✓ " + t("sy_acked")); }
    }, {wide:true, replace:true});
  }
  function refresh(){ open(); }
  // a little dot on the button: red when the apps disagree (counted lazily, not on every keystroke)
  let dotT = null;
  function dot(){ clearTimeout(dotT); dotT = setTimeout(() => { const el = document.querySelector('[data-h="sync"]'); if (!el || !store || !B()) return; let n = 0; try { n = conflicts(B()).filter(c => c.sev === "err").length; } catch(e){}
    el.classList.toggle("sydot", n > 0); el.title = n ? t("sy_btnBad", {n}) : t("sy_btn"); }, 600); }
  return {open, conflicts, snapshot, diff, dot};
})();
