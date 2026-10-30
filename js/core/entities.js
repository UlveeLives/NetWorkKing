/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Shared building entities: device kinds, devices, racks, cables, floors, rooms, VLANs — and the editors every app uses.
"use strict";
// cat: palette group; rack: can be mounted in a rack (h = default height in U); ports: default port count; sw: switching device
const KINDS = {
  internet:{cat:"net", icon:"internet", phys:false},
  modem:{cat:"net", icon:"modem", ports:4},
  ont:{cat:"net", icon:"ont", ports:4},
  firewall:{cat:"net", icon:"fw", rack:true, h:1, ports:10, sfp:2},
  router:{cat:"net", icon:"router", rack:true, h:1, ports:6},
  coresw:{cat:"net", icon:"coresw", rack:true, h:1, ports:52, sfp:4, sw:true},
  switch:{cat:"net", icon:"sw", rack:true, h:1, ports:28, sfp:4, sw:true},
  wlc:{cat:"net", icon:"wlc", rack:true, h:1, ports:4},
  ap:{cat:"wifi", icon:"ap", ports:1},
  mediaconv:{cat:"fiber", icon:"mediaconv", ports:2},
  pp:{cat:"passive", icon:"pp", rack:true, h:1, ports:24, passive:true},
  fpp:{cat:"fiber", icon:"fpp", rack:true, h:1, ports:24, passive:true},
  splice:{cat:"fiber", icon:"splice", passive:true, ports:0},
  cablemgr:{cat:"rackacc", icon:"cm", rack:true, h:1, passive:true, acc:true},
  brush:{cat:"rackacc", icon:"cm", rack:true, h:1, passive:true, acc:true},
  blank:{cat:"rackacc", icon:"blank", rack:true, h:1, passive:true, acc:true},
  vent:{cat:"rackacc", icon:"vent", rack:true, h:1, passive:true, acc:true},
  shelf:{cat:"rackacc", icon:"shelf", rack:true, h:1, passive:true, acc:true},
  fan:{cat:"rackacc", icon:"fan", rack:true, h:1, acc:true},
  ups:{cat:"power", icon:"ups", rack:true, h:2},
  pdu:{cat:"power", icon:"pdu", rack:true, h:1},
  poeinj:{cat:"power", icon:"poeinj", ports:2},
  poeext:{cat:"power", icon:"poeinj", ports:2},
  ethext:{cat:"net", icon:"adapter", ports:2},
  hdmiext:{cat:"cctv", icon:"hdmiext", ports:1, av:{hdmiIn:1, hdmiOut:1}},
  usbext:{cat:"end", icon:"adapter", ports:1},
  server:{cat:"compute", icon:"server", rack:true, h:2, ports:4},
  nas:{cat:"compute", icon:"nas", rack:true, h:2, ports:4},
  storage:{cat:"compute", icon:"storage", rack:true, h:2, ports:2},
  kvm:{cat:"compute", icon:"kvm", rack:true, h:1, ports:8, av:{hdmiIn:4, hdmiOut:1}},
  camera:{cat:"cctv", icon:"turret", ports:1},
  nvr:{cat:"cctv", icon:"nvr", rack:true, h:2, ports:2, av:{hdmiOut:2, vgaOut:1}},
  dvr:{cat:"cctv", icon:"dvr", rack:true, h:1, ports:1, av:{hdmiOut:1, vgaOut:1}},
  decoder:{cat:"cctv", icon:"decoder", rack:true, h:1, ports:1, av:{hdmiOut:4}},
  encoder:{cat:"cctv", icon:"encoder", rack:true, h:1, ports:1, av:{hdmiIn:1}},
  monitor:{cat:"cctv", icon:"monitor", av:{hdmiIn:2}},
  videowall:{cat:"cctv", icon:"wall", av:{hdmiIn:4}},
  joystick:{cat:"cctv", icon:"joystick", ports:1},
  workstation:{cat:"end", icon:"workstation", ports:1, av:{hdmiOut:2}},
  pc:{cat:"end", icon:"pc", ports:1, av:{hdmiOut:1}},
  laptop:{cat:"end", icon:"laptop", ports:1},
  printer:{cat:"end", icon:"printer", ports:1},
  phone:{cat:"end", icon:"phone", ports:2},
  tv:{cat:"end", icon:"tv", ports:1, av:{hdmiIn:2}},
  touch:{cat:"end", icon:"touch", ports:1},
  intercom:{cat:"end", icon:"intercom", ports:1},
  access:{cat:"end", icon:"access", ports:1},
  alarm:{cat:"end", icon:"alarm", ports:1},
  sensor:{cat:"end", icon:"sensor", ports:1},
  iot:{cat:"end", icon:"iot", ports:1},
  outlet:{cat:"passive", icon:"outlet", ports:2, passive:true},
  other:{cat:"end", icon:"box", ports:1}
};
const KIND_ORDER = Object.keys(KINDS);
// names of the picture ports of a device, in order: HDMI outputs, VGA outputs, HDMI inputs
function avPorts(d){ const A = d && d.av || {}, L = []; for (let i = 1; i <= num(A.hdmiOut); i++) L.push("HDMI" + i); for (let i = 1; i <= num(A.vgaOut); i++) L.push("VGA" + i); for (let i = 1; i <= num(A.hdmiIn); i++) L.push("IN" + i); return L; }
const isAvPort = p => /^(HDMI|VGA|IN)\d+$/i.test(String(p || ""));
const kindName = k => KINDS[k] && KINDS[k].label ? KINDS[k].label : t("k_" + (KINDS[k] ? k : "other"));
/* ---------- device kinds the user adds ("＋ My device" in an add list) ----------
   Kept in the settings (offered in every project) and in each project that uses them (so a project file opened on
   another computer still knows them). A user kind behaves like the built-in kind it is based on for ports, rack height,
   category and lists; special functions of a few built-in kinds (camera view cone, AP signal, NVR channels) stay with them. */
const UK_LISTS = [], UK_IDS = {};
const ukList = (arr, id) => { UK_LISTS.push(arr); if (id) UK_IDS[id] = arr.slice(); return arr; };
document.addEventListener("click", async e => { const el = e.target.closest && e.target.closest("[data-ukadd]"); if (!el) return; e.preventDefault(); e.stopPropagation(); const k = await ukDialog(UK_IDS[el.dataset.ukadd]); if (k) render(); }, true);
function ukAll(){ const M = new Map(); [...(store.settings.ukinds || []), ...Object.values(store.projects || {}).flatMap(p => p.ukinds || [])].forEach(u => { if (u && u.key && !M.has(u.key)) M.set(u.key, u); }); return [...M.values()]; }
function regUKinds(scan){
  ukAll().forEach(u => { const B0 = KINDS[u.base] && !KINDS[u.base].custom ? KINDS[u.base] : KINDS.other, k = u.key;
    KINDS[k] = {cat:B0.cat, icon:ICO[u.icon] ? u.icon : B0.icon, rack:!!B0.rack, h:Math.max(1, num(u.h, B0.h || 1)), ports:Math.max(0, num(u.ports, B0.ports || 0)), sw:!!B0.sw, passive:!!B0.passive, acc:!!B0.acc, phys:B0.phys, custom:true, base:u.base, label:u.name, av:B0.av};
    if (!KIND_ORDER.includes(k)) KIND_ORDER.push(k);
    UK_LISTS.forEach(L => { if (L.includes(u.base) && !L.includes(k)) L.push(k); }); });
  // a device of a kind nobody described (a file from a newer version): shown as "other" under its own name
  if (scan) Object.values(store.projects || {}).forEach(p => (p.buildings || []).forEach(b => (b.devices || []).forEach(d => { if (d.kind && !KINDS[d.kind]) KINDS[d.kind] = Object.assign({}, KINDS.other, {custom:true, base:"other", label:d.kind}); })));
}
// the dialog: name, which built-in kind it is like, icon, ports, height
async function ukDialog(bases){
  bases = (bases || KIND_ORDER).filter(k => KINDS[k] && !KINDS[k].custom);
  const icons = [...new Set([...Object.values(KINDS).filter(k => !k.custom).map(k => k.icon), ...ICON_LIST])].filter(i => ICO[i]);
  const mine = ukAll(), used = k => Object.values(store.projects).some(p => p.buildings.some(b => b.devices.some(d => d.kind === k)));
  return new Promise(res => {
    const st = {base:bases[0], icon:KINDS[bases[0]].icon};
    const draw = () => modal(`<h3>＋ ${esc(t("ukT"))}</h3><p class="muted small">${esc(t("ukH"))}</p>
      <label class="fld"><span>${esc(t("f_name"))}</span><input id="uk-n" placeholder="${esc(t("ukNameP"))}" value="${esc(st.name || "")}"></label>
      <label class="fld"><span>${esc(t("ukBase"))}</span><select id="uk-b">${bases.map(k => opt(k, kindName(k), st.base)).join("")}</select></label>
      <div class="two"><label class="fld"><span>${esc(t("f_ports"))}</span><input id="uk-p" type="text" inputmode="numeric" value="${esc(st.ports ?? (KINDS[st.base].ports || 0))}"></label>${KINDS[st.base].rack ? `<label class="fld"><span>${esc(t("ukH_U"))}</span><input id="uk-h" type="text" inputmode="numeric" value="${esc(st.h ?? (KINDS[st.base].h || 1))}"></label>` : "<span></span>"}</div>
      <div class="fld"><span>${esc(t("ukIcon"))}</span><div class="ukicons">${icons.map(i => `<button type="button" class="ukic${st.icon === i ? " on" : ""}" data-ukic="${i}"><svg viewBox="0 0 48 48">${ICO[i]}</svg></button>`).join("")}</div></div>
      ${mine.length ? `<details class="dsec"><summary>${esc(t("ukMine"))} <span class="cnt">${mine.length}</span></summary><div class="dsb"><table class="t">${mine.map(u => `<tr><td><svg viewBox="0 0 48 48" width="18" height="18">${ICO[(KINDS[u.key] || {}).icon] || ICO.box}</svg> ${esc(u.name)}</td><td class="small muted">${esc(kindName(u.base))}</td><td>${used(u.key) ? `<small class="muted">${esc(t("ukUsed"))}</small>` : `<button type="button" class="epdel" data-ukdel="${u.key}" title="${esc(t("delete"))}">−</button>`}</td></tr>`).join("")}</table></div></details>` : ""}
      <div class="mfoot"><button class="btn" data-m="cancel">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok">✓ ${esc(t("ukAdd"))}</button></div>`,
      {ok:() => { read(); const n = String(st.name || "").trim(); if (!n){ toast("⚠ " + t("ukNoName")); return; }
          if (KIND_ORDER.some(k => same(kindName(k), n))){ toast("⚠ " + t("ukDup", {n})); return; }
          const u = {key:"u_" + uid(""), name:n, base:st.base, icon:st.icon, ports:Math.max(0, Math.round(num(st.ports, 0))), h:Math.max(1, Math.round(num(st.h, 1)))};
          store.settings.ukinds = [...(store.settings.ukinds || []), u]; const p = P(); p.ukinds = [...(p.ukinds || []), u]; regUKinds(); persist(); closeModal(); toast("✓ " + t("ukDone", {n})); res(u.key); },
       cancel:() => { closeModal(); res(null); }}, {nofocus:true});
    const read = () => { const v = id => ($(id) || {}).value; if ($("#uk-n")) st.name = v("#uk-n"); if ($("#uk-p")) st.ports = v("#uk-p"); if ($("#uk-h")) st.h = v("#uk-h"); };
    const wire = () => { const b = $("#uk-b"); if (b) b.addEventListener("change", () => { read(); st.base = b.value; st.icon = KINDS[b.value].icon; delete st.ports; delete st.h; draw(); wire(); });
      $$("[data-ukic]").forEach(el => el.addEventListener("click", () => { read(); st.icon = el.dataset.ukic; draw(); wire(); }));
      $$("[data-ukdel]").forEach(el => el.addEventListener("click", () => { const k = el.dataset.ukdel; store.settings.ukinds = (store.settings.ukinds || []).filter(u => u.key !== k); Object.values(store.projects).forEach(p => { if (p.ukinds) p.ukinds = p.ukinds.filter(u => u.key !== k); });
        delete KINDS[k]; const i = KIND_ORDER.indexOf(k); if (i >= 0) KIND_ORDER.splice(i, 1); UK_LISTS.forEach(L => { const j = L.indexOf(k); if (j >= 0) L.splice(j, 1); }); persist(); read(); mine.splice(mine.findIndex(u => u.key === k), 1); draw(); wire(); })); };
    draw(); wire();
  });
}
// the "＋ My device" button at the end of an add list (list: the kinds that list offers)
const ukBtn = id => `<button type="button" class="pitem ukadd" data-ukadd="${id}" title="${esc(t("ukT"))}"><svg viewBox="0 0 48 48"><path d="M24 10v28M10 24h28" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg><span>${esc(t("ukBtn"))}</span></button>`;
const CAM_STYLES = {bullet:"camBullet", turret:"turret", dome:"camDome", ptz:"ptz", fisheye:"fisheye", box:"camBox", cube:"camCube"};
// other names vendors use for the same camera types
const CAM_ALIAS = {eyeball:"turret", "turret-dome":"turret", "speed dome":"ptz", "speed-dome":"ptz", speeddome:"ptz", pt:"ptz", panoramic:"fisheye", "360":"fisheye", "mini bullet":"bullet", "mini-bullet":"bullet", "mini dome":"dome", "wedge":"dome", "pinhole":"box", "covert":"box"};
const camStyleOf = s => { s = String(s || "").toLowerCase().trim(); return CAM_STYLES[s] ? s : CAM_ALIAS[s] || ""; };
// how a device is mounted changes its picture (ceiling / wall / outdoor AP, rack / desktop switch, rack / tower UPS and server)
const MOUNTS = {ap:["ceiling", "wall", "out"], switch:["rack", "desktop"], ups:["rack", "tower"], server:["rack", "tower"], nas:["rack", "desktop"]};
// palette entries: one per camera type and per AP mounting, so the right picture goes on the plan from the start
const KIND_VARIANTS = {camera:Object.keys(CAM_STYLES).filter(k => k !== "cube"), ap:["ceiling", "wall", "out"]};
const variantName = kv => { const [k, v] = String(kv).split("."); return !v ? kindName(k) : k === "camera" ? t("cs_" + v) : t("mt_" + v) + " " + kindName(k); };
const variantIcon = kv => { const [k, v] = String(kv).split("."); return devIcon(k === "camera" ? {kind:k, camera:{style:v}} : {kind:k, mount:v, ports:KINDS[k] && KINDS[k].ports}); };
const expandKinds = L => L.flatMap(k => KIND_VARIANTS[k] ? KIND_VARIANTS[k].map(v => k + "." + v) : [k]);
function devIcon(d){ if (!d) return "box"; const k = d.kind, m = d.mount || "";
  if (k === "camera"){ const c = d.camera || {}, n = CAM_STYLES[c.style] || "turret"; return c.loc === "out" && ICO[n + "_out"] ? n + "_out" : n; }
  if (k === "ap") return m === "wall" ? "apWall" : m === "out" || m === "pole" ? "apOut" : "ap";
  if (k === "switch" && (m === "desktop" || (!m && !d.rack && num(d.ports) > 0 && num(d.ports) <= 10))) return "swDesk";
  if (k === "ups") return m === "rack" || (!m && d.rack) ? "upsRack" : "ups";
  if (k === "server" && m === "tower") return "server_t";
  if (k === "nas" && (m === "rack" || (!m && d.rack))) return "storage";
  if ((k === "nvr" || k === "dvr") && num(d.params && d.params.h, 1) >= 2) return "nvr2";
  return (KINDS[k] || KINDS.other).icon; }
const STATUSES = ["planned","installed","active","maintenance","faulty","removed"];
const AIRFLOW = ["f2b","b2f","side","passive"];
// Cable / connection types with drawing style. fiber:true = optical.
const MEDIA = {
  cat6:{c:"#1f6fd6", w:1.8}, cat6a:{c:"#1f6fd6", w:2}, cat5e:{c:"#5b8fd6", w:1.6}, patch:{c:"#3d7fe0", w:1.4}, patch6a:{c:"#3d7fe0", w:1.5}, patch5e:{c:"#5b8fd6", w:1.3},
  poe:{c:"#e0661b", w:1.8}, fiber_sm:{c:"#7d3cc8", w:2.2, fiber:true}, fiber_mm:{c:"#e08a1b", w:2.2, fiber:true}, fpatch:{c:"#b07be0", w:1.6, fiber:true},
  dac:{c:"#2b8a8a", w:2}, isp:{c:"#1d2433", w:2}, wifi:{c:"#16a3a3", w:1.6, dash:"2 4"}, ptp:{c:"#16a3a3", w:2, dash:"8 4"}, vpn:{c:"#c0392b", w:1.8, dash:"10 4 2 4"},
  console:{c:"#8a6d1f", w:1.4, dash:"1 3"}, power:{c:"#d7262e", w:1.8}, hdmi:{c:"#1d2433", w:1.6}, coax:{c:"#8a6d1f", w:1.8}, mgmt:{c:"#1f9d4c", w:1.6}, planned:{c:"#1f6fd6", w:1.8, dash:"5 4"}
};
const MEDIA_ORDER = Object.keys(MEDIA);
const mediaName = m => t("m_" + m);
const isFiber = m => !!(MEDIA[m] && MEDIA[m].fiber);
/* ---------- normalisation ---------- */
function normDevice(d){
  const K = KINDS[d.kind] || KINDS.other;
  const def = {name:"", brand:"", model:"", status:"installed", floor:"", room:"", rack:"", u:0, side:"front", host:"", ip:"", mac:"", serial:"", asset:"", fw:"", owner:"", installed:"", warranty:"", vlan:"", notes:"", ports:K.ports || 0, nvr:"", ch:"", mount:""};
  for (const k in def) if (d[k] === undefined) d[k] = def[k];
  d.params = Object.assign({h:K.h || (K.rack ? 1 : 0), depth:0, weight:0, powerW:0, maxW:0, psu:1, airflow:K.acc || K.passive ? "passive" : "f2b", sfp:K.sfp || 0, poePorts:0, poeBudget:0, poeStd:"", poeIn:0, va:0, upsW:0, wh:0, amps:0, feedA:"", feedB:"", feed:""}, d.params || {});
  d.pcfg = d.pcfg && typeof d.pcfg === "object" ? d.pcfg : {};
  // picture ports (HDMI / VGA in and out) next to the network ports: named HDMI1…, VGA1…, IN1…
  if (!d.av || typeof d.av !== "object") d.av = Object.assign({hdmiOut:0, vgaOut:0, hdmiIn:0}, K.av || {});
  // counts read from older or imported files are never negative (a negative SFP count stopped the rack drawing)
  // sane limits whatever path a number came in by (field, table import, AI, sync fix): a 99999-port switch froze the program
  d.ports = clamp(Math.round(num(d.ports, 0)), 0, 512); if (d.params.sfp !== undefined) d.params.sfp = clamp(Math.round(num(d.params.sfp, 0)), 0, 64); if (d.params.h !== undefined && d.params.h !== "") d.params.h = clamp(Math.round(num(d.params.h, 1)), 0, 60); /* 0 = 0U side PDU / not a rack device */ ["sfp", "h", "psu", "poePorts"].forEach(k => { if (d.params[k] !== undefined && num(d.params[k], 0) < 0) d.params[k] = 0; });
  if (d.kind === "camera"){
    // one camera can record on several NVRs: nvrs = [nvr ids], chs = {nvr id: channel}; nvr / ch mirror the first one
    if (!Array.isArray(d.nvrs)) d.nvrs = d.nvr ? [d.nvr] : [];
    if (!d.chs || typeof d.chs !== "object") d.chs = d.nvr && d.ch ? {[d.nvr]:d.ch} : {};
    d.nvrs = [...new Set(d.nvrs.filter(Boolean))]; d.nvr = d.nvrs[0] || ""; d.ch = d.nvr ? (d.chs[d.nvr] || "") : ""; }
  if (d.kind === "camera") d.camera = Object.assign({style:"turret", mp:4, lens:"2.8", sensor:"1/3\"", hfov:0, ir:30, ipr:"", codec:"H.265+", fps:25, bitrate:"", rec:"cont", act:30, hours:24, retain:""}, d.camera || {});
  if (d.kind === "nvr" || d.kind === "dvr") d.nvrp = Object.assign({channels:16, inMbps:160, bays:2, hdd:8, raid:"none", maxMp:8}, d.nvrp || {});
  if (d.kind === "splice" || d.kind === "fpp") d.fbox = Object.assign({adapters:d.kind === "fpp" ? 12 : 8, atype:"lcd", trays:2, perTray:12}, d.fbox || {});
  if (d.kind === "ap"){ d.ap = Object.assign({mount:"ceiling", h:3, x:null, y:null, radios:{}}, d.ap || {}); ["2.4","5","6"].forEach(b => { d.ap.radios[b] = Object.assign({on:b !== "6", ch:b === "2.4" ? 1 : b === "5" ? 36 : 5, w:b === "2.4" ? 20 : b === "5" ? 40 : 80, tx:b === "2.4" ? 14 : 20, maxTx:b === "2.4" ? 20 : 23, gain:b === "2.4" ? 3 : 5}, d.ap.radios[b] || {}); }); }
  return d;
}
function normRack(r){
  const def = {name:"Rack", code:"", u:42, floor:"", room:"", row:"", dims:{h:2000, w:600, d:1000}, udepth:800, load:800, coolKw:0, volts:230, pf:0.9, airflow:"f2b", pdus:[], specs:{}, notes:[], view:{power:true, cables:true, assets:true}};
  for (const k in def) if (r[k] === undefined) r[k] = clone(def[k]);
  r.dims = Object.assign({h:2000, w:600, d:1000}, r.dims || {}); r.u = clamp(Math.round(num(r.u, 42)), 1, 60); return r;
}
/* ---------- lookups ---------- */
const devById = (b, id) => b.devices.find(d => d.id === id);
const rackById = (b, id) => b.racks.find(r => r.id === id);
const linkById = (b, id) => b.links.find(l => l.id === id);
const floorById = (b, id) => b.floors.find(f => f.id === id);
const roomById = (b, id) => b.rooms.find(r => r.id === id);
const vlanById = (b, id) => b.vlans.find(v => v.id === id);
const floorName = (b, id) => id === "__later" ? t("later") : id === OUT_FLOOR ? t("flOut") : (floorById(b, id) || {}).name || "";
// «Çevrə» — around the building (yard, gate, perimeter cameras): a location for devices that is on no floor
const OUT_FLOOR = "__out";
// names that mean «outside»; a winter garden (kış bahçesi) is inside
const OUTDOOR_RX = /həyət|heyet|(?<!k[ıi]ş |k[ıi]s |q[ıi]ş |winter )(bahçe|bahce|garden)|yard|çöl|outdoor|outside|exterior|dış mekan|dis mekan|perimeter|çevrə|cevre|parking|otopark|darvaza|gate/i;
const roomOutside = rm => !!rm && (rm.type === "outdoor" || rm.floor === OUT_FLOOR);
const devOutside = (b, d) => !!d && (d.floor === OUT_FLOOR || (d.kind === "camera" && d.camera && d.camera.loc === "out" && !d.room) || roomOutside(d.room && roomById(b, d.room)));
const roomName = (b, id) => id === "__later" ? t("later") : (roomById(b, id) || {}).name || "";
const vlanLabel = (b, id) => { const v = vlanById(b, id); return v ? `${v.vid} · ${v.name}` : ""; };
const devLabel = d => d ? (d.name || [d.brand, d.model].filter(Boolean).join(" ") || kindName(d.kind)) : "?";
const devFull = (b, d) => { if (!d) return "?"; const r = d.rack && rackById(b, d.rack); return devLabel(d) + (r ? ` (${r.name} U${d.u})` : ""); };
const linksOf = (b, id) => b.links.filter(l => l.a.d === id || l.b.d === id);
const otherEnd = (l, id) => l.a.d === id ? l.b : l.a;
const thisEnd = (l, id) => l.a.d === id ? l.a : l.b;
function linkText(b, l){ const A = devById(b, l.a.d), Bd = devById(b, l.b.d); return `${devLabel(A)}${l.a.p ? " :" + l.a.p : ""} → ${devLabel(Bd)}${l.b.p ? " :" + l.b.p : ""}`; }
function appForKind(k){ if (["camera","nvr","dvr","monitor","videowall","decoder","encoder","joystick"].includes(k)) return "cctv"; if (k === "ap") return "wifi"; if (["fpp","splice","mediaconv","ont"].includes(k)) return "fiber"; if (KINDS[k] && KINDS[k].rack) return "rack"; return "topology"; }
const topU = d => d.u + Math.max(1, num(d.params.h, 1)) - 1;
const devH = d => Math.max(1, Math.round(num(d.params.h, 1)));
const rackDevices = (b, r) => b.devices.filter(d => d.rack === r.id && d.u > 0);
function rackOcc(b, r, ex){ const a = new Array(r.u + 2).fill(null); rackDevices(b, r).forEach(d => { if (d.id === ex) return; for (let u = d.u; u <= topU(d); u++) if (u <= r.u) a[u] = d; }); return a; }
function rackFits(b, r, u, h, ex){ if (u < 1 || u + h - 1 > r.u) return false; const o = rackOcc(b, r, ex); for (let x = u; x < u + h; x++) if (o[x]) return false; return true; }
function rackSpot(b, r, h, pref, ex){
  if (pref){ for (let d = 0; d <= r.u; d++){ if (rackFits(b, r, pref - d, h, ex)) return pref - d; if (rackFits(b, r, pref + d, h, ex)) return pref + d; } return 0; }
  for (let u = r.u - h + 1; u >= 1; u--) if (rackFits(b, r, u, h, ex)) return u; return 0;
}
/* ---------- create / delete ---------- */
function nextRackName(b){ const used = new Set(b.racks.map(r => r.name)); let i = 1, n; do { n = `Rack-${String(i++).padStart(2, "0")}`; } while (used.has(n)); return n; }
// device names are unique in a building (accessories such as blanking panels excepted)
const nameKey = s => String(s || "").trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
function nameTaken(b, name, exceptId){ const k = nameKey(name); if (!k) return null; return b.devices.find(d => d.id !== exceptId && !(KINDS[d.kind] && KINDS[d.kind].acc) && nameKey(d.name) === k) || null; }
async function nameOk(b, name, exceptId){ const o = nameTaken(b, name, exceptId); if (!o) return true; await uiAlert(t("nameDup",{n:String(name).trim(), k:kindName(o.kind), r:[roomName(b, o.room), o.rack ? (rackById(b, o.rack) || {}).name : ""].filter(Boolean).join(" · ") || "—"})); return false; }
function dupGroups(b){ const G = {}; b.devices.forEach(d => { if (KINDS[d.kind] && KINDS[d.kind].acc) return; const k = nameKey(d.name); if (k) (G[k] = G[k] || []).push(d); }); return Object.values(G).filter(g => g.length > 1); }
// list of devices that share a name: what each one is connected to, so the right one can be kept
function dupTool(){
  const b = B(), G = dupGroups(b);
  const conn = d => b.links.filter(l => l.a.d === d.id || l.b.d === d.id).map(l => { const o = devById(b, l.a.d === d.id ? l.b.d : l.a.d), op = l.a.d === d.id ? l.b.p : l.a.p; return o ? devLabel(o) + (op ? ":" + op : "") : "?"; });
  if (!G.length){ modal(`<h3>✓ ${esc(t("dupNoneT"))}</h3><p>${esc(t("dupNone"))}</p><div class="mfoot"><span class="grow"></span><button class="btn pri" data-m="close">OK</button></div>`); return; }
  modal(`<h3>⚠ ${esc(t("dupT"))} <span class="cnt">${G.length}</span></h3><p class="muted small">${esc(t("dupH"))}</p>
    <div class="scroll" style="max-height:60vh">${G.map(g => `<div class="dupg"><b>${esc(g[0].name)}</b> <small class="muted">×${g.length}</small><table class="t">${g.map(d => { const c = conn(d);
      return `<tr><td>${esc(kindName(d.kind))}</td><td class="small">${esc(t("st_" + d.status) === "st_" + d.status ? d.status : t("st_" + d.status))}</td><td class="small">${esc([floorName(b, d.floor), roomName(b, d.room)].filter(Boolean).join(" · ") || "—")}</td><td class="small">${c.length ? "🔌 " + esc(c.join(", ")) : `<span class="muted">${esc(t("dupNoCable"))}</span>`}</td>
        <td class="nw"><button class="btn small" data-m="dren:${d.id}">✎</button><button class="btn small dan" data-m="ddel:${d.id}" title="${esc(t("delete"))}">⊖</button></td></tr>`; }).join("")}</table></div>`).join("")}</div>
    <div class="mfoot"><span class="grow"></span><button class="btn pri" data-m="close">${esc(t("close"))}</button></div>`, {
    ddel: async (el, e, id) => { const d = devById(b, id); if (!d) return; if (!await delDeviceAsk(b, d)) return; dupTool(); },
    dren: async (el, e, id) => { const d = devById(b, id); if (!d) return; const n = await uiPrompt(t("f_name"), d.name); if (n === null || !n.trim() || nameKey(n) === nameKey(d.name)) return; if (!await nameOk(b, n, d.id)) return; edit(() => { d.name = n.trim(); }); dupTool(); } }, {wide:true});
}
// delete one device after confirming (says how many cables go with it)
async function delDeviceAsk(b, d){ const n = b.links.filter(l => l.a.d === d.id || l.b.d === d.id).length;
  if (!await uiConfirm(t("delDevQ",{d:devLabel(d), k:kindName(d.kind), n}), t("delete"), true)) return false;
  edit(() => { removeDevices(b, [d.id]); if (UI.sel && UI.sel.id === d.id) UI.sel = null; }); toast("🗑 " + devLabel(d)); return true; }
function newDevice(kind, o = {}){
  let vr = ""; if (String(kind).includes(".")) [kind, vr] = String(kind).split(".");
  const d = normDevice(Object.assign({id:uid("d"), kind}, o));
  if (vr){ if (kind === "camera"){ if (CAM_STYLES[vr]) d.camera.style = vr; } else d.mount = vr; }
  if (o.status === undefined && store && store.settings && store.settings.addPlanned) d.status = "planned";
  if (!d.name) d.name = autoName(B(), kind);
  return d;
}
// Next free name like "SW-01", "CAM-07".
const NAMEPFX = {switch:"SW", coresw:"CORE", firewall:"FW", router:"RTR", modem:"MODEM", ont:"ONT", wlc:"WLC", ap:"AP", camera:"CAM", nvr:"NVR", dvr:"DVR", server:"SRV", nas:"NAS", storage:"STG", ups:"UPS", pdu:"PDU", pp:"PP", fpp:"FPP", splice:"SC", mediaconv:"MC", pc:"PC", laptop:"NB", printer:"PRN", phone:"TEL", tv:"TV", workstation:"WS", monitor:"MON", videowall:"VW", decoder:"DEC", encoder:"ENC", joystick:"KB", poeinj:"INJ", kvm:"KVM", alarm:"ALM", touch:"TP", intercom:"INT", access:"ACS", sensor:"SNS", iot:"IOT", outlet:"TO", internet:"ISP", other:"DEV"};
function autoName(b, kind){
  kind = String(kind).split(".")[0];
  if (KINDS[kind] && KINDS[kind].acc) return kindName(kind);
  const p = NAMEPFX[kind] || "DEV", used = new Set(b.devices.map(d => d.name)); let i = 1, n;
  do { n = `${p}-${String(i).padStart(2, "0")}`; i++; } while (used.has(n)); return n;
}
function removeDevices(b, ids){
  const set = new Set(ids);
  b.devices = b.devices.filter(d => !set.has(d.id)); b.links = b.links.filter(l => !set.has(l.a.d) && !set.has(l.b.d));
  P().links = P().links.filter(l => !set.has(l.a.d) && !set.has(l.b.d));
  Object.values(b.views).forEach(v => { if (v && v.nodes) ids.forEach(id => delete v.nodes[id]); });
  b.devices.forEach(d => { if (set.has(d.nvr)) d.nvr = ""; if (Array.isArray(d.nvrs)){ d.nvrs = d.nvrs.filter(x => !set.has(x)); ids.forEach(x => { if (d.chs) delete d.chs[x]; }); } if (set.has(d.params.feedA)) d.params.feedA = ""; if (set.has(d.params.feedB)) d.params.feedB = ""; });
}
function addLink(b, a, bb, media, o = {}){ const l = normLink(Object.assign({id:uid("l"), a:{d:a, p:o.pa || ""}, b:{d:bb, p:o.pb || ""}, media:media || "cat6"}, o)); delete l.pa; delete l.pb; b.links.push(l); return l; }
/* ---------- floors & rooms ---------- */
const LINK_FLOOR = /^(bağlant|baglant|əlaqə|elaqe|uplink|link|trunk|connection|interconnect|backbone|magistral|магистр|связ)/i;
function ensureFloor(b, name){ let f = b.floors.find(x => same(x.name, name)); if (!f){ f = {id:uid("f"), name, lvl:b.floors.length}; b.floors.push(f); normBuilding(b); } return f; }
function ensureRoom(b, floorId, name){ let r = b.rooms.find(x => same(x.name, name) && (x.floor || "") === (floorId || "")); if (!r){ r = {id:uid("r"), name, floor:floorId || "", users:0, wall:"drywall"}; b.rooms.push(r); } return r; }
const roomsOn = (b, fid) => b.rooms.filter(r => (r.floor || "") === (fid || ""));
function floorOpts(b, cur, extra = true){ return opt("", t("none"), cur) + b.floors.map(f => opt(f.id, f.name, cur)).join("") + opt(OUT_FLOOR, "🌳 " + t("flOut"), cur) + (extra ? opt("__later", t("later"), cur) + opt("__new", "＋ " + t("floorNew") + "…", "") : ""); }
function roomOpts(b, fid, cur, extra = true){ const L = fid && fid !== "__later" ? roomsOn(b, fid) : b.rooms; return opt("", t("none"), cur) + L.map(r => opt(r.id, r.name + (fid ? "" : r.floor ? " · " + floorName(b, r.floor) : ""), cur)).join("") + (extra ? opt("__later", t("later"), cur) + opt("__new", "＋ " + t("roomNew") + "…", "") : ""); }
function vlanOpts(b, cur, extra = true){ return opt("", t("none"), cur) + b.vlans.map(v => opt(v.id, `${v.vid} · ${v.name}`, cur)).join("") + (extra ? opt("__new", "＋ " + t("vlanNew") + "…", "") : ""); }
// Handles the "＋ new…" options of floor / room / VLAN selects. Resolves to the id to store (or null = cancelled).
async function resolveNew(kind, b, val, ctx = {}){
  if (val !== "__new") return val;
  if (kind === "floor"){ const n = await uiPrompt(t("floorNew")); if (!n || !n.trim()) return null; return ensureFloor(b, n.trim()).id; }
  if (kind === "room"){ const n = await uiPrompt(t("roomNew")); if (!n || !n.trim()) return null; return ensureRoom(b, ctx.floor && ctx.floor !== "__later" ? ctx.floor : "", n.trim()).id; }
  if (kind === "vlan"){
    // one window: ID, name, subnet; an ID that already exists is simply chosen
    const v = await uiForm(t("vlanNew"), [{k:"vid", label:t("vlanIdQ"), mode:"numeric", ph:"20"}, {k:"name", label:t("vlanNameQ"), ph:"VLAN 20"}, {k:"subnet", label:t("vlanSubnetQ"), ph:"192.168.20.0/24"}],
      x => !/^\d+$/.test(x.vid) || +x.vid < 1 || +x.vid > 4094 ? t("vlanBad") : x.subnet && !IP.valid(x.subnet.split("/")[0]) ? t("ipBad") : "");
    if (!v) return null; const ex = b.vlans.find(x => String(x.vid) === String(+v.vid)); if (ex){ toast(t("vlanExists", {v:ex.vid + " · " + ex.name})); return ex.id; }
    const o = {id:uid("v"), vid:String(+v.vid), name:v.name || "VLAN " + (+v.vid), subnet:v.subnet, gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}; b.vlans.push(o); return o.id; }
  return null;
}
const VCOLORS = ["#2f7de1","#14a37f","#d9822b","#8a5cd6","#c9475d","#4d5bd1","#0e8fa8","#b8860b","#6b8e23","#c2185b"];
/* ---------- path helpers for form fields: "name", "params.depth", "camera.mp" ---------- */
function getPath(o, p){ return p.split(".").reduce((x, k) => x == null ? x : x[k], o); }
function setPath(o, p, v){ const ks = p.split("."), last = ks.pop(); let x = o; for (const k of ks){ if (x[k] == null || typeof x[k] !== "object") x[k] = {}; x = x[k]; } x[last] = v; }
// numbers that can't be below zero (plan coordinates and the camera direction can)
const numOf = (path, v) => { const n = num(String(v).replace(",", "."), 0); return /^(ap\.x|ap\.y|camera\.dir)$/.test(path) ? n : Math.max(0, n); };
const NUMF = new Set(["av.hdmiOut","av.vgaOut","av.hdmiIn","ports","params.sfp","u","params.h","params.depth","params.weight","params.powerW","params.maxW","params.psu","params.poePorts","params.poeBudget","params.poeIn","params.va","params.upsW","params.wh","params.amps","camera.mp","camera.ir","camera.fps","camera.bitrate","camera.act","camera.hours","camera.retain","camera.hfov","camera.dir","nvrp.channels","nvrp.inMbps","nvrp.bays","nvrp.hdd","nvrp.maxMp","ap.h","ap.x","ap.y","ap.cable","len"]);
/* ---------- shared device editor (drawer) ---------- */
const fld = (label, path, val, type = "text", extra = "") => `<label class="fld"><span>${esc(label)}</span><input data-f="${path}" type="${type}" value="${esc(val ?? "")}"${extra}></label>`;
const sel = (label, path, val, optsHtml, extra = "") => `<label class="fld"><span>${esc(label)}</span><select data-f="${path}"${extra}>${optsHtml}</select></label>`;
const sec = (id, title, body, open) => `<details class="dsec" data-sec="${id}"${open || UI.open && UI.open[id] ? " open" : ""}><summary>${title}</summary><div class="dsb">${body}</div></details>`;
UI.open = {gen:true, loc:true};
function deviceEditor(b, d, opts = {}){
  const K = KINDS[d.kind] || KINDS.other, r = d.rack && rackById(b, d.rack), P2 = d.params;
  const head = `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO[devIcon(d)] || ICO.box}</svg><div><h3>${esc(devLabel(d))}</h3><div class="muted small">${esc(kindName(d.kind))}${d.brand || d.model ? " · " + esc([d.brand, d.model].filter(Boolean).join(" ")) : ""}</div></div><button class="x" data-dr="close" title="${esc(t("close"))}">×</button></div>`;
  const cat = `<div class="catrow"><button class="btn small" data-dr="catalog">📚 ${esc(d.model ? t("catChange") : t("catPick"))}</button>${d.cat ? `<span class="pill ok" title="${esc(t("catLinked"))}">✓ ${esc(t("catFromDb"))}</span>` : ""}${d.model && !d.cat ? `<button class="btn small" data-dr="webFill" title="${esc(t("wfH"))}">🔎 ${esc(t("wfBtn"))}</button>` : ""}${opts.extraHead || ""}</div>`;
  let g = sel(t("f_kind"), "kind", d.kind, KIND_ORDER.map(k => opt(k, kindName(k), d.kind)).join("")) + fld(t("f_name"), "name", d.name)
    + `<div class="two">${fld(t("f_brand"), "brand", d.brand, "text", ' list="dl-brands"')}${fld(t("f_model"), "model", d.model, "text", ' list="dl-models"')}</div>${modelList(d.kind, d.brand)}`
    + sel(t("f_status"), "status", d.status, STATUSES.map(s => opt(s, t("st_" + s), d.status)).join(""))
    + (MOUNTS[d.kind] ? sel(t("f_mount"), "mount", d.mount, opt("", t("mt_auto"), d.mount) + MOUNTS[d.kind].map(m => opt(m, t("mt_" + m), d.mount)).join("")) : "");
  let loc = `<div class="two">${sel(t("f_floor"), "floor", d.floor, floorOpts(b, d.floor))}${sel(t("f_room"), "room", d.room, roomOpts(b, d.floor, d.room))}</div>`;
  if (K.rack) loc += `<div class="two">${sel(t("f_rack"), "rack", d.rack, opt("", t("none"), d.rack) + b.racks.map(x => opt(x.id, x.name, d.rack)).join(""))}${d.rack ? fld(t("f_u"), "u", d.u || "", "number", ` min="1" max="${r ? r.u : 60}"`) : "<span></span>"}</div>`
    + `<div class="two">${fld(t("f_h"), "params.h", P2.h, "number", ' min="0" max="60"')}${d.rack ? sel(t("f_side"), "side", d.side, opt("front", t("sideFront"), d.side) + opt("rear", t("sideRear"), d.side)) : "<span></span>"}</div>`;
  let net = "";
  // the IP is first chosen as static or given by DHCP (a DHCP address is optional: a reservation, or the one seen now)
  if (d.kind !== "internet" && !K.acc && !K.passive) net = `<div class="two">${fld(t("f_host"), "host", d.host)}${sel(t("f_ipMode"), "ipMode", d.ipMode || "", [["", "—"], ["static", t("ipStatic")], ["dhcp", t("ipDhcp")]].map(([k, l]) => opt(k, l, d.ipMode || "")).join(""))}</div>
    <div class="two">${fld(d.ipMode === "dhcp" ? t("ipDhcpF") : "IP", "ip", d.ip, "text", ` placeholder="${d.ipMode === "dhcp" ? "DHCP" : "10.10.10.2/24"}" inputmode="decimal"`)}<span></span></div>
    <div class="two">${fld("MAC", "mac", d.mac, "text", ' placeholder="00:11:22:33:44:55"')}${sel("VLAN", "vlan", d.vlan, vlanOpts(b, d.vlan))}</div>`;
  const hasSfp = K.sw || ["firewall","router","modem","ont","server","nas","nvr","wlc"].includes(d.kind), sfpN = Math.max(0, Math.round(num(d.params.sfp)));
  if (K.ports !== undefined || K.sw || K.passive) net += hasSfp ? `<div class="two">${fld(t("f_rj45"), "__rj45", Math.max(0, Math.round(num(d.ports)) - sfpN), "number", ' min="0" max="512"')}${fld(t("f_sfp"), "params.sfp", sfpN, "number", ' min="0" max="64"')}</div>${sfpN ? `<p class="muted small">${esc(t("f_portsSum", {n:d.ports, a:Math.max(0, num(d.ports) - sfpN) + 1, b:d.ports}))}</p>` : ""}`
    : `<div class="two">${fld(t("f_ports"), "ports", d.ports, "number", ' min="0" max="512"')}<span></span></div>`;
  if (!K.acc && !K.passive && d.kind !== "internet") net += `<div class="three">${fld("USB", "params.usb", P2.usb ?? "", "number", ' min="0" max="16"')}${fld(t("f_console"), "params.console", P2.console ?? "", "number", ' min="0" max="4"')}${fld(t("f_mgmt"), "params.mgmt", P2.mgmt ?? "", "number", ' min="0" max="4"')}</div>`;
  if (K.av || (d.av && num(d.av.hdmiOut) + num(d.av.vgaOut) + num(d.av.hdmiIn))) net += `<div class="three">${fld(t("f_hdmiOut"), "av.hdmiOut", d.av.hdmiOut || 0, "number", ' min="0" max="32"')}${fld(t("f_vgaOut"), "av.vgaOut", d.av.vgaOut || 0, "number", ' min="0" max="8"')}${fld(t("f_hdmiIn"), "av.hdmiIn", d.av.hdmiIn || 0, "number", ' min="0" max="32"')}</div>`;
  const asset = `<div class="two">${fld(t("f_serial"), "serial", d.serial)}${fld(t("f_asset"), "asset", d.asset)}</div><div class="two">${fld(t("f_fw"), "fw", d.fw)}${fld(t("f_owner"), "owner", d.owner)}</div>
    <div class="two">${fld(t("f_installed"), "installed", d.installed, "date")}${fld(t("f_warranty"), "warranty", d.warranty, "date")}</div>`;
  let phys = "";
  if (!K.acc && d.kind !== "internet") phys = `<div class="two">${fld(t("f_powerW"), "params.powerW", P2.powerW || "", "number", ' min="0"')}${fld(t("f_maxW"), "params.maxW", P2.maxW || "", "number", ' min="0"')}</div>
    <div class="two">${fld(t("f_weight"), "params.weight", P2.weight || "", "number", ' min="0" step="0.1"')}${fld(t("f_depth"), "params.depth", P2.depth || "", "number", ' min="0"')}</div>
    <div class="two">${sel("PSU", "params.psu", P2.psu, [1,2,3,4].map(x => opt(x, x === 1 ? t("psu1") : x + " " + t("psuN"), P2.psu)).join(""))}${sel(t("f_airflow"), "params.airflow", P2.airflow, AIRFLOW.map(x => opt(x, t("af_" + x), P2.airflow)).join(""))}</div>`;
  if (K.sw || d.kind === "nvr") phys += `<div class="two">${fld(t("f_poePorts"), "params.poePorts", P2.poePorts || "", "number", ' min="0"')}${fld(t("f_poeBudget"), "params.poeBudget", P2.poeBudget || "", "number", ' min="0"')}</div>`;
  if (["ap","camera","phone","access","intercom","touch","iot","sensor"].includes(d.kind)) phys += `<div class="two">${fld(t("f_poeIn"), "params.poeIn", P2.poeIn || "", "number", ' min="0" step="0.1"')}<span></span></div>`;
  if (d.kind === "ups") phys += `<div class="two">${fld(t("f_va"), "params.va", P2.va || "", "number")}${fld(t("f_upsW"), "params.upsW", P2.upsW || "", "number")}</div><div class="two">${fld(t("f_wh"), "params.wh", P2.wh || "", "number")}<span></span></div>`;
  if (d.kind === "pdu") phys += `<div class="two">${fld(t("f_amps"), "params.amps", P2.amps || 16, "number")}${sel(t("f_feed"), "params.feed", P2.feed, opt("", "—", P2.feed) + opt("A", "A", P2.feed) + opt("B", "B", P2.feed))}</div>`;
  const extra = opts.extra ? opts.extra(b, d) : "";
  const conn = connectionsHtml(b, d);
  const notes = `<label class="fld"><span>${esc(t("f_notes"))}</span><textarea data-f="notes" rows="3">${esc(d.notes)}</textarea></label>`;
  return `${head}${cat}${sec("gen", t("sec_general"), g, true)}${sec("loc", t("sec_location"), loc)}${extra}${net ? sec("net", t("sec_network"), net) : ""}${sec("conn", t("sec_links") + ` <span class="cnt">${linksOf(b, d.id).length}</span>`, conn)}${phys ? sec("phys", t("sec_power"), phys) : ""}${sec("asset", t("sec_asset"), asset)}${notes}
    <div class="btns">${opts.btns || ""}<button class="btn" data-dr="dupDev">⧉ ${esc(t("duplicate"))}</button><button class="btn dan" data-dr="delDev">🗑 ${esc(t("delete"))}</button></div>`;
}
// Model suggestions from the catalog for this kind (and brand, when one is typed).
// models for the model field: the catalog, plus every model already typed on a device of the same kind (any project)
function usedModels(kind, brand){ const out = new Map(), ok = k => k === kind || (KGROUP_OF[kind] || []).includes(k);
  Object.values(store.projects || {}).forEach(p => (p.buildings || []).forEach(b => (b.devices || []).forEach(d => { if (d.model && ok(d.kind) && (!brand || same(d.brand, brand))){ const key = (d.brand || "") + "|" + d.model.trim().toLowerCase(); if (!out.has(key)) out.set(key, {brand:d.brand || "", model:d.model.trim()}); } })));
  return [...out.values()]; }
function modelList(kind, brand){
  const L = CAT.all().filter(r => (r.kind === kind || (KGROUP_OF[kind] || []).includes(r.kind)) && (!brand || same(r.brand, brand)));
  const seen = new Set(L.map(r => r.model.toLowerCase())), U = usedModels(kind, brand).filter(r => !seen.has(r.model.toLowerCase()));
  return `<datalist id="dl-models">${U.map(r => `<option value="${esc(r.model)}">${esc((brand ? "" : r.brand + " · ") + t("modelMine"))}</option>`).join("")}${L.slice(0, 400).map(r => `<option value="${esc(r.model)}">${esc(brand ? "" : r.brand)}</option>`).join("")}</datalist>`;
}
const KGROUP_OF = {switch:["coresw"], coresw:["switch"], nvr:["dvr"], dvr:["nvr"], server:["nas","storage"], nas:["server","storage"], firewall:["router"], router:["firewall","modem"], modem:["router","ont"]};
// A model the user typed earlier on another device (not in the catalog): copy that device's port count and parameters.
// Height (U) is not copied for a device already in a rack, so nothing in the rack moves.
function copyTwin(d){
  const ok = k => k === d.kind || (KGROUP_OF[d.kind] || []).includes(k); let tw = null;
  Object.values(store.projects || {}).some(p => (p.buildings || []).some(b => (b.devices || []).some(x => { if (x !== d && x.id !== d.id && ok(x.kind) && same(x.model, d.model) && (!d.brand || same(x.brand, d.brand))){ tw = x; return true; } })));
  if (!tw) return false;
  if (!d.brand && tw.brand) d.brand = tw.brand;
  if (num(tw.ports) > num(d.ports)) d.ports = tw.ports;
  Object.entries(tw.params || {}).forEach(([k, v]) => { if (k === "h" && d.rack) return; d.params[k] = typeof v === "object" && v ? JSON.parse(JSON.stringify(v)) : v; });
  return true;
}
// "Fill from the internet": the model's datasheet is looked up (Claude with web search, the user's own API key),
// shown for checking, then applied to the device and kept in the user's catalog for next time.
async function webFill(d){
  if (!d.model) return toast("⚠ " + t("wfNoModel"));
  if (!(store.settings.ai && store.settings.ai.key)){
    const c = await uiChoice(t("wfNoKey"), [["set", "⚙ " + t("wfSetKey"), "pri"], ["web", "🌐 " + t("wfGoogle")]]);
    if (c === "set") openSettings("ai"); else if (c === "web") window.open("https://www.google.com/search?q=" + encodeURIComponent(`${d.brand} ${d.model} datasheet specifications`), "_blank");
    return; }
  toast("⏳ " + t("aiWorking"), 60000);
  let rec; try { rec = await aiLookup(d.brand, d.model, d.kind); } catch(e){ toast("⚠ " + (e.message || e), 6000); return; }
  toast("✓", 500);
  modal(`<h3>🔎 ${esc(d.brand + " " + d.model)}</h3><div class="aibox">${specDetail(Object.assign({_src:"ai"}, rec))}</div><p class="muted small">${esc(t("aiCheck"))}</p>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="ok">✓ ${esc(t("wfApply"))}</button></div>`,
    {ok:async () => { closeModal(); await CAT.saveUser(rec); const r = CAT.get(CAT.key(rec)) || rec; edit(() => applySpec(d, r)); toast("✓ " + t("catApplied", {m:rec.brand + " " + rec.model})); }}, {wide:true});
}
// When brand + model typed by hand match a catalog record, its parameters are filled in automatically.
function catMatch(d){ const L = CAT.all().filter(r => same(r.model, d.model) && (!d.brand || same(r.brand, d.brand))); return L.length === 1 ? L[0] : null; }
/* ---------- several devices at once (Ctrl / Shift + click): change the fields they share ---------- */
const multiDevs = () => { const b = B(); return [...UI.multi].filter(k => k.startsWith("dev:")).map(k => devById(b, k.slice(4))).filter(Boolean); };
function multiEditor(b, L){
  const kinds = [...new Set(L.map(d => d.kind))], one = kinds.length === 1 ? kinds[0] : null, K = one ? KINDS[one] : {};
  const val = p => { const vs = [...new Set(L.map(d => JSON.stringify(getPath(d, p) ?? "")))]; return vs.length === 1 ? JSON.parse(vs[0]) : undefined; };
  const MIX = esc(t("mixed"));
  const f = (label, p, type = "text", extra = "") => { const v = val(p); return `<label class="fld"><span>${esc(label)}</span><input data-mf="${p}" type="${type}" value="${esc(v ?? "")}"${v === undefined ? ` placeholder="${MIX}"` : ""}${extra}></label>`; };
  const s = (label, p, opts) => { const v = val(p); return `<label class="fld"><span>${esc(label)}</span><select data-mf="${p}">${v === undefined ? `<option value="__mix" selected>${MIX}</option>` : ""}${opts.map(([k, l]) => opt(k, l, v === undefined ? "\u0000" : String(v))).join("")}</select></label>`; };
  const fl = val("floor");
  let g = `<div class="two">${f(t("f_brand"), "brand", "text", ' list="dl-brands"')}${f(t("f_model"), "model", "text", ' list="dl-models"')}</div>${one ? modelList(one, val("brand") || "") : ""}
    ${s(t("f_status"), "status", STATUSES.map(x => [x, t("st_" + x)]))}
    <div class="two">${s(t("f_floor"), "floor", [["", t("none")], ...b.floors.map(x => [x.id, x.name])])}${s(t("f_room"), "room", [["", t("none")], ...(fl ? roomsOn(b, fl) : b.rooms).map(r => [r.id, r.name + (fl || !r.floor ? "" : " · " + floorName(b, r.floor))])])}</div>
    ${s("VLAN", "vlan", [["", t("none")], ...b.vlans.map(v => [v.id, v.vid + " · " + v.name])])}
    <div class="two">${f(t("f_owner"), "owner")}${f(t("f_fw"), "fw")}</div>`;
  if (["ap","camera","phone","access","intercom","touch","iot","sensor"].includes(one)) g += `<div class="two">${f(t("f_poeIn"), "params.poeIn", "number", ' min="0" step="0.1"')}<span></span></div>`;
  if (K.sw) g += `<div class="two">${f(t("f_ports"), "ports", "number")}${f(t("f_poeBudget"), "params.poeBudget", "number")}</div>`;
  if (one === "camera") g += `<h4 class="msub">📷 ${esc(t("camSec"))}</h4><div class="two">${s(t("camStyle"), "camera.style", Object.keys(CAM_STYLES).map(k => [k, t("cs_" + k)]))}${s(t("camLoc"), "camera.loc", [["in", t("camIn")], ["out", t("camOut")]])}</div>
    <div class="two">${f("MP", "camera.mp", "number", ' step="0.1"')}${f(t("camLens") + " (mm)", "camera.lens")}</div>
    <div class="two">${f("IR (m)", "camera.ir", "number")}${f("FPS", "camera.fps", "number")}</div>
    <div class="two">${s(t("camCodec"), "camera.codec", ["H.264","H.264+","H.265","H.265+"].map(x => [x, x]))}${s(t("camRec"), "camera.rec", [["cont", t("rec_cont")], ["motion", t("rec_motion")], ["sched", t("rec_sched")]])}</div>
    <div class="two">${f(t("camHours"), "camera.hours", "number")}${f(t("camRetain"), "camera.retain", "number")}</div>
    ${b.devices.some(x => x.kind === "nvr" || x.kind === "dvr") ? `<h4 class="msub">🗄 NVR</h4>${b.devices.filter(x => x.kind === "nvr" || x.kind === "dvr").map(nv => { const n = L.filter(d => (d.nvrs || []).includes(nv.id)).length;
      return `<div class="mrow"><span><b>${esc(devLabel(nv))}</b> <small class="muted">${n}/${L.length}</small></span><button class="btn small" data-mdr="nvrAdd:${nv.id}">＋ ${esc(t("nvrAddAll"))}</button>${n ? `<button class="btn small dan" data-mdr="nvrRm:${nv.id}">×</button>` : ""}</div>`; }).join("")}` : ""}`;
  if (one === "ap") g += `<div class="two">${s(t("wf_f_mount"), "ap.mount", [["ceiling", t("wf_m_ceil")], ["wall", t("wf_m_wall")]])}${f(t("wf_f_h"), "ap.h", "number", ' step="0.1"')}</div>${f(t("wf_f_vlans"), "ap.vlans")}`;
  return `<p class="muted small">${esc(t("multiHint",{n:L.length}))}${one ? " · " + esc(kindName(one)) : ""}</p>
    ${one ? `<div class="catrow"><button class="btn small" data-mdr="catalog">📚 ${esc(t("catPickAll"))}</button></div>` : ""}
    ${sec("mgen", t("sec_general"), g, true)}
    <div class="btns"><button class="btn dan" data-mdr="del">🗑 ${esc(t("delete"))} (${L.length})</button></div>`;
}
async function multiChange(el){
  const b = B(), L = multiDevs(), path = el.dataset.mf; let v = el.value; if (!L.length) return;
  if (v === "__mix") return;
  if (path === "ip") return;
  edit(() => L.forEach(d => { if (path.startsWith("camera.") && d.kind !== "camera") return;
    setPath(d, path, NUMF.has(path) ? numOf(path, v) : (typeof v === "string" ? v.trim() : v));
    if (path === "floor"){ if (d.room && (roomById(b, d.room) || {}).floor !== v) d.room = ""; }
    if (path === "room" && v){ const r = roomById(b, v); if (r && r.floor) d.floor = r.floor; }
    if ((path === "model" || path === "brand") && d.model){ const r = catMatch(d); if (r) applySpec(d, r); } }));
}
async function multiAct(k){
  const b = B(), L = multiDevs(); if (!L.length) return;
  if (k === "catalog"){ openCatalogPicker(L[0].kind, rec => edit(() => L.forEach(d => applySpec(d, rec)))); return; }
  if (k === "del"){ if (!await uiConfirm(t("delManyConf",{n:L.length}), t("delete"), true)) return; edit(() => { removeDevices(b, L.map(d => d.id)); UI.multi.clear(); UI.sel = null; }); return; }
  if (k.startsWith("nvrAdd:")){ const id = k.slice(7); edit(() => { const used = new Set(b.devices.filter(d => d.kind === "camera" && (d.nvrs || []).includes(id)).map(d => +d.chs[id]).filter(Boolean)); let ch = 1;
    L.forEach(d => { if (d.kind !== "camera" || d.nvrs.includes(id)) return; d.nvrs.push(id); while (used.has(ch)) ch++; d.chs[id] = String(ch); used.add(ch); }); }); return; }
  if (k.startsWith("nvrRm:")){ const id = k.slice(6); edit(() => L.forEach(d => { if (!Array.isArray(d.nvrs)) return; d.nvrs = d.nvrs.filter(x => x !== id); delete d.chs[id]; })); }
}
function connectionsHtml(b, d){
  const L = linksOf(b, d.id);
  return (L.length ? L.map(l => { const o = otherEnd(l, d.id), od = devById(b, o.d), me = thisEnd(l, d.id), M = MEDIA[l.media] || MEDIA.cat6;
    // through a patch panel / outlet: also show where that panel port goes (switch and port), with the rack names
    let via = ""; if (od && window.PM && PM.passive(od) && !PM.passive(d)){ const w = PM.walk(b, d.id, me.p, l), k = w.findIndex(h => !PM.passive(devById(b, h.d)));
      if (k > 0){ const sw = devById(b, w[k].d); via = `<br><small>⇢ <b>${esc(devFull(b, sw))}</b>${w[k].p ? " :" + esc(w[k].p) : ""}</small>`; } }
    return `<div class="lnk" data-dr="link:${l.id}"><i style="background:${M.c}"></i><span><b>${esc(me.p ? ":" + me.p : "")}</b> → <b>${esc(od ? devFull(b, od) : "?")}</b>${o.p ? " :" + esc(o.p) : ""}${via}<br><small class="muted">${esc(mediaName(l.media))}${l.cid ? " · " + esc(l.cid) : ""}${l.len ? " · " + esc(l.len) + " m" : ""}</small></span><button class="x" data-dr="unlink:${l.id}" title="${esc(t("delete"))}">×</button></div>`; }).join("") : `<p class="muted small">${esc(t("noLinks"))}</p>`)
    + `<button class="btn small" data-dr="addLink">＋ ${esc(t("linkAdd"))}</button>`;
}
function linkEditor(b, l){
  const A = devById(b, l.a.d), Bd = devById(b, l.b.d);
  const devOpt = cur => b.devices.slice().sort((x, y) => devLabel(x).localeCompare(devLabel(y))).map(d => opt(d.id, devFull(b, d), cur)).join("");
  return `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO.cable}</svg><div><h3>${esc(t("linkT"))}</h3><div class="muted small">${esc(linkText(b, l))}</div></div><button class="x" data-dr="close">×</button></div>
  ${sec("gen", t("sec_general"), `${sel(t("f_media"), "media", l.media, MEDIA_ORDER.map(m => opt(m, mediaName(m), l.media)).join(""))}
    <div class="two">${sel(t("linkA"), "a.d", l.a.d, devOpt(l.a.d))}${fld(t("f_port"), "a.p", l.a.p)}</div>
    <div class="two">${sel(t("linkB"), "b.d", l.b.d, devOpt(l.b.d))}${fld(t("f_port"), "b.p", l.b.p)}</div>
    <div class="two">${fld(t("f_cid"), "cid", l.cid)}${fld(t("f_len"), "len", l.len, "number", ' min="0" step="0.1"')}</div>
    <div class="two">${fld(t("f_label"), "label", l.label)}${sel(t("f_speed"), "speed", l.speed, ["","100M","1G","2.5G","5G","10G","25G","40G","100G"].map(s => opt(s, s || "—", l.speed)).join(""))}</div>
    ${sel(t("f_status"), "status", l.status, ["","planned","installed","active","faulty"].map(s => opt(s, s ? t("st_" + s) : "—", l.status)).join(""))}`, true)}
  ${curApp().linkExtra ? curApp().linkExtra(b, l) : ""}
  <div class="btns"><button class="btn" data-dr="sel:${l.a.d}">← ${esc(devLabel(A))}</button><button class="btn" data-dr="sel:${l.b.d}">${esc(devLabel(Bd))} →</button></div>
  <div class="btns"><button class="btn dan" data-dr="unlink:${l.id}">🗑 ${esc(t("delete"))}</button></div>`;
}
// New cable from a device: pick the other device (searchable), ports and type.
function openLinkDialog(b, fromId, done){
  const from = devById(b, fromId), list = b.devices.filter(d => d.id !== fromId).sort((x, y) => devLabel(x).localeCompare(devLabel(y)));
  modal(`<h3>＋ ${esc(t("linkAdd"))}</h3><p class="muted small">${esc(devFull(b, from))}</p>
    <label class="fld"><span>${esc(t("linkTo"))}</span><input id="lk-q" placeholder="${esc(t("searchHint"))}" autocomplete="off"></label>
    <div id="lk-list" class="scroll pick" style="max-height:34vh"></div>
    <div class="two"><label class="fld"><span>${esc(t("f_portFrom"))}</span><input id="lk-pa"></label><label class="fld"><span>${esc(t("f_portTo"))}</span><input id="lk-pb"></label></div>
    <div class="two"><label class="fld"><span>${esc(t("f_media"))}</span><select id="lk-m">${MEDIA_ORDER.map(m => opt(m, mediaName(m), from && KINDS[from.kind] && from.kind === "camera" ? "poe" : "cat6")).join("")}</select></label><label class="fld"><span>${esc(t("f_cid"))}</span><input id="lk-cid"></label></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="ok">${esc(t("linkAdd"))}</button></div>`, {
      ok: () => { const to = $("#lk-list .on"); if (!to){ toast(t("linkPick")); return; } const v = {pa:$("#lk-pa").value.trim(), pb:$("#lk-pb").value.trim(), cid:$("#lk-cid").value.trim()}, m = $("#lk-m").value; closeModal();
        edit(() => { const l = addLink(b, fromId, to.dataset.id, m, v); if (done) done(l); }); },
      pick: btn => { $$("#lk-list .on").forEach(x => x.classList.remove("on")); btn.classList.add("on"); }
    });
  const draw = () => { const q = $("#lk-q").value.trim().toLowerCase();
    $("#lk-list").innerHTML = list.filter(d => !q || [d.name, d.brand, d.model, d.ip, kindName(d.kind), roomName(b, d.room)].join(" ").toLowerCase().includes(q)).slice(0, 150)
      .map(d => `<button class="pk" data-m="pick" data-id="${d.id}"><svg viewBox="0 0 48 48" width="22" height="22">${ICO[devIcon(d)] || ICO.box}</svg><span><b>${esc(devLabel(d))}</b><small>${esc([kindName(d.kind), roomName(b, d.room), d.ip].filter(Boolean).join(" · "))}</small></span></button>`).join("") || `<p class="muted">${esc(t("notFound"))}</p>`; };
  $("#lk-q").addEventListener("input", draw); draw();
}
/* ---------- "does it still fit?" — one rule for every shrink or resize ----------
   Reducing a size (rack U, device height, port count, NVR channels) is allowed whenever the contents still fit;
   the things that would fall outside are moved to free places, and the user sees what moves before it happens.
   Only when they really don't fit is the change refused, with the numbers. */
// rack: push devices down from the top so that everything fits under newU, keeping their order and moving as few as possible
function rackRepack(b, r, newU, change){
  const L = rackDevices(b, r).map(d => ({d, u:d.u, h:change && change.id === d.id ? change.h : devH(d)}));
  const need = L.reduce((a, x) => a + x.h, 0); if (need > newU) return {ok:false, need, moves:[]};
  // the device whose height changes keeps its bottom U if possible; the others make room by moving down
  L.sort((a, c) => (c.u + c.h) - (a.u + a.h) || c.u - a.u); let ceil = newU; const moves = [];
  L.forEach(x => { const top = Math.min(x.u + x.h - 1, ceil), u = top - x.h + 1; x.nu = u; ceil = u - 1; });
  if (L.some(x => x.nu < 1)){ // something sticks out below: pack again from the bottom, same order
    let floor = 1; L.slice().reverse().forEach(x => { x.nu = Math.max(x.nu, floor); floor = x.nu + x.h; }); if (floor - 1 > newU) return {ok:false, need, moves:[]}; }
  L.forEach(x => { if (x.nu !== x.d.u) moves.push([x.d, x.d.u, x.nu]); });
  return {ok:true, need, moves};
}
const moveText = M => M.slice(0, 12).map(([d, a, c]) => `${devLabel(d)}: U${a} → U${c}`).join("\n") + (M.length > 12 ? `\n… +${M.length - 12}` : "");
async function setRackU(b, r, n){
  n = clamp(Math.round(num(n, r.u)), 1, 60); if (n === r.u) return false;
  if (n > r.u) return edit(() => { r.u = n; }), true;
  const R = rackRepack(b, r, n);
  if (!R.ok){ await uiAlert(t("fitRackNo",{r:r.name, n, need:R.need})); return false; }
  if (R.moves.length && !await uiConfirm(t("fitRackMove",{r:r.name, n, k:R.moves.length}) + "\n\n" + moveText(R.moves), t("fitApply"))) return false;
  edit(() => { R.moves.forEach(([d, , u]) => { d.u = u; }); r.u = n; });
  if (R.moves.length) toast("✓ " + t("fitMoved",{k:R.moves.length})); return true;
}
// a device in a rack gets taller: room above or below it, else the rack makes room, else the numbers
async function setDevHeight(b, d, h){
  const r = d.rack && rackById(b, d.rack); h = clamp(Math.round(num(h, 1)), 1, 60);
  if (!r) return edit(() => { d.params.h = h; }), true;
  for (const u of [d.u, d.u - (h - devH(d))]) if (rackFits(b, r, u, h, d.id)) return edit(() => { d.u = u; d.params.h = h; }), true;
  const R = rackRepack(b, r, r.u, {id:d.id, h});
  if (!R.ok){ await uiAlert(t("fitHNo",{d:devLabel(d), h, r:r.name, free:r.u - (R.need - h), need:h})); return false; }
  if (!await uiConfirm(t("fitHMove",{d:devLabel(d), h, k:R.moves.length}) + "\n\n" + moveText(R.moves.filter(m => m[0] !== d)), t("fitApply"))) return false;
  edit(() => { R.moves.forEach(([x, , u]) => { x.u = u; }); d.params.h = h; }); return true;
}
// a device goes into a rack: a free spot, else the rack is packed down to open one at the top
async function putDevInRack(b, d, r, pref){
  const h = devH(d); let u = pref && rackFits(b, r, pref, h, d.id) ? pref : rackSpot(b, r, h, pref || 0, d.id);
  if (u) return edit(() => { d.rack = r.id; d.u = u; if (!d.floor) d.floor = r.floor; if (!d.room) d.room = r.room; }), true;
  const others = rackDevices(b, r).filter(x => x.id !== d.id), used = others.reduce((a, x) => a + devH(x), 0);
  if (used + h > r.u){ await uiAlert(t("fitRackFull",{r:r.name, free:r.u - used, need:h})); return false; }
  const R = rackRepack(b, r, r.u - h);
  if (!R.ok || !await uiConfirm(t("fitMakeRoom",{r:r.name, k:R.moves.length, d:devLabel(d)}) + "\n\n" + moveText(R.moves), t("fitApply"))) return false;
  edit(() => { R.moves.forEach(([x, , nu]) => { x.u = nu; }); d.rack = r.id; d.u = r.u - h + 1; if (!d.floor) d.floor = r.floor; if (!d.room) d.room = r.room; }); return true;
}
// fewer ports: cables on ports above the new count move to free ports below it (numbered ports only)
async function setPortCount(b, d, n){
  n = Math.max(0, Math.round(num(n, d.ports))); if (n >= num(d.ports)) return edit(() => { d.ports = n; }), true;
  const ends = []; b.links.forEach(l => ["a", "b"].forEach(s => { if (l[s].d === d.id) ends.push({l, s, p:String(l[s].p || "")}); }));
  const isNum = p => /^\d+$/.test(p), high = ends.filter(e => isNum(e.p) && +e.p > n);
  if (!high.length) return edit(() => { d.ports = n; }), true;
  const used = new Set(ends.filter(e => isNum(e.p)).map(e => +e.p)), free = []; for (let p = 1; p <= n; p++) if (!used.has(p)) free.push(p);
  if (free.length < high.length){ await uiAlert(t("fitPortNo",{d:devLabel(d), n, k:high.length, f:free.length, m:used.size})); return false; }
  high.sort((a, c) => +a.p - +c.p);
  if (!await uiConfirm(t("fitPortMove",{d:devLabel(d), n, k:high.length}) + "\n\n" + high.slice(0, 16).map((e, i) => `${e.p} → ${free[i]}`).join(" · "), t("fitApply"))) return false;
  edit(() => { high.forEach((e, i) => { e.l[e.s].p = String(free[i]); }); d.ports = n; }); toast("✓ " + t("fitPortsMoved",{k:high.length})); return true;
}
// fewer NVR channels: cameras on channels above the new count move to free channels
async function setNvrChannels(b, nv, n){
  n = Math.max(0, Math.round(num(n, nv.nvrp.channels))); const C = b.devices.filter(c => c.kind === "camera" && (c.nvrs || []).includes(nv.id));
  if (!n || n >= num(nv.nvrp.channels) || !C.length) return edit(() => { nv.nvrp.channels = n; }), true;
  if (C.length > n){ await uiAlert(t("fitChNo",{d:devLabel(nv), n, k:C.length})); return false; }
  const ch = c => +c.chs[nv.id] || 0, high = C.filter(c => ch(c) > n || !ch(c)), used = new Set(C.map(ch).filter(x => x && x <= n)), free = []; for (let i = 1; i <= n; i++) if (!used.has(i)) free.push(i);
  if (high.length && !await uiConfirm(t("fitChMove",{d:devLabel(nv), n, k:high.length}) + "\n\n" + high.slice(0, 16).map((c, i) => `${devLabel(c)}: ${ch(c) || "—"} → ${free[i]}`).join("\n"), t("fitApply"))) return false;
  edit(() => { high.forEach((c, i) => { c.chs[nv.id] = String(free[i]); if (c.nvr === nv.id) c.ch = c.chs[nv.id]; }); nv.nvrp.channels = n; }); return true;
}
window.FIT = {rackRepack, setRackU, setDevHeight, putDevInRack, setPortCount, setNvrChannels};

// Events of the shared editors (wired once, act on the current selection).
function wireEditors(){
  const dr = $("#drawer");
  dr.addEventListener("toggle", e => { const s = e.target.closest && e.target.closest("details[data-sec]"); if (s) UI.open[s.dataset.sec] = s.open; }, true);
  dr.addEventListener("change", async e => {
    if (e.target.dataset.mf){ multiChange(e.target); return; }
    const el = e.target, path = el.dataset.f; if (!path) return;
    const b = B(), s = UI.sel; if (!s) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (s.type === "dev"){ const d = devById(b, s.id); if (!d) return;
      if (path === "floor" || path === "room" || path === "vlan"){ const r = await resolveNew(path, b, v, {floor:d.floor}); if (r === null){ renderDrawer(); return; } v = r; }
      if (path === "name" && String(v).trim() && nameTaken(b, v, d.id)){ await nameOk(b, v, d.id); renderDrawer(); return; }
      if (path === "params.h" && d.rack){ if (!await setDevHeight(b, d, v)) renderDrawer(); return; }
      if (path === "rack" && v){ const rk = rackById(b, v); if (rk && !await putDevInRack(b, d, rk)) renderDrawer(); return; }
      // RJ45 and SFP are entered apart; the device's port count is their sum (SFP ports are the last numbers)
      if (path === "__rj45" || path === "params.sfp"){ const sfp = Math.max(0, Math.round(num(d.params.sfp))), rj = Math.max(0, Math.round(num(d.ports)) - sfp), nv = Math.max(0, Math.round(num(v)));
        const total = path === "__rj45" ? nv + sfp : rj + nv; if (total < num(d.ports) && !await setPortCount(b, d, total)){ renderDrawer(); return; }
        return edit(() => { d.ports = total; if (path === "params.sfp") d.params.sfp = nv; }); }
      if (path === "ports" && num(v) < num(d.ports)){ if (!await setPortCount(b, d, v)) renderDrawer(); return; }
      if (path === "nvrp.channels" && d.nvrp && num(v) < num(d.nvrp.channels)){ if (!await setNvrChannels(b, d, v)) renderDrawer(); return; }
      if (path === "u" || path === "params.h" || path === "rack"){
        const nr = path === "rack" ? v : d.rack, rk = nr && rackById(b, nr), h = path === "params.h" ? Math.max(1, Math.round(num(v, 1))) : devH(d);
        let u = path === "u" ? Math.round(num(v, 0)) : d.u;
        if (rk && (!u || !rackFits(b, rk, u, h, d.id))){ const occ = rackOcc(b, rk, d.id), who = [...new Set(occ.slice(u, u + h).filter(Boolean))]; await uiAlert(u < 1 || u + h - 1 > rk.u ? t("fitUOut",{u, h, r:rk.name, n:rk.u}) : t("fitUTaken",{u, d:who.map(devLabel).join(", ")})); renderDrawer(); return; }
        return edit(() => { d.rack = nr; d.u = rk ? u : 0; d.params.h = h; if (rk && !d.floor) d.floor = rk.floor; if (rk && !d.room) d.room = rk.room; });
      }
      if (path === "ip" && v && !IP.valid(v)) toast("⚠ " + t("ipBad"));
      if (path === "mac" && v && !macValid(v)) toast("⚠ " + t("macBad"));
      if (path === "ip" && v) v = v.replace(/,/g, ".");
      let applied = null;
      edit(() => { setPath(d, path, NUMF.has(path) ? numOf(path, v) : (typeof v === "string" ? v.trim() : v)); if (path === "kind") normDevice(d); if (path === "floor") d.room = "";
        if ((path === "model" || path === "brand") && d.model && d.cat !== CAT.key(d)){ const r = catMatch(d); if (r){ applySpec(d, r); applied = r; } else if (copyTwin(d)) applied = {brand:d.brand || "", model:d.model}; }
        if (curApp().onDevChange) curApp().onDevChange(b, d, path); });
      if (applied) toast("📚 " + t("catApplied",{m:applied.brand + " " + applied.model}));
    } else if (s.type === "link"){ const l = linkById(b, s.id); if (!l) return; edit(() => { setPath(l, path, NUMF.has(path) ? numOf(path, v) : v); }); }
    else if (curApp().onField) curApp().onField(path, v, el);
  });
  dr.addEventListener("click", async e => {
    const mx = e.target.closest("[data-mdr]"); if (mx){ e.stopPropagation(); multiAct(mx.dataset.mdr); return; }
    const x = e.target.closest("[data-dr]"); if (!x) return; e.stopPropagation();
    const k = x.dataset.dr, b = B(), s = UI.sel;
    if (k === "close"){ UI.sel = null; UI.selBack = null; UI.multi.clear(); render(); return; }
    // going from one card to another inside the panel remembers where we came from (‹ Back at the top of the new card)
    if (k === "selback"){ const B0 = UI.selBack; UI.selBack = B0 && B0.prev || null; UI.sel = B0 ? B0.from : null; render(); return; }
    if (k.startsWith("link:")){ selGo({type:"link", id:k.slice(5)}); return; }
    if (k.startsWith("sel:")){ selGo({type:"dev", id:k.slice(4)}); return; }
    if (k.startsWith("unlink:")){ const id = k.slice(7); edit(() => { b.links = b.links.filter(l => l.id !== id); if (s && s.type === "link") UI.sel = null; }); return; }
    if (!s) return;
    const d = s.type === "dev" && devById(b, s.id);
    if (k === "catalog" && d){ openCatalogPicker(d.kind, rec => edit(() => { applySpec(d, rec); })); return; }
    if (k === "webFill" && d){ webFill(d); return; }
    if (k === "addLink" && d){ openLinkDialog(b, d.id); return; }
    if (k === "dupDev" && d){ edit(() => { const c = clone(d); c.id = uid("d"); c.name = autoName(b, d.kind); c.ip = ""; c.mac = ""; c.serial = ""; c.asset = ""; c.host = "";
      if (c.rack){ const rk = rackById(b, c.rack), u = rk && rackSpot(b, rk, devH(c), topU(d) + 1, null); if (u) c.u = u; else { c.rack = ""; c.u = 0; } }
      b.devices.push(c); Object.values(b.views).forEach(v => { if (v && v.nodes && v.nodes[d.id]){ v.nodes[c.id] = Object.assign({}, v.nodes[d.id], {x:v.nodes[d.id].x + 30, y:v.nodes[d.id].y + 30}); } }); UI.sel = {type:"dev", id:c.id}; }); return; }
    if (k === "delDev" && d){ if (!await uiConfirm(t("delDevConf",{n:devLabel(d)}), t("delete"), true)) return; edit(() => { removeDevices(b, [d.id]); UI.sel = null; }); return; }
    if (curApp().onDrawerAct) curApp().onDrawerAct(k, x, e);
  });
}
/* ---------- floors / rooms / VLAN managers (modal, shared by all apps) ---------- */
function openPlaces(tab){
  const b = B(), cur = tab || "floors";
  const fl = b.floors.map((f, i) => `<tr data-i="${i}"><td><input data-c="name" value="${esc(f.name)}"></td><td class="c">${roomsOn(b, f.id).length}</td><td class="c">${b.devices.filter(d => d.floor === f.id).length}</td><td class="nw"><button class="btn small" data-m="fUp" data-i="${i}">↑</button><button class="btn small" data-m="fDown" data-i="${i}">↓</button><button class="btn small dan" data-m="fDel" data-i="${i}">×</button></td></tr>`).join("");
  const rm = b.rooms.map((r, i) => `<tr data-i="${i}"><td><input data-c="name" value="${esc(r.name)}"></td><td><select data-c="floor">${opt("", t("none"), r.floor)}${b.floors.map(f => opt(f.id, f.name, r.floor)).join("")}</select></td><td><input data-c="users" type="number" min="0" value="${esc(r.users || 0)}" style="width:70px"></td><td class="c">${b.devices.filter(d => d.room === r.id).length}</td><td><button class="btn small dan" data-m="rDel" data-i="${i}">×</button></td></tr>`).join("");
  const vl = b.vlans.map((v, i) => `<tr data-i="${i}"><td><input data-c="color" type="color" value="${esc(v.color || "#888888")}"></td><td><input data-c="vid" value="${esc(v.vid)}" style="width:64px"></td><td><input data-c="name" value="${esc(v.name)}"></td><td><input data-c="subnet" value="${esc(v.subnet || "")}" placeholder="10.10.10.0/24"></td><td><input data-c="gw" value="${esc(v.gw || "")}"></td><td><input data-c="dhcp" value="${esc(v.dhcp || "")}" placeholder="10.10.10.100-200"></td><td><button class="btn small dan" data-m="vDel" data-i="${i}">×</button></td></tr>`).join("");
  modal(`<h3>🏢 ${esc(b.name)} — ${esc(t("places"))}</h3><div class="tabs">${[["floors", t("floors")], ["rooms", t("rooms")], ["vlans", "VLAN"]].map(([k, l]) => `<button class="tabb${k === cur ? " on" : ""}" data-m="tab:${k}">${esc(l)}</button>`).join("")}</div>
    <div class="tsec" data-t="floors"${cur === "floors" ? "" : " hidden"}><table class="t" id="t-fl"><tr><th>${esc(t("f_floor"))}</th><th>${esc(t("rooms"))}</th><th>${esc(t("devices"))}</th><th></th></tr>${fl}</table><button class="btn small" data-m="fAdd">＋ ${esc(t("floorNew"))}</button></div>
    <div class="tsec" data-t="rooms"${cur === "rooms" ? "" : " hidden"}><p class="muted small">${esc(t("roomsHint"))}</p><table class="t" id="t-rm"><tr><th>${esc(t("f_room"))}</th><th>${esc(t("f_floor"))}</th><th>${esc(t("f_users"))}</th><th>${esc(t("devices"))}</th><th></th></tr>${rm}</table><button class="btn small" data-m="rAdd">＋ ${esc(t("roomNew"))}</button></div>
    <div class="tsec" data-t="vlans"${cur === "vlans" ? "" : " hidden"}><div class="scroll"><table class="t" id="t-vl"><tr><th></th><th>ID</th><th>${esc(t("f_name"))}</th><th>${esc(t("subnet"))}</th><th>Gateway</th><th>DHCP</th><th></th></tr>${vl}</table></div><button class="btn small" data-m="vAdd">＋ ${esc(t("vlanNew"))}</button></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="save">${esc(t("save"))}</button></div>`, {
      tab: (bt, e, k) => { $$(".mbox .tabb").forEach(x => x.classList.toggle("on", x === bt)); $$(".mbox .tsec").forEach(x => x.hidden = x.dataset.t !== k); },
      save: () => { readPlaces(b); closeModal(); edit(() => {}); },
      fAdd: () => { readPlaces(b); b.floors.push({id:uid("f"), name:t("floorN",{n:b.floors.length + 1}), lvl:b.floors.length}); normBuilding(b); openPlaces("floors"); },
      fDel: async bt => { readPlaces(b); const f = b.floors[+bt.dataset.i]; if (!f) return openPlaces("floors"); if (!await uiConfirm(t("floorDelConf",{n:f.name}), t("delete"), true)) return openPlaces("floors"); b.floors.splice(+bt.dataset.i, 1); b.rooms.forEach(r => { if (r.floor === f.id) r.floor = ""; }); b.devices.forEach(d => { if (d.floor === f.id) d.floor = ""; }); openPlaces("floors"); },
      fUp: bt => { readPlaces(b); const i = +bt.dataset.i; if (i > 0 && i < b.floors.length){ const x = b.floors.splice(i, 1)[0]; b.floors.splice(i - 1, 0, x); } openPlaces("floors"); },
      fDown: bt => { readPlaces(b); const i = +bt.dataset.i; if (i >= 0 && i < b.floors.length - 1){ const x = b.floors.splice(i, 1)[0]; b.floors.splice(i + 1, 0, x); } openPlaces("floors"); },
      rAdd: () => { readPlaces(b); b.rooms.push({id:uid("r"), name:t("roomN",{n:b.rooms.length + 1}), floor:b.floors[0] ? b.floors[0].id : "", users:0, wall:"drywall"}); openPlaces("rooms"); },
      rDel: async bt => { readPlaces(b); const r = b.rooms[+bt.dataset.i]; if (!r) return openPlaces("rooms"); const n = b.devices.filter(d => d.room === r.id).length; if (n && !await uiConfirm(t("roomDelConf",{n:r.name, c:n}), t("delete"), true)) return openPlaces("rooms"); b.rooms.splice(+bt.dataset.i, 1); b.devices.forEach(d => { if (d.room === r.id) d.room = ""; }); openPlaces("rooms"); },
      vAdd: () => { readPlaces(b); const used = new Set(b.vlans.map(v => +v.vid)); let id = 10; while (used.has(id)) id += 10; b.vlans.push({id:uid("v"), vid:String(id), name:"VLAN " + id, subnet:"", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}); openPlaces("vlans"); },
      vDel: bt => { readPlaces(b); const v = b.vlans[+bt.dataset.i]; if (!v) return openPlaces("vlans"); b.vlans.splice(+bt.dataset.i, 1); b.devices.forEach(d => { if (d.vlan === v.id) d.vlan = ""; Object.values(d.pcfg).forEach(c => { if (c.vlan === v.id) c.vlan = ""; if (c.native === v.id) c.native = ""; }); }); openPlaces("vlans"); }
    }, {wide:true});
}
function readPlaces(b){
  pushUndo();
  $$("#t-fl tr[data-i]").forEach(tr => { const f = b.floors[+tr.dataset.i]; if (f) f.name = tr.querySelector('[data-c="name"]').value.trim() || f.name; });
  $$("#t-rm tr[data-i]").forEach(tr => { const r = b.rooms[+tr.dataset.i]; if (!r) return; r.name = tr.querySelector('[data-c="name"]').value.trim() || r.name; r.floor = tr.querySelector('[data-c="floor"]').value; r.users = num(tr.querySelector('[data-c="users"]').value, 0); });
  $$("#t-vl tr[data-i]").forEach(tr => { const v = b.vlans[+tr.dataset.i]; if (!v) return; ["color","vid","name","subnet","gw","dhcp"].forEach(k => { const el = tr.querySelector(`[data-c="${k}"]`); if (el) v[k] = el.value.trim(); }); });
}
/* ---------- checks shared by all apps ---------- */
function commonWarnings(b){
  const W = [], ips = {}, hosts = {}, macs = {}, sers = {}, ports = {}, cids = {};
  dupGroups(b).forEach(g => W.push(["err", t("w_nameDup",{n:g[0].name, k:g.length}), g[0].id]));
  b.devices.forEach(d => { const n = devLabel(d);
    if (d.ip){ if (!IP.valid(d.ip)) W.push(["err", t("w_ipBad",{n, ip:d.ip}), d.id]); else { const k = d.ip.split("/")[0]; if (ips[k]) W.push(["err", t("w_ipDup",{ip:k, a:ips[k], b:n}), d.id]); ips[k] = n;
      const v = vlanById(b, d.vlan), c = v && IP.cidr(v.subnet); if (c && !IP.inside(IP.host(d.ip), c)) W.push(["", t("w_ipVlan",{n, ip:k, v:v.vid, s:v.subnet}), d.id]); } }
    if (d.host){ const k = d.host.toLowerCase(); if (hosts[k]) W.push(["err", t("w_hostDup",{h:d.host}), d.id]); hosts[k] = 1; }
    if (d.mac){ if (!macValid(d.mac)) W.push(["err", t("w_macBad",{n, m:d.mac}), d.id]); else { const k = macNorm(d.mac); if (macs[k]) W.push(["err", t("w_macDup",{m:d.mac, a:macs[k], b:n}), d.id]); macs[k] = n; } }
    if (d.serial){ const k = d.serial.toLowerCase(); if (sers[k]) W.push(["err", t("w_serDup",{s:d.serial}), d.id]); sers[k] = 1; }
  });
  b.links.forEach(l => {
    [l.a, l.b].forEach(e => { const p = String(e.p || "").trim(); if (!p) return; const d = devById(b, e.d), k = e.d + "|" + p.toLowerCase(); if (ports[k] && !(d && KINDS[d.kind] && KINDS[d.kind].passive && ports[k] < 2)) W.push(["err", t("w_portDup",{n:devLabel(d), p}), e.d]); ports[k] = (ports[k] || 0) + 1; });
    const c = String(l.cid || "").trim(); if (c){ if (cids[c]) W.push(["err", t("w_cidDup",{c}), null]); cids[c] = 1; }
    if (!isFiber(l.media) && ["cat5e","cat6","cat6a","poe"].includes(l.media) && num(l.len) > 90) W.push(["err", t("w_len90",{c:l.cid || linkText(b, l), l:l.len}), null]);
  });
  return W;
}
// Which message template a warning comes from (so «all warnings of this kind» can be hidden, e.g. every same-hostname warning)
let WKIND = null, WKL = "";
function warnKind(txt){
  if (!WKIND || WKL !== store.settings.lang){ WKL = store.settings.lang; const T = I18N[store.settings.lang] || I18N.az; WKIND = Object.entries(T).filter(([k, v]) => typeof v === "string" && v.includes("{") && /^(w_|rw_|pw_|cw_|bd_w|dx_w|wf_w|fit|wn_)/.test(k))
      .map(([k, v]) => [k, new RegExp("^" + v.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[a-z0-9]+\}/gi, "[\\s\\S]*?") + "$")]); }
  const m = WKIND.find(([, rx]) => rx.test(txt)); return m ? m[0] : null;
}
const ignOf = b => { b.ign = b.ign && typeof b.ign === "object" ? b.ign : {txt:[], kind:[]}; b.ign.txt = b.ign.txt || []; b.ign.kind = b.ign.kind || []; return b.ign; };
const isIgnored = (b, w) => { const I = ignOf(b); return I.txt.includes(w[1]) || I.kind.includes(warnKind(w[1])); };
// Warnings box of every app: each warning can be hidden ("ignore") — just this one, or every warning of its kind
function warnBox(W){
  if (!W.length) return "";
  const b = B(), shown = W.filter(w => !isIgnored(b, w)), hid = W.length - shown.length, I = ignOf(b);
  if (!shown.length && !hid) return "";
  const list = UI.showIgn ? W : shown;
  return `<details class="warns"${UI.warnOpen === false ? "" : " open"}><summary>⚠ ${esc(t("warnCount",{n:shown.length}))}${hid ? ` <small class="muted">· ${esc(t("ignHidden",{n:hid}))}</small>` : ""}</summary><div class="wlist">${list.slice(0, 80).map(w => { const ig = isIgnored(b, w);
      return `<div class="warn ${w[0]}${ig ? " ign" : ""}"${w[2] ? ` data-goto="${esc(w[2])}"` : ""}><span class="wtx">${w[0] === "err" ? "⛔" : w[0] === "info" ? "ⓘ" : "⚠"} ${esc(w[1])}</span>${ig ? `<button class="wign" data-wunign="${esc(w[1])}" title="${esc(t("ignUndo"))}">↺</button>` : `<button class="wign" data-wign="${esc(w[1])}" title="${esc(t("ignBtn"))}">🙈 ${esc(t("ignBtnS"))}</button>`}</div>`; }).join("")}${list.length > 80 ? `<div class="warn info">… +${list.length - 80}</div>` : ""}
    ${hid || I.txt.length || I.kind.length ? `<div class="wfoot"><button class="btn small" data-wshow="1">${esc(UI.showIgn ? t("ignHideAgain") : t("ignShow",{n:hid}))}</button>${I.txt.length || I.kind.length ? `<button class="btn small" data-wreset="1">↺ ${esc(t("ignReset"))}</button>` : ""}</div>` : ""}</div></details>`;
}
document.addEventListener("click", async e => {
  const ig = e.target.closest("[data-wign]"), un = e.target.closest("[data-wunign]"), sh = e.target.closest("[data-wshow]"), rs = e.target.closest("[data-wreset]");
  if (!ig && !un && !sh && !rs) return; e.stopPropagation(); e.preventDefault(); const b = B(), I = ignOf(b);
  if (sh){ UI.showIgn = !UI.showIgn; render(); return; }
  if (rs){ if (await uiConfirm(t("ignResetQ"), t("ignReset"))) edit(() => { b.ign = {txt:[], kind:[]}; }); return; }
  if (un){ const w = un.dataset.wunign, k = warnKind(w); edit(() => { I.txt = I.txt.filter(x => x !== w); I.kind = I.kind.filter(x => x !== k); }); return; }
  const w = ig.dataset.wign, k = warnKind(w), n = k ? document.querySelectorAll(".warn .wtx").length : 0; void n;
  const ch = await uiChoice(t("ignQ",{w}), [["one", t("ignOne"), "pri"], ...(k ? [["kind", t("ignKind")]] : [])]);
  if (!ch) return; edit(() => { if (ch === "kind" && k){ if (!I.kind.includes(k)) I.kind.push(k); } else if (!I.txt.includes(w)) I.txt.push(w); });
  toast("🙈 " + t("ignDone"));
}, true);
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches("details.warns")) UI.warnOpen = e.target.open; }, true);
document.addEventListener("click", e => { const g = e.target.closest(".warn[data-goto]"); if (!g) return; const b = B(), id = g.dataset.goto; UI.sel = devById(b, id) ? {type:"dev", id} : rackById(b, id) ? {type:"rack", id} : roomById(b, id) ? {type:"room", id} : {type:"any", id}; render(); const a = curApp(); if (a.reveal) a.reveal(UI.sel); });
