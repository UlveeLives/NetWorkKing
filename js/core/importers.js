/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Import of files from the earlier separate programs into NetWorkKing:
//   PortMap 1.x / 2.x / 3.x (.portmap.json, or a PortMap backup with several buildings),
//   RackLayout 2.x (.rack.json, app "rack-u-layout"),
//   Wolf Suite 2.0 documents (.topology.json, .cctv.json, .fiber.json, .wifi.json).
// Everything becomes shared building data: switches, panels, end devices, racks and cables are real devices and links,
// so the imported data shows up in every app.
"use strict";
/* ---------- helpers ---------- */
const IMP_TYPE_RX = [
  [/access\s*point|^ap\b|wi-?fi|точк/i, "ap"], [/kamera|camera|cam\b|камер|cctv/i, "camera"], [/print|yazıc|принтер/i, "printer"],
  [/telefon|phone|телефон|\btel\b|voip/i, "phone"], [/server|сервер|sunucu/i, "server"], [/\bnvr\b/i, "nvr"], [/\bdvr\b/i, "dvr"],
  [/firewall|forti\s*gate|\bfw\b|брандмауэр/i, "firewall"], [/router|роутер|маршрутиз/i, "router"], [/modem|модем|superbox/i, "modem"],
  [/\btv\b|televizor|телевиз|ekran|display/i, "tv"], [/touch|sensor panel|сенсор/i, "touch"], [/intercom|domofon|домофон|interkom/i, "intercom"],
  [/turnike|access control|kart oxu|скуд|pdks/i, "access"], [/data|outlet|rozetka|priz|розетк/i, "outlet"], [/switch|svitç|коммутатор/i, "switch"],
  [/\bups\b|ибп/i, "ups"], [/laptop|noutbuk|ноутбук/i, "laptop"], [/pc|kompüter|computer|bilgisayar|компьютер|iş yeri|workstation/i, "pc"], [/nas\b|storage/i, "nas"]
];
function kindFromText(s, def = "other"){ const x = String(s || ""); for (const [rx, k] of IMP_TYPE_RX) if (rx.test(x)) return k; return def; }
const RACKH = n => n <= 9 ? 12 : n <= 20 ? 24 : n <= 40 ? 42 : 48;
function impVlan(b, vid, name, subnet, gw, dhcp){
  vid = String(vid || "").trim(); if (!vid) return "";
  let v = b.vlans.find(x => String(x.vid) === vid);
  if (!v){ v = {id:uid("v"), vid, name:name || "VLAN " + vid, subnet:subnet || "", gw:gw || "", dhcp:dhcp || "", color:VCOLORS[b.vlans.length % VCOLORS.length]}; b.vlans.push(v); }
  else { if (!v.subnet && subnet) v.subnet = subnet; if (!v.gw && gw) v.gw = gw; }
  return v.id;
}
// The name from the old file is kept as it is (end devices are often just "PC"); unnamed devices get the next free name.
function impName(b, kind, want){ return want || autoName(b, kind); }
function impDev(b, kind, o = {}){ const d = normDevice(Object.assign({id:uid("d"), kind}, o)); d.name = impName(b, kind, String(o.name || "").trim()); b.devices.push(d); return d; }
function impRack(b, name, u){ const r = {id:uid("k"), name:name || nextRackName(b), u}; normRack(r); b.racks.push(r); return r; }
// Puts devices into a rack from the top down, in the given order.
function stackRack(r, devs){ let top = r.u; devs.forEach(d => { const h = Math.max(1, Math.round(num(d.params.h, 1))); if (top - h + 1 < 1) return; d.rack = r.id; d.u = top - h + 1; d.floor = d.floor || r.floor; d.room = d.room || r.room; top -= h; }); }
async function impAssets(assets){ const map = {}; for (const [id, url] of Object.entries(assets || {})){ try { map[id] = await putAsset(dataURLToBlob(url)); } catch(e){} } return map; }
// Where should the import go: current building, a new building of this project, or a new project.
async function impTarget(n, what){
  const ch = await uiChoice(t("impWhere",{n, w:what}), [["new", t("impNewProj"), "pri"], ["bld", t("impNewBld")], ["cur", t("impCurBld",{b:B().name})]]);
  return ch;
}
function impFinish(target, buildings, projName){
  pushUndo();
  if (target === "new"){ const p = newProject(projName || buildings[0].name); p.buildings = buildings; p.cur = {b:buildings[0].id}; normProject(p); store.projects[p.id] = p; store.cur = p.id; undoStack = []; redoStack = []; }
  else if (target === "bld"){ const p = P(); buildings.forEach(b => p.buildings.push(normBuilding(b))); p.cur.b = buildings[0].id; }
  UI.sel = null; normProject(P()); persist(); render();
}

/* ---------- PortMap 1.x – 3.x ---------- */
function pmFromV1(p){
  const q = {id:p.id || uid("b"), name:p.name, racks:[], switches:clone(p.config.switches || []), floors:[], rooms:[], types:[], vlans:[], conns:[], hiddenConns:[], ports:{}};
  const fk = {}, addF = n => { if (!n || n === "__later") return n || ""; if (!fk[n]){ const k = uid("f"); fk[n] = k; q.floors.push({k, n}); } return fk[n]; };
  (p.config.floors || []).forEach(addF);
  const V1T = {pc:"PC", ap:"Access Point", cam:"Camera", prn:"Printer", tel:"IP Phone", srv:"Server", nvr:"NVR", fw:"Firewall", tv:"TV", tp:"Touch Panel", ic:"Intercom", data:"Data Outlet", oth:"Other"};
  const tk = {}; for (const id of Object.keys(V1T)){ const k = uid("t"); tk[id] = k; q.types.push({k, n:V1T[id]}); }
  const vk = {}; for (const [vid, n, sn] of (p.config.vlans || [])){ const k = uid("v"); vk[vid] = k; q.vlans.push({k, vid, n, sn:sn || ""}); }
  for (const [key, d] of Object.entries(p.ports || {})){
    const conn = d.type === "up" ? "up" : d.panel === "DIR" ? "pc" : "pp";
    q.ports[key] = {sw:d.sw, port:d.port, conn, panel:d.panel || "", pp:d.panel && !["DIR","LATER"].includes(d.panel) ? (d.pp || 1) : "", floor:addF(d.floor), room:d.room || "",
      type:tk[d.type] || "", name:d.name || "", vlan:d.vlan === "none" ? "none" : (vk[d.vlan] || ""), note:d.note || "", peerSw:d.peerSw || "", peerPort:d.peerPort || ""};
  }
  (p.rooms || []).forEach(x => { if (typeof x === "string") q.rooms.push({f:"", n:x}); else if (x && x.n) q.rooms.push({f:addF(x.f), n:x.n}); });
  return q;
}
function pmNormalize(p0){
  const q = p0.config ? pmFromV1(p0) : clone(p0);
  ["switches","floors","rooms","types","vlans","conns","racks"].forEach(k => q[k] = Array.isArray(q[k]) ? q[k] : []); q.ports = q.ports || {};
  // older versions kept the patch panels on each switch: one rack cabinet per switch
  if (!q.racks.length && q.switches.length) q.racks = q.switches.map(s => { const pn = s.panels || [], u = x => ({t:"p", id:x.id, ports:x.ports}); return {id:uid("r"), name:s.name, units:[...pn.filter(x => x.pos === "top").map(u), {t:"s", sw:s.id}, ...pn.filter(x => x.pos !== "top").map(u)]}; });
  for (const s of q.switches) if (!q.racks.some(r => r.units.some(x => x.t === "s" && x.sw === s.id))) q.racks.push({id:uid("r"), name:s.name, units:[{t:"s", sw:s.id}]});
  for (const [k, d] of Object.entries(q.ports)) if (d && d.ip === undefined && d.mac === undefined){ const nm = String(d.name || ""), mi = nm.match(/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/), mm = nm.match(/\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/);
    if (mi || mm) q.ports[k] = Object.assign({}, d, {ip:mi ? mi[0] : "", mac:mm ? mm[0] : "", name:nm.replace(mi ? mi[0] : "\u0000", " ").replace(mm ? mm[0] : "\u0000", " ").replace(/[\s·•|,;/–-]+$/, "").replace(/^[\s·•|,;/–-]+/, "").replace(/\s{2,}/g, " ").trim()}); }
  q.name = q.name || "PortMap"; return q;
}
const PM_HAS = d => !!(d && (d.room || d.type || d.name || d.conn || d.floor || d.note || d.vlan || d.bad || d.ip || d.mac || d.mode || d.cid || d.poe || d.speed || d.admin));
function pmToBuilding(p, b){
  const BCONN = {up:{peer:true}, sfp:{peer:true}, pp:{}, pc:{}}, connObj = k => BCONN[k] || p.conns.find(c => c.k === k) || {}, isPeer = k => !!connObj(k).peer;
  const SW = id => p.switches.find(s => s.id === id), rackOf = id => p.racks.find(r => r.units.some(u => u.t === "s" && u.sw === id));
  const nearPanels = swId => { const r = rackOf(swId); if (!r) return []; const i = r.units.findIndex(u => u.t === "s" && u.sw === swId); let a = null, c = null;
    for (let j = i - 1; j >= 0; j--) if (r.units[j].t === "p"){ a = r.units[j]; break; } for (let j = i + 1; j < r.units.length; j++) if (r.units[j].t === "p"){ c = r.units[j]; break; } return [a, c].filter(Boolean); };
  const defPanel = (sw, port) => { let st = 1; for (const x of nearPanels(sw.id)){ if (port < st + num(x.ports)) return {panel:x.id, pp:port - st + 1}; st += num(x.ports); } return {panel:"", pp:""}; };
  const panelUser = (rk, pid, pp) => { const ids = rk ? rk.units.filter(u => u.t === "s").map(u => u.sw) : []; for (const d of Object.values(p.ports)) if (ids.includes(d.sw) && d.panel === pid && +d.pp === +pp) return d; return null; };
  const rec = (sw, port) => { const r = p.ports[sw.id + "-" + port] || {}; let d = {panel:r.panel, pp:r.pp || ""}; if (r.panel === undefined){ d = defPanel(sw, port); if (d.panel && panelUser(rackOf(sw.id), d.panel, d.pp)) d = {panel:"", pp:""}; } return Object.assign({}, r, {panel:d.panel || "", pp:d.panel ? d.pp : ""}); };
  const F = {}, V = {}, T = {}, SWD = {}, PPD = {};
  // a "floor" that only stands for the link between racks / floors (e.g. «Bağlantı») is not a storey of the building
  p.floors.forEach(f => { F[f.k] = LINK_FLOOR.test(String(f.n).trim()) ? "" : ensureFloor(b, f.n).id; });
  p.vlans.forEach(v => { V[v.k] = impVlan(b, v.vid, v.n, v.sn); });
  p.types.forEach(x => { T[x.k] = kindFromText(x.n); });
  p.rooms.forEach(r => { if (r.n && r.n !== "__later") ensureRoom(b, F[r.f] || "", r.n); });
  const SK = {switch:"switch", firewall:"firewall", router:"router", nvr:"nvr", server:"server", ups:"ups", pdu:"pdu", modem:"modem", other:"other"};
  p.racks.forEach(rk => {
    const devs = [];
    rk.units.forEach(un => { if (un.t === "p"){ const d = impDev(b, "pp", {name:/^\d+$/.test(String(un.id)) ? "PP-" + un.id : String(un.id), ports:num(un.ports, 24)}); PPD[rk.id + "|" + un.id] = d; devs.push(d); }
      else { const s = SW(un.sw); if (!s || SWD[s.id]) return; const d = impDev(b, SK[s.kind] || "switch", {name:s.name, ports:num(s.ports, 24)}); SWD[s.id] = d; devs.push(d); } });
    const r = impRack(b, rk.name, RACKH(devs.reduce((a, d) => a + devH(d), 0))); stackRack(r, devs);
  });
  p.switches.forEach(s => { if (!SWD[s.id]) SWD[s.id] = impDev(b, SK[s.kind] || "switch", {name:s.name, ports:num(s.ports, 24)}); });
  const peerDone = new Set(), byAddr = {};
  p.switches.forEach(s => { const sd = SWD[s.id], rk = rackOf(s.id);
    for (let i = 1; i <= num(s.ports); i++){
      const raw = p.ports[s.id + "-" + i]; if (!PM_HAS(raw)) continue; const r = rec(s, i), port = String(i);
      const c = {mode:r.mode || (r.vlan === "all" ? "trunk" : V[r.vlan] ? "access" : ""), vlan:V[r.vlan] || "", native:V[r.native] || "", allowed:r.allowed || "", speed:r.speed || "", poe:r.poe && r.poe !== "none" ? r.poe : "", admin:r.admin === "down" ? "down" : "up", desc:"", bad:!!r.bad, note:r.note || ""};
      if (c.mode || c.vlan || c.allowed || c.speed || c.poe || c.admin === "down" || c.bad || c.note) sd.pcfg[port] = c;
      const floor = F[r.floor] || "", room = r.room && r.room !== "__later" ? ensureRoom(b, floor, r.room).id : "";
      if (isPeer(r.conn) && r.peerSw && SWD[r.peerSw]){
        const key = [s.id + ":" + i, r.peerSw + ":" + r.peerPort].sort().join("|"); if (peerDone.has(key)) continue; peerDone.add(key);
        addLink(b, sd.id, SWD[r.peerSw].id, r.conn === "sfp" ? "fpatch" : "patch", {pa:port, pb:String(r.peerPort || ""), cid:r.cid || ""}); continue; }
      const hasEnd = r.name || r.type || r.ip || r.mac;
      const panelDev0 = r.panel && !["DIR","LATER"].includes(r.panel) && rk ? PPD[rk.id + "|" + r.panel] : null;
      if (!hasEnd && !floor && !room){ if (panelDev0) addLink(b, sd.id, panelDev0.id, "patch", {pa:port, pb:String(r.pp)}); continue; }
      let kind = T[r.type] || kindFromText(r.name, isPeer(r.conn) ? "router" : hasEnd ? "other" : "outlet");
      const ak = (r.ip || r.mac) && ((r.ip || "") + "|" + (r.mac || "")).toLowerCase();
      let ed = ak && byAddr[ak];
      if (!ed){ ed = impDev(b, kind, {name:r.name, ip:r.ip || "", mac:r.mac || "", floor:floor || (room && roomById(b, room).floor) || "", room, status:"active"}); if (ak) byAddr[ak] = ed; }
      const epNext = () => String(linksOf(b, ed.id).length + 1);
      const panelDev = r.panel && !["DIR","LATER"].includes(r.panel) && rk ? PPD[rk.id + "|" + r.panel] : null;
      if (panelDev){ addLink(b, sd.id, panelDev.id, "patch", {pa:port, pb:String(r.pp)}); addLink(b, panelDev.id, ed.id, "cat6", {pa:String(r.pp), pb:KINDS[ed.kind].ports > 1 ? epNext() : "", cid:r.cid || ""}); }
      else { const l = addLink(b, sd.id, ed.id, kind === "camera" || kind === "ap" ? "poe" : "cat6", {pa:port, cid:r.cid || ""}); if (r.panel === "LATER" || !r.panel && r.conn !== "pc") l.status = "planned"; }
    } });
  return b;
}
async function importPortMap(list){
  const target = await impTarget(list.length, "PortMap"); if (!target) return true;
  const bs = list.map(p0 => { const p = pmNormalize(p0); return pmToBuilding(p, target === "cur" ? B() : newBuilding(p.name)); });
  if (target === "cur"){ pushUndo(); normBuilding(B()); persist(); render(); }
  else impFinish(target, bs, list.length === 1 ? bs[0].name : "PortMap");
  toast("✓ " + t("impPmOk",{n:list.length, d:bs.reduce((a, b) => a + b.devices.length, 0)}));
  return true;
}

/* ---------- RackLayout 2.x ---------- */
const RL_KIND = {pp:"pp", fiberpp:"fpp", cablemgr:"cablemgr", brush:"brush", coresw:"coresw", sw:"switch", fw:"firewall", router:"router", nvr:"nvr", server:"server", ups:"ups", pdu:"pdu", fan:"fan", vent:"vent", blank:"blank", shelf:"shelf", other:"other"};
const RL_MEDIA = {data:"cat6", fiber:"fiber_sm", fiberlc:"fpatch", poe:"poe", power:"power"};
function rackLayoutInto(b, src){
  const r = impRack(b, src.name, num(src.u, 42));
  Object.assign(r, {code:src.code || "", row:src.row || "", load:num(src.load, 800), coolKw:num(src.coolKw), volts:num(src.volts, 230), pf:num(src.pf, .9)});
  r.dims = Object.assign({h:2000, w:600, d:1000}, src.dims || {}); r.specs = Object.assign({}, src.specs || {}); r.notes = Array.isArray(src.notes) ? src.notes.map(String) : [];
  if (src.room) r.room = ensureRoom(b, "", String(src.room)).id;
  const map = {};
  r.pdus = (src.pdus || []).map(p => { const id = uid("p"); map[p.id] = id; return Object.assign({}, p, {id}); });
  (src.devices || []).forEach(x => { const kind = RL_KIND[x.type] || "other";
    const d = impDev(b, kind, {name:x.name, model:x.model || "", ports:num(x.ports, KINDS[kind].ports || 0), rack:r.id, u:num(x.u), side:x.side === "rear" ? "rear" : "front", room:r.room,
      host:x.host || "", ip:x.ip || "", mac:x.mac || "", serial:x.serial || "", asset:x.asset || "", fw:x.fw || "", owner:x.owner || "", status:x.status === "active" || !x.status ? "active" : x.status, installed:x.installed || "", warranty:x.warranty || "",
      notes:[x.note, x.rear].filter(Boolean).join(" · ")});
    Object.assign(d.params, {h:num(x.h, 1), powerW:num(x.power), maxW:num(x.maxW), weight:num(x.weight), depth:num(x.depth), psu:num(x.psu, 1), airflow:x.airflow === "none" ? "passive" : AIRFLOW.includes(x.airflow) ? x.airflow : d.params.airflow, va:num(x.va), wh:num(x.wh), amps:num(x.amps)});
    if (kind === "pdu") d.params.feed = x.feedA === "A" || x.feedA === "B" ? x.feedA : "";
    map[x.id] = d.id; d.__fa = x.feedA; d.__fb = x.feedB; });
  b.devices.filter(d => d.rack === r.id).forEach(d => { if (d.__fa && map[d.__fa]) d.params.feedA = map[d.__fa]; if (d.__fb && map[d.__fb]) d.params.feedB = map[d.__fb]; delete d.__fa; delete d.__fb; });
  (src.links || []).forEach(l => { if (map[l.a] && map[l.b]) addLink(b, map[l.a], map[l.b], RL_MEDIA[l.cable] || "cat6", {label:l.label || "", cid:l.cid || "", pa:l.pa || "", pb:l.pb || ""}); });
  if (src.title || src.subtitle){ b.docs = b.docs || {}; b.docs.rack = {title:src.title || "", sub:src.subtitle || ""}; }
  return r;
}
async function importRackLayout(racks){
  const target = await impTarget(racks.length, "RackLayout"); if (!target) return true;
  const b = target === "cur" ? B() : newBuilding(racks[0].site || racks[0].name || t("bldN",{n:1}));
  racks.forEach(src => rackLayoutInto(b, src));
  if (target === "cur"){ pushUndo(); normBuilding(b); persist(); render(); } else impFinish(target, [b], b.name);
  toast("✓ " + t("impRackOk",{n:racks.length})); return true;
}

/* ---------- Wolf Suite 2.0 documents ---------- */
const V2_MEDIA = {cat6:"cat6", fiber:"fiber_sm", future:"planned", isp:"isp", wifi:"wifi", wl:"wifi", vpn:"vpn", console:"console", poe:"poe", hdmi:"hdmi", coax:"coax", patch:"fpatch", outdoor:"fiber_sm", mm:"fiber_mm"};
const V2_KIND = {cam_in:"camera", cam_out:"camera", ap:"ap", ap_line:"ap", data:"outlet", phone:"phone", guard:"access", printer:"printer", server:"server", switch:"switch"};
const V2_COLOR = c => ZC[c] ? c : c === "navy" ? "black" : "blue";
const iconKind = (() => { let m = null; return ic => { if (!m){ m = {}; Object.entries(KINDS).forEach(([k, v]) => { if (!m[v.icon]) m[v.icon] = k; }); Object.assign(m, {sw:"switch", fw:"firewall", cam:"camera", turret:"camera", camDome:"camera", camBullet:"camera", ptz:"camera", fisheye:"camera", apDisk:"ap", ap:"ap", cloud:"internet", internet:"internet", nvr:"nvr", monitor:"monitor", wall:"videowall", building:""}); } return m[ic]; }; })();
const firstLine = s => String(s || "").split("\n")[0].trim();
function v2Diagram(b, doc, appId, A){
  const v = view(b, appId), map = {}, unplaced = [];
  v.page = {w:Math.max(800, num(doc.page && doc.page.w, 1200)), h:Math.max(500, num(doc.page && doc.page.h, 800))};
  (doc.zones || []).forEach(z => v.boxes.push({id:uid("z"), x:num(z.x), y:num(z.y), w:num(z.w, 200), h:num(z.h, 120), label:z.label || "", sub:z.sub || "", color:V2_COLOR(z.color), dash:!!z.dashed, fill:!!z.fill, tpos:"left", tsize:15}));
  (doc.tables && doc.tables.vlan || []).forEach(r => impVlan(b, r.id || r.vid, r.name, r.subnet, r.gw, r.dhcp));
  (doc.nodes || []).forEach(n => { const p = n.props || {}, a = n.a || {}, x = num(n.x), y = num(n.y), w = num(n.w, 100), h = num(n.h, 40);
    if (n.type === "floor" || n.type === "group" && !(num(p.count) && V2_KIND[p.kind])){ v.boxes.push({id:uid("z"), x, y, w, h, label:firstLine(n.label), sub:n.sub || "", color:V2_COLOR(p.color), dash:!!p.dashed, fill:n.type === "floor", tpos:"left", tsize:15}); return; }
    if (n.type === "text"){ v.anno.push({id:uid("a"), type:"text", text:n.label || "", size:num(p.size, 12), bold:!!p.bold, color:p.tcolor || "#1d2433", x, y, w, h}); return; }
    if (n.type === "shape"){ v.anno.push({id:uid("a"), type:"shape", shape:p.shape || "round", text:n.label || "", color:"yellow", x, y, w, h}); return; }
    if (n.type === "image"){ if (p.img && A[p.img]) v.anno.push({id:uid("a"), type:"image", img:A[p.img], x, y, w, h, op:num(p.op, 100)}); return; }
    if (n.type === "rack"){ const items = lines(p.items).map(s => s.trim()).filter(Boolean), devs = items.map(s => impDev(b, kindFromText(s, /patch/i.test(s) ? "pp" : /panel|odf|fiber|optik/i.test(s) ? "fpp" : "other"), {name:s}));
      devs.forEach(d => { if (/patch/i.test(d.name)) { d.kind = "pp"; normDevice(d); } }); const r = impRack(b, firstLine(n.label) || nextRackName(b), RACKH(devs.length)); stackRack(r, devs.filter(d => KINDS[d.kind].rack));
      v.nodes[r.id] = {x, y, w}; map[n.id] = devs.find(d => KINDS[d.kind].sw) || devs[0]; return; }
    if (n.type === "box" && !p.icon && !(a.ip || a.model || a.serial)){ v.boxes.push({id:uid("z"), x, y, w, h, label:firstLine(n.label), sub:n.sub || "", color:V2_COLOR(p.color), dash:!!p.dashed, fill:false, tpos:"left", tsize:13}); return; }
    let kind = (num(p.count) > 1 || n.type === "endpoint" || n.type === "group") && V2_KIND[p.kind] ? V2_KIND[p.kind] : iconKind(p.icon) || (n.type === "cloud" ? "internet" : n.type === "splice" ? "splice" : kindFromText(n.label + " " + (n.sub || "")));
    if (!KINDS[kind]) kind = "other";
    const cnt = clamp(Math.round(num(p.count, 1)), 1, 256), lbl = firstLine(n.label), st = a.status === "existing" ? "active" : STATUSES.includes(a.status) ? a.status : "installed";
    for (let i = 0; i < cnt; i++){
      const d = impDev(b, kind, {name:cnt > 1 ? "" : lbl, brand:a.vendor || "", model:a.model || "", host:a.host || "", ip:i ? "" : (a.ip || ""), mac:i ? "" : (a.mac || ""), serial:i ? "" : (a.serial || ""), fw:a.fw || "", owner:a.owner || "", installed:a.installed || "", status:st, notes:[cnt > 1 ? lbl : "", n.sub, a.notes, a.location].filter(Boolean).join(" · ")});
      if (kind === "nvr" && p.channels) Object.assign(d.nvrp, {channels:num(p.channels, 16), inMbps:num(p.inMbps, d.nvrp.inMbps), bays:num(p.bays, d.nvrp.bays), hdd:num(p.hdd, d.nvrp.hdd), raid:String(p.raid || "none")});
      if (kind === "camera" && p.kind === "cam_out") d.camera.loc = "out";
      if (!i){ map[n.id] = d; v.nodes[d.id] = n.type === "device" || n.type === "cloud" || n.type === "endpoint" && w < 80 ? {x, y, size:clamp(Math.max(w, h), 40, 90)} : {x, y, boxed:true, w:clamp(w, 90, 360), h:clamp(h, 40, 160)}; }
      else unplaced.push(d);
    } });
  (doc.links || []).forEach(l => { const A1 = map[l.a], B1 = map[l.b]; if (!A1 || !B1 || A1 === B1) return; const c = l.c || {};
    addLink(b, A1.id, B1.id, V2_MEDIA[l.type] || "cat6", {pa:c.pa || c.portA || "", pb:c.pb || c.portB || "", cid:c.cid || "", len:c.length ? num(c.length) : "", label:l.label || c.label || "", status:c.status === "existing" ? "active" : c.status || ""}); });
  if (doc.title){ b.docs = b.docs || {}; b.docs[appId] = {title:doc.title, sub:doc.subtitle || ""}; }
  if (doc.cctv) b.cctv = Object.assign({}, b.cctv, doc.cctv);
  return unplaced.length;
}
// Wi-Fi Plan v2 model library (data-sheet values used by v2), used to fill the radios of imported APs.
const V2_AP = {"U6-LR":["Ubiquiti","Wi-Fi 6",{"2.4":[26,3],"5":[26,5.5]},16.5,300], "U6-Pro":["Ubiquiti","Wi-Fi 6",{"2.4":[22,4],"5":[26,6]},13,350], "U7-Pro":["Ubiquiti","Wi-Fi 7",{"2.4":[22,4],"5":[26,6],"6":[24,6]},21,300],
  "AP-535":["HPE Aruba","Wi-Fi 6",{"2.4":[21,3.8],"5":[21,5.8]},25.5,1024], "AP-635":["HPE Aruba","Wi-Fi 6E",{"2.4":[21,3.8],"5":[21,5.8],"6":[21,5.6]},21.5,1024], "C9136I":["Cisco","Wi-Fi 6E",{"2.4":[23,4],"5":[23,6],"6":[23,6]},30,1200],
  "R750":["Ruckus","Wi-Fi 6",{"2.4":[24,3],"5":[25,3]},25.5,1024], "MR46":["Cisco Meraki","Wi-Fi 6",{"2.4":[25,4],"5":[25,6]},21.6,512], "EAP670":["TP-Link Omada","Wi-Fi 6",{"2.4":[23,4],"5":[25,5]},22.5,500],
  "Generic-6":["","Wi-Fi 6",{"2.4":[20,3],"5":[23,5]},15,256], "Generic-6E":["","Wi-Fi 6E",{"2.4":[20,3],"5":[23,5],"6":[23,5]},25,256]};
function v2Wifi(b, doc, A){
  const W = wset2(b), sws = {};
  W.cfg = Object.assign({}, W.cfg, doc.cfg || {}); W.view = Object.assign({}, W.view, doc.view || {});
  W.ssid = (doc.tables && doc.tables.ssid || []).slice(); W.notes = (doc.notes || []).slice(); W.equip = (doc.equip || []).slice();
  (doc.tables && doc.tables.sw || []).forEach(s => { if (!s.name) return; const d = impDev(b, "switch", {name:s.name, ports:num(s.ports, 24), notes:s.loc || ""}); d.params.poeBudget = num(s.budget); d.params.poePorts = num(s.ports); sws[s.name] = d; });
  const fl = {}; (doc.floors || []).slice().reverse().forEach(f => {
    const sf = {id:uid("f"), name:firstLine(f.name) || t("bldN",{n:1}), lvl:b.floors.length, plan:{desc:f.desc || "", color:f.color || "blue", wm:num(f.wm, 40), hm:num(f.hm, 14), img:f.img && A[f.img] ? A[f.img] : null, op:num(f.op, 60), idf:f.idf || null, walls:(f.walls || []).map(w => Object.assign({}, w)), survey:(f.survey || []).map(s => Object.assign({}, s)), cal:!!f.calibrated}};
    b.floors.push(sf); fl[f.id] = sf.id;
    (f.rooms || []).forEach(r => b.rooms.push({id:uid("r"), name:lines(r.label).join(" ").trim() || "—", floor:sf.id, users:num(r.users), wall:r.wall || "drywall", geo:{x:num(r.x), y:num(r.y), w:num(r.w, 1), h:num(r.h, 1)}}));
  });
  (doc.aps || []).forEach(a => { const M = V2_AP[a.model] || V2_AP["Generic-6"];
    const d = impDev(b, "ap", {name:a.name, brand:M[0], model:a.model && !/^Generic/.test(a.model) ? a.model : "", floor:fl[a.floor] || "", status:a.status === "active" ? "active" : a.status || "planned", ip:a.ip || "", mac:a.mac || "", serial:a.serial || "", notes:a.note || ""});
    d.params.poeIn = M[3]; d.ap.std = M[1]; d.ap.maxClients = M[4];
    Object.assign(d.ap, {x:num(a.x), y:num(a.y), h:num(a.h, 3), mount:a.mount || "ceiling", cable:a.cable || "", vlans:a.vlans || ""});
    ["2.4","5","6"].forEach(bd => { const R = d.ap.radios[bd], src = a.radios && a.radios[bd] || {}, m = M[2][bd];
      if (!m){ R.none = true; R.on = false; return; } R.none = false; R.maxTx = m[0]; R.gain = m[1]; Object.assign(R, {on:src.on !== undefined ? !!src.on : R.on, ch:num(src.ch, R.ch), w:num(src.w, R.w), tx:Math.min(num(src.tx, R.tx), m[0])}); });
    const sw = sws[String(a.sw || "").trim()]; if (sw) addLink(b, sw.id, d.id, "poe", {pa:a.port || ""}); else if (a.sw || a.port) d.notes = [d.notes, "Switch: " + [a.sw, a.port].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  });
  if (doc.title){ b.docs = b.docs || {}; b.docs.wifi = {title:doc.title, sub:""}; }
}
const wset2 = b => { b.wifi = b.wifi && typeof b.wifi === "object" ? b.wifi : {}; return b.wifi; };
const V2_APPS = {"net-topology":"topology", "cctv-topology":"cctv", "fiber-backbone":"fiber", "wifi-plan":"wifi"};
async function importWolf2(j){
  const docs = j.docs || [], app = V2_APPS[j.app];
  const target = await impTarget(docs.length, "Wolf Suite 2.0"); if (!target) return true;
  const A = await impAssets(j.assets);
  const bs = []; let un = 0;
  docs.forEach(doc => { const b = target === "cur" ? B() : newBuilding(doc.name);
    if (app === "wifi") v2Wifi(b, doc, A); else un += v2Diagram(b, doc, app, A);
    if (target !== "cur") bs.push(b); });
  if (target === "cur"){ pushUndo(); normBuilding(B()); persist(); render(); } else impFinish(target, bs, docs[0] && docs[0].name);
  UI.app = app; render();
  toast("✓ " + t("impV2Ok",{n:docs.length}) + (un ? " · " + t("impUnplaced",{n:un}) : ""));
  return true;
}

/* ---------- entry point (called by importAny for files that are not NetWorkKing projects) ---------- */
async function importLegacy(j){
  if (!j || typeof j !== "object") return false;
  if (j.type === "portmap-project" && j.project) return importPortMap([j.project]);
  if (j.projects && typeof j.projects === "object" && !j.settings){ const L = Object.values(j.projects).filter(p => p && p.ports && (p.config || p.switches)); if (L.length) return importPortMap(L); }
  if (j.ports && (j.config || j.switches)) return importPortMap([j]);
  if (j.app === "rack-u-layout" && Array.isArray(j.racks)) return importRackLayout(j.racks);
  if (Array.isArray(j.devices) && j.u && !j.project) return importRackLayout([j]);
  if (V2_APPS[j.app] && Array.isArray(j.docs)) return importWolf2(j);
  return false;
}
