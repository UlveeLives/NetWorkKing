/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// FortiGate import: one or more files taken from a FortiGate fill the current building in one step.
//  • the configuration backup (FortiOS text format) — the FortiGate itself, VLANs with their subnets and DHCP ranges,
//    every managed FortiSwitch (name, serial, model, port settings), the FortiLink and switch-to-switch (ISL) links, FortiAPs;
//  • CLI outputs — the MAC tables of the switches (which device is on which port), LLDP neighbours (what is plugged into
//    which port), ARP and DHCP lease lists (IP and name for each MAC);
//  • the FortiSwitch Ports page export (JSON or CSV) — port settings and the device seen on each port.
// Every switch of the file is matched to a switch of the building (by serial, then name) or created; the user sees all
// of it before anything changes, and the whole import is one Undo step.
"use strict";
const FGI = (function(){
const PMx = () => window.PM;
const MACG = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b|\b[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}\b/ig;
const IPG = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const nMac = m => { const h = String(m || "").replace(/[^0-9a-f]/gi, "").toUpperCase(); return h.length === 12 ? h.match(/../g).join(":") : ""; };
const SWSER = /\b(S\d{3}[A-Z][A-Z0-9]{8,14})\b/, APSER = /\b(F[PW]\d{2,3}[A-Z][A-Z0-9]{8,14})\b/;
const pNo = s => { const m = String(s || "").replace(/"/g, "").match(/^port(\d+)$/i); return m ? String(+m[1]) : null; };
const uq = s => String(s === undefined ? "" : s).replace(/^"|"$/g, "").trim();
const vals = s => (String(s || "").match(/"[^"]*"|\S+/g) || []).map(uq);
const maskLen = m => { const x = String(m).split(".").map(Number); return x.length === 4 ? x.reduce((a, o) => a + (o >>> 0).toString(2).split("").filter(c => c === "1").length, 0) : null; };

/* ---------- FortiOS configuration: config / edit / set / next / end → a tree ---------- */
function parseFOS(txt){
  const root = {set:{}, cfg:{}, edits:[]}, st = [root];
  String(txt || "").replace(/\r/g, "").split("\n").forEach(raw => { const l = raw.trim(); let m; if (!l || l[0] === "#") return; const top = st[st.length - 1];
    if ((m = l.match(/^config\s+(.+)$/))){ const c = {set:{}, cfg:{}, edits:[]}, k = m[1].trim(); (top.cfg[k] = top.cfg[k] || []).push(c); st.push(c); return; }
    if ((m = l.match(/^edit\s+(.+)$/))){ const e = {name:uq(m[1]), set:{}, cfg:{}, edits:[], edit:true}; top.edits.push(e); st.push(e); return; }
    if (l === "next"){ if (top.edit && st.length > 1) st.pop(); return; }
    if (l === "end"){ while (st.length > 1 && st[st.length - 1].edit) st.pop(); if (st.length > 1) st.pop(); return; }
    if ((m = l.match(/^set\s+(\S+)\s*(.*)$/))) top.set[m[1]] = m[2].trim();
  });
  return root;
}
// every block with this name anywhere (a FortiGate with VDOMs has them under «config vdom / edit root»)
function all(node, name, out = []){ (node.cfg[name] || []).forEach(c => out.push(c)); Object.values(node.cfg).forEach(L => L.forEach(c => { c.edits.forEach(e => all(e, name, out)); all(c, name, out); })); node.edits.forEach(e => all(e, name, out)); return out; }
const edits = (root, name) => all(root, name).flatMap(c => c.edits);
const swModel = ser => { const m = String(ser).match(/^S(\d{3})([A-Z])([PF])?/); if (!m) return ""; return `FortiSwitch ${m[1]}${m[2]}${m[3] === "P" ? "-POE" : m[3] === "F" ? "-FPOE" : ""}`; };
const swPorts = ser => { const m = String(ser).match(/^S\d(\d{2})/); if (!m) return 0; const n = +m[1]; return n === 8 ? 10 : n === 24 ? 28 : n === 48 ? 52 : 0; };
const apModel = ser => { const m = String(ser).match(/^F[PW](\d{2,3}[A-Z])/); return m ? "FortiAP " + m[1] : ""; };

function fromConfig(txt, R){
  const root = parseFOS(txt), hv = (txt.match(/#config-version=(?:FGT|FG|FWF)_?([0-9A-Z]+?)-/) || [])[1];
  const gl = edits(root, "system global"), glob = all(root, "system global")[0];
  if (glob){ R.fw.hostname = uq(glob.set.hostname) || R.fw.hostname; }
  if (hv && !/^VM/.test(hv)) R.fw.model = "FortiGate " + hv;
  R.kinds.add("config");
  // interfaces: VLANs (vlanid) and aggregates (member)
  edits(root, "system interface").forEach(e => { const S = e.set, ip = vals(S.ip); R.ifaces[e.name] = {vid:S.vlanid, parent:uq(S.interface), members:vals(S.member), alias:uq(S.alias), type:uq(S.type)};
    // the VLANs FortiLink makes by itself (quarantine, voice, video, rspan, onboarding, nac_segment, _default) are not imported as VLANs
    if (S.vlanid && /\.fortilink$/.test(uq(S.alias))) R.sysVlan[e.name] = S.vlanid;
    if (S.vlanid && !/\.fortilink$/.test(uq(S.alias))){ const pr = ip[1] ? maskLen(ip[1]) : null, c = ip[0] && ip[0] !== "0.0.0.0" && pr !== null ? IP.cidr(ip[0] + "/" + pr) : null;
      R.vlans[S.vlanid] = Object.assign(R.vlans[S.vlanid] || {vid:S.vlanid}, {name:uq(S.alias) || e.name, ifname:e.name, gw:ip[0] && ip[0] !== "0.0.0.0" ? ip[0] : "", subnet:c ? IP.str(c.net) + "/" + pr : ""}); } });
  // DHCP servers → the VLAN's DHCP range; reserved addresses → IP / name for a MAC
  edits(root, "system dhcp server").forEach(e => { const ifn = uq(e.set.interface), I = R.ifaces[ifn], rg = (e.cfg["ip-range"] || []).flatMap(c => c.edits).map(x => `${uq(x.set["start-ip"])} – ${uq(x.set["end-ip"])}`).filter(x => x.length > 4);
    if (I && I.vid && R.vlans[I.vid] && rg.length) R.vlans[I.vid].dhcp = rg.join(", ");
    (e.cfg["reserved-address"] || []).flatMap(c => c.edits).forEach(x => { const mac = nMac(uq(x.set.mac)), ip = uq(x.set.ip); if (mac && ip) host(R, mac, {ip, name:uq(x.set.description)}); }); });
  // managed FortiSwitches
  edits(root, "switch-controller managed-switch").forEach(e => { const S = e.set, ser = uq(S.sn) || e.name, sw = sw0(R, ser);
    // FortiOS 7.4 keeps the switch's own name as the «edit» key and the serial in «set sn»
    if (e.name !== ser){ sw.name = e.name; R.alias[e.name] = ser; } else sw.name = uq(S.name) || uq(S.description) || sw.name || ""; sw.model = sw.model || swModel(ser); sw.peer = uq(S["fsw-wan1-peer"]) || sw.peer;
    (e.cfg.ports || []).flatMap(c => c.edits).forEach(p => { const P = p.set;
      if (uq(P.type) === "trunk"){ sw.trunks[p.name] = {members:vals(P.members), fortilink:/^__FoRtI1LiNk/i.test(p.name) || uq(P.fortilink) === "1" || uq(P["fortilink"]) === "enable", isl:uq(P["isl-peer-device-name"]), islPort:uq(P["isl-peer-port-name"])}; return; }
      const n = pNo(p.name); if (!n) return; const o = port(sw, n);
      if (P.description) o.desc = uq(P.description);
      if (P.status) o.admin = /down/.test(P.status) ? "down" : "up";
      if (P.vlan) o.native = uq(P.vlan);
      if (/enable/.test(P["allowed-vlans-all"] || "")) o.allowed = ["all"]; else if (P["allowed-vlans"]) o.allowed = vals(P["allowed-vlans"]);
      if (P["poe-status"]) o.poe = /disable/.test(P["poe-status"]) ? "" : "at";
      if (P.speed && !/auto/.test(P.speed)) o.speed = /100000/.test(P.speed) ? "100G" : /40000/.test(P.speed) ? "40G" : /25000/.test(P.speed) ? "25G" : /10000/.test(P.speed) ? "10G" : /1000/.test(P.speed) ? "1G" : "100M";
      if (P["isl-peer-device-name"]) o.isl = {ser:uq(P["isl-peer-device-name"]), port:uq(P["isl-peer-port-name"])}; });
    // the ports of an ISL trunk lead to the switch named on the trunk
    Object.values(sw.trunks).forEach(tr => { if (!tr.isl) return; tr.members.forEach((m, i) => { const n = pNo(m); if (n && !port(sw, n).isl) port(sw, n).isl = {ser:tr.isl, port:i === 0 ? tr.islPort : ""}; }); }); });
  // FortiAPs
  edits(root, "wireless-controller wtp").forEach(e => { const a = R.aps[e.name] = R.aps[e.name] || {ser:e.name}; a.name = uq(e.set.name) || a.name || e.name; a.model = apModel(e.name); a.profile = uq(e.set["wtp-profile"]); });
}
const sw0 = (R, ser) => R.sw[ser] = R.sw[ser] || {ser, name:"", model:"", ports:{}, trunks:{}, peer:"", macs:{}, lldp:{}};
const port = (sw, n) => sw.ports[n] = sw.ports[n] || {};
const host = (R, mac, o) => { const h = R.hosts[mac] = R.hosts[mac] || {}; if (o.ip && !h.ip) h.ip = o.ip; if (o.name && !h.name) h.name = o.name; };

/* ---------- CLI outputs: MAC tables, LLDP neighbours, ARP, DHCP leases ---------- */
function fromText(txt, R){
  let cur = null, any = false;
  String(txt || "").replace(/\r/g, "").split("\n").forEach(l => { let m;
    const s = l.match(SWSER); if (s && !/\bport\d+\b/i.test(l)){ cur = s[1]; sw0(R, cur); return; }             // «S248EPTF18000001 :» or «Managed Switch : S248…»
    // LLDP neighbours summary: portN  Up  <device>  <ttl>  <capability> …
    if ((m = l.match(/^\s*(port\d+)\s+(?:up|down)\s+(\S+)\s+\d+\s+([A-Z,]+|-)?/i)) && cur && !l.match(MACG)){ const n = pNo(m[1]); if (n && m[2] !== "-"){ sw0(R, cur).lldp[n] = {name:m[2], cap:m[3] || ""}; R.kinds.add("lldp"); any = true; } return; }
    const macs = l.match(MACG); if (!macs) return; const mac = nMac(macs[0]); if (!mac || mac === "FF:FF:FF:FF:FF:FF" || mac === "00:00:00:00:00:00") return;
    const ips = (l.match(IPG) || []).filter(x => IP.toInt(x) !== null), pm = l.replace(macs[0], " ").match(/\bport(\d+)\b/i);
    if (pm && cur){ const sw = sw0(R, cur); (sw.macs[String(+pm[1])] = sw.macs[String(+pm[1])] || new Set()).add(mac); R.kinds.add("mac"); any = true; }
    if (ips.length){ // DHCP lease list: IP  MAC  hostname …;  ARP: IP  age  MAC  interface
      // an ARP line has the age between the IP and the MAC and the interface after it; a lease line has the host name after the MAC
      const arpLine = /(\d{1,3}\.){3}\d{1,3}\s+\d+\s+\S*[0-9a-f]{2}[:-][0-9a-f]{2}/i.test(l), after = l.slice(l.indexOf(macs[0]) + macs[0].length).trim().split(/\s+/)[0] || "";
      const nm = !arpLine && /^[A-Za-z][\w.-]{1,40}$/.test(after) && !R.ifaces[after] && !/^(port|vlan|internal|wan|lan|fortilink|dmz|x\d)/i.test(after) ? after : "";
      host(R, mac, {ip:ips[0], name:nm}); R.kinds.add(nm ? "dhcp" : "arp"); any = true; }
  });
  return any;
}

/* ---------- FortiSwitch Ports page export: JSON or CSV ---------- */
function csvRows(txt){ const rows = []; let row = [], cell = "", q = false; const s = String(txt || "").replace(/\r/g, "");
  for (let i = 0; i < s.length; i++){ const c = s[i]; if (q){ if (c === '"'){ if (s[i + 1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === "," || c === ";" || c === "\t"){ row.push(cell); cell = ""; } else if (c === "\n"){ row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim()); return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] === undefined ? "" : r[i].trim()]))); }
function flat(o, pre = "", out = {}){ if (o && typeof o === "object" && !Array.isArray(o)) Object.entries(o).forEach(([k, v]) => flat(v, pre ? pre + "." + k : k, out));
  else if (Array.isArray(o)) out[pre] = o.map(x => typeof x === "object" ? Object.values(flat(x)).join(" ") : x).join(" "); else out[pre] = o; return out; }
function records(j){ if (Array.isArray(j)) return j; if (j && typeof j === "object"){ for (const k of ["results", "data", "ports", "items", "rows"]) if (Array.isArray(j[k])) return j[k]; const arr = Object.values(j).find(Array.isArray); if (arr) return arr; } return []; }
const FGSER = /\b(F(?:GT|G|WF)[0-9A-Z]{10,16})\b/;
const listOf = v => Array.isArray(v) ? v.map(x => typeof x === "object" ? Object.values(x).join(" ") : String(x)) : String(v === undefined || v === null ? "" : v).split(/\n/);
const vName = x => { const m = String(x).match(/\(([^)]+)\)\s*$/); return (m ? m[1] : String(x)).trim(); };   // «_default.fortilink (_default)» → «_default»
function fromRecords(list, R){
  let n = 0, cur = "";
  const resolve = x => { const v = String(x || "").trim(), m = v.match(/^(.*?)\s*\((S\d{3}[A-Z0-9]{8,})\)$/); if (m){ R.alias[m[1]] = m[2]; return m[2]; } return R.alias[v] || v; };
  // names written as «NAME (SERIAL)» anywhere in the file teach which name is which switch
  list.forEach(r => Object.values(r || {}).forEach(v => listOf(v).forEach(x => { const m = String(x).match(/^(.*?)\s*\((S\d{3}[A-Z0-9]{8,})\)$/); if (m) R.alias[m[1].trim()] = m[2]; })));
  list.forEach(r0 => { const r = r0 || {}, K = Object.keys(r), get = rx => { const k = K.find(x => rx.test(x)); return k === undefined ? undefined : r[k]; };
    const portV = listOf(get(/^port$/i) !== undefined ? get(/^port$/i) : r[K[0]]).join(" ").trim(), filled = K.filter(k => listOf(r[k]).join("").trim()).length;
    const pn = pNo(portV);
    if (!pn){ if (portV && filled === 1) cur = resolve(portV); return; }                                         // a CSV line with only the switch
    const swv = get(/^fortiswitch$|switch.?(id|name|serial)|^serial$/i), ser = swv !== undefined && listOf(swv).join("").trim() ? resolve(listOf(swv).join("").trim()) : cur;
    if (!ser) return; const sw = sw0(R, ser), o = port(sw, pn); n++;
    if (R.alias && !sw.name){ const nm = Object.keys(R.alias).find(k => R.alias[k] === ser); if (nm) sw.name = nm; }
    // «Native VLAN» holds the VLAN — or, on a port that leads to another switch / the FortiGate, that device
    const nat = listOf(get(/native/i)).map(x => x.trim()).filter(Boolean);
    if (nat.length === 1 && (SWSER.test(nat[0]) || FGSER.test(nat[0]) || R.alias[nat[0]] || /\((S\d{3}|F(GT|G|WF))[0-9A-Z]+\)$/.test(nat[0]))){
      const fg = (nat[0].match(FGSER) || [])[1]; if (fg){ o.peer = {fg:true}; R.fw.serial = R.fw.serial || fg; } else o.peer = {ser:resolve(nat[0])}; }
    else if (nat.length) o.native = vName(nat[0]);
    const al = listOf(get(/allowed/i)).map(x => x.trim()).filter(Boolean); if (al.length && !o.peer) o.allowed = al.some(x => /^all$/i.test(x)) ? ["all"] : al.map(vName);
    // «Powered» alone only says PoE is on (the default on a PoE switch); «Powered 7.60W» means a device draws power here
    const po = listOf(get(/^poe/i)).join(" ").trim(); if (po) o.poe = /disab|off|none/i.test(po) ? "" : /\d+(\.\d+)?\s*W/i.test(po) ? "at" : o.poe;
    const ds = listOf(get(/description/i)).join(" ").trim(); if (ds) o.desc = ds;
    const info = listOf(get(/device.?info|connected|device$/i)).map(x => x.trim()).filter(Boolean); if (info.length) o.info = [...new Set(info)];
    info.forEach(x => { if (MACG.test(x)){ MACG.lastIndex = 0; const m = nMac(x.match(MACG)[0]); (sw.macs[pn] = sw.macs[pn] || new Set()).add(m); } MACG.lastIndex = 0; });
  });
  if (n) R.kinds.add("export"); return n;
}

/* ---------- one or more sources → one result ---------- */
function blank(){ return {fw:{hostname:"", model:"", serial:""}, ifaces:{}, vlans:{}, sysVlan:{}, alias:{}, sw:{}, aps:{}, hosts:{}, kinds:new Set(), files:[]}; }
function kindOf(s){ s = String(s || "");
  if (/^\s*[[{]/.test(s)){ try { JSON.parse(s); return "json"; } catch(e){} }
  if (/(^|\n)\s*config\s+\S+/.test(s) && /\n\s*(edit|set)\s/.test(s)) return "config";
  if (/^﻿?[^\n]*,[^\n]*\n/.test(s) && /port\d+/i.test(s) && /^﻿?"?port"?\s*,/i.test(s)) return "csv";
  if (/[,;\t]/.test(s.split("\n")[0] || "") && /port\d+/i.test(s) && !/(^|\n)\s*(S\d{3}[A-Z0-9]{8,})\s*:\s*$/m.test(s)) return "csv";
  return "cli"; }
function build(srcs){
  const R = blank(), order = {config:0, json:1, csv:1, cli:2};
  srcs.forEach(x => { x.kind = kindOf(x.txt); });
  [...srcs].sort((a, b) => order[a.kind] - order[b.kind]).forEach(x => { let ok = false;
    if (x.kind === "config"){ fromConfig(x.txt, R); ok = true; }
    else if (x.kind === "json"){ try { ok = fromRecords(records(JSON.parse(x.txt)), R) > 0; } catch(e){} }
    else if (x.kind === "csv") ok = fromRecords(csvRows(String(x.txt).replace(/^﻿/, "")), R) > 0;
    else ok = fromText(x.txt, R);
    if (!ok) x.kind = ""; });
  // a switch first met by its name (CSV / JSON without a configuration) gets its serial when the alias is known
  Object.keys(R.sw).forEach(k => { const ser = R.alias[k]; if (ser && ser !== k){ const a = R.sw[k], b = sw0(R, ser); b.name = b.name || k; Object.assign(b.ports, a.ports); Object.entries(a.macs).forEach(([p, S]) => b.macs[p] = S); Object.assign(b.lldp, a.lldp); delete R.sw[k]; } });
  Object.values(R.sw).forEach(s => { if (!s.model) s.model = swModel(s.ser); });
  return R; }

/* ---------- applying it to the building ---------- */
const findSw = (b, s) => b.devices.find(d => d.serial && d.serial.toUpperCase() === s.ser.toUpperCase()) || b.devices.find(d => ["switch", "coresw"].includes(d.kind) && s.name && d.name === s.name);
function plan(R){
  const b = B();
  Object.values(R.sw).forEach(s => { s.match = findSw(b, s); s.to = s.match ? s.match.id : "__new"; });
  return b;
}
function vlanOf(b, vid, name, extra){ let v = b.vlans.find(x => String(x.vid) === String(vid));
  if (!v){ v = {id:uid("v"), vid:String(vid), name:name || "VLAN " + vid, subnet:"", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}; b.vlans.push(v); }
  else if (name && /^VLAN \d+$/.test(v.name)) v.name = name;
  Object.entries(extra || {}).forEach(([k, x]) => { if (x && !v[k]) v[k] = x; }); return v; }
function apply(R, opt){
  const b = B(), Q = {vlan:0, sw:0, swNew:0, port:0, link:0, ap:0, dev:0, devNew:0, ip:0, skip:0, apUnknown:0, multi:0};
  // a VLAN given by its interface name, alias or number; FortiLink's own VLANs (_default, quarantine …) count as «none»
  const vidOf = x => { const s = vName(uq(x)); if (!s || /^(_default|quarantine)$/i.test(s) || R.sysVlan[s]) return "";
    return R.ifaces[s] && R.ifaces[s].vid ? R.ifaces[s].vid : /^\d+$/.test(s) ? s : (Object.values(R.vlans).find(v => v.name === s || v.ifname === s) || {}).vid || ""; };
  const linkTo = (a, pa, z, pz, media) => { if (!a || !z) return false; // a free port only; an existing link between the same two ends counts as done
    const LA = PMx().linksAt(b, a.id, pa); if (LA.some(l => (l.a.d === z.id || l.b.d === z.id))) return true; if (LA.length){ Q.skip++; return false; }
    if (pz && PMx().linksAt(b, z.id, pz).length){ Q.skip++; return false; }
    addLink(b, a.id, z.id, media || "cat6", {pa:String(pa), pb:pz ? String(pz) : ""}); Q.link++; return true; };
  // the FortiGate
  let fw = b.devices.find(d => d.kind === "firewall" && ((R.fw.hostname && d.name === R.fw.hostname) || /forti/i.test(d.brand + " " + d.model))) || null;
  if (!fw && R.fw.serial) fw = b.devices.find(d => d.serial && d.serial.toUpperCase() === R.fw.serial.toUpperCase()) || null;
  if (!fw && (R.fw.hostname || R.fw.model || Object.keys(R.sw).length)){ fw = newDevice("firewall", {name:R.fw.hostname && !b.devices.some(x => x.name === R.fw.hostname) ? R.fw.hostname : autoName(b, "firewall"), brand:"Fortinet", model:R.fw.model || "", serial:R.fw.serial || ""}); const r = fw.model && catMatch(fw); if (r) applySpec(fw, r); b.devices.push(fw); Q.devNew++; }
  if (fw){ if (!fw.serial && R.fw.serial) fw.serial = R.fw.serial; if (!fw.model && R.fw.model){ fw.model = R.fw.model; const r = catMatch(fw); if (r) applySpec(fw, r); } }
  // VLANs
  if (opt.vlan) Object.values(R.vlans).forEach(v => { vlanOf(b, v.vid, v.name, {gw:v.gw, subnet:v.subnet, dhcp:v.dhcp}); Q.vlan++; });
  // switches
  const SW = {};
  Object.values(R.sw).forEach(s => { if (s.to === "__skip") return; let d = s.to !== "__new" ? devById(b, s.to) : null;
    if (!d){ d = newDevice("switch", {name:s.name && !b.devices.some(x => x.name === s.name) ? s.name : autoName(b, "switch"), brand:"Fortinet", model:s.model, serial:s.ser});
      const r = s.model && catMatch(d); if (r) applySpec(d, r); if (!num(d.ports)){ const mx = Math.max(swPorts(s.ser), ...Object.keys(s.ports).map(Number), ...Object.keys(s.macs).map(Number)); d.ports = mx > 0 ? mx : 24; }
      b.devices.push(d); Q.swNew++; }
    else { if (!d.serial) d.serial = s.ser; if (!d.brand) d.brand = "Fortinet"; if (!d.model && s.model){ d.model = s.model; const r = catMatch(d); if (r) applySpec(d, r); } }
    SW[s.ser] = d; Q.sw++;
    // port settings
    if (opt.port) Object.entries(s.ports).forEach(([n, o]) => { if (+n > num(d.ports) || o.peer) return; const c = PMx().cfgOf(d, n), put = (k, x) => { if (x === undefined) return; if (opt.over || !c[k] || c[k] === "up") c[k] = x; };
      const nv = o.native ? vidOf(o.native) : "", al = (o.allowed || []).some(x => /^all$/i.test(x)) ? ["all"] : [...new Set((o.allowed || []).map(vidOf).filter(Boolean))];
      const mode = al.length ? "trunk" : nv ? "access" : undefined; put("mode", mode);
      if (mode === "access" && nv) put("vlan", vlanOf(b, nv).id); if (mode === "trunk"){ if (nv) put("native", vlanOf(b, nv).id); put("allowed", al.join(",")); }
      put("desc", o.desc); put("admin", o.admin); put("speed", o.speed); put("poe", o.poe);
      if (!PMx().hasCfg(d, n)) delete d.pcfg[n]; else Q.port++; }); });
  // FortiAPs
  const AP = {};
  if (opt.ap) Object.values(R.aps).forEach(a => { let d = b.devices.find(x => x.serial && x.serial.toUpperCase() === a.ser.toUpperCase()) || b.devices.find(x => x.kind === "ap" && x.name === a.name);
    if (!d){ d = newDevice("ap", {name:a.name && !b.devices.some(x => x.name === a.name) ? a.name : autoName(b, "ap"), brand:"Fortinet", model:a.model, serial:a.ser}); const r = a.model && catMatch(d); if (r) applySpec(d, r); b.devices.push(d); Q.ap++; }
    AP[a.ser.toUpperCase()] = d; AP["n:" + a.name] = d; });
  if (!opt.ap) Object.values(R.aps).forEach(a => { const d = b.devices.find(x => x.serial && x.serial.toUpperCase() === a.ser.toUpperCase()); if (d){ AP[a.ser.toUpperCase()] = d; AP["n:" + a.name] = d; } });
  // links: FortiLink (switch → FortiGate), switch ↔ switch (ISL), LLDP neighbours
  if (opt.link){
    const fgMembers = ifn => { const I = R.ifaces[ifn]; return I && I.members.length ? I.members : ifn ? [ifn] : []; }, fgPort = m => pNo(m) || m;
    const used = {};
    Object.values(R.sw).forEach(s => { const d = SW[s.ser]; if (!d) return;
      Object.entries(s.ports).forEach(([n, o]) => { if (!o.isl || !SW[o.isl.ser]) return; linkTo(d, n, SW[o.isl.ser], pNo(o.isl.port) || "", "cat6"); });
      // a switch whose FortiLink ports lead to another switch (tiered) is not linked to the FortiGate directly
      const fl = Object.values(s.trunks).find(tr => tr.fortilink), islIn = new Set(Object.values(R.sw).flatMap(o => Object.values(o.ports).filter(x => x.isl && x.isl.ser === s.ser).map(x => pNo(x.isl.port))).filter(Boolean));
      const viaSwitch = fl && fl.members.some(m => { const n = pNo(m); return n && ((s.ports[n] && s.ports[n].isl) || islIn.has(n)); });
      if (fw && s.peer && fl && !viaSwitch){ const fm = fgMembers(s.peer); fl.members.forEach(m => { const n = pNo(m); if (!n) return; used[s.peer] = used[s.peer] || 0; const fp = fm[used[s.peer]] ? fgPort(fm[used[s.peer]]) : ""; used[s.peer]++; linkTo(d, n, fw, fp, "cat6"); }); }
      // the export names the device at the far end of an uplink port: pair it with the port on that switch that names this one
      Object.entries(s.ports).forEach(([n, o]) => { if (!o.peer) return;
        if (o.peer.fg){ if (fw){ const fm = fgMembers(s.peer || "fortilink"); linkTo(d, n, fw, fm.length === 1 ? fgPort(fm[0]) : "", "cat6"); } return; }
        const z = R.sw[o.peer.ser], zd = SW[o.peer.ser]; if (!zd) return; const back = z ? Object.entries(z.ports).filter(([, q]) => q.peer && q.peer.ser === s.ser).map(([k]) => k) : [];
        linkTo(d, n, zd, back.length === 1 ? back[0] : "", "cat6"); });
      Object.entries(s.lldp).forEach(([n, nb]) => { const nm = String(nb.name || ""), up = nm.toUpperCase();
        const z = SW[up] || SW[nm] || AP[up] || AP["n:" + nm] || b.devices.find(x => x.name === nm || (x.host && x.host === nm) || (x.serial && x.serial.toUpperCase() === up));
        if (z){ if (z !== d) linkTo(d, n, z, "", "cat6"); return; }
        if (!opt.newDev) return; const cap = String(nb.cap || ""), kind = /W/.test(cap) || APSER.test(up) ? "ap" : /T/.test(cap) ? "phone" : /B/.test(cap) || SWSER.test(up) ? "switch" : /R/.test(cap) ? "router" : "other";
        const x = newDevice(kind, {name:b.devices.some(y => y.name === nm) ? autoName(b, kind) : nm, status:"installed"}); b.devices.push(x); Q.devNew++; linkTo(d, n, x, "", "cat6"); }); }); }
  // «Device Information» of the export: a FortiAP by its name, else one MAC and / or one host name = the device on the port
  if (opt.dev || opt.ap) Object.values(R.sw).forEach(s => { const d = SW[s.ser]; if (!d) return;
    Object.entries(s.ports).forEach(([n, o]) => { if (!o.info || o.peer || +n > num(d.ports)) return; const I = o.info;
      const ap = I.map(x => AP["n:" + x]).find(Boolean); if (ap){ if (opt.ap) linkTo(d, n, ap, "", "cat6"); s.macs[n] = new Set(); return; }
      if (I.some(x => /^FortiAP-/i.test(x))){ Q.apUnknown++; s.macs[n] = new Set(); return; }
      if (!opt.dev) return; const macs = I.filter(x => MACG.test(x) && !(MACG.lastIndex = 0)).map(x => nMac(x.match(MACG)[0])), names = I.filter(x => !MACG.test(x) && !(MACG.lastIndex = 0) && !IP.toInt(x));
      MACG.lastIndex = 0; if (macs.length > 1 || names.length > 1 || (!macs.length && !names.length)){ if (I.length > 1) Q.multi++; s.macs[n] = new Set(); return; }
      const mac = macs[0] || "", nm = names[0] || "", pr = PMx().parts(b, d.id, n), ed = pr.end && devById(b, pr.end.d);
      if (ed && PMx().isNet(ed)) return;
      if (ed){ if (mac && !ed.mac){ ed.mac = mac; Q.dev++; } if (nm && !ed.host) ed.host = nm; s.macs[n] = new Set(); return; }
      let x = (mac && b.devices.find(y => nMac(y.mac) === mac)) || (nm && b.devices.find(y => y.name === nm || y.host === nm));
      if (!x){ if (!opt.newDev){ s.macs[n] = new Set(); return; } const h = R.hosts[mac] || {}; x = newDevice(kindGuess(o), {status:"installed"}); const want = nm || h.name; if (want && !b.devices.some(y => y.name === want)) x.name = want; x.mac = mac; if (nm) x.host = nm; b.devices.push(x); Q.devNew++; }
      if (mac && !x.mac) x.mac = mac; if (!PMx().linksAt(b, x.id).length){ const tail = pr.after.filter(q => PMx().passive(devById(b, q.d))).slice(-1)[0] || {d:d.id, p:n}; linkTo(tail.d === d.id ? d : devById(b, tail.d), tail.p, x, "", "cat6"); }
      Q.dev++; s.macs[n] = new Set(); }); });
  // end devices from the MAC tables (one MAC on a port that leads to no other switch)
  if (opt.dev) Object.values(R.sw).forEach(s => { const d = SW[s.ser]; if (!d) return;
    Object.entries(s.macs).forEach(([n, set]) => { if (set.size !== 1 || +n > num(d.ports)) return; const o = s.ports[n] || {}; if (o.isl || s.lldp[n] && (SWSER.test(String(s.lldp[n].name).toUpperCase()))) return;
      const mac = [...set][0], h = R.hosts[mac] || {}, pr = PMx().parts(b, d.id, n), ed = pr.end && devById(b, pr.end.d);
      if (ed && PMx().isNet(ed)) return;
      if (ed){ if (!ed.mac){ ed.mac = mac; Q.dev++; } if (h.ip && !ed.ip){ ed.ip = h.ip; Q.ip++; } return; }
      let x = b.devices.find(y => nMac(y.mac) === mac);
      if (!x){ if (!opt.newDev) return; x = newDevice("other", {status:"installed"}); if (h.name && !b.devices.some(y => y.name === h.name)) x.name = h.name; x.mac = mac; b.devices.push(x); Q.devNew++; }
      if (h.ip && !x.ip){ x.ip = h.ip; Q.ip++; }
      // through the patch panel when the port already leads to one
      if (!PMx().linksAt(b, x.id).length){ const tail = pr.after.filter(q => PMx().passive(devById(b, q.d))).slice(-1)[0] || {d:d.id, p:n}; linkTo(tail.d === d.id ? d : devById(b, tail.d), tail.p, x, "", "cat6"); }
      Q.dev++; }); });
  // IP / name for every device whose MAC is known (ARP, DHCP leases, reservations)
  if (opt.dev) b.devices.forEach(x => { const h = R.hosts[nMac(x.mac)]; if (!h) return; if (h.ip && !x.ip){ x.ip = h.ip; Q.ip++; } if (h.name && !x.host) x.host = h.name; });
  return Q;
}

// a new device's kind from the name of its port's VLAN (CAMERA → camera, VOICE → IP phone, PRINT → printer)
const kindGuess = o => { const v = String(o.native || "") + " " + (o.allowed || []).join(" ");
  return /cam|cctv|kamera|video|nvr/i.test(o.native || "") ? "camera" : /voice|voip|phone|tel/i.test(o.native || "") ? "phone" : /print/i.test(v) ? "printer" : "other"; };
/* ---------- the window ---------- */
const KN = {config:"fg_kConfig", mac:"fg_kMac", lldp:"fg_kLldp", arp:"fg_kArp", dhcp:"fg_kDhcp", export:"fg_kExport", json:"fg_kExport", csv:"fg_kExport", cli:"fg_kCli"};
function open(first){
  const srcs = []; let R = blank();
  const add = (name, txt) => { if (!String(txt || "").trim()) return; srcs.push({name, txt}); R = build(srcs); draw(); };
  if (first && first.text) srcs.push({name:first.name || t("fg_pasted"), txt:first.text});
  R = build(srcs);
  const draw = () => { const b = plan(R), S = Object.values(R.sw), A = Object.values(R.aps), V = Object.values(R.vlans), H = Object.keys(R.hosts).length;
    const macN = S.reduce((a, s) => a + Object.keys(s.macs).length, 0), lldpN = S.reduce((a, s) => a + Object.keys(s.lldp).length, 0), islN = S.reduce((a, s) => a + Object.values(s.ports).filter(o => o.isl || o.peer).length, 0);
    const swOpts = s => `<option value="__new"${s.to === "__new" ? " selected" : ""}>＋ ${esc(t("fg_new"))}</option>${b.devices.filter(d => ["switch", "coresw"].includes(d.kind)).map(d => `<option value="${d.id}"${s.to === d.id ? " selected" : ""}>${esc(devLabel(d))}${d.serial ? " · " + esc(d.serial) : ""}</option>`).join("")}<option value="__skip"${s.to === "__skip" ? " selected" : ""}>— ${esc(t("fg_skip"))} —</option>`;
    modal(`<h3>⤓ ${esc(t("fg_title"))}</h3><p class="muted small">${esc(t("fg_hint"))}</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-m="file">📄 ${esc(t("fg_addFile"))}</button><button class="btn" data-m="paste">📋 ${esc(t("fg_addText"))}</button><span class="grow"></span>
        ${srcs.length ? `<span class="small muted">${srcs.map(s => `${esc(s.name)} <span class="pill">${esc(s.kind ? t(KN[s.kind] || "fg_kCli") : t("fg_kNone"))}</span>`).join(" ")}</span>` : ""}</div>
      <div id="fg-paste" hidden><textarea id="fg-t" class="mono" rows="7" style="width:100%" spellcheck="false" placeholder="show full-configuration · diagnose switch-controller switch-info mac-table · diagnose switch-controller switch-info lldp neighbors-summary · get system arp · execute dhcp lease-list"></textarea><div class="btns"><button class="btn small pri" data-m="pasteOk">${esc(t("fg_read"))}</button></div></div>
      ${!srcs.length ? `<div class="empty small"><p>${esc(t("fg_empty"))}</p></div>` : `
      <div class="fgsum">${R.fw.hostname || R.fw.model ? `<p>🛡 <b>${esc(R.fw.hostname || "FortiGate")}</b> ${esc(R.fw.model)}</p>` : ""}
        <p class="small">${esc(t("fg_found", {v:V.length, s:S.length, a:A.length, l:islN + lldpN, m:macN, h:H}))}</p></div>
      ${S.length ? `<div class="scroll" style="max-height:32vh"><table class="t"><tr><th>FortiSwitch</th><th>${esc(t("f_model"))}</th><th>${esc(t("fg_ports"))}</th><th>MAC</th><th>LLDP</th><th>${esc(t("fg_to"))}</th></tr>
        ${S.map(s => `<tr><td><b>${esc(s.name || s.ser)}</b><br><small class="muted mono">${esc(s.ser)}</small></td><td>${esc(s.model || "—")}</td><td class="c">${Object.keys(s.ports).length}</td><td class="c">${Object.keys(s.macs).length}</td><td class="c">${Object.keys(s.lldp).length}</td>
          <td><select data-fgsw="${esc(s.ser)}">${swOpts(s)}</select></td></tr>`).join("")}</table></div>` : ""}
      <div class="fgopts">
        <label class="chk"><input type="checkbox" id="fg-vlan"${V.length ? " checked" : " disabled"}> ${esc(t("fg_oVlan", {n:V.length}))}</label>
        <label class="chk"><input type="checkbox" id="fg-port" checked> ${esc(t("fg_oPort"))}</label>
        <label class="chk sub"><input type="checkbox" id="fg-over" checked> ${esc(t("ciOver"))}</label>
        <label class="chk"><input type="checkbox" id="fg-link" checked> ${esc(t("fg_oLink"))}</label>
        <label class="chk"><input type="checkbox" id="fg-ap"${A.length ? " checked" : " disabled"}> ${esc(t("fg_oAp", {n:A.length}))}</label>
        <label class="chk"><input type="checkbox" id="fg-dev"${macN || H ? " checked" : " disabled"}> ${esc(t("fg_oDev"))}</label>
        <label class="chk sub"><input type="checkbox" id="fg-newdev"> ${esc(t("fg_oNewDev"))}</label></div>`}
      <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok"${srcs.length && (S.length || V.length || H) ? "" : " disabled"}>✓ ${esc(t("fg_apply"))}</button></div>`, {
      file: async () => { const txt = await openTextFile(".conf,.txt,.log,.json,.csv,.cfg"); if (txt) add(t("fg_file") + " " + (srcs.length + 1), txt); },
      paste: () => { $("#fg-paste").hidden = false; $("#fg-t").focus(); },
      pasteOk: () => add(t("fg_pasted") + " " + (srcs.length + 1), $("#fg-t").value),
      ok: () => { const o = {vlan:$("#fg-vlan").checked, port:$("#fg-port").checked, over:$("#fg-over").checked, link:$("#fg-link").checked, ap:$("#fg-ap").checked, dev:$("#fg-dev").checked, newDev:$("#fg-newdev").checked};
        $$("[data-fgsw]").forEach(x => { R.sw[x.dataset.fgsw].to = x.value; });
        closeModal(); let Q; edit(() => { Q = apply(R, o); });
        modal(`<h3>✓ ${esc(t("fg_doneT"))}</h3><ul class="small">${[["fg_rSw", Q.sw, Q.swNew], ["fg_rVlan", Q.vlan], ["fg_rPort", Q.port], ["fg_rLink", Q.link], ["fg_rAp", Q.ap], ["fg_rDev", Q.dev, Q.devNew], ["fg_rIp", Q.ip]].filter(x => x[1] || x[2]).map(([k, a, c]) => `<li>${esc(t(k, {n:a, c:c || 0}))}</li>`).join("")}
          ${Q.skip ? `<li class="warn">${esc(t("fg_rSkip", {n:Q.skip}))}</li>` : ""}${Q.apUnknown ? `<li class="warn">${esc(t("fg_rApUnk", {n:Q.apUnknown}))}</li>` : ""}${Q.multi ? `<li>${esc(t("fg_rMulti", {n:Q.multi}))}</li>` : ""}</ul><p class="muted small">${esc(t("fg_doneH"))}</p><div class="mfoot"><span class="grow"></span><button class="btn pri" data-m="close">OK</button></div>`, {}); }
    }, {wide:true, nofocus:true});
    $$("[data-fgsw]").forEach(x => x.addEventListener("change", () => { R.sw[x.dataset.fgsw].to = x.value; })); };
  draw();
}
// a text the general Import button could not read: is it something from a FortiGate?
const looks = txt => { const s = String(txt || ""); return /#config-version=|(^|\n)\s*config (system|switch-controller|firewall)\b/.test(s) || (/\bport\d+\b/i.test(s) && SWSER.test(s)); };
return {open, looks, parseFOS, build, blank, apply};
})();
