/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Tables shared by several apps: device inventory and cable schedule (both editable, both exportable to CSV).
"use strict";
function invRows(b, kinds){ return b.devices.filter(d => !kinds || kinds.includes(d.kind)).filter(d => !(KINDS[d.kind] || {}).acc).sort((a, c) => (a.kind + devLabel(a)).localeCompare(c.kind + devLabel(c), undefined, {numeric:true})); }
function invTable(b, kinds, q){
  q = String(q || "").toLowerCase();
  const R = invRows(b, kinds).filter(d => !q || [d.name, d.brand, d.model, d.ip, d.mac, d.host, d.serial, kindName(d.kind), roomName(b, d.room), floorName(b, d.floor)].join(" ").toLowerCase().includes(q));
  if (!R.length) return `<div class="empty"><p>${esc(t("invEmpty"))}</p></div>`;
  const s = UI.sel;
  return `<div class="scroll"><table class="t"><tr><th>${esc(t("f_name"))}</th><th>${esc(t("f_kind"))}</th><th>${esc(t("f_brand"))} / ${esc(t("f_model"))}</th><th>${esc(t("f_floor"))} / ${esc(t("f_room"))}</th><th>Rack</th><th>IP</th><th>MAC</th><th>VLAN</th><th>${esc(t("f_serial"))}</th><th>${esc(t("f_status"))}</th></tr>${R.map(d => { const r = d.rack && rackById(b, d.rack);
    return `<tr class="click${s && s.type === "dev" && s.id === d.id ? " on" : ""}" data-sel="dev:${d.id}"><td><b>${esc(devLabel(d))}</b></td><td class="nw">${esc(kindName(d.kind))}</td><td>${esc([d.brand, d.model].filter(Boolean).join(" "))}</td><td>${esc([floorName(b, d.floor), roomName(b, d.room)].filter(Boolean).join(" · "))}</td><td class="nw">${r ? esc(r.name) + " U" + d.u : ""}</td><td class="mono nw">${esc(d.ip)}</td><td class="mono nw">${esc(d.mac)}</td><td>${esc(vlanLabel(b, d.vlan))}</td><td class="mono">${esc(d.serial)}</td><td><span class="pill">${esc(t("st_" + d.status))}</span></td></tr>`; }).join("")}</table></div>`;
}
function invCsv(b, kinds, name){
  saveText(`${fileSafe(b.name)} - ${name || t("inventory")}.csv`, csvText([t("f_name"), t("f_kind"), t("f_brand"), t("f_model"), t("f_floor"), t("f_room"), "Rack", "U", t("f_host"), "IP", "MAC", "VLAN", t("f_serial"), t("f_asset"), t("f_fw"), t("f_owner"), t("f_installed"), t("f_warranty"), t("f_status"), "W", "kg", t("f_notes")],
    invRows(b, kinds).map(d => { const r = d.rack && rackById(b, d.rack); return [devLabel(d), kindName(d.kind), d.brand, d.model, floorName(b, d.floor), roomName(b, d.room), r ? r.name : "", r ? d.u : "", d.host, d.ip, d.mac, vlanLabel(b, d.vlan), d.serial, d.asset, d.fw, d.owner, d.installed, d.warranty, t("st_" + d.status), d.params.powerW || "", d.params.weight || "", d.notes]; })), "csv", "text/csv");
}
function cableRows(b, filter){ return b.links.filter(l => !filter || filter(l, b)); }
function cableTable(b, filter){
  const R = cableRows(b, filter); if (!R.length) return `<div class="empty"><p>${esc(t("noLinks"))}</p></div>`;
  const inp = (l, k, w) => `<input data-lk="${l.id}:${k}" value="${esc(getPath(l, k) ?? "")}" style="width:${w}">`, s = UI.sel;
  return `<div class="scroll"><table class="t"><tr><th>${esc(t("f_cid"))}</th><th>${esc(t("linkA"))}</th><th>${esc(t("f_port"))}</th><th>${esc(t("linkB"))}</th><th>${esc(t("f_port"))}</th><th>${esc(t("f_media"))}</th><th>${esc(t("f_len"))}</th><th>${esc(t("f_speed"))}</th><th>${esc(t("f_label"))}</th><th></th></tr>${R.map(l => { const A = devById(b, l.a.d), C = devById(b, l.b.d), M = MEDIA[l.media] || MEDIA.cat6;
    return `<tr class="${s && s.type === "link" && s.id === l.id ? "on" : ""}"><td>${inp(l, "cid", "80px")}</td><td class="click nw" data-sel="dev:${l.a.d}">${esc(devFull(b, A))}</td><td>${inp(l, "a.p", "64px")}</td><td class="click nw" data-sel="dev:${l.b.d}">${esc(devFull(b, C))}</td><td>${inp(l, "b.p", "64px")}</td>
      <td><select data-lk="${l.id}:media">${MEDIA_ORDER.map(m => opt(m, mediaName(m), l.media)).join("")}</select></td><td>${inp(l, "len", "54px")}</td><td>${inp(l, "speed", "54px")}</td><td>${inp(l, "label", "90px")}</td><td><button class="btn small" data-sel="link:${l.id}" title="${esc(t("edit"))}" style="border-left:4px solid ${M.c}">✎</button></td></tr>`; }).join("")}</table></div>`;
}
function cableCsv(b, filter, name){
  saveText(`${fileSafe(b.name)} - ${name || t("cables")}.csv`, csvText([t("f_cid"), t("linkA"), t("f_port"), t("linkB"), t("f_port"), t("f_media"), t("f_len"), t("f_speed"), t("f_label"), t("f_status")],
    cableRows(b, filter).map(l => [l.cid, devFull(b, devById(b, l.a.d)), l.a.p, devFull(b, devById(b, l.b.d)), l.b.p, mediaName(l.media), l.len, l.speed, l.label, l.status ? t("st_" + l.status) : ""])), "csv", "text/csv");
}
function autoCableIds(b, filter, prefix){
  const used = new Set(b.links.map(l => l.cid).filter(Boolean)); let n = 1;
  edit(() => cableRows(b, filter).forEach(l => { if (String(l.cid).trim()) return; let id; do { id = `${prefix || "C"}-${String(n++).padStart(3, "0")}`; } while (used.has(id)); l.cid = id; used.add(id); }));
}
// table interactions
document.addEventListener("click", e => {
  const s = e.target.closest("[data-sel]"); if (!s || e.target.closest("#modal") || e.target.closest("input,select")) return;
  const [type, id] = s.dataset.sel.split(/:(.+)/);
  // Ctrl / Shift + click: add to / remove from a multi-selection (several devices edited together)
  if ((e.ctrlKey || e.metaKey || e.shiftKey) && type === "dev"){ if (!UI.multi.size && UI.sel && UI.sel.type === "dev") UI.multi.add("dev:" + UI.sel.id); const k = "dev:" + id; UI.multi.has(k) ? UI.multi.delete(k) : UI.multi.add(k);
    UI.sel = UI.multi.size === 1 ? {type:"dev", id:[...UI.multi][0].slice(4)} : null; if (UI.multi.size === 1) UI.multi.clear(); render(); return; }
  UI.sel = {type, id}; UI.multi.clear(); render();
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-lk]"); if (!el || el.closest("#modal")) return;
  const [id, k] = el.dataset.lk.split(/:(.+)/), b = B(), l = linkById(b, id); if (!l) return;
  edit(() => { setPath(l, k, k === "len" ? (el.value === "" ? "" : num(el.value, 0)) : el.value.trim()); });
});
function searchBox(id, ph){ return `<input id="${id}" class="tsearch" placeholder="${esc(ph || t("searchHint"))}" value="${esc(UI.q && UI.q[id] || "")}" autocomplete="off" style="max-width:320px">`; }
document.addEventListener("input", e => { const el = e.target.closest(".tsearch"); if (!el) return; UI.q = UI.q || {}; UI.q[el.id] = el.value; const pos = el.selectionStart; render(); const n = $("#" + el.id); if (n){ n.focus(); n.setSelectionRange(pos, pos); } });
