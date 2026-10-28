// Shared building entities: device kinds, devices, racks, cables, floors, rooms, VLANs — and the editors every app uses.
"use strict";
// cat: palette group; rack: can be mounted in a rack (h = default height in U); ports: default port count; sw: switching device
const KINDS = {
  internet:{cat:"net", icon:"internet", phys:false},
  modem:{cat:"net", icon:"modem", ports:4},
  ont:{cat:"net", icon:"ont", ports:4},
  firewall:{cat:"net", icon:"fw", rack:true, h:1, ports:10},
  router:{cat:"net", icon:"router", rack:true, h:1, ports:6},
  coresw:{cat:"net", icon:"coresw", rack:true, h:1, ports:48, sw:true},
  switch:{cat:"net", icon:"sw", rack:true, h:1, ports:24, sw:true},
  wlc:{cat:"net", icon:"wlc", rack:true, h:1, ports:4},
  ap:{cat:"wifi", icon:"ap", ports:1},
  mediaconv:{cat:"fiber", icon:"mediaconv", ports:2},
  pp:{cat:"passive", icon:"pp", rack:true, h:1, ports:24, passive:true},
  fpp:{cat:"fiber", icon:"fpp", rack:true, h:1, ports:24, passive:true},
  splice:{cat:"fiber", icon:"splice", passive:true, ports:0},
  cablemgr:{cat:"rackacc", icon:"cm", rack:true, h:1, passive:true, acc:true},
  brush:{cat:"rackacc", icon:"cm", rack:true, h:1, passive:true, acc:true},
  blank:{cat:"rackacc", icon:"blank", rack:true, h:1, passive:true, acc:true},
  vent:{cat:"rackacc", icon:"blank", rack:true, h:1, passive:true, acc:true},
  shelf:{cat:"rackacc", icon:"shelf", rack:true, h:1, passive:true, acc:true},
  fan:{cat:"rackacc", icon:"fan", rack:true, h:1, acc:true},
  ups:{cat:"power", icon:"ups", rack:true, h:2},
  pdu:{cat:"power", icon:"pdu", rack:true, h:1},
  server:{cat:"compute", icon:"server", rack:true, h:2, ports:4},
  nas:{cat:"compute", icon:"nas", rack:true, h:2, ports:4},
  storage:{cat:"compute", icon:"storage", rack:true, h:2, ports:2},
  camera:{cat:"cctv", icon:"turret", ports:1},
  nvr:{cat:"cctv", icon:"nvr", rack:true, h:2, ports:2},
  dvr:{cat:"cctv", icon:"nvr", rack:true, h:1, ports:1},
  monitor:{cat:"cctv", icon:"monitor"},
  videowall:{cat:"cctv", icon:"wall"},
  workstation:{cat:"end", icon:"workstation", ports:1},
  pc:{cat:"end", icon:"pc", ports:1},
  laptop:{cat:"end", icon:"laptop", ports:1},
  printer:{cat:"end", icon:"printer", ports:1},
  phone:{cat:"end", icon:"phone", ports:2},
  tv:{cat:"end", icon:"tv", ports:1},
  touch:{cat:"end", icon:"touch", ports:1},
  intercom:{cat:"end", icon:"intercom", ports:1},
  access:{cat:"end", icon:"access", ports:1},
  sensor:{cat:"end", icon:"sensor", ports:1},
  iot:{cat:"end", icon:"iot", ports:1},
  outlet:{cat:"passive", icon:"outlet", ports:2, passive:true},
  other:{cat:"end", icon:"box", ports:1}
};
const KIND_ORDER = Object.keys(KINDS);
const kindName = k => t("k_" + (KINDS[k] ? k : "other"));
const CAM_STYLES = {turret:"turret", dome:"camDome", bullet:"camBullet", ptz:"ptz", fisheye:"fisheye", box:"camBullet", cube:"camDome"};
function devIcon(d){ if (!d) return "box"; if (d.kind === "camera") return CAM_STYLES[d.camera && d.camera.style] || "turret"; return (KINDS[d.kind] || KINDS.other).icon; }
const STATUSES = ["planned","installed","active","maintenance","faulty","removed"];
const AIRFLOW = ["f2b","b2f","side","passive"];
// Cable / connection types with drawing style. fiber:true = optical.
const MEDIA = {
  cat6:{c:"#1f6fd6", w:1.8}, cat6a:{c:"#1f6fd6", w:2}, cat5e:{c:"#5b8fd6", w:1.6}, patch:{c:"#3d7fe0", w:1.4},
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
  const def = {name:"", brand:"", model:"", status:"installed", floor:"", room:"", rack:"", u:0, side:"front", host:"", ip:"", mac:"", serial:"", asset:"", fw:"", owner:"", installed:"", warranty:"", vlan:"", notes:"", ports:K.ports || 0, nvr:"", ch:""};
  for (const k in def) if (d[k] === undefined) d[k] = def[k];
  d.params = Object.assign({h:K.h || (K.rack ? 1 : 0), depth:0, weight:0, powerW:0, maxW:0, psu:1, airflow:K.acc || K.passive ? "passive" : "f2b", sfp:0, poePorts:0, poeBudget:0, poeStd:"", poeIn:0, va:0, upsW:0, wh:0, amps:0, feedA:"", feedB:"", feed:""}, d.params || {});
  d.pcfg = d.pcfg && typeof d.pcfg === "object" ? d.pcfg : {};
  if (d.kind === "camera") d.camera = Object.assign({style:"turret", mp:4, lens:"2.8", sensor:"1/3\"", hfov:0, ir:30, ipr:"", codec:"H.265+", fps:25, bitrate:"", rec:"cont", act:30, hours:24, retain:""}, d.camera || {});
  if (d.kind === "nvr" || d.kind === "dvr") d.nvrp = Object.assign({channels:16, inMbps:160, bays:2, hdd:8, raid:"none", maxMp:8}, d.nvrp || {});
  if (d.kind === "splice" || d.kind === "fpp") d.fbox = Object.assign({adapters:d.kind === "fpp" ? 12 : 8, atype:"lcd", trays:2, perTray:12}, d.fbox || {});
  if (d.kind === "ap"){ d.ap = Object.assign({mount:"ceiling", h:3, x:null, y:null, radios:{}}, d.ap || {}); ["2.4","5","6"].forEach(b => { d.ap.radios[b] = Object.assign({on:b !== "6", ch:b === "2.4" ? 1 : b === "5" ? 36 : 5, w:b === "2.4" ? 20 : b === "5" ? 40 : 80, tx:b === "2.4" ? 14 : 20, maxTx:b === "2.4" ? 20 : 23, gain:b === "2.4" ? 3 : 5}, d.ap.radios[b] || {}); }); }
  return d;
}
function normRack(r){
  const def = {name:"Rack", code:"", u:42, floor:"", room:"", row:"", dims:{h:2000, w:600, d:1000}, udepth:800, load:800, coolKw:0, volts:230, pf:0.9, airflow:"f2b", pdus:[], specs:{}, notes:[], view:{power:true, cables:true, assets:true}};
  for (const k in def) if (r[k] === undefined) r[k] = clone(def[k]);
  r.dims = Object.assign({h:2000, w:600, d:1000}, r.dims || {}); return r;
}
/* ---------- lookups ---------- */
const devById = (b, id) => b.devices.find(d => d.id === id);
const rackById = (b, id) => b.racks.find(r => r.id === id);
const linkById = (b, id) => b.links.find(l => l.id === id);
const floorById = (b, id) => b.floors.find(f => f.id === id);
const roomById = (b, id) => b.rooms.find(r => r.id === id);
const vlanById = (b, id) => b.vlans.find(v => v.id === id);
const floorName = (b, id) => id === "__later" ? t("later") : (floorById(b, id) || {}).name || "";
const roomName = (b, id) => id === "__later" ? t("later") : (roomById(b, id) || {}).name || "";
const vlanLabel = (b, id) => { const v = vlanById(b, id); return v ? `${v.vid} · ${v.name}` : ""; };
const devLabel = d => d ? (d.name || [d.brand, d.model].filter(Boolean).join(" ") || kindName(d.kind)) : "?";
const devFull = (b, d) => { if (!d) return "?"; const r = d.rack && rackById(b, d.rack); return devLabel(d) + (r ? ` (${r.name} U${d.u})` : ""); };
const linksOf = (b, id) => b.links.filter(l => l.a.d === id || l.b.d === id);
const otherEnd = (l, id) => l.a.d === id ? l.b : l.a;
const thisEnd = (l, id) => l.a.d === id ? l.a : l.b;
function linkText(b, l){ const A = devById(b, l.a.d), Bd = devById(b, l.b.d); return `${devLabel(A)}${l.a.p ? " :" + l.a.p : ""} → ${devLabel(Bd)}${l.b.p ? " :" + l.b.p : ""}`; }
function appForKind(k){ if (["camera","nvr","dvr","monitor","videowall"].includes(k)) return "cctv"; if (k === "ap") return "wifi"; if (["fpp","splice","mediaconv","ont"].includes(k)) return "fiber"; if (KINDS[k] && KINDS[k].rack) return "rack"; return "topology"; }
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
function newDevice(kind, o = {}){
  const d = normDevice(Object.assign({id:uid("d"), kind}, o));
  if (!d.name) d.name = autoName(B(), kind);
  return d;
}
// Next free name like "SW-01", "CAM-07".
const NAMEPFX = {switch:"SW", coresw:"CORE", firewall:"FW", router:"RTR", modem:"MODEM", ont:"ONT", wlc:"WLC", ap:"AP", camera:"CAM", nvr:"NVR", dvr:"DVR", server:"SRV", nas:"NAS", storage:"STG", ups:"UPS", pdu:"PDU", pp:"PP", fpp:"FPP", splice:"SC", mediaconv:"MC", pc:"PC", laptop:"NB", printer:"PRN", phone:"TEL", tv:"TV", workstation:"WS", monitor:"MON", videowall:"VW", touch:"TP", intercom:"INT", access:"ACS", sensor:"SNS", iot:"IOT", outlet:"TO", internet:"ISP", other:"DEV"};
function autoName(b, kind){
  if (KINDS[kind] && KINDS[kind].acc) return kindName(kind);
  const p = NAMEPFX[kind] || "DEV", used = new Set(b.devices.map(d => d.name)); let i = 1, n;
  do { n = `${p}-${String(i).padStart(2, "0")}`; i++; } while (used.has(n)); return n;
}
function removeDevices(b, ids){
  const set = new Set(ids);
  b.devices = b.devices.filter(d => !set.has(d.id)); b.links = b.links.filter(l => !set.has(l.a.d) && !set.has(l.b.d));
  P().links = P().links.filter(l => !set.has(l.a.d) && !set.has(l.b.d));
  Object.values(b.views).forEach(v => { if (v && v.nodes) ids.forEach(id => delete v.nodes[id]); });
  b.devices.forEach(d => { if (set.has(d.nvr)) d.nvr = ""; if (set.has(d.params.feedA)) d.params.feedA = ""; if (set.has(d.params.feedB)) d.params.feedB = ""; });
}
function addLink(b, a, bb, media, o = {}){ const l = normLink(Object.assign({id:uid("l"), a:{d:a, p:o.pa || ""}, b:{d:bb, p:o.pb || ""}, media:media || "cat6"}, o)); delete l.pa; delete l.pb; b.links.push(l); return l; }
/* ---------- floors & rooms ---------- */
function ensureFloor(b, name){ let f = b.floors.find(x => same(x.name, name)); if (!f){ f = {id:uid("f"), name, lvl:b.floors.length}; b.floors.push(f); normBuilding(b); } return f; }
function ensureRoom(b, floorId, name){ let r = b.rooms.find(x => same(x.name, name) && (x.floor || "") === (floorId || "")); if (!r){ r = {id:uid("r"), name, floor:floorId || "", users:0, wall:"drywall"}; b.rooms.push(r); } return r; }
const roomsOn = (b, fid) => b.rooms.filter(r => (r.floor || "") === (fid || ""));
function floorOpts(b, cur, extra = true){ return opt("", t("none"), cur) + b.floors.map(f => opt(f.id, f.name, cur)).join("") + (extra ? opt("__later", t("later"), cur) + opt("__new", "＋ " + t("floorNew") + "…", "") : ""); }
function roomOpts(b, fid, cur, extra = true){ const L = fid && fid !== "__later" ? roomsOn(b, fid) : b.rooms; return opt("", t("none"), cur) + L.map(r => opt(r.id, r.name + (fid ? "" : r.floor ? " · " + floorName(b, r.floor) : ""), cur)).join("") + (extra ? opt("__later", t("later"), cur) + opt("__new", "＋ " + t("roomNew") + "…", "") : ""); }
function vlanOpts(b, cur, extra = true){ return opt("", t("none"), cur) + b.vlans.map(v => opt(v.id, `${v.vid} · ${v.name}`, cur)).join("") + (extra ? opt("__new", "＋ " + t("vlanNew") + "…", "") : ""); }
// Handles the "＋ new…" options of floor / room / VLAN selects. Resolves to the id to store (or null = cancelled).
async function resolveNew(kind, b, val, ctx = {}){
  if (val !== "__new") return val;
  if (kind === "floor"){ const n = await uiPrompt(t("floorNew")); if (!n || !n.trim()) return null; return ensureFloor(b, n.trim()).id; }
  if (kind === "room"){ const n = await uiPrompt(t("roomNew")); if (!n || !n.trim()) return null; return ensureRoom(b, ctx.floor && ctx.floor !== "__later" ? ctx.floor : "", n.trim()).id; }
  if (kind === "vlan"){ const id = await uiPrompt(t("vlanIdQ")); if (!id || !/^\d+$/.test(id.trim()) || +id < 1 || +id > 4094){ if (id !== null) toast("⚠ " + t("vlanBad")); return null; } const n = await uiPrompt(t("vlanNameQ"), "VLAN " + id.trim()); if (n === null) return null; const sn = await uiPrompt(t("vlanSubnetQ"), ""); const v = {id:uid("v"), vid:id.trim(), name:n.trim() || "VLAN " + id.trim(), subnet:(sn || "").trim(), gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}; b.vlans.push(v); return v.id; }
  return null;
}
const VCOLORS = ["#2f7de1","#14a37f","#d9822b","#8a5cd6","#c9475d","#4d5bd1","#0e8fa8","#b8860b","#6b8e23","#c2185b"];
/* ---------- path helpers for form fields: "name", "params.depth", "camera.mp" ---------- */
function getPath(o, p){ return p.split(".").reduce((x, k) => x == null ? x : x[k], o); }
function setPath(o, p, v){ const ks = p.split("."), last = ks.pop(); let x = o; for (const k of ks){ if (x[k] == null || typeof x[k] !== "object") x[k] = {}; x = x[k]; } x[last] = v; }
const NUMF = new Set(["ports","params.sfp","u","params.h","params.depth","params.weight","params.powerW","params.maxW","params.psu","params.poePorts","params.poeBudget","params.poeIn","params.va","params.upsW","params.wh","params.amps","camera.mp","camera.ir","camera.fps","camera.bitrate","camera.act","camera.hours","camera.retain","camera.hfov","nvrp.channels","nvrp.inMbps","nvrp.bays","nvrp.hdd","nvrp.maxMp","ap.h","ap.x","ap.y","ap.cable","len"]);
/* ---------- shared device editor (drawer) ---------- */
const fld = (label, path, val, type = "text", extra = "") => `<label class="fld"><span>${esc(label)}</span><input data-f="${path}" type="${type}" value="${esc(val ?? "")}"${extra}></label>`;
const sel = (label, path, val, optsHtml, extra = "") => `<label class="fld"><span>${esc(label)}</span><select data-f="${path}"${extra}>${optsHtml}</select></label>`;
const sec = (id, title, body, open) => `<details class="dsec" data-sec="${id}"${open || UI.open && UI.open[id] ? " open" : ""}><summary>${title}</summary><div class="dsb">${body}</div></details>`;
UI.open = {gen:true, loc:true};
function deviceEditor(b, d, opts = {}){
  const K = KINDS[d.kind] || KINDS.other, r = d.rack && rackById(b, d.rack), P2 = d.params;
  const head = `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO[devIcon(d)] || ICO.box}</svg><div><h3>${esc(devLabel(d))}</h3><div class="muted small">${esc(kindName(d.kind))}${d.brand || d.model ? " · " + esc([d.brand, d.model].filter(Boolean).join(" ")) : ""}</div></div><button class="x" data-dr="close" title="${esc(t("close"))}">×</button></div>`;
  const cat = `<div class="catrow"><button class="btn small" data-dr="catalog">📚 ${esc(d.model ? t("catChange") : t("catPick"))}</button>${d.cat ? `<span class="pill ok" title="${esc(t("catLinked"))}">✓ ${esc(t("catFromDb"))}</span>` : ""}${opts.extraHead || ""}</div>`;
  let g = sel(t("f_kind"), "kind", d.kind, KIND_ORDER.map(k => opt(k, kindName(k), d.kind)).join("")) + fld(t("f_name"), "name", d.name)
    + `<div class="two">${fld(t("f_brand"), "brand", d.brand, "text", ' list="dl-brands"')}${fld(t("f_model"), "model", d.model)}</div>`
    + sel(t("f_status"), "status", d.status, STATUSES.map(s => opt(s, t("st_" + s), d.status)).join(""));
  let loc = `<div class="two">${sel(t("f_floor"), "floor", d.floor, floorOpts(b, d.floor))}${sel(t("f_room"), "room", d.room, roomOpts(b, d.floor, d.room))}</div>`;
  if (K.rack) loc += `<div class="two">${sel(t("f_rack"), "rack", d.rack, opt("", t("none"), d.rack) + b.racks.map(x => opt(x.id, x.name, d.rack)).join(""))}${d.rack ? fld(t("f_u"), "u", d.u || "", "number", ` min="1" max="${r ? r.u : 60}"`) : "<span></span>"}</div>`
    + `<div class="two">${fld(t("f_h"), "params.h", P2.h, "number", ' min="1" max="20"')}${d.rack ? sel(t("f_side"), "side", d.side, opt("front", t("sideFront"), d.side) + opt("rear", t("sideRear"), d.side)) : "<span></span>"}</div>`;
  let net = "";
  if (d.kind !== "internet" && !K.acc && !K.passive) net = `<div class="two">${fld(t("f_host"), "host", d.host)}${fld("IP", "ip", d.ip, "text", ' placeholder="10.10.10.2/24" inputmode="decimal"')}</div>
    <div class="two">${fld("MAC", "mac", d.mac, "text", ' placeholder="00:11:22:33:44:55"')}${sel("VLAN", "vlan", d.vlan, vlanOpts(b, d.vlan))}</div>`;
  if (K.ports !== undefined || K.sw || K.passive) net += `<div class="two">${fld(t("f_ports"), "ports", d.ports, "number", ' min="0" max="512"')}${K.sw || ["firewall","router","fpp"].includes(d.kind) ? fld(t("f_sfp"), "params.sfp", d.params.sfp || "", "number", ' min="0" max="64"') : "<span></span>"}</div>`;
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
function connectionsHtml(b, d){
  const L = linksOf(b, d.id);
  return (L.length ? L.map(l => { const o = otherEnd(l, d.id), od = devById(b, o.d), me = thisEnd(l, d.id), M = MEDIA[l.media] || MEDIA.cat6;
    return `<div class="lnk" data-dr="link:${l.id}"><i style="background:${M.c}"></i><span><b>${esc(me.p ? ":" + me.p : "")}</b> → <b>${esc(devLabel(od))}</b>${o.p ? " :" + esc(o.p) : ""}<br><small class="muted">${esc(mediaName(l.media))}${l.cid ? " · " + esc(l.cid) : ""}${l.len ? " · " + esc(l.len) + " m" : ""}</small></span><button class="x" data-dr="unlink:${l.id}" title="${esc(t("delete"))}">×</button></div>`; }).join("") : `<p class="muted small">${esc(t("noLinks"))}</p>`)
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
// Events of the shared editors (wired once, act on the current selection).
function wireEditors(){
  const dr = $("#drawer");
  dr.addEventListener("toggle", e => { const s = e.target.closest && e.target.closest("details[data-sec]"); if (s) UI.open[s.dataset.sec] = s.open; }, true);
  dr.addEventListener("change", async e => {
    const el = e.target, path = el.dataset.f; if (!path) return;
    const b = B(), s = UI.sel; if (!s) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (s.type === "dev"){ const d = devById(b, s.id); if (!d) return;
      if (path === "floor" || path === "room" || path === "vlan"){ const r = await resolveNew(path, b, v, {floor:d.floor}); if (r === null){ renderDrawer(); return; } v = r; }
      if (path === "u" || path === "params.h" || path === "rack"){
        const nr = path === "rack" ? v : d.rack, rk = nr && rackById(b, nr), h = path === "params.h" ? Math.max(1, Math.round(num(v, 1))) : devH(d);
        let u = path === "u" ? Math.round(num(v, 0)) : d.u;
        if (rk){ if (path === "rack") u = rackSpot(b, rk, h, 0, d.id); if (!u || !rackFits(b, rk, u, h, d.id)){ toast("⚠ " + t("rackNoSpace")); renderDrawer(); return; } }
        return edit(() => { d.rack = nr; d.u = rk ? u : 0; d.params.h = h; if (rk && !d.floor) d.floor = rk.floor; if (rk && !d.room) d.room = rk.room; });
      }
      if (path === "ip" && v && !IP.valid(v)) toast("⚠ " + t("ipBad"));
      if (path === "mac" && v && !macValid(v)) toast("⚠ " + t("macBad"));
      edit(() => { setPath(d, path, NUMF.has(path) ? num(v, 0) : (typeof v === "string" ? v.trim() : v)); if (path === "kind") normDevice(d); if (path === "floor") d.room = ""; if (curApp().onDevChange) curApp().onDevChange(b, d, path); });
    } else if (s.type === "link"){ const l = linkById(b, s.id); if (!l) return; edit(() => { setPath(l, path, NUMF.has(path) ? num(v, 0) : v); }); }
    else if (curApp().onField) curApp().onField(path, v, el);
  });
  dr.addEventListener("click", async e => {
    const x = e.target.closest("[data-dr]"); if (!x) return; e.stopPropagation();
    const k = x.dataset.dr, b = B(), s = UI.sel;
    if (k === "close"){ UI.sel = null; UI.multi.clear(); render(); return; }
    if (k.startsWith("link:")){ UI.sel = {type:"link", id:k.slice(5)}; render(); return; }
    if (k.startsWith("sel:")){ UI.sel = {type:"dev", id:k.slice(4)}; render(); return; }
    if (k.startsWith("unlink:")){ const id = k.slice(7); edit(() => { b.links = b.links.filter(l => l.id !== id); if (s && s.type === "link") UI.sel = null; }); return; }
    if (!s) return;
    const d = s.type === "dev" && devById(b, s.id);
    if (k === "catalog" && d){ openCatalogPicker(d.kind, rec => edit(() => { applySpec(d, rec); })); return; }
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
      fDel: async bt => { readPlaces(b); const f = b.floors[+bt.dataset.i]; if (!await uiConfirm(t("floorDelConf",{n:f.name}), t("delete"), true)) return openPlaces("floors"); b.floors.splice(+bt.dataset.i, 1); b.rooms.forEach(r => { if (r.floor === f.id) r.floor = ""; }); b.devices.forEach(d => { if (d.floor === f.id) d.floor = ""; }); openPlaces("floors"); },
      fUp: bt => { readPlaces(b); const i = +bt.dataset.i; if (i > 0){ const x = b.floors.splice(i, 1)[0]; b.floors.splice(i - 1, 0, x); } openPlaces("floors"); },
      fDown: bt => { readPlaces(b); const i = +bt.dataset.i; if (i < b.floors.length - 1){ const x = b.floors.splice(i, 1)[0]; b.floors.splice(i + 1, 0, x); } openPlaces("floors"); },
      rAdd: () => { readPlaces(b); b.rooms.push({id:uid("r"), name:t("roomN",{n:b.rooms.length + 1}), floor:b.floors[0] ? b.floors[0].id : "", users:0, wall:"drywall"}); openPlaces("rooms"); },
      rDel: async bt => { readPlaces(b); const r = b.rooms[+bt.dataset.i]; const n = b.devices.filter(d => d.room === r.id).length; if (n && !await uiConfirm(t("roomDelConf",{n:r.name, c:n}), t("delete"), true)) return openPlaces("rooms"); b.rooms.splice(+bt.dataset.i, 1); b.devices.forEach(d => { if (d.room === r.id) d.room = ""; }); openPlaces("rooms"); },
      vAdd: () => { readPlaces(b); const used = new Set(b.vlans.map(v => +v.vid)); let id = 10; while (used.has(id)) id += 10; b.vlans.push({id:uid("v"), vid:String(id), name:"VLAN " + id, subnet:"", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}); openPlaces("vlans"); },
      vDel: bt => { readPlaces(b); const v = b.vlans[+bt.dataset.i]; b.vlans.splice(+bt.dataset.i, 1); b.devices.forEach(d => { if (d.vlan === v.id) d.vlan = ""; Object.values(d.pcfg).forEach(c => { if (c.vlan === v.id) c.vlan = ""; if (c.native === v.id) c.native = ""; }); }); openPlaces("vlans"); }
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
function warnBox(W){
  if (!W.length) return "";
  return `<details class="warns"${UI.warnOpen === false ? "" : " open"}><summary>⚠ ${esc(t("warnCount",{n:W.length}))}</summary><div class="wlist">${W.slice(0, 80).map(w => `<div class="warn ${w[0]}"${w[2] ? ` data-goto="${esc(w[2])}"` : ""}>${w[0] === "err" ? "⛔" : w[0] === "info" ? "ⓘ" : "⚠"} ${esc(w[1])}</div>`).join("")}${W.length > 80 ? `<div class="warn info">… +${W.length - 80}</div>` : ""}</div></details>`;
}
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches("details.warns")) UI.warnOpen = e.target.open; }, true);
document.addEventListener("click", e => { const g = e.target.closest(".warn[data-goto]"); if (!g) return; const b = B(), id = g.dataset.goto; UI.sel = devById(b, id) ? {type:"dev", id} : rackById(b, id) ? {type:"rack", id} : {type:"any", id}; render(); const a = curApp(); if (a.reveal) a.reveal(UI.sel); });
