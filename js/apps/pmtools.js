/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Port Map tools for one switch:
//  • bulk port settings — a range of ports gets the same mode / VLAN / PoE / speed / state, or is patched in order to a panel;
//  • configuration import — the switch's own configuration text (Cisco IOS, FortiSwitch, FortiGate with FortiLink) fills
//    VLANs and port settings;
//  • MAC / ARP import — the switch's MAC address table (which MAC is on which port) and an ARP table (which IP has which
//    MAC) fill the MAC and IP of the devices at the ends of the ports.
// Every tool shows what will change before anything is changed, and the whole change is one Undo step.
"use strict";
(function(){
const PM = () => window.PM;
// "1-8, 10, 12-14" → ["1",…]; ports beyond the switch are dropped
function portList(txt, max){ const out = new Set(); String(txt || "").split(/[\s,;]+/).filter(Boolean).forEach(part => { const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) return; let a = +m[1], z = +(m[2] || m[1]); if (a > z) [a, z] = [z, a]; for (let i = a; i <= Math.min(z, max); i++) if (i >= 1) out.add(String(i)); }); return [...out].sort((x, y) => x - y); }
const vlanByVid = (b, vid) => b.vlans.find(v => String(v.vid) === String(vid));
function ensureVlan(b, vid, name, extra = {}){ let v = vlanByVid(b, vid); if (!v){ v = Object.assign({id:uid("v"), vid:String(vid), name:name || "VLAN " + vid, subnet:"", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}, extra); b.vlans.push(v); } else { if (name && /^VLAN \d+$/.test(v.name)) v.name = name; Object.keys(extra).forEach(k => { if (extra[k] && !v[k]) v[k] = extra[k]; }); } return v; }

/* ---------- bulk port settings ---------- */
function bulk(d){
  const b = B(), n = Math.round(num(d.ports)), panels = b.devices.filter(x => PM().passive(x) && x.kind !== "outlet" && num(x.ports) > 0);
  const row = (k, label, ctl) => `<tr><td><input type="checkbox" class="bu-on" data-k="${k}"></td><td>${esc(label)}</td><td>${ctl}</td></tr>`;
  modal(`<h3>⚙ ${esc(t("buT"))} — ${esc(devLabel(d))}</h3><p class="muted small">${esc(t("buH"))}</p>
    <label class="fld"><span>${esc(t("buPorts"))}</span><input id="bu-p" value="1-${n}" placeholder="1-24, 26, 30-32"></label>
    <table class="t"><tr><th></th><th>${esc(t("buWhat"))}</th><th>${esc(t("buValue"))}</th></tr>
      ${row("mode", t("pmMode"), `<select data-v="mode">${opt("", "—", "")}${opt("access", "access", "access")}${opt("trunk", "trunk (802.1Q)", "")}</select>`)}
      ${row("vlan", "VLAN (access)", `<select data-v="vlan">${vlanOpts(b, "", false)}</select>`)}
      ${row("native", t("pmNative"), `<select data-v="native">${vlanOpts(b, "", false)}</select>`)}
      ${row("allowed", t("pmAllowed"), `<input data-v="allowed" placeholder="10,20,30-40 / all">`)}
      ${row("poe", "PoE", `<select data-v="poe">${[["", "—"], ["af", "802.3af"], ["at", "802.3at PoE+"], ["bt3", "802.3bt Type 3"], ["bt4", "802.3bt Type 4"]].map(([k, l]) => opt(k, l, "")).join("")}</select>`)}
      ${row("speed", t("f_speed"), `<select data-v="speed">${["", "auto", "100M", "1G", "2.5G", "10G"].map(x => opt(x, x || "—", "")).join("")}</select>`)}
      ${row("admin", t("pmAdmin"), `<select data-v="admin">${opt("up", t("pmUp"), "up")}${opt("down", t("pmDown"), "")}</select>`)}
      ${row("desc", t("pmDesc"), `<input data-v="desc" placeholder="${esc(t("buDescP"))}">`)}
      ${panels.length ? row("panel", t("buPanel"), `<select data-v="panel">${panels.map(x => opt(x.id, devLabel(x), "")).join("")}</select> ${esc(t("buFrom"))} <input data-v="pstart" value="1" style="width:60px" inputmode="numeric">`) : ""}
    </table>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok">✓ ${esc(t("buApply"))}</button></div>`, {
    ok: async () => {
      const P = portList($("#bu-p").value, n); if (!P.length) return toast("⚠ " + t("buNoPorts"));
      const on = new Set($$(".bu-on:checked").map(x => x.dataset.k)); if (!on.size) return toast("⚠ " + t("buNothing"));
      // values are read now: the window is closed before the change is made
      const V0 = Object.fromEntries($$("#modal [data-v]").map(x => [x.dataset.v, x.value])), v = k => V0[k] || "";
      if (on.has("allowed") && v("allowed") && vlanIdsOk(v("allowed")) === false) return toast("⚠ " + t("pw_allowed", {p:devLabel(d), v:v("allowed")}));
      let ps = 0, busy = [];
      if (on.has("panel")){ const pp = devById(b, v("panel")), st = Math.max(1, Math.round(num(v("pstart"), 1)));
        if (st + P.length - 1 > num(pp.ports)) return toast("⚠ " + t("buPanelFull", {p:devLabel(pp), n:pp.ports}));
        busy = P.map((p, i) => String(st + i)).filter(x => PM().linksAt(b, pp.id, x).length); ps = st;
        if (busy.length && !await uiConfirm(t("buPanelBusy", {p:devLabel(pp), l:busy.join(", ")}), t("pmMove"))) return; }
      closeModal();
      edit(() => P.forEach((p, i) => { const c = PM().cfgOf(d, p);
        ["mode","vlan","native","allowed","poe","speed","admin"].forEach(k => { if (on.has(k)) c[k] = v(k); });
        if (on.has("mode") && c.mode !== "trunk") c.allowed = on.has("allowed") ? c.allowed : "";
        if (on.has("desc")) c.desc = v("desc").replace(/\{n\}/g, p);
        if (on.has("panel")){ const pp = v("panel"), q = String(ps + i);
          // the switch port's own first cable and whatever was on the panel port's front are replaced
          const pr = PM().parts(b, d.id, p), first = pr.after[0]; if (first) b.links = b.links.filter(l => l !== first.link);
          PM().linksAt(b, pp, q).filter(l => { const o = l.a.d === pp ? l.b.d : l.a.d; return PM().isNet(devById(b, o)); }).forEach(l => { b.links = b.links.filter(x => x !== l); });
          addLink(b, d.id, pp, "patch", {pa:p, pb:q}); PM().setLater(d, p, "panel", false); }
        if (!PM().hasCfg(d, p)) delete d.pcfg[p]; }));
      toast("✓ " + t("buDone", {n:P.length}));
    }}, {wide:true, nofocus:true});
  $$(".bu-on").forEach(c => { const tr = c.closest("tr"); tr.querySelectorAll("select,input:not(.bu-on)").forEach(x => x.addEventListener("input", () => { c.checked = true; })); });
}
function vlanIdsOk(txt){ if (String(txt).trim().toLowerCase() === "all") return true; return String(txt).split(/[\s,;]+/).filter(Boolean).every(p => { const m = p.match(/^(\d+)(?:-(\d+))?$/); return m && +m[1] >= 1 && +(m[2] || m[1]) <= 4094; }); }

/* ---------- configuration import ---------- */
// a port key from a configuration → the switch's port number ("u2" = 2nd uplink port, after the copper ports)
function upPort(d, k){ const n = Math.round(num(d.ports)); if (/^u\d+$/.test(k)){ const sfp = Math.round(num(d.params && d.params.sfp)) || 4, p = n - sfp + +k.slice(1); return p >= 1 && p <= n ? String(p) : null; } return +k >= 1 && +k <= n ? String(+k) : null; }
// returns {vlans:[{vid,name,gw,subnet}], ports:{p:{mode,vlan,native,allowed,desc,admin,speed,poe}}, kind}
function parseConfig(txt){
  const L = String(txt || "").replace(/\r/g, "").split("\n"), vlans = {}, ports = {}, ifVid = {};
  const V = (vid, o = {}) => { vlans[vid] = Object.assign(vlans[vid] || {vid:String(vid)}, o); return vlans[vid]; };
  const portNo = name => { const m = String(name).replace(/"/g, "").match(/(\d+)\s*$/); return m ? String(+m[1]) : null; };
  const P = p => ports[p] = ports[p] || {};
  const mask = m => { const x = String(m).split(".").map(Number); if (x.length !== 4) return null; return x.reduce((a, o) => a + (o >>> 0).toString(2).split("").filter(c => c === "1").length, 0); };
  const vids = s => String(s).replace(/"/g, " ").trim().split(/[\s,]+/).filter(Boolean).map(x => ifVid[x] || x).filter(x => /^\d+(-\d+)?$/.test(x)).join(",");
  let kind = /config (system|switch)/.test(txt) ? "forti" : /^\s*interface\s+\S+/m.test(txt) ? "cisco" : "";
  if (kind === "cisco"){
    let cur = null, vlanCur = null;
    L.forEach(raw => { const l = raw.trim(); let m;
      if ((m = l.match(/^vlan\s+(\d+)$/i))){ vlanCur = m[1]; V(vlanCur); cur = null; return; }
      if (vlanCur && (m = l.match(/^name\s+(.+)$/i))){ V(vlanCur, {name:m[1].trim()}); return; }
      if ((m = l.match(/^interface\s+(\S+)/i))){ vlanCur = null; const nm = m[1]; if (/vlan(\d+)/i.test(nm)){ cur = {svi:nm.match(/vlan(\d+)/i)[1]}; return; } if (/port-channel|loopback|tunnel|^po\d|mgmt|null/i.test(nm)){ cur = null; return; }
        // only the front ports of the first module/stack member (Gi1/0/N, Gi0/N, FastEthernet0/N, Te1/1/N count as uplinks above the copper ports)
        // Gi1/0/5 → port 5; Gi1/1/2 (uplink module) → "u2", placed after the copper ports when applied
        const parts = (nm.match(/(\d+(?:\/\d+)*)\s*$/) || [])[1], seg = parts ? parts.split("/").map(Number) : [], last = seg[seg.length - 1];
        const key = seg.length >= 3 && seg[seg.length - 2] > 0 ? "u" + last : last ? String(last) : null; cur = key ? {p:key} : null; if (cur) P(cur.p); return; }
      if (!cur) return;
      if (cur.svi){ if ((m = l.match(/^ip address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/i))){ const pr = mask(m[2]); const c = IP.cidr(m[1] + "/" + pr); V(cur.svi, {gw:m[1], subnet:c ? IP.str(c.net) + "/" + pr : ""}); } if ((m = l.match(/^description\s+(.+)/i))) V(cur.svi, {name:m[1].trim()}); return; }
      const o = P(cur.p);
      if ((m = l.match(/^description\s+(.+)/i))) o.desc = m[1].trim();
      else if ((m = l.match(/^switchport mode\s+(access|trunk)/i))) o.mode = m[1].toLowerCase();
      else if ((m = l.match(/^switchport access vlan\s+(\d+)/i))){ o.vlan = m[1]; o.mode = o.mode || "access"; V(m[1]); }
      else if ((m = l.match(/^switchport trunk native vlan\s+(\d+)/i))){ o.native = m[1]; V(m[1]); }
      else if ((m = l.match(/^switchport trunk allowed vlan\s+(?:add\s+)?(.+)/i))) o.allowed = (o.allowed && /add/i.test(l) ? o.allowed + "," : "") + m[1].trim();
      else if (/^shutdown$/i.test(l)) o.admin = "down";
      else if ((m = l.match(/^speed\s+(\d+|auto)/i))) o.speed = m[1] === "auto" ? "auto" : +m[1] >= 10000 ? "10G" : +m[1] >= 2500 ? "2.5G" : +m[1] >= 1000 ? "1G" : "100M";
      else if (/^power inline never/i.test(l)) o.poe = "";
    });
  }
  if (kind === "forti"){
    // a small reader for "config … / edit "x" / set k v / next / end" blocks
    const stack = []; let edit = null;
    const ctx = () => stack.join(" > ");
    L.forEach(raw => { const l = raw.trim(); let m;
      if ((m = l.match(/^config\s+(.+)$/))){ stack.push(m[1].trim()); return; }
      if (l === "end"){ stack.pop(); edit = null; return; }
      if ((m = l.match(/^edit\s+"?([^"]+)"?$/))){ edit = {name:m[1], ctx:ctx(), set:{}}; return; }
      if (l === "next"){ if (edit) handle(edit); edit = null; return; }
      if (edit && (m = l.match(/^set\s+(\S+)\s+(.+)$/))) edit.set[m[1]] = m[2].trim();
    });
    function handle(e){ const S = e.set, c = e.ctx, uq = s => String(s || "").replace(/"/g, "").trim();
      if (/system interface$/.test(c) && S.vlanid){ const ip = String(S.ip || "").split(/\s+/); const pr = ip[1] ? mask(ip[1]) : null, cc = ip[0] && pr !== null ? IP.cidr(ip[0] + "/" + pr) : null;
        ifVid[e.name] = S.vlanid; V(S.vlanid, {name:uq(S.alias) || e.name, gw:ip[0] && ip[0] !== "0.0.0.0" ? ip[0] : "", subnet:cc ? IP.str(cc.net) + "/" + pr : ""}); }
      else if (/switch vlan$/.test(c) && /^\d+$/.test(e.name)) V(e.name, {name:uq(S.description) || undefined});
      else if (/(switch interface|managed-switch > ports|> ports)$/.test(c) || /^port\d+$/i.test(e.name)){ const p = portNo(e.name); if (!p || !/port/i.test(e.name)) return; const o = P(p);
        if (S.description) o.desc = uq(S.description);
        if (S.status) o.admin = /down/.test(S.status) ? "down" : "up";
        if (S["native-vlan"]){ o.native = S["native-vlan"]; V(o.native); }
        if (S.vlan){ const vv = ifVid[uq(S.vlan)] || uq(S.vlan); if (/^\d+$/.test(vv)){ o.native = vv; V(vv); } }
        const al = S["allowed-vlans"] || S["untagged-vlans"]; if (al){ o.allowed = vids(al); o.mode = "trunk"; }
        if (!o.mode && o.native) o.mode = "access";
        if (o.mode === "access"){ o.vlan = o.native; delete o.native; }
        if (S["poe-status"]) o.poe = /disable/.test(S["poe-status"]) ? "" : "at";
        if (S.speed) o.speed = /auto/.test(S.speed) ? "auto" : /10000/.test(S.speed) ? "10G" : /1000/.test(S.speed) ? "1G" : "100M"; } }
    // FortiLink port lines that came before the VLAN interfaces were read
    Object.values(ports).forEach(o => { ["vlan", "native"].forEach(k => { if (o[k] && ifVid[o[k]]) o[k] = ifVid[o[k]]; }); if (o.allowed) o.allowed = vids(o.allowed); });
  }
  Object.values(vlans).forEach(v => { Object.keys(v).forEach(k => { if (v[k] === undefined) delete v[k]; }); });
  return {kind, vlans:Object.values(vlans).filter(v => /^\d+$/.test(v.vid) && +v.vid >= 1 && +v.vid <= 4094), ports};
}
function cfgImport(d){
  const b = B(), n = Math.round(num(d.ports));
  modal(`<h3>⤓ ${esc(t("ciT"))} — ${esc(devLabel(d))}</h3><p class="muted small">${esc(t("ciH"))}</p>
    <textarea id="ci-t" class="mono" rows="12" style="width:100%" spellcheck="false" placeholder="show running-config  /  show full-configuration"></textarea>
    <div class="row" style="gap:8px;margin-top:6px"><button class="btn small" data-m="file">📄 ${esc(t("ciFile"))}</button><span class="grow"></span><button class="btn" data-m="prev">👁 ${esc(t("ciPreview"))}</button></div>
    <div id="ci-r"></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok" disabled>✓ ${esc(t("ciApply"))}</button></div>`, {
    file: async () => { const txt = await openTextFile(".txt,.cfg,.conf,.log"); if (txt !== null && txt !== undefined) $("#ci-t").value = txt; modalActs.prev(); },
    prev: () => { const R = parseConfig($("#ci-t").value), P = Object.keys(R.ports).filter(k => upPort(d, k)), extra = Object.keys(R.ports).filter(k => !upPort(d, k));
      modalActs._r = R;
      $("#ci-r").innerHTML = !R.kind ? `<p class="msg err">⚠ ${esc(t("ciUnknown"))}</p>` : `<p class="small">${esc(t("ciFound", {k:R.kind === "cisco" ? "Cisco IOS" : "Fortinet", v:R.vlans.length, p:P.length}))}${extra.length ? " " + esc(t("ciExtra", {l:extra.slice(0, 8).join(", "), n})) : ""}</p>
        <div class="scroll" style="max-height:30vh"><table class="t"><tr><th>${esc(t("f_port"))}</th><th>${esc(t("pmMode"))}</th><th>VLAN</th><th>${esc(t("pmAllowed"))}</th><th>${esc(t("pmDesc"))}</th></tr>${P.map(p => { const o = R.ports[p]; return `<tr><td>${upPort(d, p)}${/^u/.test(p) ? " <small class=muted>(uplink " + p.slice(1) + ")</small>" : ""}</td><td>${esc(o.mode || "")}</td><td>${esc(o.vlan || o.native || "")}</td><td>${esc(o.allowed || "")}</td><td>${esc(o.desc || "")}${o.admin === "down" ? " ⛔" : ""}</td></tr>`; }).join("")}</table></div>
        ${R.vlans.length ? `<p class="small">VLAN: ${R.vlans.map(v => esc(v.vid + (v.name ? " " + v.name : "") + (v.subnet ? " (" + v.subnet + ")" : ""))).join(" · ")}</p>` : ""}
        <label class="chk"><input type="checkbox" id="ci-over" checked> ${esc(t("ciOver"))}</label>`;
      $('#modal [data-m="ok"]').disabled = !R.kind || (!P.length && !R.vlans.length); },
    ok: () => { const R = modalActs._r; if (!R) return; const over = $("#ci-over") && $("#ci-over").checked; closeModal(); let nP = 0;
      edit(() => { R.vlans.forEach(v => ensureVlan(b, v.vid, v.name, {gw:v.gw || "", subnet:v.subnet || ""}));
        Object.entries(R.ports).forEach(([k, o]) => { const p = upPort(d, k); if (!p) return; const c = PM().cfgOf(d, p), id = vid => vid ? ensureVlan(b, vid).id : "";
          const put = (k, val) => { if (val === undefined) return; if (over || !c[k] || c[k] === "up") c[k] = val; };
          put("mode", o.mode); put("vlan", o.vlan ? id(o.vlan) : undefined); put("native", o.native ? id(o.native) : undefined); put("allowed", o.allowed); put("desc", o.desc); put("admin", o.admin); put("speed", o.speed); put("poe", o.poe);
          if (!PM().hasCfg(d, p)) delete d.pcfg[p]; else nP++; }); });
      toast("✓ " + t("ciDone", {p:nP, v:R.vlans.length}), 5000); }
  }, {wide:true, nofocus:true});
}

/* ---------- MAC address table + ARP table ---------- */
const MAC_RX = /\b([0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b|\b[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}\b|\b[0-9a-f]{12}\b/i;
const normMac = m => { const h = String(m).replace(/[^0-9a-f]/gi, "").toUpperCase(); return h.length === 12 ? h.match(/../g).join(":") : ""; };
function parseTables(txt){
  const byPort = {}, arp = {};
  String(txt || "").replace(/\r/g, "").split("\n").forEach(l => { const mm = l.match(MAC_RX); if (!mm) return; const mac = normMac(mm[0]); if (!mac || mac === "FF:FF:FF:FF:FF:FF") return;
    const ip = (l.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/) || [])[1];
    if (ip && IP.toInt(ip) !== null){ arp[mac] = ip; }
    // port: Gi1/0/5, Fa0/5, Te1/1/1, port5, port5(port-id 5), eth5 … (an ARP line usually has no port)
    const pm = l.replace(mm[0], " ").match(/\b(?:gi|ge|fa|te|tw|eth|et|port|p)[a-z]*\s*(\d+(?:\/\d+)*)\b/i);
    if (pm){ const p = String(+pm[1].split("/").pop()); (byPort[p] = byPort[p] || new Set()).add(mac); }
  });
  return {byPort, arp};
}
function macImport(d){
  const b = B(), n = Math.round(num(d.ports));
  modal(`<h3>⤓ ${esc(t("miT"))} — ${esc(devLabel(d))}</h3><p class="muted small">${esc(t("miH"))}</p>
    <textarea id="mi-t" class="mono" rows="10" style="width:100%" spellcheck="false" placeholder="show mac address-table  ·  show ip arp  ·  diagnose switch mac-address list  ·  get system arp  ·  arp -a"></textarea>
    <div class="row" style="gap:8px;margin-top:6px"><button class="btn small" data-m="file">📄 ${esc(t("ciFile"))}</button><span class="grow"></span><button class="btn" data-m="prev">👁 ${esc(t("ciPreview"))}</button></div>
    <div id="mi-r"></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button><span class="grow"></span><button class="btn pri" data-m="ok" disabled>✓ ${esc(t("ciApply"))}</button></div>`, {
    file: async () => { const txt = await openTextFile(".txt,.log,.csv"); if (txt) $("#mi-t").value = txt; modalActs.prev(); },
    prev: () => { const T = parseTables($("#mi-t").value), rows = [];
      Object.entries(T.byPort).forEach(([p, S]) => { if (+p > n) return; const macs = [...S];
        if (macs.length > 1){ rows.push({p, skip:t("miMany", {n:macs.length})}); return; }
        const mac = macs[0], ip = T.arp[mac] || "", pr = PM().parts(b, d.id, p), ed = pr.end && devById(b, pr.end.d), other = b.devices.find(x => normMac(x.mac) === mac && (!ed || x.id !== ed.id));
        if (ed && PM().isNet(ed)) { rows.push({p, skip:t("miUplink")}); return; }
        rows.push({p, mac, ip, ed, other, newDev:!ed}); });
      // ARP only: devices that already have this MAC get the IP
      const arpOnly = Object.entries(T.arp).map(([mac, ip]) => ({mac, ip, dev:b.devices.find(x => normMac(x.mac) === mac && !x.ip)})).filter(x => x.dev);
      modalActs._rows = rows.filter(r => !r.skip); modalActs._arp = arpOnly;
      $("#mi-r").innerHTML = `<p class="small">${esc(t("miFound", {p:Object.keys(T.byPort).length, a:Object.keys(T.arp).length}))}</p><div class="scroll" style="max-height:34vh"><table class="t"><tr><th></th><th>${esc(t("f_port"))}</th><th>MAC</th><th>IP</th><th>${esc(t("pmEnd"))}</th></tr>
        ${rows.sort((x, y) => x.p - y.p).map((r, i) => r.skip ? `<tr class="muted"><td></td><td>${r.p}</td><td colspan="3"><small>${esc(r.skip)}</small></td></tr>` : `<tr><td><input type="checkbox" class="mi-on" data-i="${modalActs._rows.indexOf(r)}" checked></td><td>${r.p}</td><td class="mono">${esc(r.mac)}</td><td>${esc(r.ip || "—")}</td><td>${r.ed ? esc(devLabel(r.ed)) + (r.ed.mac && normMac(r.ed.mac) !== r.mac ? ` <span class="bad">≠ ${esc(r.ed.mac)}</span>` : "") : r.other ? `🔗 ${esc(devLabel(r.other))} <small class="muted">${esc(t("miConnect"))}</small>` : `＋ <small class="muted">${esc(t("miNew"))}</small>`}</td></tr>`).join("")}
        ${arpOnly.map(x => `<tr><td>✓</td><td>—</td><td class="mono">${esc(x.mac)}</td><td>${esc(x.ip)}</td><td>${esc(devLabel(x.dev))}</td></tr>`).join("")}</table></div>`;
      $('#modal [data-m="ok"]').disabled = !modalActs._rows.length && !arpOnly.length; },
    ok: () => { const rows = modalActs._rows || [], on = new Set($$(".mi-on:checked").map(x => +x.dataset.i)), arp = modalActs._arp || []; closeModal(); let nU = 0, nN = 0;
      edit(() => { rows.forEach((r, i) => { if (!on.has(i)) return; let x = r.ed;
          if (!x && r.other){ x = r.other; const pr = PM().parts(b, d.id, r.p), tail = pr.after.filter(h => PM().passive(devById(b, h.d))).slice(-1)[0] || {d:d.id, p:r.p}; addLink(b, tail.d, x.id, "cat6", {pa:tail.p}); }
          if (!x){ x = newDevice("other", {status:"planned"}); x.name = autoName(b, "other"); b.devices.push(x); const pr = PM().parts(b, d.id, r.p), tail = pr.after.filter(h => PM().passive(devById(b, h.d))).slice(-1)[0] || {d:d.id, p:r.p}; addLink(b, tail.d, x.id, "cat6", {pa:tail.p}); PM().setLater(d, r.p, "end", false); nN++; }
          x.mac = r.mac; if (r.ip && !x.ip) x.ip = r.ip; nU++; });
        arp.forEach(a => { if (!a.dev.ip){ a.dev.ip = a.ip; nU++; } }); });
      toast("✓ " + t("miDone", {u:nU, n:nN}), 5000); }
  }, {wide:true, nofocus:true});
}
// buttons in the switch's panel (Port Map) and in its port cards
const toolBtns = d => `<button class="btn small" data-pmt="bulk:${d.id}">⚙ ${esc(t("buBtn"))}</button><button class="btn small" data-pmt="cfg:${d.id}">⤓ ${esc(t("ciBtn"))}</button><button class="btn small" data-pmt="mac:${d.id}">⤓ ${esc(t("miBtn"))}</button>`;
document.addEventListener("click", e => { const el = e.target.closest && e.target.closest("[data-pmt]"); if (!el) return; const [k, id] = el.dataset.pmt.split(":"), d = devById(B(), id); if (!d) return; ({bulk, cfg:cfgImport, mac:macImport})[k](d); });
window.PMT = {toolBtns, parseConfig, parseTables, portList};
})();
