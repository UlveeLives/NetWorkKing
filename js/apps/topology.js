// Network topology: physical / logical diagram of the building, IP & VLAN plan, inventory, cable schedule, document.
"use strict";
(function(){
const cfg = {id:"topology", media:["cat6","cat6a","fiber_sm","fiber_mm","poe","isp","wifi","ptp","vpn","console","planned"],
  kinds:["internet","modem","ont","firewall","router","coresw","switch","wlc","ap","server","nas","ups","camera","nvr","decoder","encoder","joystick","poeinj","kvm","alarm","pc","laptop","printer","phone","tv","touch","intercom","access","iot","outlet","other"],
  // VLAN filter: members of the chosen VLAN stay as they are, everything else fades into the background.
  // A device is a member by its own VLAN, by an IP inside the VLAN subnet, or by a switch port that carries the VLAN (access, native or trunk-allowed).
  highlight(b, v){ const id = UI.hlVlan; if (!id) return null; return vlanMembers(b, id); },
  extraPalette(b){ return b.vlans.length ? `<div class="psec"><h4>VLAN</h4><select id="hlv">${opt("", t("hlNone"), UI.hlVlan)}${b.vlans.map(v => opt(v.id, `${v.vid} · ${v.name}`, UI.hlVlan)).join("")}${opt("__none", t("vlNone"), UI.hlVlan)}</select><p class="muted small">${esc(t("hlHint"))}</p></div>` : ""; }
};
document.addEventListener("change", e => { if (e.target.id === "hlv"){ UI.hlVlan = e.target.value; render(); } });
document.addEventListener("click", e => { const c = e.target.closest("[data-vlf]"); if (!c || UI.app !== "topology") return; UI.hlVlan = c.dataset.vlf; render(); });
function allowedHas(str, vid){ return String(str || "").split(/[\s,;]+/).some(x => { if (/^all$/i.test(x)) return true; const m = x.match(/^(\d+)-(\d+)$/); return m ? +vid >= +m[1] && +vid <= +m[2] : x === String(vid); }); }
function inVlan(b, d, vl){ const c = IP.cidr(vl.subnet); return d.vlan === vl.id || !!(c && d.ip && IP.inside(IP.host(d.ip), c)) || Object.values(d.pcfg || {}).some(p => p.vlan === vl.id || p.native === vl.id || (p.mode === "trunk" && allowedHas(p.allowed, vl.vid))); }
function vlanMembers(b, id){ const s = new Set();
  if (id === "__none") b.devices.forEach(d => { if (!b.vlans.some(vl => inVlan(b, d, vl))) s.add(d.id); });
  else { const vl = vlanById(b, id); if (!vl) return null; b.devices.forEach(d => { if (inVlan(b, d, vl)) s.add(d.id); }); }
  b.devices.forEach(d => { if (s.has(d.id) && d.rack) s.add(d.rack); }); return s; }
// chips above the diagram: All · each VLAN · without VLAN
function vlanBar(b){ if (!b.vlans.length) return ""; const cur = UI.hlVlan || "", n = id => { const m = vlanMembers(b, id); return m ? [...m].filter(x => devById(b, x)).length : 0; };
  return `<div class="vlbar"><b>VLAN:</b><button class="vlc${!cur ? " on" : ""}" data-vlf="">${esc(t("vlAll"))} <small>${b.devices.length}</small></button>${b.vlans.slice().sort((a, c) => +a.vid - +c.vid).map(v => `<button class="vlc${cur === v.id ? " on" : ""}" data-vlf="${v.id}" style="--vc:${esc(v.color || "#2f5fc4")}"><i></i>${esc(v.vid)} · ${esc(v.name)} <small>${n(v.id)}</small></button>`).join("")}<button class="vlc${cur === "__none" ? " on" : ""}" data-vlf="__none">${esc(t("vlNone"))} <small>${n("__none")}</small></button></div>`; }
function vlanUse(b, v){ const c = IP.cidr(v.subnet); const ds = b.devices.filter(d => d.vlan === v.id || (c && d.ip && IP.inside(IP.host(d.ip), c))); return {n:ds.length, ips:ds.filter(d => d.ip).length, c}; }
function ipWarnings(b){
  const W = [], seen = {}, nets = [];
  b.vlans.forEach(v => { const id = String(v.vid).trim(); if (!id) return; if (seen[id]) W.push(["err", t("w_vlanDup",{v:id})]); seen[id] = 1;
    if (+id < 1 || +id > 4094) W.push(["err", t("w_vlanRange",{v:id})]);
    if (v.subnet){ const c = IP.cidr(v.subnet); if (!c){ W.push(["err", t("w_cidrBad",{s:v.subnet, v:id})]); return; }
      if (!c.aligned) W.push(["", t("w_cidrAlign",{s:v.subnet, n:IP.str(c.net) + "/" + c.p})]);
      nets.forEach(o => { if (c.net <= o.c.bc && o.c.net <= c.bc) W.push(["err", t("w_overlap",{a:id, b:o.v})]); }); nets.push({v:id, c});
      if (v.gw && !IP.inside(IP.host(v.gw), c)) W.push(["err", t("w_gwOut",{g:v.gw, v:id})]);
      const m = String(v.dhcp || "").match(/^\s*(\d+\.\d+\.\d+\.)?(\d+)\s*-\s*(\d+\.\d+\.\d+\.)?(\d+)\s*$/);
      if (v.dhcp && m){ const pre = IP.str(c.net).split(".").slice(0, 3).join(".") + ".", a = IP.toInt((m[1] || pre) + m[2]), z = IP.toInt((m[3] || m[1] || pre) + m[4]);
        if (a === null || z === null || !IP.inside(a, c) || !IP.inside(z, c)) W.push(["err", t("w_dhcpOut",{r:v.dhcp, v:id})]);
        else { if (v.gw && IP.host(v.gw) >= a && IP.host(v.gw) <= z) W.push(["err", t("w_gwDhcp",{v:id})]);
          b.devices.forEach(d => { const h = d.ip && IP.host(d.ip); if (h !== null && h !== undefined && h >= a && h <= z && d.vlan === v.id) W.push(["", t("w_staticDhcp",{n:devLabel(d), ip:d.ip, v:id}), d.id]); }); } }
      b.devices.forEach(d => { if (!d.ip) return; const h = IP.host(d.ip); if (IP.inside(h, c) && (h === c.net || h === c.bc) && c.p < 31) W.push(["err", t("w_netBc",{n:devLabel(d), ip:d.ip}), d.id]); }); } });
  return W;
}
const warnings = b => [...commonWarnings(b), ...ipWarnings(b)];
registerApp({
  id:"topology", name:"app_topology", desc:"app_topology_d", docName:"doc_topology", color:"#2448a8", dg:cfg,
  glyph:`<circle cx="24" cy="13" r="5" fill="#fff"/><circle cx="12" cy="35" r="5" fill="#ffb703"/><circle cx="36" cy="35" r="5" fill="#5ac8fa"/><path d="M24 18v8M24 26L12 30M24 26l12 4" stroke="#fff" stroke-width="2.5"/>`,
  tabs:[
    {id:"map", label:"tabMap", icon:"🗺", palette:() => dgPalette(B(), cfg),
      render(){ const b = B(); document.body.classList.toggle("linkmode", DG.mode === "link"); return `${warnBox(warnings(b))}${vlanBar(b)}${!b.devices.length && !view(b, cfg.id).boxes.length ? `<div class="empty"><h3>${esc(t("emptyTopoT"))}</h3><p>${esc(t("emptyTopo"))}</p></div>` : !Object.keys(view(b, cfg.id).nodes).length && !view(b, cfg.id).boxes.length ? `<div class="empty"><h3>${esc(t("emptyTopoT"))}</h3><p>${esc(t("emptyPlace",{n:b.devices.length}))}</p><div class="btns" style="justify-content:center"><button class="btn pri" data-pal="placeAll">⤵ ${esc(t("placeAll"))}</button></div></div>` : ""}<div id="dgwrap">${dgSvg(b, cfg)}</div><p class="dghint">${esc(DG.mode === "link" ? t("hintLink") : t("hintMap"))}</p>`; },
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:"#btabs", title:t("tShellT2"), text:t("tShell2")}, {sel:"#pal .seg", title:t("tMapT1"), text:t("tMap1")}, {sel:"#pal .pgrid", title:t("tMapT2"), text:t("tMap2")}, {sel:"#pal .plink", title:t("tMapT3"), text:t("tMap3")}, {sel:"#dgwrap", title:t("tMapT4"), text:t("tMap4")}, {sel:'[data-h="settings"]', title:t("tShellT3"), text:t("tShell3")}]},
    {id:"ip", label:"tabIp", icon:"🌐", render(){ const b = B();
      const rows = b.vlans.map(v => { const u = vlanUse(b, v); return `<tr class="click" data-sel="vlan:${v.id}"><td><i class="sw" style="background:${esc(v.color)};display:inline-block;width:12px;height:12px;border-radius:3px"></i></td><td class="c"><b>${esc(v.vid)}</b></td><td>${esc(v.name)}</td><td class="mono">${esc(v.subnet)}</td><td class="mono">${esc(v.gw)}</td><td class="mono">${esc(v.dhcp)}</td><td class="c">${u.c ? u.c.hosts : "—"}</td><td class="c">${u.n}</td></tr>`; }).join("");
      const ipd = b.devices.filter(d => d.ip).sort((a, c) => (IP.host(a.ip) || 0) - (IP.host(c.ip) || 0));
      return `${warnBox(ipWarnings(b))}<div class="card"><h3>🌐 ${esc(t("vlanPlan"))}<span class="grow"></span><button class="btn small" data-act2="vlans">✎ ${esc(t("edit"))}</button></h3>${b.vlans.length ? `<div class="scroll"><table class="t"><tr><th></th><th>VLAN</th><th>${esc(t("f_name"))}</th><th>${esc(t("subnet"))}</th><th>Gateway</th><th>DHCP</th><th>${esc(t("hosts"))}</th><th>${esc(t("devices"))}</th></tr>${rows}</table></div>` : `<p class="muted">${esc(t("noVlans"))}</p>`}</div>
        <div class="card"><h3>📋 ${esc(t("ipList"))}</h3>${ipd.length ? `<div class="scroll"><table class="t"><tr><th>IP</th><th>${esc(t("f_name"))}</th><th>${esc(t("f_kind"))}</th><th>VLAN</th><th>MAC</th><th>${esc(t("f_room"))}</th></tr>${ipd.map(d => `<tr class="click" data-sel="dev:${d.id}"><td class="mono">${esc(d.ip)}</td><td>${esc(devLabel(d))}</td><td>${esc(kindName(d.kind))}</td><td>${esc(vlanLabel(b, d.vlan))}</td><td class="mono">${esc(d.mac)}</td><td>${esc(roomName(b, d.room))}</td></tr>`).join("")}</table></div>` : `<p class="muted">${esc(t("noIps"))}</p>`}</div>`; },
      tour:() => [{sel:'[data-act2="vlans"]', title:t("tIpT1"), text:t("tIp1")}]},
    {id:"inv", label:"tabInv", icon:"📋", render(){ const b = B(); return `<div class="row" style="margin-bottom:10px">${searchBox("q-inv")}<span class="grow"></span><button class="btn small" data-act2="invCsv">⤓ CSV</button></div>${invTable(b, null, UI.q && UI.q["q-inv"])}`; },
      tour:() => [{sel:"#q-inv", title:t("tInvT1"), text:t("tInv1")}]},
    {id:"cables", label:"tabCables", icon:"🔌", render(){ const b = B(); return `${warnBox(commonWarnings(b).filter(w => !w[2] || true))}<div class="row" style="margin-bottom:10px"><button class="btn small" data-act2="autoCid"># ${esc(t("autoCid"))}</button><button class="btn small" data-act2="cabCsv">⤓ CSV</button></div>${cableTable(b)}`; },
      tour:() => [{sel:'[data-act2="autoCid"]', title:t("tCabT1"), text:t("tCab1")}]},
    docTab("topology", b => { const v = view(b, cfg.id);
      return `<div style="border:1px solid #c7d1e6;border-radius:6px;overflow:hidden">${dgSvg(b, cfg, {print:true}).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px"><div><h3>${esc(t("vlanPlan"))}</h3>${b.vlans.length ? `<table class="t"><tr><th>VLAN</th><th>${esc(t("f_name"))}</th><th>${esc(t("subnet"))}</th><th>Gateway</th><th>DHCP</th></tr>${b.vlans.map(x => `<tr><td class="c"><b>${esc(x.vid)}</b></td><td>${esc(x.name)}</td><td>${esc(x.subnet)}</td><td>${esc(x.gw)}</td><td>${esc(x.dhcp)}</td></tr>`).join("")}</table>` : "—"}</div>
        <div><h3>${esc(t("legend"))}</h3><table class="t">${[...new Set(b.links.map(l => l.media))].map(m => `<tr><td style="width:60px"><svg width="50" height="10"><path d="M2 5H48" stroke="${MEDIA[m].c}" stroke-width="3"${MEDIA[m].dash ? ` stroke-dasharray="${MEDIA[m].dash}"` : ""}/></svg></td><td>${esc(mediaName(m))}</td></tr>`).join("")}${statsRows(b)}</table></div></div>`; })
  ],
  actions(tab){ if (tab.id !== "map") return [{id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}];
    return [{id:"link", icon:"🔗", label:"linkMode", on:DG.mode === "link", fn:() => { DG.mode = DG.mode === "link" ? "select" : "link"; DG.media = DG.media || "cat6"; DG.linkFrom = null; render(); }}, {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; },
  drawer(tab){ const b = B(); if (tab.id === "map") return dgDrawer(b, cfg); const s = UI.sel; if (!s) return "";
    if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d) : ""; } if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; }
    if (s.type === "vlan"){ setTimeout(() => { UI.sel = null; openPlaces("vlans"); }, 0); } return ""; },
  onDrawerAct:(k, el) => dgDrawerAct(cfg, k, el), onField:(p, v, el) => dgField(cfg, p, v, el),
  onKey(e, tab){ if (tab.id === "map") dgKey(cfg, e); }, onEsc(){ return dgEsc(); },
  exports(tab){ const b = B(); return [{icon:"🖼", label:t("exPng"), fn:() => exportDiagram(cfg, "png")}, {icon:"◇", label:t("exSvg"), fn:() => exportDiagram(cfg, "svg")}, {icon:"▦", label:t("exInv"), fn:() => invCsv(b)}, {icon:"▦", label:t("exCab"), fn:() => cableCsv(b)}]; },
  reveal(s){ if (s && (s.type === "dev" || s.type === "rack")){ UI.tabs.topology = "map"; render(); } },
  guide:() => [[t("gTopo1h"), t("gTopo1")], [t("gTopo2h"), t("gTopo2")], [t("gTopo3h"), t("gTopo3")], [t("gTopo4h"), t("gTopo4")], [t("gTopo5h"), t("gTopo5")]]
});
function statsRows(b){ const by = {}; b.devices.forEach(d => { if ((KINDS[d.kind] || {}).acc) return; by[d.kind] = (by[d.kind] || 0) + 1; });
  return Object.entries(by).map(([k, n]) => `<tr><td class="c">${n}</td><td>${esc(kindName(k))}</td></tr>`).join(""); }
document.addEventListener("click", e => { const a = e.target.closest("[data-act2]"); if (!a || UI.app !== "topology") return; const b = B(), k = a.dataset.act2;
  if (k === "vlans") openPlaces("vlans"); else if (k === "invCsv") invCsv(b); else if (k === "cabCsv") cableCsv(b); else if (k === "autoCid") autoCableIds(b, null, "C"); });
APPS.topology.init = () => dgWire(cfg);
})();
