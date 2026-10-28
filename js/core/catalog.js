// Device catalog: built-in models (from official data sheets), online updates, user-added models and optional AI lookup.
"use strict";
const CAT = {
  builtin: Array.isArray(window.CATALOG_DATA) ? window.CATALOG_DATA : [],
  remote: [], user: [], remoteInfo: null, _all: null,
  key: r => (String(r.brand || "") + "|" + String(r.model || "")).trim().toLowerCase(),
  async load(){
    if (!IDB.db) return;
    const rm = await IDB.get("catalog", "remote").catch(() => null); if (rm && Array.isArray(rm.models)){ CAT.remote = rm.models; CAT.remoteInfo = {date:rm.date, version:rm.version, checked:rm.checked}; }
    const us = await IDB.get("catalog", "user").catch(() => null); if (Array.isArray(us)) CAT.user = us;
    CAT._all = null;
  },
  all(){ if (CAT._all) return CAT._all; const m = new Map();
    [["builtin", CAT.builtin], ["remote", CAT.remote], ["user", CAT.user]].forEach(([src, L]) => L.forEach(r => { if (r && r.brand && r.model) m.set(CAT.key(r), Object.assign({}, r, {_src:src})); }));
    CAT._all = [...m.values()].sort((a, b) => (a.brand + a.model).localeCompare(b.brand + b.model)); return CAT._all; },
  get(key){ return CAT.all().find(r => CAT.key(r) === key); },
  brands(){ return [...new Set(CAT.all().map(r => r.brand))].sort(); },
  search(q, kinds){ const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    return CAT.all().filter(r => (!kinds || !kinds.length || kinds.includes(r.kind)) && words.every(w => [r.brand, r.model, (r.sku || []).join(" "), r.series, r.desc].join(" ").toLowerCase().includes(w))); },
  async saveUser(rec){ rec.verified = rec.verified || today(); const k = CAT.key(rec); CAT.user = CAT.user.filter(r => CAT.key(r) !== k); CAT.user.push(rec); CAT._all = null; if (IDB.db) await IDB.put("catalog", CAT.user, "user"); },
  async delUser(key){ CAT.user = CAT.user.filter(r => CAT.key(r) !== key); CAT._all = null; if (IDB.db) await IDB.put("catalog", CAT.user, "user"); },
  // Download the published catalog (JSON) and keep it for offline use.
  async update(manual){
    const url = store.settings.catalogUrl; if (!url) return manual && toast("⚠ " + t("catNoUrl"));
    try {
      const r = await fetch(url, {cache:"no-store"}); if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(), models = Array.isArray(j) ? j : j.models; if (!Array.isArray(models)) throw new Error(t("catBadFile"));
      const good = models.filter(x => x && x.brand && x.model && x.kind);
      const rec = {models:good, date:j.date || today(), version:j.version || "", checked:new Date().toISOString()};
      if (IDB.db) await IDB.put("catalog", rec, "remote"); CAT.remote = good; CAT.remoteInfo = rec; CAT._all = null;
      if (manual) toast("✓ " + t("catUpdated",{n:good.length}));
      return true;
    } catch(e){ if (manual) toast("⚠ " + t("catUpdFail") + " " + (e.message || "")); return false; }
  },
  autoUpdate(){ if (!store.settings.catalogAuto || !navigator.onLine) return; const last = CAT.remoteInfo && CAT.remoteInfo.checked; if (last && Date.now() - new Date(last).getTime() < 7 * 864e5) return; CAT.update(false); }
};
// Well-known brands offered when typing a brand (also those without models in the catalog yet).
const BRANDS_KNOWN = [
  // network / security
  "Fortinet","Cisco","Cisco Meraki","Juniper","HPE Aruba Networking","Aruba Instant On","Ubiquiti","TP-Link","TP-Link Omada","MikroTik","Ruckus","Extreme Networks","Huawei","H3C","ZTE","Zyxel","D-Link","Netgear","Allied Telesis","Ruijie","Reyee","Grandstream","Cambium Networks","Mimosa","Palo Alto Networks","Check Point","Sophos","SonicWall","WatchGuard","Barracuda","pfSense / Netgate","Keenetic","Tenda","Mercusys","Edimax","Planet","Teltonika","Draytek","Cudy","Linksys","Asus","Superbox (Turkcell)","Airties","Nokia","Alcatel-Lucent Enterprise","Dell","Lenovo","Arista",
  // CCTV / access / intercom
  "Hikvision","Dahua","Uniview","Axis","Hanwha Vision","Bosch","Avigilon","Milestone","Tiandy","Ezviz","Imou","Reolink","Ajax","Paradox","Akuvox","2N","Commax","Kocom","Suprema","ZKTeco","Honeywell",
  // power
  "APC by Schneider Electric","APC","Schneider Electric","Eaton","Vertiv","Liebert","Makelsan","Inform","Tescom","Legrand","Riello","Socomec","CyberPower","Delta","Huawei UPS","Power Kinetics","Salicru","Gesan","Powerware","Tripp Lite","Raritan","Rittal","Lande","Triton","Canovate","Netrack","Lanberg","Hyperline",
  // servers / storage / end devices
  "HPE","Supermicro","Fujitsu","Synology","QNAP","Western Digital","Seagate","Yealink","Fanvil","Snom","Polycom (Poly)","Avaya","Panasonic","Siemens","HP","Canon","Epson","Brother","Kyocera","Xerox","Samsung","LG","Philips",
  // cabling / passive
  "Panduit","CommScope","Corning","Nexans","Legrand LCS","Belden","Brand-Rex","Excel","Schrack","Prysmian","Siemon","Molex"
];
const allBrands = () => [...new Set([...CAT.brands(), ...BRANDS_KNOWN])].sort((a, b) => a.localeCompare(b));
// Fill a device from a catalog record (only values the record actually has are copied).
function applySpec(d, r){
  if (!r) return;
  if (r.kind && KINDS[r.kind] && r.kind !== d.kind){ d.kind = r.kind; normDevice(d); }
  d.brand = r.brand; d.model = r.model; d.cat = CAT.key(r);
  const P2 = d.params, pw = r.power || {}, ports = r.ports || {}, dims = r.dims_mm || {};
  const has = v => v !== null && v !== undefined && v !== "";
  if (has(r.u) && r.u > 0) P2.h = r.u;
  if (has(dims.d)) P2.depth = dims.d; if (has(r.weight_kg)) P2.weight = r.weight_kg;
  if (has(pw.typ_w)) P2.powerW = pw.typ_w; if (has(pw.max_w)) P2.maxW = pw.max_w; if (has(pw.psu)) P2.psu = pw.psu;
  const af = {"front-to-back":"f2b", "back-to-front":"b2f", "side-to-side":"side", passive:"passive"}[r.airflow]; if (af) P2.airflow = af;
  const pc = ["rj45_100m","rj45_1g","rj45_mgig","rj45_10g","sfp","sfp_plus","sfp28","qsfp_plus","qsfp28"].reduce((s, k) => s + (num(ports[k]) || 0), 0); if (pc) d.ports = pc; const sf = ["sfp","sfp_plus","sfp28","qsfp_plus","qsfp28"].reduce((s, k) => s + (num(ports[k]) || 0), 0); P2.sfp = sf;
  if (r.poe){ if (has(r.poe.ports)) P2.poePorts = r.poe.ports; if (has(r.poe.budget_w)) P2.poeBudget = r.poe.budget_w; if (has(r.poe.std)) P2.poeStd = r.poe.std; }
  if (r.poe_in && has(r.poe_in.max_w)) P2.poeIn = r.poe_in.max_w;
  if (r.ups){ if (has(r.ups.va)) P2.va = r.ups.va; if (has(r.ups.w)) P2.upsW = r.ups.w; if (has(r.ups.battery_wh)) P2.wh = r.ups.battery_wh; }
  if (d.kind === "pdu" && pw.input){ const m = String(pw.input).match(/(\d+)\s*A/i); if (m) P2.amps = +m[1]; }
  if (d.kind === "camera" && r.camera){ const c = r.camera, C = d.camera;
    if (has(c.style) && CAM_STYLES[c.style]) C.style = c.style; if (has(c.mp)) C.mp = c.mp; if (has(c.sensor)) C.sensor = c.sensor; if (has(c.ir_m)) C.ir = c.ir_m; if (has(c.ip_rating)) C.ipr = c.ip_rating + (c.ik ? " / " + c.ik : "");
    if (Array.isArray(c.lens_mm) && c.lens_mm.length){ C.lens = String(c.lens_mm[0]); C.lenses = c.lens_mm; C.hfovs = c.hfov_deg || []; if (Array.isArray(c.hfov_deg) && has(c.hfov_deg[0])) C.hfov = c.hfov_deg[0]; }
    else if (has(c.lens_mm)) C.lens = String(c.lens_mm);
    if (Array.isArray(c.codec) && c.codec.length) C.codecs = c.codec; if (has(c.max_fps)) C.maxFps = c.max_fps; if (has(c.power_w)) P2.poeIn = c.power_w; }
  if ((d.kind === "nvr" || d.kind === "dvr") && r.nvr){ const n = r.nvr, N = d.nvrp; if (has(n.channels)) N.channels = n.channels; if (has(n.in_mbps)) N.inMbps = n.in_mbps; if (has(n.hdd_bays)) N.bays = n.hdd_bays; if (has(n.hdd_max_tb)) N.hddMax = n.hdd_max_tb; if (Array.isArray(n.raid)) N.raids = n.raid; if (has(n.max_mp)) N.maxMp = n.max_mp; if (has(n.poe_ports)) P2.poePorts = n.poe_ports; if (has(n.poe_budget_w)) P2.poeBudget = n.poe_budget_w; }
  if (d.kind === "ap" && r.wifi && r.wifi.bands){ ["2.4","5","6"].forEach(bd => { const x = r.wifi.bands[bd], R = d.ap.radios[bd]; if (!x){ if (bd === "6") R.on = false; R.none = true; return; } R.none = false; if (has(x.tx_dbm)) R.maxTx = x.tx_dbm; if (has(x.gain_dbi)) R.gain = x.gain_dbi; if (R.tx > R.maxTx) R.tx = R.maxTx; }); d.ap.std = r.wifi.std || ""; d.ap.maxClients = r.wifi.max_clients || 0; }
}
function specLine(r){
  const p = r.ports || {}, pw = r.power || {}, bits = [];
  if (r.u) bits.push(r.u + "U");
  const pc = ["rj45_1g","rj45_mgig","rj45_10g","sfp","sfp_plus","sfp28","qsfp_plus","qsfp28"].map(k => num(p[k]) ? `${p[k]}×${({rj45_1g:"GE", rj45_mgig:"mGig", rj45_10g:"10GE", sfp:"SFP", sfp_plus:"SFP+", sfp28:"SFP28", qsfp_plus:"QSFP+", qsfp28:"QSFP28"})[k]}` : "").filter(Boolean); if (pc.length) bits.push(pc.join(" "));
  if (r.poe && r.poe.budget_w) bits.push(`PoE ${r.poe.budget_w} W`);
  if (r.camera){ const c = r.camera; bits.push([c.mp && c.mp + " MP", Array.isArray(c.lens_mm) ? c.lens_mm.join("/") + " mm" : c.lens_mm, c.ir_m && "IR " + c.ir_m + " m"].filter(Boolean).join(" · ")); }
  if (r.nvr){ const n = r.nvr; bits.push([n.channels && n.channels + " ch", n.in_mbps && n.in_mbps + " Mbps", n.hdd_bays && n.hdd_bays + "×HDD"].filter(Boolean).join(" · ")); }
  if (r.wifi) bits.push([r.wifi.std, r.wifi.streams].filter(Boolean).join(" · "));
  if (r.ups && r.ups.va) bits.push(`${r.ups.va} VA / ${r.ups.w || "?"} W`);
  if (pw.max_w) bits.push(`≤${pw.max_w} W`);
  return bits.filter(Boolean).join(" · ");
}
/* ---------- picker ---------- */
const KGROUPS = {net:["firewall","router","coresw","switch","modem","ont","wlc"], wifi:["ap","wlc"], cctv:["camera","nvr","dvr","monitor"], power:["ups","pdu"], compute:["server","nas","storage"], passive:["pp","fpp","splice","mediaconv"], end:["phone","printer","pc","workstation","other"]};
function openCatalogPicker(kind, onPick){
  let kinds = kind ? [kind] : [], q = "", brand = "";
  const draw = () => {
    const L = CAT.search(q, kinds).filter(r => !brand || r.brand === brand);
    $("#cp-list").innerHTML = L.length ? L.slice(0, 200).map(r => `<button class="pk catit" data-m="sel" data-k="${esc(CAT.key(r))}"><svg viewBox="0 0 48 48" width="26" height="26">${ICO[(KINDS[r.kind] || KINDS.other).icon] || ICO.box}</svg><span><b>${esc(r.brand)} ${esc(r.model)}</b><small>${esc(kindName(r.kind))} · ${esc(specLine(r) || r.desc || "")}</small></span>${r._src === "user" ? `<span class="pill">${esc(t("catMine"))}</span>` : r.confidence === "medium" ? `<span class="pill warn" title="${esc(t("catMedium"))}">~</span>` : ""}</button>`).join("") + (L.length > 200 ? `<p class="muted small">… +${L.length - 200}</p>` : "") : `<p class="muted">${esc(t("catNone"))}</p>`;
  };
  modal(`<h3>📚 ${esc(t("catTitle"))}</h3><p class="muted small">${esc(t("catHint",{n:CAT.all().length}))}</p>
    <div class="row"><input id="cp-q" placeholder="${esc(t("catSearch"))}" autocomplete="off"><select id="cp-b"><option value="">${esc(t("catAllBrands"))}</option>${CAT.brands().map(x => opt(x, x, "")).join("")}</select></div>
    <div class="chips" id="cp-k"><button class="chip${!kinds.length ? " on" : ""}" data-m="k:">${esc(t("all"))}</button>${KIND_ORDER.filter(k => CAT.all().some(r => r.kind === k) || k === kind).map(k => `<button class="chip${kinds.includes(k) ? " on" : ""}" data-m="k:${k}">${esc(kindName(k))}</button>`).join("")}</div>
    <div class="cpgrid"><div id="cp-list" class="scroll pick" style="max-height:52vh"></div><div id="cp-det" class="cpdet"><p class="muted">${esc(t("catPickHint"))}</p></div></div>
    <div class="mfoot"><button class="btn" data-m="newModel">＋ ${esc(t("catNew"))}</button><span class="grow"></span><button class="btn" data-m="close">${esc(t("cancel"))}</button><button class="btn pri" data-m="apply" id="cp-ok" disabled>${esc(t("catApply"))}</button></div>`, {
      k: (bt, e, k) => { kinds = k ? [k] : []; $$("#cp-k .chip").forEach(x => x.classList.toggle("on", x === bt)); draw(); },
      sel: bt => { $$("#cp-list .on").forEach(x => x.classList.remove("on")); bt.classList.add("on"); const r = CAT.get(bt.dataset.k); $("#cp-det").innerHTML = specDetail(r); $("#cp-ok").disabled = false; $("#cp-ok").dataset.k = bt.dataset.k; },
      apply: bt => { const r = CAT.get(bt.dataset.k); closeModal(); if (r) onPick(r); },
      delUser: async bt => { await CAT.delUser(bt.dataset.k); draw(); $("#cp-det").innerHTML = ""; },
      newModel: () => openNewModel(kind || (kinds[0] || ""), onPick)
    }, {xwide:true});
  $("#cp-q").addEventListener("input", e => { q = e.target.value; draw(); }); $("#cp-b").addEventListener("change", e => { brand = e.target.value; draw(); });
  draw();
}
function specDetail(r){
  if (!r) return "";
  const rows = [], add = (k, v) => { if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) rows.push(`<tr><td class="k">${esc(k)}</td><td>${esc(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`); };
  const pw = r.power || {}, p = r.ports || {}, dm = r.dims_mm || {};
  add(t("f_kind"), kindName(r.kind)); add(t("catSeries"), r.series); add("SKU", r.sku); add(t("catDesc"), r.desc); add(t("catMount"), r.mount); add("U", r.u || null);
  add(t("catDims"), [dm.w, dm.d, dm.h].some(x => x) ? `${dm.w ?? "?"} × ${dm.d ?? "?"} × ${dm.h ?? "?"} mm` : null); add(t("f_weight"), r.weight_kg);
  add(t("f_powerW"), pw.typ_w); add(t("f_maxW"), pw.max_w); add("PSU", pw.psu ? pw.psu + (pw.psu_redundant ? " (redundant)" : "") : null); add(t("catInput"), pw.input); add("BTU/h", r.heat_btu_h); add(t("f_airflow"), r.airflow);
  add(t("catPorts"), specLine({ports:p}) + (p.notes ? " — " + p.notes : ""));
  if (r.poe) add("PoE", [r.poe.ports && r.poe.ports + " port", r.poe.budget_w && r.poe.budget_w + " W", r.poe.std].filter(Boolean).join(" · "));
  if (r.poe_in) add(t("f_poeIn"), [r.poe_in.class, r.poe_in.max_w && r.poe_in.max_w + " W"].filter(Boolean).join(" · "));
  if (r.perf) add(t("catPerf"), Object.entries(r.perf).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_gbps/, "")}: ${v} ${/mpps/.test(k) ? "Mpps" : "Gbps"}`).join(" · "));
  if (r.wifi){ add("Wi-Fi", [r.wifi.std, r.wifi.streams].filter(Boolean).join(" · ")); Object.entries(r.wifi.bands || {}).forEach(([bd, x]) => x && add(bd + " GHz", [x.tx_dbm && x.tx_dbm + " dBm", x.gain_dbi && x.gain_dbi + " dBi"].filter(Boolean).join(" · "))); add(t("catClients"), r.wifi.max_clients); }
  if (r.camera){ const c = r.camera; add(t("camStyle"), c.style); add("MP", c.mp); add(t("camRes"), c.resolution); add(t("camSensor"), c.sensor); add(t("camLens"), Array.isArray(c.lens_mm) ? c.lens_mm.map((l, i) => l + " mm" + (c.hfov_deg && c.hfov_deg[i] ? " (" + c.hfov_deg[i] + "°)" : "")).join(", ") : c.lens_mm); add("IR", c.ir_m && c.ir_m + " m"); add(t("camCodec"), c.codec); add("FPS", c.max_fps); add("IP/IK", [c.ip_rating, c.ik].filter(Boolean).join(" / ")); add(t("f_poeIn"), c.power_w && c.power_w + " W"); }
  if (r.nvr){ const n = r.nvr; add(t("nvrCh"), n.channels); add(t("nvrIn"), n.in_mbps && n.in_mbps + " Mbps"); add("HDD", [n.hdd_bays && n.hdd_bays + " ×", n.hdd_max_tb && n.hdd_max_tb + " TB"].filter(Boolean).join(" ")); add("RAID", n.raid); add("PoE", [n.poe_ports && n.poe_ports + " port", n.poe_budget_w && n.poe_budget_w + " W"].filter(Boolean).join(" · ")); add(t("nvrMaxMp"), n.max_mp); }
  if (r.ups){ add("VA / W", `${r.ups.va ?? "?"} / ${r.ups.w ?? "?"}`); add(t("upsTopo"), r.ups.topology); add(t("f_wh"), r.ups.battery_wh); add(t("upsOut"), r.ups.outlets); }
  add(t("catNotes"), r.notes);
  return `<h4>${esc(r.brand)} ${esc(r.model)}</h4><table class="t">${rows.join("")}</table>
    <p class="small">${r.source ? `${esc(t("catSource"))}: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(r.source.replace(/^https?:\/\//, "").slice(0, 70))}</a>` : ""}${r.verified ? ` · ${esc(t("catVerified"))} ${esc(r.verified)}` : ""}${r.confidence === "medium" ? ` · <span class="pill warn">${esc(t("catMedium"))}</span>` : ""}${r._src === "user" ? ` · ${esc(t("catMine"))} <button class="btn small dan" data-m="delUser" data-k="${esc(CAT.key(r))}">${esc(t("delete"))}</button>` : ""}</p>`;
}
/* ---------- adding a model that is not in the catalog ---------- */
const GENERIC = /^(switch|router|firewall|camera|kamera|ap|access ?point|nvr|dvr|ups|pdu|server|modem|cihaz|device|model|test|new|yeni|other|digər|-+|\?+)$/i;
function modelProblem(brand, model){
  brand = String(brand || "").trim(); model = String(model || "").trim();
  if (!brand) return t("nmNeedBrand"); if (model.length < 3) return t("nmNeedModel"); if (GENERIC.test(model) || same(model, brand)) return t("nmGeneric");
  if (!/[0-9]/.test(model) && model.split(/\s+/).length < 2) return t("nmVague");
  return "";
}
function openNewModel(kind, onPick){
  const near = () => { const b = $("#nm-b").value.trim(), m = $("#nm-m").value.trim().toLowerCase().replace(/[\s-]/g, ""); if (m.length < 3) return [];
    return CAT.all().filter(r => (!b || same(r.brand, b)) && (r.model.toLowerCase().replace(/[\s-]/g, "").includes(m) || m.includes(r.model.toLowerCase().replace(/[\s-]/g, "")))).slice(0, 6); };
  const ai = store.settings.ai.enabled && store.settings.ai.key;
  modal(`<h3>＋ ${esc(t("catNew"))}</h3><p class="muted small">${esc(t("nmHint"))}</p>
    <datalist id="dl-brands2">${allBrands().map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="two"><label class="fld"><span>${esc(t("f_brand"))} *</span><input id="nm-b" list="dl-brands2" placeholder="Fortinet, Hikvision…"></label><label class="fld"><span>${esc(t("nmModel"))} *</span><input id="nm-m" placeholder="FortiSwitch 248E-FPOE"></label></div>
    <label class="fld"><span>${esc(t("f_kind"))}</span><select id="nm-k">${KIND_ORDER.map(k => opt(k, kindName(k), kind || "switch")).join("")}</select></label>
    <div id="nm-near"></div><div class="msg err" id="nm-err"></div>
    <div class="btns">${ai ? `<button class="btn pri" data-m="ai">🤖 ${esc(t("nmAi"))}</button>` : `<span class="muted small">${esc(t("nmAiOff"))}</span>`}<button class="btn" data-m="web">🔎 ${esc(t("nmWeb"))}</button></div>
    <details class="dsec" id="nm-man"><summary>${esc(t("nmManual"))}</summary><div class="dsb">
      <div class="two"><label class="fld"><span>U</span><input id="nm-u" type="number" min="0"></label><label class="fld"><span>${esc(t("f_ports"))}</span><input id="nm-p" type="number" min="0"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_powerW"))}</span><input id="nm-pw" type="number" min="0"></label><label class="fld"><span>${esc(t("f_maxW"))}</span><input id="nm-mx" type="number" min="0"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_weight"))}</span><input id="nm-w" type="number" min="0" step="0.1"></label><label class="fld"><span>${esc(t("f_depth"))}</span><input id="nm-d" type="number" min="0"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_poePorts"))}</span><input id="nm-pp" type="number" min="0"></label><label class="fld"><span>${esc(t("f_poeBudget"))}</span><input id="nm-pb" type="number" min="0"></label></div>
      <div class="two"><label class="fld"><span>${esc(t("f_poeIn"))}</span><input id="nm-pi" type="number" min="0" step="0.1"></label><label class="fld"><span>PSU</span><input id="nm-psu" type="number" min="1" max="4" value="1"></label></div>
      <label class="fld"><span>${esc(t("catSource"))}</span><input id="nm-src" placeholder="https://… datasheet"></label>
      <button class="btn" data-m="saveMan">💾 ${esc(t("nmSave"))}</button></div></details>
    <div id="nm-res"></div>
    <div class="mfoot"><button class="btn" data-m="close">${esc(t("cancel"))}</button></div>`, {
      web: () => { const b = $("#nm-b").value.trim(), m = $("#nm-m").value.trim(), pr = modelProblem(b, m); if (pr){ $("#nm-err").textContent = pr; return; } window.open("https://www.google.com/search?q=" + encodeURIComponent(`${b} ${m} datasheet specifications`), "_blank"); $("#nm-man").open = true; },
      ai: async bt => { const b = $("#nm-b").value.trim(), m = $("#nm-m").value.trim(), k = $("#nm-k").value, pr = modelProblem(b, m); if (pr){ $("#nm-err").textContent = pr; return; }
        $("#nm-err").textContent = ""; bt.disabled = true; $("#nm-res").innerHTML = `<p class="muted">⏳ ${esc(t("aiWorking"))}</p>`;
        try { const rec = await aiLookup(b, m, k); $("#nm-res").innerHTML = `<div class="aibox">${specDetail(Object.assign({_src:"ai"}, rec))}<p class="muted small">${esc(t("aiCheck"))}</p><div class="btns"><button class="btn pri" data-m="saveAi">✓ ${esc(t("aiAccept"))}</button></div></div>`; modalActs._ai = rec; }
        catch(e){ $("#nm-res").innerHTML = `<p class="msg err">⚠ ${esc(e.message || String(e))}</p>`; }
        bt.disabled = false; },
      saveAi: async () => { const rec = modalActs._ai; if (!rec) return; rec.verified = today(); await CAT.saveUser(rec); closeModal(); toast("✓ " + t("nmSaved")); onPick && onPick(CAT.get(CAT.key(rec))); },
      saveMan: async () => { const b = $("#nm-b").value.trim(), m = $("#nm-m").value.trim(), pr = modelProblem(b, m); if (pr){ $("#nm-err").textContent = pr; return; }
        const n = id => { const v = $("#" + id).value; return v === "" ? null : num(v); };
        const rec = {brand:b, model:m, kind:$("#nm-k").value, u:n("nm-u"), weight_kg:n("nm-w"), dims_mm:{w:null, d:n("nm-d"), h:null}, power:{typ_w:n("nm-pw"), max_w:n("nm-mx"), psu:n("nm-psu")}, ports:{rj45_1g:n("nm-p")}, poe:n("nm-pb") ? {ports:n("nm-pp"), budget_w:n("nm-pb"), std:null} : null, poe_in:n("nm-pi") ? {class:null, max_w:n("nm-pi")} : null, source:$("#nm-src").value.trim() || null, confidence:"medium", notes:t("nmManualNote")};
        await CAT.saveUser(rec); closeModal(); toast("✓ " + t("nmSaved")); onPick && onPick(CAT.get(CAT.key(rec))); }
    }, {wide:true});
  const upd = () => { const L = near(), pr = modelProblem($("#nm-b").value, $("#nm-m").value);
    $("#nm-near").innerHTML = L.length ? `<p class="small">${esc(t("nmMaybe"))}</p>` + L.map(r => `<button class="pk" data-m="useNear" data-k="${esc(CAT.key(r))}"><span><b>${esc(r.brand)} ${esc(r.model)}</b><small>${esc(specLine(r))}</small></span></button>`).join("") : "";
    $("#nm-err").textContent = $("#nm-m").value.length > 2 ? pr : ""; };
  modalActs.useNear = bt => { const r = CAT.get(bt.dataset.k); closeModal(); onPick && onPick(r); };
  $("#nm-b").addEventListener("input", upd); $("#nm-m").addEventListener("input", upd);
}
/* ---------- AI lookup (optional, user's own Claude API key) ---------- */
const AI_SCHEMA = `{"brand":"","model":"","sku":[],"kind":"","series":"","desc":"","mount":"rack|desktop|wall|ceiling|pole|din","u":0,"dims_mm":{"w":0,"d":0,"h":0},"weight_kg":0,"power":{"typ_w":0,"max_w":0,"psu":1,"psu_redundant":false,"input":""},"heat_btu_h":0,"airflow":"front-to-back|back-to-front|side-to-side|passive","ports":{"rj45_100m":0,"rj45_1g":0,"rj45_mgig":0,"rj45_10g":0,"sfp":0,"sfp_plus":0,"sfp28":0,"qsfp_plus":0,"qsfp28":0,"console":0,"usb":0,"notes":""},"poe":{"ports":0,"budget_w":0,"std":"802.3af|802.3at|802.3bt"},"poe_in":{"class":"","max_w":0},"perf":{"switching_gbps":0,"fw_gbps":0,"ngfw_gbps":0,"threat_gbps":0,"ipsec_gbps":0},"wifi":{"std":"","streams":"","bands":{"2.4":{"tx_dbm":0,"gain_dbi":0},"5":{"tx_dbm":0,"gain_dbi":0},"6":null},"max_clients":0,"uplink":""},"camera":{"style":"turret|dome|bullet|ptz|fisheye|box|cube","mp":0,"resolution":"","sensor":"","lens_mm":[],"hfov_deg":[],"ir_m":0,"codec":[],"max_fps":0,"ip_rating":"","ik":"","power_w":0,"poe_class":""},"nvr":{"channels":0,"in_mbps":0,"out_mbps":0,"hdd_bays":0,"hdd_max_tb":0,"raid":[],"poe_ports":0,"poe_budget_w":0,"max_mp":0},"ups":{"va":0,"w":0,"topology":"","battery_wh":0,"outlets":""},"source":"https://...","source2":"","confidence":"high|medium","notes":""}`;
async function aiLookup(brand, model, kind){
  const S = store.settings.ai; if (!S.key) throw new Error(t("aiNoKey"));
  const prompt = `Find the official specifications of the network/security device "${brand} ${model}" (device kind: ${kind}). Search the web, prefer the vendor's official datasheet or product page. Then reply with ONLY one JSON object (no prose) shaped like this template; drop sections that do not apply to this kind by setting them to null; use null for any value the source does not state — never guess. kind must be one of: ${KIND_ORDER.join(", ")}. "source" must be the URL that contains the values; "confidence" is "high" only if all values come from the official vendor source.\nTemplate: ${AI_SCHEMA}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {method:"POST", headers:{"content-type":"application/json", "x-api-key":S.key, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:S.model || "claude-sonnet-5-5", max_tokens:4000, tools:[{type:"web_search_20250305", name:"web_search", max_uses:6}], messages:[{role:"user", content:prompt}]})});
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.error && j.error.message) || ("HTTP " + r.status));
  const txt = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
  const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/) || txt.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(t("aiNoJson"));
  let rec; try { rec = JSON.parse(m[1]); } catch(e){ throw new Error(t("aiNoJson")); }
  rec.brand = rec.brand || brand; rec.model = rec.model || model; if (!KINDS[rec.kind]) rec.kind = kind;
  rec.notes = [rec.notes, t("aiNote")].filter(Boolean).join(" · "); rec.verified = today();
  return rec;
}
async function aiTest(){
  const S = store.settings.ai; if (!S.key) return toast("⚠ " + t("aiNoKey"));
  try { const r = await fetch("https://api.anthropic.com/v1/messages", {method:"POST", headers:{"content-type":"application/json", "x-api-key":S.key, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true"}, body:JSON.stringify({model:S.model || "claude-sonnet-5-5", max_tokens:16, messages:[{role:"user", content:"Reply OK"}]})});
    const j = await r.json().catch(() => null); if (!r.ok) throw new Error((j && j.error && j.error.message) || "HTTP " + r.status); toast("✓ " + t("aiOk")); }
  catch(e){ toast("⚠ " + (e.message || e)); }
}
