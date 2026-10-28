// AI assistant: a chat panel opened from a button in every app. It sees the open project (building, floors, rooms,
// devices, cables, VLANs, racks), the open app and the selection, answers questions and can propose changes.
// Changes are never made on its own: each proposal is shown as a list with Apply / Reject; Apply is one undo step.
// The user's own Anthropic API key is used (Settings → AI); it is stored only on this device.
"use strict";
const AI = (function(){
const S = () => { UI.ai = UI.ai || {open:false, msgs:[], busy:false, err:""}; return UI.ai; };
const ENDPOINT = "https://api.anthropic.com/v1/messages";
/* ---------- what the assistant sees ---------- */
function context(){
  const b = B(), a = curApp(), sel = UI.sel, cap = 500;
  const fl = id => (floorById(b, id) || {}).name || "", rm = id => (roomById(b, id) || {}).name || "", vl = id => { const v = vlanById(b, id); return v ? v.vid : ""; };
  const devRow = d => [d.id, d.name, d.kind, [d.brand, d.model].filter(Boolean).join(" "), d.ip, d.mac, vl(d.vlan), fl(d.floor), rm(d.room), d.rack ? (rackById(b, d.rack) || {}).name + " U" + d.u + (devH(d) > 1 ? "-" + topU(d) : "") : "", d.ports || "", d.status !== "installed" ? d.status : ""].join("|");
  const kinds = {}; b.devices.forEach(d => { kinds[d.kind] = (kinds[d.kind] || 0) + 1; });
  const devs = b.devices.slice(0, cap).map(devRow).join("\n");
  const links = b.links.slice(0, cap).map(l => { const A = devById(b, l.a.d), C = devById(b, l.b.d); return [l.id, A ? A.name : "?", l.a.p, C ? C.name : "?", l.b.p, l.media, l.cid || ""].join("|"); }).join("\n");
  const rooms = b.rooms.slice(0, cap).map(r => [r.id, r.name, fl(r.floor), r.type || "", r.geo ? Math.round(r.geo.w * r.geo.h) + "m2" : "", Object.entries(r.req || {}).filter(([, v]) => num(v)).map(([k, v]) => k + ":" + v).join(" ")].join("|")).join("\n");
  const racks = b.racks.map(r => { const used = rackDevices(b, r).reduce((s, d) => s + devH(d), 0); return [r.id, r.name, r.u + "U", "used " + used + "U", fl(r.floor), rm(r.room)].join("|"); }).join("\n");
  let selTxt = "";
  if (sel){ const o = sel.type === "dev" ? devById(b, sel.id) : sel.type === "room" ? roomById(b, sel.id) : sel.type === "rack" ? rackById(b, sel.id) : sel.type === "link" ? linkById(b, sel.id) : null; if (o) selTxt = `\nSELECTED (${sel.type}): ${JSON.stringify(o).slice(0, 3000)}`; }
  const warns = typeof a.warnings === "function" ? a.warnings(b) : (typeof commonWarnings === "function" ? commonWarnings(b) : []);
  return `PROJECT: ${P().name} · BUILDING: ${b.name}${b.address ? " (" + b.address + ")" : ""} · OPEN APP: ${t(a.name)} (${a.id}) · TAB: ${curTab().id}
FLOORS (bottom → top): ${b.floors.map(f => f.name + " [" + f.id + "]").join(", ") || "none"}
DEVICE COUNTS: ${Object.entries(kinds).map(([k, n]) => k + " " + n).join(", ") || "none"}
VLANS: ${b.vlans.map(v => v.vid + " " + v.name + (v.subnet ? " " + v.subnet : "")).join("; ") || "none"}
RACKS (id|name|size|used|floor|room):
${racks || "none"}
ROOMS (id|name|floor|type|area|needs):
${rooms || "none"}${b.rooms.length > cap ? "\n… +" + (b.rooms.length - cap) : ""}
DEVICES (id|name|kind|brand model|ip|mac|vlan|floor|room|rack position|ports|status):
${devs || "none"}${b.devices.length > cap ? "\n… +" + (b.devices.length - cap) + " more (use get_details)" : ""}
CABLES (id|from|port|to|port|media|cable id):
${links || "none"}${b.links.length > cap ? "\n… +" + (b.links.length - cap) : ""}
WARNINGS OF THE OPEN APP: ${(warns || []).slice(0, 40).map(w => w[1]).join(" / ") || "none"}${selTxt}`;
}
const KIND_LIST = () => Object.keys(KINDS).join(", ");
function system(){
  const lang = {az:"Azerbaijani", tr:"Turkish", en:"English", ru:"Russian"}[store.settings.lang] || "Azerbaijani";
  return `You are the assistant inside NetWorkKing, a network documentation program with these apps: Building structure (floors, rooms, room needs, floor plans), Network topology, Port Map (switch / patch panel ports, VLANs, patch cords), Rack U-Layout (rack elevations, power), Fiber, CCTV (cameras, NVR channels, storage) and Wi-Fi Plan. All apps share the same data.
Answer in ${lang}, short and practical, like an experienced network engineer. When you use an abbreviation, give its full name once (e.g. PoE — Power over Ethernet).
Say plainly when something is risky, wrong or could be done better. Do not invent devices, ports or numbers that are not in the data; if data is missing, say what is missing.
To change the project, call propose_changes with the exact operations. The user sees them as a list and decides; nothing changes until they press Apply. Use the ids from the data. Keep each proposal focused (≤ 60 operations); explain in one or two sentences what it does.
Use get_details when you need all fields of some devices, rooms, racks or cables.
Device kinds: ${KIND_LIST()}.

CURRENT DATA:
${context()}`;
}
const TOOLS = [
  {name:"get_details", description:"Full stored fields of devices, rooms, racks, cables or floors by id.", input_schema:{type:"object", properties:{ids:{type:"array", items:{type:"string"}}}, required:["ids"]}},
  {name:"propose_changes", description:"Propose changes to the project. They are shown to the user with Apply / Reject; nothing changes before Apply. Operations run in order.",
    input_schema:{type:"object", properties:{summary:{type:"string", description:"One sentence: what these changes do."},
      ops:{type:"array", items:{type:"object", properties:{
        op:{type:"string", enum:["set_device","add_device","delete_device","add_link","delete_link","set_room","add_room","add_vlan","set_rack","add_rack"]},
        id:{type:"string", description:"id of the device / room / rack / cable to change or delete"},
        fields:{type:"object", description:"set_*: fields to change. Device: name, brand, model, ip, mac, vlan (VLAN number), notes, status (installed|planned|faulty|spare), ports, floor (floor id), room (room id), rack (rack id), u, serial. Room: name, type, users, needs {outlet, ap, camera, tv, phone, …}. Rack: name, u."},
        kind:{type:"string"}, name:{type:"string"}, count:{type:"integer", description:"add_device: how many (names get numbers)"},
        floor:{type:"string"}, room:{type:"string"}, rack:{type:"string"}, u:{type:"integer"}, brand:{type:"string"}, model:{type:"string"}, ip:{type:"string"}, vlan:{type:"string"},
        a:{type:"string", description:"add_link: device id"}, pa:{type:"string"}, b:{type:"string", description:"add_link: device id"}, pb:{type:"string"}, media:{type:"string", description:"cat6, cat6a, cat5e, patch, fiber_sm, fiber_mm, poe …"},
        vid:{type:"integer"}, subnet:{type:"string"}, type:{type:"string"}}, required:["op"]}}}, required:["summary","ops"]}}
];
/* ---------- calling the model ---------- */
async function call(messages){
  const st = store.settings.ai;
  const r = await fetch(ENDPOINT, {method:"POST", headers:{"content-type":"application/json", "x-api-key":st.key, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:st.model || "claude-sonnet-5-5", max_tokens:4000, system:system(), tools:TOOLS, messages})});
  const j = await r.json().catch(() => null);
  if (!r.ok){ const m = (j && j.error && j.error.message) || ""; if (r.status === 401) throw new Error(t("ai_e401")); if (r.status === 429) throw new Error(t("ai_e429")); if (r.status === 400 && /credit|balance/i.test(m)) throw new Error(t("ai_eCredit")); throw new Error(m || "HTTP " + r.status); }
  return j;
}
function details(ids){ const b = B(); return JSON.stringify((ids || []).slice(0, 60).map(id => devById(b, id) || roomById(b, id) || rackById(b, id) || linkById(b, id) || floorById(b, id) && Object.assign({}, floorById(b, id), {plan:{wm:floorById(b, id).plan.wm, hm:floorById(b, id).plan.hm}}) || {id, missing:true})).slice(0, 60000); }
// one user turn: the model may look things up (get_details) several times, then answers and/or proposes
async function ask(text){
  const A = S(); if (A.busy || !text.trim()) return;
  // the conversation must alternate user / assistant
  if (A.msgs.length && A.msgs[A.msgs.length - 1].role === "user") A.msgs.push({role:"assistant", content:[{type:"text", text:"…"}], hidden:true});
  const start = A.msgs.length;
  A.msgs.push({role:"user", content:text.trim()}); A.busy = true; A.err = ""; draw(true);
  try {
    for (let step = 0; step < 6; step++){
      const api = A.msgs.filter(m => m.api !== false).map(m => ({role:m.role, content:m.content}));
      const j = await call(api);
      A.msgs.push({role:"assistant", content:j.content});
      const uses = (j.content || []).filter(c => c.type === "tool_use");
      if (!uses.length) break;
      const results = uses.map(u => {
        if (u.name === "get_details") return {type:"tool_result", tool_use_id:u.id, content:details(u.input.ids)};
        if (u.name === "propose_changes"){ A.props = A.props || {}; A.props[u.id] = {state:"open", input:u.input}; return {type:"tool_result", tool_use_id:u.id, content:"Shown to the user with Apply / Reject. Wait for their decision; do not repeat the proposal."}; }
        return {type:"tool_result", tool_use_id:u.id, content:"Unknown tool", is_error:true}; });
      A.msgs.push({role:"user", content:results, hidden:true});
      if (uses.some(u => u.name === "propose_changes")){
        // let the model add its short explanation after the proposal
        const j2 = await call(A.msgs.filter(m => m.api !== false).map(m => ({role:m.role, content:m.content})));
        const tx = (j2.content || []).filter(c => c.type === "text" && c.text.trim()); A.msgs.push({role:"assistant", content:tx.length ? tx : [{type:"text", text:"…"}], hidden:!tx.length}); break; }
    }
  } catch(e){ A.err = e.message || String(e);
    // the failed turn is shown but not sent again, so the conversation stays valid
    A.msgs.slice(start).forEach(m => { m.api = false; });
    A.msgs.push({role:"assistant", content:[{type:"text", text:"⚠ " + A.err}], api:false}); }
  A.busy = false; draw(true);
}
/* ---------- applying a proposal (one undo step) ---------- */
function vlanIdOf(b, v){ if (v === undefined || v === null || v === "") return ""; const s = String(v).trim(); const x = b.vlans.find(q => String(q.vid) === s || q.id === s); return x ? x.id : null; }
function applyOps(ops){
  const b = B(), log = [];
  edit(() => {
    ops.forEach((o, i) => { const n = `${i + 1}. `;
      try {
        if (o.op === "set_device" || o.op === "delete_device"){ const d = devById(b, o.id); if (!d) return log.push(n + "✕ " + o.id);
          if (o.op === "delete_device"){ removeDevices(b, [d.id]); return log.push(n + "🗑 " + d.name); }
          const F = o.fields || {};
          Object.entries(F).forEach(([k, v]) => {
            if (k === "vlan"){ const id = vlanIdOf(b, v); if (id === null) log.push(n + "⚠ VLAN " + v); else d.vlan = id; }
            else if (k === "u"){ const r = d.rack && rackById(b, d.rack), u = Math.round(num(v)); if (r && !rackFits(b, r, u, devH(d), d.id)) log.push(n + "⚠ " + d.name + " U" + u); else d.u = u; }
            else if (k === "rack"){ const r = rackById(b, v); if (!v){ d.rack = ""; d.u = 0; } else if (r){ const u = rackSpot(b, r, devH(d), 0, d.id); if (u){ d.rack = r.id; d.u = u; } else log.push(n + "⚠ " + r.name + " " + t("rackNoSpace")); } }
            else if (k === "ports") d.ports = Math.max(0, Math.round(num(v)));
            else if (k === "name" && nameTaken(b, v, d.id)) log.push(n + "⚠ " + t("nameDupS",{n:v}));
            else if (["name","brand","model","ip","mac","notes","status","serial","floor","room","host","owner"].includes(k)) d[k] = String(v ?? "");
          });
          return log.push(n + "✎ " + d.name); }
        if (o.op === "add_device"){ const k = KINDS[o.kind] ? o.kind : "other", c = clamp(Math.round(num(o.count, 1)), 1, 200);
          for (let q = 0; q < c; q++){ const d = newDevice(k, {floor:o.floor && floorById(b, o.floor) ? o.floor : "", room:o.room && roomById(b, o.room) ? o.room : ""}); d.name = o.name ? (c > 1 ? `${o.name}-${String(q + 1).padStart(2, "0")}` : o.name) : autoName(b, k); if (nameTaken(b, d.name)){ log.push(n + "⚠ " + t("nameDupS",{n:d.name})); continue; }
            if (o.brand) d.brand = o.brand; if (o.model) d.model = o.model; if (o.ip && c === 1) d.ip = o.ip; if (o.vlan){ const id = vlanIdOf(b, o.vlan); if (id) d.vlan = id; }
            if (d.room && !d.floor) d.floor = roomById(b, d.room).floor;
            if (o.rack){ const r = rackById(b, o.rack); if (r){ const u = o.u && rackFits(b, r, o.u, devH(d)) ? o.u : rackSpot(b, r, devH(d), 0); if (u){ d.rack = r.id; d.u = u; d.floor = d.floor || r.floor; d.room = d.room || r.room; } else log.push(n + "⚠ " + r.name + " " + t("rackNoSpace")); } }
            b.devices.push(d); } return log.push(n + "＋ " + (o.name || kindName(k)) + (c > 1 ? " ×" + c : "")); }
        if (o.op === "add_link"){ const A = devById(b, o.a), C = devById(b, o.b); if (!A || !C) return log.push(n + "✕ link");
          const busy = (id, p) => p && b.links.some(l => (l.a.d === id && String(l.a.p) === String(p)) || (l.b.d === id && String(l.b.p) === String(p)));
          if (busy(A.id, o.pa) || busy(C.id, o.pb)) return log.push(n + "⚠ " + t("ai_portBusy",{a:A.name + ":" + o.pa, b:C.name + ":" + o.pb}));
          addLink(b, A.id, C.id, MEDIA[o.media] ? o.media : "cat6", {pa:String(o.pa || ""), pb:String(o.pb || "")}); return log.push(n + "🔌 " + A.name + " ↔ " + C.name); }
        if (o.op === "delete_link"){ const l = linkById(b, o.id); if (!l) return log.push(n + "✕ " + o.id); b.links = b.links.filter(x => x !== l); return log.push(n + "🗑 cable"); }
        if (o.op === "set_room"){ const r = roomById(b, o.id); if (!r) return log.push(n + "✕ " + o.id); const F = o.fields || {};
          if (F.name) r.name = String(F.name); if (F.type) r.type = String(F.type); if (F.users !== undefined) r.users = Math.max(0, Math.round(num(F.users)));
          const nd = F.needs || F.req; if (nd && typeof nd === "object"){ r.req = r.req || {}; Object.entries(nd).forEach(([k, v]) => { r.req[k] = Math.max(0, Math.round(num(v))); }); } return log.push(n + "✎ " + r.name); }
        if (o.op === "add_room"){ const f = floorById(b, o.floor) || b.floors[0]; if (!f) return log.push(n + "✕ floor"); b.rooms.push({id:uid("r"), name:o.name || t("roomN",{n:b.rooms.length + 1}), floor:f.id, users:0, wall:"drywall", type:o.type || "office", req:{}}); return log.push(n + "＋ " + (o.name || "room")); }
        if (o.op === "add_vlan"){ const vid = Math.round(num(o.vid)); if (vid < 1 || vid > 4094 || b.vlans.some(v => +v.vid === vid)) return log.push(n + "⚠ VLAN " + vid);
          b.vlans.push({id:uid("v"), vid:String(vid), name:o.name || "VLAN " + vid, subnet:o.subnet || "", gw:"", dhcp:"", color:VCOLORS[b.vlans.length % VCOLORS.length]}); return log.push(n + "＋ VLAN " + vid); }
        if (o.op === "set_rack"){ const r = rackById(b, o.id); if (!r) return log.push(n + "✕ " + o.id); const F = o.fields || {}; if (F.name) r.name = String(F.name);
          if (F.u !== undefined){ const R = rackRepack(b, r, Math.round(num(F.u))); if (!R.ok) log.push(n + "⚠ " + t("fitRackNo",{r:r.name, n:F.u, need:R.need})); else { R.moves.forEach(([d, , u]) => { d.u = u; }); r.u = Math.round(num(F.u)); } } return log.push(n + "✎ " + r.name); }
        if (o.op === "add_rack"){ const r = normRack({id:uid("k"), name:o.name || nextRackName(b), u:clamp(Math.round(num(o.u, 42)), 4, 60), floor:o.floor && floorById(b, o.floor) ? o.floor : "", room:o.room && roomById(b, o.room) ? o.room : ""}); b.racks.push(r); return log.push(n + "＋ " + r.name); }
        log.push(n + "? " + o.op);
      } catch(e){ log.push(n + "⚠ " + e.message); } });
  });
  return log;
}
function decide(id, yes){
  const A = S(), p = A.props && A.props[id]; if (!p || p.state !== "open") return;
  if (yes){ p.log = applyOps(p.input.ops || []); p.state = "applied"; } else p.state = "rejected";
  // the model learns the decision with the next message
  A.msgs.push({role:"user", content:yes ? `[I applied the proposal. Result: ${p.log.join("; ")}]` : "[I rejected the proposal.]", hidden:true, note:true});
  A.msgs.push({role:"assistant", content:[{type:"text", text:yes ? "✓" : "—"}], hidden:true});
  draw();
}
/* ---------- panel ---------- */
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/^#{1,4} (.+)$/gm, "<b>$1</b>").replace(/^[-•] (.+)$/gm, "• $1").replace(/\n/g, "<br>");
function opLine(o){ const b = B(), nm = id => { const x = devById(b, id) || roomById(b, id) || rackById(b, id); return x ? x.name : id; };
  switch (o.op){
    case "set_device": case "set_room": case "set_rack": return `✎ <b>${esc(nm(o.id))}</b>: ${esc(Object.entries(o.fields || {}).map(([k, v]) => k + " → " + (typeof v === "object" ? JSON.stringify(v) : v)).join(", "))}`;
    case "add_device": return `＋ ${esc(kindName(o.kind))} <b>${esc(o.name || "")}</b>${o.count > 1 ? " ×" + o.count : ""}${o.room ? " · " + esc(nm(o.room)) : ""}${o.rack ? " · " + esc(nm(o.rack)) + (o.u ? " U" + o.u : "") : ""}${o.ip ? " · " + esc(o.ip) : ""}`;
    case "delete_device": return `🗑 <b>${esc(nm(o.id))}</b>`;
    case "add_link": return `🔌 <b>${esc(nm(o.a))}</b>${o.pa ? ":" + esc(o.pa) : ""} ↔ <b>${esc(nm(o.b))}</b>${o.pb ? ":" + esc(o.pb) : ""} · ${esc(o.media || "cat6")}`;
    case "delete_link": return `🗑 cable ${esc(o.id)}`;
    case "add_room": return `＋ ${esc(t("f_room"))} <b>${esc(o.name || "")}</b>`;
    case "add_vlan": return `＋ VLAN <b>${esc(o.vid)}</b> ${esc(o.name || "")} ${esc(o.subnet || "")}`;
    case "add_rack": return `＋ Rack <b>${esc(o.name || "")}</b> ${esc(o.u || 42)}U`;
    default: return esc(JSON.stringify(o)); } }
function msgHtml(m){
  if (m.hidden) return "";
  if (m.role === "user") return typeof m.content === "string" ? `<div class="aim u">${md(m.content)}</div>` : "";
  return (m.content || []).map(c => {
    if (c.type === "text" && c.text.trim()) return `<div class="aim a">${md(c.text)}</div>`;
    if (c.type === "tool_use" && c.name === "propose_changes"){ const p = (S().props || {})[c.id] || {state:"open", input:c.input}, ops = (c.input.ops || []);
      return `<div class="aiprop ${p.state}"><div class="aiph">🛠 ${esc(c.input.summary || t("ai_prop"))} <span class="cnt">${ops.length}</span></div><ol>${ops.slice(0, 80).map(o => `<li>${opLine(o)}</li>`).join("")}</ol>
        ${p.state === "open" ? `<div class="btns"><button class="btn pri small" data-aiyes="${c.id}">✓ ${esc(t("ai_apply"))}</button><button class="btn small" data-aino="${c.id}">✕ ${esc(t("ai_reject"))}</button></div><p class="muted small">${esc(t("ai_undoHint"))}</p>`
          : p.state === "applied" ? `<p class="small ok">✓ ${esc(t("ai_applied"))}</p>${(p.log || []).some(x => /⚠|✕/.test(x)) ? `<p class="small bad">${esc(p.log.filter(x => /⚠|✕/.test(x)).join(" · "))}</p>` : ""}` : `<p class="small muted">${esc(t("ai_rejected"))}</p>`}</div>`; }
    return ""; }).join("");
}
function suggestions(){ const id = curApp().id;
  const L = {building:["ai_sB1","ai_sB2"], portmap:["ai_sP1","ai_sP2"], rack:["ai_sR1","ai_sR2"], cctv:["ai_sC1","ai_sC2"], wifi:["ai_sW1","ai_sW2"], topology:["ai_sT1","ai_sT2"], fiber:["ai_sF1","ai_sF2"]}[id] || ["ai_sT1"];
  return L.map(k => `<button class="aisug" data-aisug="${esc(t(k))}">${esc(t(k))}</button>`).join(""); }
function keyBox(){ const s = store.settings.ai;
  return `<div class="aikey"><h4>🔑 ${esc(t("ai_keyT"))}</h4><ol class="small"><li>${esc(t("ai_k1"))}</li><li>${esc(t("ai_k2"))}</li><li>${esc(t("ai_k3"))}</li><li>${esc(t("ai_k4"))}</li></ol>
    <label class="fld"><span>${esc(t("aiKey"))}</span><input id="ai-key" type="password" placeholder="sk-ant-…" autocomplete="off" value="${esc(s.key || "")}"></label>
    <label class="fld"><span>${esc(t("aiModel"))}</span><select id="ai-model">${["claude-sonnet-5-5","claude-opus-5-5","claude-haiku-5-5"].map(m => opt(m, m, s.model)).join("")}</select></label>
    <div class="btns"><button class="btn pri" data-aiact="savekey">✓ ${esc(t("ai_save"))}</button></div><p class="muted small">${esc(t("ai_keyNote"))}</p></div>`; }
function draw(focus){
  let el = $("#aipanel"); const A = S();
  if (!A.open){ if (el) el.hidden = true; return; }
  if (!el){ el = document.createElement("aside"); el.id = "aipanel"; document.body.appendChild(el); }
  el.hidden = false;
  const ready = store.settings.ai.key;
  const visible = A.msgs.filter(m => !m.hidden);
  el.innerHTML = `<div class="aihead"><b>✨ ${esc(t("ai_title"))}</b><small>${esc(t(curApp().name))} · ${esc(B().name)}</small><span class="grow"></span>${ready && A.msgs.length ? `<button class="x" data-aiact="new" title="${esc(t("ai_new"))}">↺</button>` : ""}${ready ? `<button class="x" data-aiact="key" title="${esc(t("ai_keyT"))}">🔑</button>` : ""}<button class="x" data-aiact="close">×</button></div>
    <div class="aibody" id="aibody">${!ready || A.showKey ? keyBox() : visible.length ? visible.map(msgHtml).join("") : `<div class="aiwelcome"><p>${esc(t("ai_hello"))}</p><div class="aisugs">${suggestions()}</div></div>`}
      ${A.busy ? `<div class="aim a busy"><i></i><i></i><i></i></div>` : ""}</div>
    ${ready && !A.showKey ? `<div class="aifoot"><textarea id="ai-in" rows="2" placeholder="${esc(t("ai_ph"))}"${A.busy ? " disabled" : ""}>${esc(A.draft || "")}</textarea><button class="btn pri" data-aiact="send"${A.busy ? " disabled" : ""} title="Enter">➤</button></div>` : ""}`;
  const body = $("#aibody"); if (body) body.scrollTop = body.scrollHeight;
  const inp = $("#ai-in"); if (focus && inp && !A.busy) setTimeout(() => inp.focus(), 0);
}
function toggle(force){ const A = S(); A.open = force === undefined ? !A.open : force; draw(true); const btn = $("#aibtn"); if (btn) btn.classList.toggle("on", A.open); }
function send(){ const i = $("#ai-in"); if (!i) return; const v = i.value; S().draft = ""; ask(v); }
function init(){
  if (!$("#aibtn")){ const b = document.createElement("button"); b.id = "aibtn"; b.title = t("ai_title"); b.innerHTML = "✨<span>AI</span>"; document.body.appendChild(b); b.addEventListener("click", () => toggle()); }
  document.addEventListener("click", e => {
    const p = $("#aipanel"); if (!p || !p.contains(e.target)) return;
    const a = e.target.closest("[data-aiact]");
    if (a){ const k = a.dataset.aiact;
      if (k === "close") return toggle(false);
      if (k === "send") return send();
      if (k === "new"){ const A = S(); A.msgs = []; A.props = {}; A.err = ""; return draw(); }
      if (k === "key"){ S().showKey = !S().showKey; return draw(); }
      if (k === "savekey"){ const key = $("#ai-key").value.trim(); if (key && !/^sk-ant-/.test(key)) toast("⚠ " + t("ai_keyFmt")); store.settings.ai.key = key; store.settings.ai.model = $("#ai-model").value; store.settings.ai.enabled = !!key; persist(); S().showKey = false; return draw(); } }
    const s = e.target.closest("[data-aisug]"); if (s) return ask(s.dataset.aisug);
    const y = e.target.closest("[data-aiyes]"); if (y) return decide(y.dataset.aiyes, true);
    const n = e.target.closest("[data-aino]"); if (n) return decide(n.dataset.aino, false);
  });
  document.addEventListener("keydown", e => { if (e.target && e.target.id === "ai-in"){ e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); } else if (e.key === "Escape") toggle(false); } }, true);
  document.addEventListener("input", e => { if (e.target && e.target.id === "ai-in") S().draft = e.target.value; });
}
return {init, toggle, ask, draw, applyOps, context, system};
})();
