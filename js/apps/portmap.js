// Port Map: every switch / patch panel port of the building, the chain switch port → patch panel → outlet → device,
// switch-port settings (access / trunk, VLAN, PoE, speed), TIA-606 labels, checks and port lists.
"use strict";
(function(){
const PKINDS = ["switch","coresw","pp","fpp","firewall","router","wlc","modem","ont","server","nas","nvr","dvr","outlet","mediaconv"];
const NETK = new Set(["switch","coresw","firewall","router","wlc","modem","ont","mediaconv"]);
const ENDK = ["pc","laptop","printer","phone","ap","camera","tv","touch","intercom","access","iot","sensor","server","nas","nvr","decoder","encoder","joystick","alarm","kvm","poeinj","workstation","switch","firewall","router","outlet","other"];
const POE = {"":0, af:15.4, at:30, bt3:60, bt4:90};
const passive = d => !!(d && KINDS[d.kind] && KINDS[d.kind].passive);
const portDev = d => d && num(d.ports) > 0 && !["internet","splice"].includes(d.kind) && !(KINDS[d.kind] || {}).acc;
const isNet = d => d && NETK.has(d.kind);
const P0 = p => String(p ?? "").trim();
/* ---------- port graph ---------- */
const linksAt = (b, id, p) => b.links.filter(l => (l.a.d === id && P0(l.a.p) === P0(p)) || (l.b.d === id && P0(l.b.p) === P0(p)));
const endOf = (l, id, p) => (l.a.d === id && P0(l.a.p) === P0(p)) ? l.b : l.a;
// Follow a cable from (id, p) through passive devices (patch panels, outlets) until an active device.
function walk(b, id, p, first){
  const out = [], seen = new Set(); let cur = {d:id, p}, l = first;
  for (let i = 0; i < 8 && l && !seen.has(l.id); i++){
    seen.add(l.id); const o = endOf(l, cur.d, cur.p), od = devById(b, o.d); out.push({d:o.d, p:P0(o.p), link:l});
    if (!od || !passive(od)) break;
    const nx = linksAt(b, o.d, o.p).filter(x => x !== l && !seen.has(x.id)); cur = {d:o.d, p:o.p}; l = nx[0];
  }
  return out;
}
// Whole chain through (id, p), oriented network side first: [{d, p, link (cable before this hop)}].
function chainAt(b, id, p){
  const L = linksAt(b, id, p), start = {d:id, p:P0(p)};
  if (!L.length) return [start];
  const sides = L.slice(0, 2).map(l => walk(b, id, p, l));
  if (sides.length === 1) return isNet(devById(b, id)) || !passive(devById(b, id)) ? [start, ...sides[0]] : orient([start, ...sides[0]]);
  const endA = devById(b, sides[0][sides[0].length - 1].d), endB = devById(b, sides[1][sides[1].length - 1].d);
  const [left, right] = isNet(endB) && !isNet(endA) ? [sides[1], sides[0]] : [sides[0], sides[1]];
  const L2 = left.slice().reverse(), lk = left.map(h => h.link).reverse();
  const res = L2.map((h, i) => ({d:h.d, p:h.p, link:i ? lk[i - 1] : null}));
  res.push({d:id, p:P0(p), link:lk[lk.length - 1]}); right.forEach(h => res.push(h)); return res;
}
function orient(c){ const last = devById(B(), c[c.length - 1].d); if (isNet(last) && !isNet(devById(B(), c[0].d))){ const r = c.slice().reverse(), lk = c.map(h => h.link); return r.map((h, i) => ({d:h.d, p:h.p, link:i ? lk[lk.length - i] : null})); } return c; }
// Parts of the chain seen from a switch port: patch panel hop, the device at the far end and the cable to it.
function parts(b, id, p){
  const c = chainAt(b, id, p), me = c.findIndex(h => h.d === id && h.p === P0(p));
  const after = c.slice(me + 1), before = c.slice(0, me);
  const pas = after.filter(h => passive(devById(b, h.d))), end = after.find(h => !passive(devById(b, h.d))) || null;
  return {chain:c, me, before, after, panel:pas[0] || null, outlet:pas.find(h => devById(b, h.d).kind === "outlet") || null, end, endLink:end ? end.link : null};
}
const cfgOf = (d, p) => { d.pcfg[p] = Object.assign({mode:"", vlan:"", native:"", allowed:"", speed:"", poe:"", admin:"up", desc:"", bad:false, note:""}, d.pcfg[p] || {}); return d.pcfg[p]; };
const hasCfg = (d, p) => { const c = d.pcfg[p]; return !!(c && (c.mode || c.vlan || c.native || c.allowed || c.speed || c.poe || c.admin === "down" || c.desc || c.bad || c.note)); };
function label606(b, pp, port){ if (!pp || !port) return ""; const r = pp.rack && rackById(b, pp.rack); return `${r ? String(r.name).replace(/\s+/g, "") + "-" : ""}${String(pp.name).replace(/\s+/g, "")}-${String(port).padStart(2, "0")}`; }
function portState(b, d, p){
  const c = d.pcfg[p] || {}, L = linksAt(b, d.id, p);
  if (c.bad) return "bad"; if (c.admin === "down") return "down"; if (!L.length) return hasCfg(d, p) ? "cfg" : "free";
  const pr = parts(b, d.id, p); if (passive(d)) return pr.before.length && pr.after.length ? "up" : "half";
  if (!pr.end) return "half";
  return isNet(devById(b, pr.end.d)) ? "uplink" : "up";
}
/* ---------- port grid (PortMap look: dark rack, units, ports coloured by the connected device type) ---------- */
// Device-type colours of PortMap 1–3.
const TCOL = {pc:"#2f7de1", laptop:"#2f7de1", workstation:"#2f7de1", ap:"#14a37f", camera:"#d9822b", printer:"#8a5cd6", phone:"#c9475d", server:"#4d5bd1", nas:"#4d5bd1", storage:"#4d5bd1",
  nvr:"#8a6d3b", dvr:"#8a6d3b", firewall:"#b3262f", router:"#b3262f", tv:"#0e8fa8", monitor:"#0e8fa8", videowall:"#0e8fa8", touch:"#c2569f", intercom:"#5e8f2e", access:"#5e8f2e", outlet:"#8e9bd4", iot:"#2a9d8f", sensor:"#2a9d8f", ups:"#6d597a", pdu:"#6d597a", other:"#7c8a99"};
const UPLINK = "#e0b51b";
const tcol = k => TCOL[k] || TCOL.other;
function portLook(b, d, p, st){
  if (st === "free" || st === "down") return {c:"", k:""};
  if (st === "cfg") return {c:"var(--filled)", k:""};
  const pr = parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d);
  if (st === "uplink") return {c:UPLINK, k:"uplink", dir:!pr.panel && !passive(d)};
  if (ed) return {c:tcol(ed.kind), k:ed.kind, dir:!pr.panel && !passive(d)};
  return {c:"var(--filled)", k:""};
}
function grid(b, d){
  const n = Math.max(0, Math.round(num(d.ports))), sfp = clamp(Math.round(num(d.params.sfp)), 0, n), cu = n - sfp, s = UI.sel;
  const cell = i => { const p = String(i), st = portState(b, d, p), c = d.pcfg[p] || {}, v = c.vlan && vlanById(b, c.vlan), on = s && s.type === "port" && s.id === d.id && s.p === p;
    const pr = st !== "free" ? parts(b, d.id, p) : null, ed = pr && pr.end && devById(b, pr.end.d), L = portLook(b, d, p, st);
    const tip = [`${devLabel(d)} :${p}`, ed ? "→ " + devLabel(ed) + (ed.room ? " · " + roomName(b, ed.room) : "") : "", v ? "VLAN " + v.vid : c.mode === "trunk" ? "trunk" : "", c.poe ? "PoE " + c.poe : ""].filter(Boolean).join("\n");
    return `<button class="p s-${st}${L.c ? " in" : ""}${L.dir ? " dir" : ""}${st === "half" ? " later" : ""}${i > cu ? " sfp" : ""}${on ? " sel" : ""}${c.mode === "trunk" ? " trunk" : ""}" data-port="${d.id}:${p}" title="${esc(tip)}"${L.c ? ` style="--pc:${L.c}"` : ""}>${esc(p)}${c.poe ? "<i>⚡</i>" : ""}</button>`; };
  // Patch panels are numbered left to right in one row (24 per row, as on the panel itself); switches odd / even in two rows.
  if (passive(d)){ const per = Math.min(24, Math.max(1, cu)), all = []; for (let i = 1; i <= n; i++) all.push(cell(i));
    return `<div class="pgr"><div class="pgc pp" style="grid-template-columns:repeat(${per},minmax(20px,30px))">${all.join("")}</div></div>`; }
  const half = Math.ceil(cu / 2), top = [], bot = [];
  for (let i = 1; i <= cu; i++) (i % 2 ? top : bot).push(cell(i));
  const sf = []; for (let i = cu + 1; i <= n; i++) sf.push(cell(i));
  return `<div class="pgr"><div class="pgc" style="grid-template-columns:repeat(${Math.max(1, half)},minmax(22px,30px))">${top.join("")}${bot.join("")}</div>${sf.length ? `<div class="pgc sf" style="grid-template-columns:repeat(${Math.ceil(sf.length / 2)},minmax(22px,30px))">${sf.filter((_, i) => i % 2 === 0).join("")}${sf.filter((_, i) => i % 2 === 1).join("")}</div>` : ""}</div>`;
}
function devRow(b, d){
  const on = UI.sel && UI.sel.type === "dev" && UI.sel.id === d.id, used = Array.from({length:Math.round(num(d.ports))}, (_, i) => linksAt(b, d.id, i + 1).length ? 1 : 0).reduce((a, c) => a + c, 0);
  return `<div class="unit${isNet(d) ? " switch" : ""}${on ? " on" : ""}"><div class="lbl" data-sel="dev:${d.id}" title="${esc(t("edit"))}">${esc(devLabel(d))}<small>${esc([d.brand, d.model].filter(Boolean).join(" ") || kindName(d.kind))}${d.u ? " · U" + d.u : ""}</small><small>${used}/${Math.round(num(d.ports))}${d.ip ? " · " + esc(d.ip.split("/")[0]) : ""}</small></div>${grid(b, d)}</div>`;
}
function legend(b){
  const kinds = [...new Set(b.devices.filter(d => !portDev(d) || !isNet(d)).filter(d => linksOf(b, d.id).length && !passive(d)).map(d => d.kind))];
  const sw = (bg, l, cls = "") => `<span><i class="sw ${cls}" style="background:${bg}"></i>${esc(l)}</span>`;
  return `<div class="pmlegend">${kinds.length ? kinds.map(k => sw(tcol(k), kindName(k))).join("") + `<span class="sep"></span>` : `<span>${esc(t("pmLgTypes"))}</span><span class="sep"></span>`}
    ${sw("var(--port)", t("pmLgFree"))}${sw("var(--filled)", t("pmLgCfg"))}${sw(UPLINK, t("pmLgUplink"))}${sw("var(--port)", t("pmLgDir"), "dirk")}${sw("var(--port)", t("pmLgHalf"), "laterk")}${sw("var(--port)", t("pmLgBad"), "badk")}<span><i class="sw trk"></i>trunk</span><span>⚡ PoE</span><span class="sep"></span><label class="row small">${esc(t("pmCords"))} <select id="pm-cords" style="width:auto">${[["all", t("pmCordsAll")], ["sel", t("pmCordsSel")], ["none", t("pmCordsNone")]].map(([k, l]) => opt(k, l, UI.cords)).join("")}</select></label></div>`;
}
/* ---------- patch cords drawn between the ports of one rack (as in PortMap) ---------- */
UI.cords = UI.cords || "all";
function drawCords(){
  const b = B(); $$(".rack.pmrack").forEach(rk => { rk.querySelector("svg.cords") && rk.querySelector("svg.cords").remove();
    if (UI.cords === "none") return;
    const btn = (id, p) => rk.querySelector(`[data-port="${CSS.escape(id + ":" + p)}"]`), R0 = rk.getBoundingClientRect(), s = UI.sel;
    let h = "";
    b.links.forEach(l => { const A = btn(l.a.d, P0(l.a.p)), Bn = btn(l.b.d, P0(l.b.p)); if (!A || !Bn) return;
      const on = s && s.type === "port" && ((s.id === l.a.d && s.p === P0(l.a.p)) || (s.id === l.b.d && s.p === P0(l.b.p)));
      if (UI.cords === "sel" && !on) return;
      const ra = A.getBoundingClientRect(), rb = Bn.getBoundingClientRect(), up = ra.top <= rb.top, a = up ? ra : rb, c = up ? rb : ra;
      const x1 = a.left + a.width / 2 - R0.left, y1 = a.bottom - R0.top - 2, x2 = c.left + c.width / 2 - R0.left, y2 = c.top - R0.top + 2, dy = Math.max(14, Math.abs(y2 - y1) * .45);
      const col = getComputedStyle(A).getPropertyValue("--pc").trim() || getComputedStyle(Bn).getPropertyValue("--pc").trim() || (MEDIA[l.media] || MEDIA.cat6).c;
      h += `<path class="${on ? "on" : ""}" style="stroke:${col}" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${x1.toFixed(1)} ${(y1 + dy).toFixed(1)} ${x2.toFixed(1)} ${(y2 - dy).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; });
    if (!h) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "cords" + (s && s.type === "port" ? " dim" : "")); svg.setAttribute("width", R0.width); svg.setAttribute("height", R0.height); svg.innerHTML = h; rk.appendChild(svg); });
}
window.addEventListener("resize", debounce(() => { if (UI.app === "portmap" && curTab().id === "ports") drawCords(); }, 120));
document.addEventListener("change", e => { if (e.target.id === "pm-cords"){ UI.cords = e.target.value; drawCords(); } });
function portsView(b){
  const devs = b.devices.filter(portDev), byRack = b.racks.map(r => ({r, ds:devs.filter(d => d.rack === r.id).sort((a, c) => topU(c) - topU(a))}));
  const loose = devs.filter(d => !d.rack && (isNet(d) || passive(d) || ["nvr","dvr","server","nas"].includes(d.kind)) && d.kind !== "outlet");
  if (!devs.length && !b.racks.length) return `<div class="empty"><h3>${esc(t("pmEmptyT"))}</h3><p>${esc(t("pmEmpty"))}</p></div>`;
  const rack = (title, sub, btn, body) => `<div class="rack pmrack"><div class="rack-title"><b>${esc(title)}</b><span class="rt-r"><small>${esc(sub)}</small>${btn}</span></div>${body}</div>`;
  return `${warnBox(warnings(b))}${legend(b)}<div class="racks">
    ${byRack.map(({r, ds}) => rack(r.name, [floorName(b, r.floor), roomName(b, r.room), r.u + "U"].filter(Boolean).join(" · "), `<button class="rk-btn" data-pma="add:${r.id}">＋ ${esc(t("pmAddHere"))}</button>`, ds.length ? ds.map(d => devRow(b, d)).join("") : `<p class="rk-empty">${esc(t("pmRackEmpty"))}</p>`)).join("")}
    ${loose.length ? rack(t("pmLoose"), "", "", loose.map(d => devRow(b, d)).join("")) : ""}</div>`;
}
/* ---------- editing the chain ---------- */
async function setPanel(b, d, p, ppId, ppPort){
  const pr = parts(b, d.id, p), first = pr.after[0];
  const oldEnd = pr.end && !pr.panel ? pr.end : null;          // was connected directly
  if (ppId && ppPort){
    const pp = devById(b, ppId), busy = linksAt(b, ppId, ppPort).filter(l => { const w = walk(b, ppId, ppPort, l), last = w[w.length - 1]; return last && isNet(devById(b, last.d)) && !(last.d === d.id && last.p === P0(p)); });
    if (busy.length){ const o = endOf(busy[0], ppId, ppPort); if (!await uiConfirm(t("pmPanelBusy",{pp:devLabel(pp) + ":" + ppPort, sw:devLabel(devById(b, o.d)) + (o.p ? ":" + o.p : "")}), t("pmMove"))) return render(); }
    edit(() => { if (first) b.links = b.links.filter(l => l !== first.link); busy.forEach(l => b.links = b.links.filter(x => x !== l));
      addLink(b, d.id, ppId, "patch", {pa:p, pb:ppPort});
      if (oldEnd && !linksAt(b, ppId, ppPort).some(l => endOf(l, ppId, ppPort).d !== d.id)) addLink(b, ppId, oldEnd.d, "cat6", {pa:ppPort, pb:oldEnd.p, cid:first.link.cid, len:first.link.len});
    });
  } else edit(() => { if (first && pr.panel) b.links = b.links.filter(l => l !== first.link); });
}
function setEnd(b, d, p, endId, endPort){
  const pr = parts(b, d.id, p), tail = pr.after.filter(h => passive(devById(b, h.d))).slice(-1)[0] || {d:d.id, p:P0(p)};
  edit(() => { if (pr.endLink) b.links = b.links.filter(l => l !== pr.endLink);
    if (endId){ const ed = devById(b, endId); addLink(b, tail.d, endId, ed && ed.kind === "camera" ? "poe" : "cat6", {pa:tail.p, pb:endPort || "", cid:pr.endLink ? pr.endLink.cid : "", len:pr.endLink ? pr.endLink.len : ""}); } });
}
function newEndpoint(b, done, preset = {}){
  const tp = "pc";
  modal(`<h3>＋ ${esc(t("pmNewEnd"))}</h3>
    <div class="two"><label class="fld"><span>${esc(t("f_kind"))}</span><select id="ne-k">${ENDK.map(k => opt(k, kindName(k), preset.kind || tp)).join("")}</select></label><label class="fld"><span>${esc(t("f_name"))}</span><input id="ne-n" placeholder="${esc(autoName(b, preset.kind || tp))}"></label></div>
    <div class="two"><label class="fld"><span>${esc(t("f_floor"))}</span><select id="ne-f">${floorOpts(b, preset.floor || "", false)}</select></label><label class="fld"><span>${esc(t("f_room"))}</span><input id="ne-r" list="ne-rl" value="${esc(preset.room ? roomName(b, preset.room) : "")}"><datalist id="ne-rl">${b.rooms.map(r => `<option value="${esc(r.name)}">`).join("")}</datalist></label></div>
    <div class="two"><label class="fld"><span>IP</span><input id="ne-ip" inputmode="decimal" placeholder="10.10.10.20/24"></label><label class="fld"><span>MAC</span><input id="ne-mac"></label></div>
    <label class="chk"><input type="checkbox" id="ne-pl"${store.settings.addPlanned ? " checked" : ""}> 📝 ${esc(t("addPlanned"))}</label>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="ok">${esc(t("add"))}</button></div>`, {
    ok: () => { const k = $("#ne-k").value, fl = $("#ne-f").value, rn = $("#ne-r").value.trim(), ip = $("#ne-ip").value.trim(), mac = $("#ne-mac").value.trim(), nm = $("#ne-n").value.trim();
      if (ip && !IP.valid(ip)) return toast("⚠ " + t("ipBad")); if (mac && !macValid(mac)) return toast("⚠ " + t("macBad"));
      if (nm && nameTaken(b, nm)){ $("#ne-n").classList.add("bad"); return nameOk(b, nm); }
      closeModal(); pushUndo(); const room = rn ? ensureRoom(b, fl, rn) : null;
      const nd = newDevice(k, {name:nm, floor:fl || (room && room.floor) || "", room:room ? room.id : "", ip, mac, status:$("#ne-pl").checked ? "planned" : "installed"}); if (!nd.name) nd.name = autoName(b, k);
      b.devices.push(nd); undoStack.pop(); done(nd); }
  });
  $("#ne-k").addEventListener("change", () => { $("#ne-n").placeholder = autoName(b, $("#ne-k").value); });
}
/* ---------- port card (drawer) ---------- */
function chainHtml(b, c, me){
  return `<div class="chain">${c.map((h, i) => { const d = devById(b, h.d), l = h.link;
    return `${i ? `<div class="chl" data-dr="link:${l.id}" title="${esc(mediaName(l.media))}"><i style="background:${(MEDIA[l.media] || MEDIA.cat6).c}"></i><small>${esc([l.cid, l.len ? l.len + " m" : ""].filter(Boolean).join(" · ") || mediaName(l.media))}</small></div>` : ""}
      <button class="chn${i === me ? " me" : ""}" ${portDev(d) && h.p ? `data-goport="${h.d}:${h.p}"` : `data-dr="sel:${h.d}"`}><svg viewBox="0 0 48 48" width="20" height="20">${ICO[devIcon(d)] || ICO.box}</svg><span><b>${esc(devLabel(d))}${h.p ? " :" + esc(h.p) : ""}</b><small>${esc([kindName(d.kind), roomName(b, d.room)].filter(Boolean).join(" · "))}</small></span></button>`; }).join("")}</div>`;
}
function portCard(b, d, p){
  const pr = parts(b, d.id, p), c = cfgOf(d, p), pas = passive(d), ed = pr.end && devById(b, pr.end.d);
  const head = `<div class="dhead"><svg viewBox="0 0 48 48" width="42" height="42">${ICO[devIcon(d)] || ICO.box}</svg><div><h3>${esc(devLabel(d))} : ${esc(p)}</h3><div class="muted small">${esc(t("pmPortOf",{k:kindName(d.kind)}))}${d.rack ? " · " + esc(rackById(b, d.rack).name) + " U" + d.u : ""}</div></div><button class="x" data-dr="close">×</button></div>
    <div class="btns"><button class="btn small" data-pmnav="-1">‹ ${esc(t("pmPrev"))}</button><button class="btn small" data-pmnav="1">${esc(t("pmNext"))} ›</button><span class="grow"></span><button class="btn small" data-dr="sel:${d.id}">${esc(t("pmDevice"))}</button></div>`;
  const chain = sec("pchain", t("pmChain"), chainHtml(b, pr.chain, pr.me), true);
  if (pas) return head + chain + panelPortSec(b, d, p, pr) + `<label class="fld"><span>${esc(t("f_notes"))}</span><textarea data-pc="note" rows="2">${esc(c.note)}</textarea></label>`;
  const panels = b.devices.filter(x => passive(x) && x.kind !== "outlet" && num(x.ports) > 0).sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  const pnl = pr.panel ? devById(b, pr.panel.d) : null;
  const cand = b.devices.filter(x => x.id !== d.id && !passive(x) && x.kind !== "internet").sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  const link = sec("plink", t("pmConn"), `<div class="two"><label class="fld"><span>${esc(t("pmPanel"))}</span><select data-pc="__panel">${opt("", "— " + t("pmDirect") + " —", pnl ? pnl.id : "")}${panels.map(x => opt(x.id, devLabel(x) + (x.rack ? " (" + rackById(b, x.rack).name + ")" : ""), pnl ? pnl.id : "")).join("")}</select></label>
      <label class="fld"><span>${esc(t("pmPanelPort"))}</span><input data-pc="__pport" type="number" min="1" value="${esc(pr.panel ? pr.panel.p : "")}"${pnl ? ` max="${num(pnl.ports)}"` : ""}></label></div>
    ${pnl ? `<p class="small">🏷 TIA-606: <b class="mono">${esc(label606(b, pnl, pr.panel.p))}</b></p>` : ""}
    <div class="two"><div class="fld"><span>${esc(t("pmEnd"))}</span><button type="button" class="endpick" data-endpick="1">${ed ? `<svg viewBox="0 0 48 48" width="16" height="16">${ICO[devIcon(ed)] || ICO.box}</svg> <b>${esc(devLabel(ed))}</b> <small class="muted">${esc([kindName(ed.kind), roomName(b, ed.room)].filter(Boolean).join(" · "))}</small>` : `<span class="muted">— ${esc(t("pmPickEnd"))} —</span>`}<i>▾</i></button></div>
      ${ed && portDev(ed) ? `<label class="fld"><span>${esc(t("pmEndPort"))}</span><input data-pc="__eport" value="${esc(pr.end.p)}"></label>` : "<span></span>"}</div>
    ${pr.endLink ? `<div class="two"><label class="fld"><span>${esc(t("f_cid"))}</span><input data-pl="cid" value="${esc(pr.endLink.cid)}"></label><label class="fld"><span>${esc(t("f_len"))}</span><input data-pl="len" type="number" min="0" step="0.1" value="${esc(pr.endLink.len)}"></label></div>` : ""}`, true);
  const endSec = ed && !isNet(ed) ? sec("pend", t("pmEndDev") + `: ${esc(devLabel(ed))}`, `<div class="two"><label class="fld"><span>${esc(t("f_kind"))}</span><select data-pe="kind">${ENDK.map(k => opt(k, kindName(k), ed.kind)).join("")}</select></label><label class="fld"><span>${esc(t("f_name"))}</span><input data-pe="name" value="${esc(ed.name)}"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_floor"))}</span><select data-pe="floor">${floorOpts(b, ed.floor)}</select></label><label class="fld"><span>${esc(t("f_room"))}</span><select data-pe="room">${roomOpts(b, ed.floor, ed.room)}</select></label></div>
      <div class="two"><label class="fld"><span>IP</span><input data-pe="ip" value="${esc(ed.ip)}" inputmode="decimal"></label><label class="fld"><span>MAC</span><input data-pe="mac" value="${esc(ed.mac)}"></label></div>
      <div class="btns"><button class="btn small" data-dr="sel:${ed.id}">${esc(t("pmOpenDev"))}</button><button class="btn small" data-dr="catalogEnd">📚 ${esc(t("catPick"))}</button></div>`, true) : "";
  const vl = (k, v) => `<select data-pc="${k}">${vlanOpts(b, v)}</select>`;
  const sp = sec("pcfg", t("pmCfg"), `<div class="two"><label class="fld"><span>${esc(t("pmMode"))}</span><select data-pc="mode">${opt("", "—", c.mode)}${opt("access", "access", c.mode)}${opt("trunk", "trunk (802.1Q)", c.mode)}</select></label>
      ${c.mode === "trunk" ? `<label class="fld"><span>${esc(t("pmNative"))}</span>${vl("native", c.native)}</label>` : `<label class="fld"><span>VLAN</span>${vl("vlan", c.vlan)}</label>`}</div>
    ${c.mode === "trunk" ? `<label class="fld"><span>${esc(t("pmAllowed"))}</span><input data-pc="allowed" value="${esc(c.allowed)}" placeholder="10,20,30-40 / all"></label>` : ""}
    <div class="two"><label class="fld"><span>${esc(t("f_speed"))}</span><select data-pc="speed">${["","auto","10M","100M","1G","2.5G","5G","10G","25G","40G","100G"].map(x => opt(x, x || "—", c.speed)).join("")}</select></label><label class="fld"><span>PoE</span><select data-pc="poe">${[["", "—"], ["af", "802.3af (15.4 W)"], ["at", "802.3at PoE+ (30 W)"], ["bt3", "802.3bt Type 3 (60 W)"], ["bt4", "802.3bt Type 4 (90 W)"]].map(([k, l]) => opt(k, l, c.poe)).join("")}</select></label></div>
    <div class="two"><label class="fld"><span>${esc(t("pmAdmin"))}</span><select data-pc="admin">${opt("up", t("pmUp"), c.admin)}${opt("down", t("pmDown"), c.admin)}</select></label><label class="fld"><span>${esc(t("pmDesc"))}</span><input data-pc="desc" value="${esc(c.desc)}" placeholder="${esc(ed ? devLabel(ed) : "")}"></label></div>
    <label class="chk"><input type="checkbox" data-pc="bad"${c.bad ? " checked" : ""}> ${esc(t("pmBad"))}</label>
    <label class="fld"><span>${esc(t("f_notes"))}</span><textarea data-pc="note" rows="2">${esc(c.note)}</textarea></label>`, true);
  return head + chain + link + endSec + sp + `<div class="btns"><button class="btn small" data-pma="cliPort">⌨ ${esc(t("pmCli"))}</button><button class="btn small dan" data-pma="clearPort">⌫ ${esc(t("pmClear"))}</button></div>`;
}
function panelPortSec(b, d, p, pr){
  const front = pr.before.length ? pr.before[pr.before.length - 1] : null, fd = front && devById(b, front.d);
  const back = pr.after.length ? pr.after[pr.after.length - 1] : null, bd = back && devById(b, back.d);
  const nets = b.devices.filter(x => !passive(x) && portDev(x)).sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  const ends = b.devices.filter(x => x.id !== d.id && x.kind !== "internet" && (!isNet(x) || true)).sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  const rearL = pr.after.length ? pr.after[0].link : null;
  return sec("plink", t("pmConn"), `<p class="small">🏷 TIA-606: <b class="mono">${esc(label606(b, d, p))}</b></p>
    <h4 class="sh">${esc(t("pmFront"))}</h4><div class="two"><label class="fld"><span>${esc(t("pmSwitch"))}</span><select data-pp="__fdev">${opt("", "—", fd ? fd.id : "")}${nets.map(x => opt(x.id, devFull(b, x), fd ? fd.id : "")).join("")}</select></label><label class="fld"><span>${esc(t("f_port"))}</span><input data-pp="__fport" value="${esc(front ? front.p : "")}"></label></div>
    <h4 class="sh">${esc(t("pmRear"))}</h4><div class="two"><label class="fld"><span>${esc(t("pmEnd"))}</span><select data-pp="__bdev">${opt("", "—", bd ? bd.id : "")}${ends.map(x => opt(x.id, devFull(b, x) + (x.room ? " · " + roomName(b, x.room) : ""), bd ? bd.id : "")).join("")}${opt("__new", "＋ " + t("pmNewEnd") + "…", "")}</select></label><label class="fld"><span>${esc(t("f_port"))}</span><input data-pp="__bport" value="${esc(back ? back.p : "")}"></label></div>
    ${rearL ? `<div class="two"><label class="fld"><span>${esc(t("f_cid"))}</span><input data-plr="cid" value="${esc(rearL.cid)}"></label><label class="fld"><span>${esc(t("f_len"))}</span><input data-plr="len" type="number" min="0" step="0.1" value="${esc(rearL.len)}"></label></div>` : ""}`, true);
}
function cliText(b, d, p){
  const c = cfgOf(d, p), v = vlanById(b, c.vlan), nv = vlanById(b, c.native), br = String(d.brand).toLowerCase(), pr = parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d), desc = c.desc || (ed ? devLabel(ed) : "");
  const allowed = String(c.allowed || "").trim();
  if (br.includes("forti")) return [`config switch interface`, `    edit "port${p}"`, desc ? `        set description "${desc}"` : "", c.mode === "trunk" ? `        set native-vlan ${nv ? nv.vid : 1}\n        set allowed-vlans ${allowed && allowed !== "all" ? allowed.replace(/\s/g, "") : ""}${allowed === "all" ? "\n        set allowed-vlans-all enable" : ""}` : v ? `        set native-vlan ${v.vid}` : "", c.poe === "" && KINDS[d.kind].sw ? "" : c.poe ? `        set poe-status enable` : "", c.admin === "down" ? `        set status down` : "", `    next`, `end`].filter(Boolean).join("\n");
  if (br.includes("ubiquiti") || br.includes("unifi") || br.includes("mikrotik") || br.includes("tp-link")) return t("pmCliGui");
  const ifn = `interface GigabitEthernet1/0/${p}`;
  return [ifn, desc ? ` description ${desc}` : "", c.mode === "trunk" ? ` switchport mode trunk${nv ? `\n switchport trunk native vlan ${nv.vid}` : ""}${allowed && allowed !== "all" ? `\n switchport trunk allowed vlan ${allowed.replace(/\s/g, "")}` : ""}` : v ? ` switchport mode access\n switchport access vlan ${v.vid}` : "", c.speed && c.speed !== "auto" ? ` speed ${({"10M":10,"100M":100,"1G":1000,"2.5G":2500,"5G":5000,"10G":10000})[c.speed] || "auto"}` : "", c.poe ? " power inline auto" : "", c.admin === "down" ? " shutdown" : " no shutdown", "!"].filter(Boolean).join("\n");
}
/* ---------- checks ---------- */
function vlanIds(txt){ const out = []; if (String(txt).trim().toLowerCase() === "all") return "all"; for (const part of String(txt || "").split(/[\s,;]+/).filter(Boolean)){ const r = part.match(/^(\d+)(?:-(\d+))?$/); if (!r) return null; const a = +r[1], z = +(r[2] || r[1]); if (a < 1 || z > 4094 || z < a) return null; for (let i = a; i <= z && out.length < 5000; i++) out.push(i); } return out; }
function pmWarnings(b){
  const W = [], vids = new Set(b.vlans.map(v => String(v.vid))), seen = new Set();
  b.devices.filter(d => !passive(d)).forEach(d => {
    let poeW = 0, poeN = 0; const noPoe = [];
    Object.keys(d.pcfg).forEach(p => { const c = d.pcfg[p], nm = `${devLabel(d)} :${p}`;
      if (c.mode === "trunk" && c.allowed){ const L = vlanIds(c.allowed); if (L === null) W.push(["err", t("pw_allowed",{p:nm, v:c.allowed}), d.id]); else if (L !== "all" && b.vlans.length){ const miss = [...new Set(L.filter(x => !vids.has(String(x))))]; if (miss.length && miss.length <= 20) W.push(["", t("pw_unk",{p:nm, v:miss.join(", ")}), d.id]); } } });
    for (let i = 1; i <= Math.round(num(d.ports)); i++){ const p = String(i), L = linksAt(b, d.id, p); if (!L.length) continue; const pr = parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d), c = d.pcfg[p] || {}, nm = `${devLabel(d)} :${p}`;
      if (ed && num(ed.params.poeIn) && (c.poe || KINDS[d.kind].sw && num(d.params.poePorts))){ poeW += num(ed.params.poeIn); poeN++; if (c.poe && num(ed.params.poeIn) > POE[c.poe]) W.push(["err", t("pw_poeClass",{p:nm, n:devLabel(ed), w:ed.params.poeIn, c:POE[c.poe]}), d.id]); }
      if (ed && ["ap","camera","phone"].includes(ed.kind) && KINDS[d.kind].sw && num(d.params.poePorts) === 0 && !c.poe) noPoe.push(p);
      const len = pr.chain.slice(pr.me + 1).reduce((s, h) => s + num(h.link && h.link.len), 0) + pr.chain.slice(0, pr.me + 1).reduce((s, h) => s + num(h.link && h.link.len), 0);
      if (len > 100 && pr.chain.every(h => !h.link || !isFiber(h.link.media))) W.push(["err", t("pw_chan",{p:nm, l:r1(len)}), d.id]);
      if (ed && isNet(ed) && pr.end.p){ const k = [d.id + ":" + p, ed.id + ":" + pr.end.p].sort().join("|"); if (seen.has(k)) continue; seen.add(k); const o = ed.pcfg[pr.end.p] || {};
        if (c.mode === "access" && KINDS[ed.kind].sw) W.push(["", t("pw_accUp",{p:nm}), d.id]);
        if (c.mode && o.mode && c.mode !== o.mode) W.push(["", t("pw_modeMis",{a:nm, b:`${devLabel(ed)} :${pr.end.p}`}), d.id]);
        if (c.mode === "trunk" && o.mode === "trunk" && c.native && o.native && c.native !== o.native) W.push(["err", t("pw_native",{a:nm, b:`${devLabel(ed)} :${pr.end.p}`}), d.id]);
        if (c.speed && o.speed && c.speed !== "auto" && o.speed !== "auto" && c.speed !== o.speed) W.push(["", t("pw_speed",{a:nm, b:`${devLabel(ed)} :${pr.end.p}`, x:c.speed, y:o.speed}), d.id]); }
    }
    if (noPoe.length) W.push(["info", t("pw_noPoe2",{n:devLabel(d), c:noPoe.length, p:noPoe.slice(0, 8).join(", ") + (noPoe.length > 8 ? " …" : "")}), d.id]);
    if (num(d.params.poeBudget) && poeW > num(d.params.poeBudget)) W.push(["err", t("pw_budget",{n:devLabel(d), w:r1(poeW), b:d.params.poeBudget}), d.id]);
    if (num(d.params.poePorts) && poeN > num(d.params.poePorts)) W.push(["", t("pw_poePorts",{n:devLabel(d), c:poeN, m:d.params.poePorts}), d.id]);
  });
  b.devices.forEach(d => { if (!portDev(d)) return; const n = Math.round(num(d.ports)); b.links.forEach(l => [l.a, l.b].forEach(e => { if (e.d !== d.id) return; const x = +e.p; if (/^\d+$/.test(P0(e.p)) && (x < 1 || x > n)) W.push(["err", t("pw_range",{n:devLabel(d), p:e.p, m:n}), d.id]); })); });
  const s2 = new Set(); return W.filter(w => !s2.has(w[1]) && s2.add(w[1]));
}
const warnings = b => [...commonWarnings(b), ...pmWarnings(b)];
/* ---------- lists ---------- */
function portRows(b){
  const R = [];
  b.devices.filter(d => portDev(d) && !passive(d)).sort((a, c) => devLabel(a).localeCompare(devLabel(c), undefined, {numeric:true})).forEach(d => {
    for (let i = 1; i <= Math.round(num(d.ports)); i++){ const p = String(i); if (!linksAt(b, d.id, p).length && !hasCfg(d, p)) continue;
      const pr = parts(b, d.id, p), c = d.pcfg[p] || {}, pn = pr.panel && devById(b, pr.panel.d), ed = pr.end && devById(b, pr.end.d);
      R.push({d, p, c, pn, pp:pr.panel ? pr.panel.p : "", ed, ep:pr.end ? pr.end.p : "", cid:pr.endLink ? pr.endLink.cid : "", lab:pn ? label606(b, pn, pr.panel.p) : ""}); } });
  return R;
}
function listView(b){
  const q = String(UI.q && UI.q["q-pm"] || "").toLowerCase(), s = UI.sel;
  const R = portRows(b).filter(r => !q || [devLabel(r.d), r.p, r.pn ? devLabel(r.pn) : "", r.lab, r.ed ? [devLabel(r.ed), r.ed.ip, r.ed.mac, roomName(b, r.ed.room)].join(" ") : "", vlanLabel(b, r.c.vlan), r.c.desc, r.c.note, r.cid].join(" ").toLowerCase().includes(q));
  return `<div class="row" style="margin-bottom:10px">${searchBox("q-pm")}<span class="grow"></span><button class="btn small" data-pma="csv">⤓ CSV</button></div>
    ${R.length ? `<div class="scroll"><table class="t"><tr><th>${esc(t("pmSwitch"))}</th><th>${esc(t("f_port"))}</th><th>${esc(t("pmPanel"))}</th><th>TIA-606</th><th>${esc(t("f_cid"))}</th><th>${esc(t("f_room"))}</th><th>${esc(t("pmEnd"))}</th><th>IP</th><th>MAC</th><th>VLAN</th><th>${esc(t("pmMode"))}</th><th>PoE</th><th>${esc(t("f_speed"))}</th></tr>
      ${R.map(r => `<tr class="click${s && s.type === "port" && s.id === r.d.id && s.p === r.p ? " on" : ""}" data-goport="${r.d.id}:${r.p}"><td class="nw"><b>${esc(devLabel(r.d))}</b></td><td class="c">${esc(r.p)}</td><td class="nw">${r.pn ? esc(devLabel(r.pn) + " :" + r.pp) : `<span class="muted">${esc(t("pmDirect"))}</span>`}</td><td class="mono nw">${esc(r.lab)}</td><td class="mono">${esc(r.cid)}</td><td>${r.ed ? esc([floorName(b, r.ed.floor), roomName(b, r.ed.room)].filter(Boolean).join(" · ")) : ""}</td>
        <td>${r.ed ? esc(devLabel(r.ed) + (r.ep ? " :" + r.ep : "")) : ""}</td><td class="mono nw">${r.ed ? esc(r.ed.ip) : ""}</td><td class="mono nw">${r.ed ? esc(r.ed.mac) : ""}</td><td class="nw">${esc(r.c.mode === "trunk" ? "T · " + (vlanById(b, r.c.native) || {}).vid + (r.c.allowed ? " / " + r.c.allowed : "") : vlanLabel(b, r.c.vlan))}</td><td>${esc(r.c.mode || "")}${r.c.admin === "down" ? ` <span class="pill bad">${esc(t("pmDown"))}</span>` : ""}${r.c.bad ? ` <span class="pill bad">⚠</span>` : ""}</td><td>${esc(r.c.poe || "")}</td><td>${esc(r.c.speed || "")}</td></tr>`).join("")}</table></div>` : `<div class="empty"><p>${esc(t("pmNoPorts"))}</p></div>`}`;
}
function roomsView(b){
  const ends = b.devices.filter(d => !passive(d) && !isNet(d) && d.kind !== "internet"), groups = {};
  ends.forEach(d => { const k = (d.floor || "") + "|" + (d.room || ""); (groups[k] = groups[k] || []).push(d); });
  const keys = Object.keys(groups).sort((a, c) => { const [fa, ra] = a.split("|"), [fc, rc] = c.split("|"); const ia = b.floors.findIndex(f => f.id === fa), ic = b.floors.findIndex(f => f.id === fc); return ia - ic || roomName(b, ra).localeCompare(roomName(b, rc), undefined, {numeric:true}); });
  if (!keys.length) return `<div class="empty"><p>${esc(t("pmNoEnds"))}</p></div>`;
  return keys.map(k => { const [f, r] = k.split("|"), L = groups[k];
    return `<div class="card"><h3>🚪 ${esc(roomName(b, r) || t("pmNoRoom"))} <small class="muted">${esc(floorName(b, f))}</small><span class="grow"></span><span class="pill">${L.length}</span></h3><div class="scroll"><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_kind"))}</th><th>${esc(t("pmSwitch"))} :${esc(t("f_port"))}</th><th>${esc(t("pmPanel"))}</th><th>IP</th><th>VLAN</th></tr>
      ${L.map(d => { const up = upstream(b, d); return `<tr class="click" data-sel="dev:${d.id}"><td><b>${esc(devLabel(d))}</b></td><td>${esc(kindName(d.kind))}</td><td>${up.sw ? `<a data-goport="${up.sw.id}:${up.p}">${esc(devLabel(up.sw) + " :" + up.p)}</a>` : `<span class="muted">—</span>`}</td><td>${up.pn ? esc(label606(b, up.pn, up.pp)) : ""}</td><td class="mono">${esc(d.ip)}</td><td>${esc(up.sw ? vlanLabel(b, ((up.sw.pcfg[up.p] || {}).vlan) || d.vlan) : vlanLabel(b, d.vlan))}</td></tr>`; }).join("")}</table></div></div>`; }).join("");
}
// The switch port (and patch panel port) a device hangs off.
function upstream(b, d){
  for (const l of linksOf(b, d.id)){ const me = thisEnd(l, d.id), w = walk(b, d.id, me.p, l), k = w.findIndex(h => !passive(devById(b, h.d)));
    if (k < 0) continue; const sw = devById(b, w[k].d); if (!isNet(sw) && !portDev(sw)) continue;
    const pn = w.slice(0, k).find(h => devById(b, h.d).kind !== "outlet"); return {sw, p:w[k].p, pn:pn && devById(b, pn.d), pp:pn && pn.p}; }
  return {};
}
function csv(b){
  saveText(`${fileSafe(b.name)} - Port Map.csv`, csvText([t("pmSwitch"), t("f_port"), t("pmPanel"), t("pmPanelPort"), "TIA-606", t("f_cid"), t("f_floor"), t("f_room"), t("pmEnd"), t("f_kind"), "IP", "MAC", "VLAN", t("pmMode"), t("pmNative"), t("pmAllowed"), t("f_speed"), "PoE", t("pmAdmin"), t("pmDesc"), t("f_notes")],
    portRows(b).map(r => [devLabel(r.d), r.p, r.pn ? devLabel(r.pn) : "", r.pp, r.lab, r.cid, r.ed ? floorName(b, r.ed.floor) : "", r.ed ? roomName(b, r.ed.room) : "", r.ed ? devLabel(r.ed) + (r.ep ? " :" + r.ep : "") : "", r.ed ? kindName(r.ed.kind) : "", r.ed ? r.ed.ip : "", r.ed ? r.ed.mac : "", vlanLabel(b, r.c.vlan), r.c.mode, vlanLabel(b, r.c.native), r.c.allowed, r.c.speed, r.c.poe, r.c.admin === "down" ? t("pmDown") : "", r.c.desc, r.c.note])), "csv", "text/csv");
}
function docBody(b){
  const sws = b.devices.filter(d => portDev(d) && !passive(d) && portRows(b).some(r => r.d === d));
  return `${b.racks.map(r => { const ds = b.devices.filter(d => d.rack === r.id && portDev(d)).sort((a, c) => topU(c) - topU(a)); return ds.length ? `<h3>🗄 ${esc(r.name)}</h3>${ds.map(d => devRow(b, d)).join("")}` : ""; }).join("")}
    ${sws.map(d => `<h3>${esc(devLabel(d))} <small>${esc([d.brand, d.model, d.ip].filter(Boolean).join(" · "))}</small></h3><table class="t"><tr><th>${esc(t("f_port"))}</th><th>${esc(t("pmPanel"))}</th><th>TIA-606</th><th>${esc(t("f_room"))}</th><th>${esc(t("pmEnd"))}</th><th>IP</th><th>VLAN</th><th>${esc(t("pmMode"))}</th><th>PoE</th></tr>
      ${portRows(b).filter(r => r.d === d).map(r => `<tr><td class="c">${esc(r.p)}</td><td>${r.pn ? esc(devLabel(r.pn) + " :" + r.pp) : "—"}</td><td class="mono">${esc(r.lab)}</td><td>${r.ed ? esc(roomName(b, r.ed.room)) : ""}</td><td>${r.ed ? esc(devLabel(r.ed)) : ""}</td><td class="mono">${r.ed ? esc(r.ed.ip) : ""}</td><td>${esc(r.c.mode === "trunk" ? "trunk " + (r.c.allowed || "") : vlanLabel(b, r.c.vlan))}</td><td>${esc(r.c.mode)}</td><td>${esc(r.c.poe)}</td></tr>`).join("")}</table>`).join("")}`;
}
/* ---------- events ---------- */
function goPort(id, p){ UI.sel = {type:"port", id, p:String(p)}; UI.multi.clear(); if (curTab().id === "rooms") UI.tabs.portmap = "ports"; render(); const el = $(`[data-port="${id}:${p}"]`); if (el) el.scrollIntoView({block:"nearest", inline:"nearest"}); }
document.addEventListener("click", async e => {
  if (UI.app !== "portmap" || e.target.closest("#modal")) return;
  const pt = e.target.closest("[data-port]"); if (pt){ const [id, p] = pt.dataset.port.split(":"); goPort(id, p); return; }
  const gp = e.target.closest("[data-goport]"); if (gp){ e.stopPropagation(); const [id, p] = gp.dataset.goport.split(":"); goPort(id, p); return; }
  const nav = e.target.closest("[data-pmnav]"); if (nav && UI.sel && UI.sel.type === "port"){ const d = devById(B(), UI.sel.id), n = Math.round(num(d.ports)), p = clamp(+UI.sel.p + +nav.dataset.pmnav, 1, n); goPort(d.id, p); return; }
  const a = e.target.closest("[data-pma]"); if (!a) return; const b = B(), k = a.dataset.pma;
  if (k === "csv") return csv(b);
  if (k.startsWith("add:")){ const rid = k.slice(4); const kind = await uiChoice(t("rackAddWhat"), ["switch","pp","fpp","firewall","router","coresw","nvr","server"].map(x => [x, kindName(x)])); if (!kind) return; const r = rackById(b, rid), h = KINDS[kind].h || 1, u = rackSpot(b, r, h, 0); if (!u) return toast("⚠ " + t("rackNoSpace")); edit(() => { const d = newDevice(kind, {rack:rid, u, floor:r.floor, room:r.room}); b.devices.push(d); UI.sel = {type:"dev", id:d.id}; }); return; }
  const s = UI.sel; if (!s || s.type !== "port") return; const d = devById(b, s.id);
  if (k === "clearPort"){ if (!await uiConfirm(t("pmClearConf",{p:devLabel(d) + " :" + s.p}), t("pmClear"), true)) return; const pr = parts(b, d.id, s.p), first = pr.after[0]; edit(() => { delete d.pcfg[s.p]; if (first) b.links = b.links.filter(l => l !== first.link); }); return; }
  if (k === "cliPort"){ const txt = cliText(b, d, s.p); modal(`<h3>⌨ ${esc(devLabel(d))} :${esc(s.p)}</h3><p class="muted small">${esc(t("pmCliNote"))}</p><textarea class="mono" rows="12" readonly style="width:100%">${esc(txt)}</textarea><div class="mfoot"><button class="btn" data-m="copy">⧉ ${esc(t("copy"))}</button><button class="btn pri" data-m="close">${esc(t("close"))}</button></div>`, {copy:() => { navigator.clipboard && navigator.clipboard.writeText(txt).then(() => toast("✓ " + t("copied"))); }}); }
});
document.addEventListener("click", e => { if (UI.app !== "portmap") return; const c = e.target.closest('[data-dr="catalogEnd"]'); if (!c) return; e.stopPropagation(); const b = B(), s = UI.sel, pr = parts(b, s.id, s.p), ed = pr.end && devById(b, pr.end.d); if (ed) openCatalogPicker(ed.kind, rec => edit(() => { applySpec(ed, rec); })); }, true);
/* ---------- end device picker: search, connection shown, same names flagged, ⊖ deletes (with confirmation) ---------- */
let EP = null;
function epRows(b, d, p, q){
  const pr = parts(b, d.id, p), cur = pr.end && pr.end.d, dups = new Set(dupGroups(b).flat().map(x => x.id));
  const cand = b.devices.filter(x => x.id !== d.id && !passive(x) && x.kind !== "internet" && !(KINDS[x.kind] || {}).acc).sort((x, y) => devLabel(x).localeCompare(devLabel(y), undefined, {numeric:true}));
  const qq = nameKey(q || ""), L = qq ? cand.filter(x => nameKey([x.name, kindName(x.kind), roomName(b, x.room), x.ip, x.brand, x.model].join(" ")).includes(qq)) : cand;
  const where = x => { const l = b.links.find(k => (k.a.d === x.id || k.b.d === x.id)); if (!l) return ""; const o = devById(b, l.a.d === x.id ? l.b.d : l.a.d), op = l.a.d === x.id ? l.b.p : l.a.p; return o ? devLabel(o) + (op ? ":" + op : "") : ""; };
  return `<div class="eprow${!cur ? " on" : ""}" data-epset=""><span class="muted">— ${esc(t("pmNoEnd"))} —</span></div><div class="eprow new" data-epnew="1">＋ ${esc(t("pmNewEnd"))}…</div>`
    + L.slice(0, 300).map(x => { const w = where(x); return `<div class="eprow${x.id === cur ? " on" : ""}${dups.has(x.id) ? " dup" : ""}" data-epset="${x.id}"><svg viewBox="0 0 48 48" width="18" height="18">${ICO[devIcon(x)] || ICO.box}</svg><span class="epn"><b>${esc(devLabel(x))}</b>${dups.has(x.id) ? ` <em title="${esc(t("dupBadgeH"))}">⚠ ${esc(t("dupBadge"))}</em>` : ""}${x.status === "planned" ? ` <em class="pl">📝</em>` : ""}<small>${esc([kindName(x.kind), roomName(b, x.room), x.ip].filter(Boolean).join(" · "))}${w ? " · 🔌 " + esc(w) : ""}</small></span><button type="button" class="epdel" data-epdel="${x.id}" title="${esc(t("delete"))}">−</button></div>`; }).join("")
    + (L.length > 300 ? `<div class="eprow muted">… +${L.length - 300}</div>` : "");
}
function epOpen(btn){
  epClose(); const b = B(), s = UI.sel, d = devById(b, s.id), p = s.p, R = btn.getBoundingClientRect();
  const el = document.createElement("div"); el.className = "epop"; el.style.left = Math.max(8, Math.min(R.left, innerWidth - 380)) + "px"; el.style.top = Math.min(R.bottom + 4, innerHeight - 360) + "px";
  el.innerHTML = `<input class="epq" placeholder="🔍 ${esc(t("search"))}…"><div class="eplist">${epRows(b, d, p, "")}</div>`; document.body.appendChild(el); EP = {el, d, p};
  const q = el.querySelector(".epq"); q.focus(); q.addEventListener("input", () => { el.querySelector(".eplist").innerHTML = epRows(B(), d, p, q.value); });
}
function epClose(){ if (EP){ EP.el.remove(); EP = null; } }
document.addEventListener("pointerdown", e => { if (EP && !EP.el.contains(e.target) && !e.target.closest("[data-endpick]") && !e.target.closest(".layer")) epClose(); }, true);
document.addEventListener("keydown", e => { if (EP && e.key === "Escape"){ e.stopPropagation(); epClose(); } }, true);
document.addEventListener("click", async e => {
  const pk = e.target.closest("[data-endpick]"); if (pk && UI.app === "portmap"){ EP ? epClose() : epOpen(pk); return; }
  if (!EP || !EP.el.contains(e.target)) return; const b = B(), {d, p} = EP;
  const del = e.target.closest("[data-epdel]"); if (del){ e.stopPropagation(); const x = devById(b, del.dataset.epdel); const keep = EP; EP.el.style.visibility = "hidden"; const ok = x && await delDeviceAsk(b, x); if (EP === keep){ EP.el.style.visibility = ""; EP.el.querySelector(".eplist").innerHTML = epRows(B(), d, p, EP.el.querySelector(".epq").value); } void ok; return; }
  if (e.target.closest("[data-epnew]")){ epClose(); return newEndpoint(b, nd => { pushUndo(); undoStack.pop(); setEnd(b, d, p, nd.id, ""); }); }
  const set = e.target.closest("[data-epset]"); if (set){ epClose(); setEnd(b, d, p, set.dataset.epset, ""); }
});
function wireDrawer(){
  const dr = $("#drawer");
  dr.addEventListener("change", async e => {
    if (UI.app !== "portmap" || !UI.sel || UI.sel.type !== "port") return;
    const el = e.target, b = B(), s = UI.sel, d = devById(b, s.id); if (!d) return; const p = s.p;
    if (el.dataset.pc){ const k = el.dataset.pc, v = el.type === "checkbox" ? el.checked : el.value;
      if (k === "__panel"){ const pp = $('[data-pc="__pport"]'); let port = pp && pp.value.trim();
        if (v && !port){ const P2 = devById(b, v), free = Array.from({length:Math.round(num(P2.ports))}, (_, i) => String(i + 1)).find(x => !linksAt(b, v, x).some(l => isNet(devById(b, endOf(l, v, x).d)))); port = (/^\d+$/.test(p) && +p <= num(P2.ports) && !linksAt(b, v, p).some(l => isNet(devById(b, endOf(l, v, p).d)))) ? p : free || "1"; }
        return setPanel(b, d, p, v, port); }
      if (k === "__pport"){ const pn = $('[data-pc="__panel"]').value; if (!pn) return toast(t("pmPickPanel")); const n = Math.round(num(v)); const P2 = devById(b, pn); if (!n || n < 1 || n > num(P2.ports)){ toast("⚠ " + t("pw_range",{n:devLabel(P2), p:v, m:P2.ports})); return renderDrawer(); } return setPanel(b, d, p, pn, String(n)); }
      if (k === "__end"){ if (v === "__new") return newEndpoint(b, nd => { pushUndo(); undoStack.pop(); setEnd(b, d, p, nd.id, ""); }); return setEnd(b, d, p, v, ""); }
      if (k === "__eport"){ const pr = parts(b, d.id, p); if (pr.end) setEnd(b, d, p, pr.end.d, v.trim()); return; }
      let val = v;
      if (k === "vlan" || k === "native"){ val = await resolveNew("vlan", b, v); if (val === null) return renderDrawer(); }
      if (k === "allowed" && val && vlanIds(val) === null) toast("⚠ " + t("pw_allowed",{p:devLabel(d) + " :" + p, v:val}));
      return edit(() => { const c = cfgOf(d, p); c[k] = typeof val === "string" ? val.trim() : val; if (k === "mode" && val !== "trunk"){ c.allowed = ""; } if (!hasCfg(d, p)) delete d.pcfg[p]; });
    }
    if (el.dataset.pl){ const pr = parts(b, d.id, p); if (!pr.endLink) return; return edit(() => { pr.endLink[el.dataset.pl] = el.dataset.pl === "len" ? (el.value === "" ? "" : num(el.value, 0)) : el.value.trim(); }); }
    if (el.dataset.plr){ const pr = parts(b, d.id, p), l = pr.after.length ? pr.after[0].link : null; if (!l) return; return edit(() => { l[el.dataset.plr] = el.dataset.plr === "len" ? (el.value === "" ? "" : num(el.value, 0)) : el.value.trim(); }); }
    if (el.dataset.pe){ const pr = parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d); if (!ed) return; const k = el.dataset.pe; let v = el.value.trim();
      if (k === "floor" || k === "room"){ v = await resolveNew(k, b, el.value, {floor:ed.floor}); if (v === null) return renderDrawer(); }
      if (k === "ip" && v && !IP.valid(v)) toast("⚠ " + t("ipBad")); if (k === "mac" && v && !macValid(v)) toast("⚠ " + t("macBad"));
      if (k === "name" && v && nameTaken(b, v, ed.id)){ await nameOk(b, v, ed.id); return renderDrawer(); }
      return edit(() => { ed[k] = v; if (k === "kind") normDevice(ed); if (k === "floor") ed.room = ""; }); }
    if (el.dataset.pp){ const k = el.dataset.pp, pr = parts(b, d.id, p);
      if (k === "__fdev" || k === "__fport"){ const fdv = $('[data-pp="__fdev"]').value, fpt = $('[data-pp="__fport"]').value.trim(); const front = pr.before.length ? pr.before[pr.before.length - 1] : null;
        if (fdv && !fpt) return; // wait for the port number
        const busy = fdv ? linksAt(b, fdv, fpt).filter(l => !front || l !== pr.chain[pr.me].link) : [];
        if (busy.length && !await uiConfirm(t("pmPortBusy",{p:devLabel(devById(b, fdv)) + " :" + fpt}), t("pmMove"))) return renderDrawer();
        return edit(() => { const myFront = pr.chain[pr.me].link; if (myFront) b.links = b.links.filter(l => l !== myFront); busy.forEach(l => b.links = b.links.filter(x => x !== l)); if (fdv) addLink(b, fdv, d.id, "patch", {pa:fpt, pb:p}); }); }
      if (k === "__bdev" || k === "__bport"){ let bdv = $('[data-pp="__bdev"]').value; const bpt = $('[data-pp="__bport"]').value.trim(), rearL = pr.after.length ? pr.after[0].link : null;
        const apply = id => edit(() => { if (rearL) b.links = b.links.filter(l => l !== rearL); if (id) addLink(b, d.id, id, "cat6", {pa:p, pb:bpt, cid:rearL ? rearL.cid : "", len:rearL ? rearL.len : ""}); });
        if (bdv === "__new") return newEndpoint(b, nd => apply(nd.id), {room:d.room, floor:d.floor}); return apply(bdv); }
    }
  });
}
registerApp({
  id:"portmap", name:"app_portmap", desc:"app_portmap_d", docName:"doc_portmap", color:"#14a37f",
  glyph:`<rect x="7" y="15" width="34" height="18" rx="3" fill="#fff"/>${[0,1,2,3,4].map(i => `<rect x="${10 + i * 6}" y="18" width="4" height="5" fill="${i === 1 ? "#ffb703" : "#14a37f"}"/><rect x="${10 + i * 6}" y="25" width="4" height="5" fill="${i === 3 ? "#5ac8fa" : "#14a37f"}"/>`).join("")}`,
  tabs:[
    {id:"ports", label:"tabPorts", icon:"🔌", render(){ return portsView(B()); }, after:drawCords,
      tour:() => [{sel:"#appsw", title:t("tShellT1"), text:t("tShell1")}, {sel:".pmlegend", title:t("tPmT1"), text:t("tPm1")}, {sel:".p", title:t("tPmT2"), text:t("tPm2")}, {sel:'[data-pma^="add:"]', title:t("tPmT3"), text:t("tPm3")}, {sel:'[data-tab="list"]', title:t("tPmT4"), text:t("tPm4")}, {sel:"#btabs", title:t("tShellT2"), text:t("tShell2")}]},
    {id:"list", label:"tabPortList", icon:"📋", render(){ return listView(B()); }, tour:() => [{sel:"#q-pm", title:t("tPmT4"), text:t("tPm4b")}]},
    {id:"rooms", label:"tabRooms", icon:"🚪", render(){ return roomsView(B()); }, tour:() => [{sel:"#view .card, #view .empty", title:t("tPmT5"), text:t("tPm5")}]},
    {id:"cables", label:"tabCables", icon:"🧵", render(){ const b = B(); return `<div class="row" style="margin-bottom:10px"><button class="btn small" data-pm2="cid"># ${esc(t("autoCid"))}</button><button class="btn small" data-pm2="ccsv">⤓ CSV</button></div>${cableTable(b)}`; }},
    docTab("portmap", docBody)
  ],
  actions(tab){ const n = dupGroups(B()).length; return [...(n ? [{id:"dups", icon:"⚠", label:"dupBtn", fn:dupTool}] : []), {id:"addRack", icon:"🗄", label:"rkAdd", fn:() => { const b = B(); edit(() => { const r = normRack({id:uid("k"), name:nextRackName(b)}); b.racks.push(r); }); }},
    {id:"addSw", icon:"＋", label:"pmAddDev", fn:async el => { const b = B(), kind = await uiChoice(t("rackAddWhat"), ["switch","pp","fpp","firewall","router","coresw","nvr","server"].map(x => [x, kindName(x)])); if (!kind) return; const r = b.racks[0]; let u = 0; if (r){ u = rackSpot(b, r, KINDS[kind].h || 1, 0); } edit(() => { const d = newDevice(kind, r && u ? {rack:r.id, u, floor:r.floor, room:r.room} : {}); b.devices.push(d); UI.sel = {type:"dev", id:d.id}; }); }},
    {id:"places", icon:"🏢", label:"places", fn:() => openPlaces()}]; },
  drawer(tab){ const b = B(), s = UI.sel; if (!s) return "";
    if (s.type === "port"){ const d = devById(b, s.id); return d ? portCard(b, d, s.p) : ""; }
    if (s.type === "dev"){ const d = devById(b, s.id); return d ? deviceEditor(b, d, {extraHead:portDev(d) ? `<button class="btn small" data-goport="${d.id}:1">🔌 ${esc(t("pmPorts"))}</button>` : ""}) : ""; }
    if (s.type === "link"){ const l = linkById(b, s.id); return l ? linkEditor(b, l) : ""; }
    if (s.type === "vlan"){ setTimeout(() => { UI.sel = null; openPlaces("vlans"); }, 0); } return ""; },
  onKey(e, tab){ const s = UI.sel; if (!s || s.type !== "port") return; const d = devById(B(), s.id); if (!d) return; const n = Math.round(num(d.ports));
    if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); goPort(d.id, clamp(+s.p + (e.key === "ArrowRight" ? 1 : -1), 1, n)); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); goPort(d.id, clamp(+s.p + (e.key === "ArrowDown" ? 1 : -1) * (+s.p % 2 ? 1 : 1), 1, n)); } },
  exports(){ const b = B(); return [{icon:"▦", label:t("pmCsv"), fn:() => csv(b)}, {icon:"▦", label:t("exInv"), fn:() => invCsv(b)}, {icon:"▦", label:t("exCab"), fn:() => cableCsv(b)}]; },
  reveal(s){ if (s && s.type === "dev"){ const d = devById(B(), s.id); if (d && portDev(d)){ UI.tabs.portmap = "ports"; render(); } } },
  guide:() => [[t("gPm1h"), t("gPm1")], [t("gPm2h"), t("gPm2")], [t("gPm3h"), t("gPm3")], [t("gPm4h"), t("gPm4")], [t("gPm5h"), t("gPm5")]]
});
document.addEventListener("click", e => { const a = e.target.closest("[data-pm2]"); if (!a || UI.app !== "portmap") return; const b = B(); if (a.dataset.pm2 === "cid") autoCableIds(b, null, "C"); else cableCsv(b); });
APPS.portmap.init = () => wireDrawer();
window.PM = {chainAt, parts, linksAt, label606, upstream, cliText, walk, passive, isNet};
})();
