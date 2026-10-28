// Shell: header with app switcher, page tabs, building tabs (bottom, like Excel sheets), drawer, modals, menus.
"use strict";
const LANGS = [["az","Azərbaycanca"],["tr","Türkçe"],["en","English"],["ru","Русский"]];
function L(){ return I18N[store && store.settings.lang] || I18N.az; }
function t(k, v){ let s = L()[k] ?? I18N.az[k] ?? I18N.en[k] ?? k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; }
const APPS = {}, APP_ORDER = ["building","topology","portmap","rack","fiber","cctv","wifi"];
function registerApp(a){ APPS[a.id] = a; }
const curApp = () => APPS[UI.app] || APPS.topology;
const curTab = () => { const a = curApp(); const id = UI.tabs[a.id]; return a.tabs.find(x => x.id === id) || a.tabs[0]; };
/* ---------- theme ---------- */
function applyTheme(){ const th = store.settings.theme; document.documentElement.dataset.theme = th === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : th; }
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => store && applyTheme());
/* ---------- toast, prompt, confirm ---------- */
let toastT; function toast(m, ms){ const el = $("#toast"); if (!el) return; el.textContent = m; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), ms || 2800); }
function layer(html, onKey){
  const o = document.createElement("div"); o.className = "layer"; o.innerHTML = `<div class="lyrbox">${html}</div>`; document.body.appendChild(o);
  const f = o.querySelector("input,select,textarea,button.pri"); if (f) setTimeout(() => f.focus(), 0);
  return o;
}
function uiPrompt(msg, def = "", type = "text"){
  return new Promise(res => {
    const o = layer(`<p>${esc(msg)}</p><input type="${type}" value="${esc(def)}"><div class="mfoot"><button class="btn" data-x="0">${esc(t("cancel"))}</button><button class="btn pri" data-x="1">${esc(t("ok"))}</button></div>`);
    const inp = o.querySelector("input"); inp.select();
    const end = ok => { const v = inp.value; o.remove(); res(ok ? v : null); };
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x) end(x.dataset.x === "1"); });
    inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") end(true); else if (e.key === "Escape") end(false); });
  });
}
function uiConfirm(msg, okLabel, danger){
  return new Promise(res => {
    const o = layer(`<p style="white-space:pre-line">${esc(msg)}</p><div class="mfoot"><button class="btn" data-x="0">${esc(t("cancel"))}</button><button class="btn ${danger ? "dan-fill" : "pri"}" data-x="1">${esc(okLabel || t("ok"))}</button></div>`);
    const end = ok => { o.remove(); document.removeEventListener("keydown", key, true); res(ok); };
    const key = e => { if (e.key === "Escape"){ e.stopPropagation(); end(false); } else if (e.key === "Enter"){ e.stopPropagation(); end(true); } };
    document.addEventListener("keydown", key, true);
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x) end(x.dataset.x === "1"); });
  });
}
// Choice dialog: resolves to the chosen key or null.
function uiChoice(msg, choices){
  return new Promise(res => {
    const o = layer(`<p>${esc(msg)}</p><div class="choices">${choices.map(([k, l, cls]) => `<button class="btn ${cls || ""}" data-x="${esc(k)}">${esc(l)}</button>`).join("")}</div><div class="mfoot"><button class="btn" data-x="">${esc(t("cancel"))}</button></div>`);
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x){ o.remove(); res(x.dataset.x || null); } });
  });
}
/* ---------- modal with named actions ---------- */
let modalActs = {};
function modal(html, acts, opts = {}){ const m = $("#modal"); modalActs = acts || {}; m.innerHTML = `<div class="mbox${opts.wide ? " wide" : ""}${opts.xwide ? " xwide" : ""}">${html}</div>`; m.hidden = false; const f = m.querySelector("input:not([type=checkbox]):not([type=radio]),select,textarea"); if (f && !opts.nofocus) setTimeout(() => f.focus(), 0); }
function uiAlert(msg){ return new Promise(res => { const o = layer(`<p style="white-space:pre-line">⚠ ${esc(msg)}</p><div class="mfoot"><span class="grow"></span><button class="btn pri" data-x="1">OK</button></div>`);
  const end = () => { o.remove(); document.removeEventListener("keydown", key, true); res(); }, key = e => { if (e.key === "Escape" || e.key === "Enter"){ e.stopPropagation(); end(); } };
  o.addEventListener("click", e => { if (e.target.closest("[data-x]")) end(); }); document.addEventListener("keydown", key, true); setTimeout(() => { const x = o.querySelector("[data-x]"); x && x.focus(); }, 0); }); }
function closeModal(){ const m = $("#modal"); m.hidden = true; m.innerHTML = ""; modalActs = {}; }
document.addEventListener("click", e => {
  const m = $("#modal"); if (!m || m.hidden) return;
  if (e.target === m && !m.querySelector(".mbox.lock")) { closeModal(); return; }
  const b = e.target.closest("[data-m]"); if (!b || !m.contains(b)) return;
  const k = b.dataset.m; if (k === "close"){ closeModal(); return; }
  if (modalActs[k]) modalActs[k](b, e);
  else if (k.includes(":") && modalActs[k.split(":")[0]]) modalActs[k.split(":")[0]](b, e, k.split(":").slice(1).join(":"));
});
/* ---------- popover menu ---------- */
let menuEl = null;
function closeMenu(){ if (menuEl){ menuEl.remove(); menuEl = null; } }
function popMenu(anchor, items, opts = {}){
  closeMenu(); const el = document.createElement("div"); el.className = "pmenu" + (opts.cls ? " " + opts.cls : "");
  el.innerHTML = items.map((it, i) => it === "-" ? `<hr>` : it.head ? `<div class="mh">${esc(it.head)}</div>` : `<button class="mi${it.danger ? " dan" : ""}${it.on ? " on" : ""}" data-i="${i}"${it.disabled ? " disabled" : ""}>${it.icon ? `<span class="mic">${it.icon}</span>` : ""}<span class="mtx"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span></button>`).join("");
  document.body.appendChild(el); menuEl = el;
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  let x = opts.right ? r.right - w : r.left, y = opts.up ? r.top - h - 4 : r.bottom + 4;
  if (y + h > innerHeight - 6) y = Math.max(6, r.top - h - 4);
  el.style.left = clamp(x, 6, innerWidth - w - 6) + "px"; el.style.top = clamp(y, 6, innerHeight - h - 6) + "px";
  el.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.fn && it.fn(); });
}
document.addEventListener("pointerdown", e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);
window.addEventListener("resize", closeMenu);
/* ---------- header ---------- */
function appIcon(a, s = 26){ return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><rect x="2" y="2" width="44" height="44" rx="10" fill="${a.color}"/>${a.glyph}</svg>`; }
function renderHeader(){
  const a = curApp(), p = P();
  const B2 = (act, ic, k, extra = "") => `<button class="hb" data-h="${act}" title="${esc(t(k))}"${extra}><span class="hi">${ic}</span><span class="ht">${esc(t(k))}</span></button>`;
  $("#hdr").innerHTML = `<button class="brand" id="appsw" title="${esc(t("switchApp"))}">${appIcon(a)}<span class="bn"><b>${esc(t(a.name))}</b><small>NetWorkKing</small></span><span class="car">▾</span></button>
    <div class="hproj"><select id="projsel" title="${esc(t("project"))}">${Object.values(store.projects).sort((x, y) => x.name.localeCompare(y.name)).map(x => opt(x.id, x.name, p.id)).join("")}<option value="__new">＋ ${esc(t("newProject"))}…</option></select></div>
    <span class="grow"></span>
    <div class="hacts">${B2("undo","↶","undo", undoStack.length ? "" : " disabled")}${B2("redo","↷","redo", redoStack.length ? "" : " disabled")}<span class="hsep"></span>
    ${B2("search","🔍","search")}${B2("versions","🕘","versions")}${B2("import","⤓","import")}${B2("export","⤒","export")}<span class="hsep"></span>
    ${B2("help","?","helpTour")}${B2("settings","⚙","settings")}</div>
    <span id="savest">✓ ${esc(t("savedShort"))}</span>
    <button class="hb hmenu" data-h="menu" title="${esc(t("menu"))}"><span class="hi">☰</span></button>`;
}
function openAppSwitcher(anchor){
  popMenu(anchor, APP_ORDER.map(id => { const a = APPS[id]; return {icon:appIcon(a, 30), label:t(a.name), sub:t(a.desc), on:id === UI.app, fn:() => switchApp(id)}; }), {cls:"appmenu"});
}
function switchApp(id){ UI.app = id; UI.sel = null; UI.multi.clear(); P().cur.app = id; persist(); render(); }
/* ---------- page tabs + app toolbar ---------- */
function renderTabs(){
  const a = curApp(), tab = curTab();
  const acts = (a.actions ? a.actions(tab) : []).filter(Boolean);
  $("#ptabs").innerHTML = `<div class="ptl" role="tablist">${a.tabs.map(x => `<button class="ptab${x === tab ? " on" : ""}" data-tab="${x.id}" role="tab">${x.icon ? `<span>${x.icon}</span>` : ""}${esc(t(x.label))}</button>`).join("")}</div>
    <div class="pta">${acts.map(x => x === "-" ? `<span class="hsep"></span>` : `<button class="tb${x.pri ? " pri" : ""}${x.on ? " on" : ""}" data-act="${x.id}" title="${esc(x.title || t(x.label))}"${x.disabled ? " disabled" : ""}>${x.icon || ""} <span class="tx">${esc(t(x.label))}</span></button>`).join("")}</div>`;
}
/* ---------- building tabs (bottom) ---------- */
function renderBuildings(){
  const p = P(), cur = B();
  $("#btabs").innerHTML = `<div class="bts">${p.buildings.map(b => `<button class="bt${b === cur ? " on" : ""}" data-b="${b.id}" title="${esc(b.address || b.name)}">🏢 ${esc(b.name)}${b === cur ? `<span class="btm" data-bmenu="${b.id}" title="${esc(t("bldMenu"))}">⋯</span>` : ""}</button>`).join("")}<button class="bt add" data-badd="1">＋ ${esc(t("bldAdd"))}</button></div>
    <div class="binfo">${esc(t("bldInfo",{d:cur.devices.length, r:cur.racks.length, l:cur.links.length}))}</div>`;
}
async function addBuilding(){
  const p = P(), name = await uiPrompt(t("bldName"), t("bldN",{n:p.buildings.length + 1})); if (name === null) return;
  edit(() => { const b = newBuilding(name.trim() || t("bldN",{n:p.buildings.length + 1})); p.buildings.push(b); p.cur.b = b.id; UI.sel = null; });
}
function buildingMenu(anchor, id){
  const p = P(), b = p.buildings.find(x => x.id === id), i = p.buildings.indexOf(b);
  popMenu(anchor, [
    {icon:"✎", label:t("rename"), fn:async () => { const n = await uiPrompt(t("bldName"), b.name); if (n && n.trim()) edit(() => { b.name = n.trim(); }); }},
    {icon:"📍", label:t("bldAddress"), fn:async () => { const n = await uiPrompt(t("bldAddress"), b.address || ""); if (n !== null) edit(() => { b.address = n.trim(); }); }},
    {icon:"⧉", label:t("duplicate"), fn:() => edit(() => { const c = clone(b); c.id = uid("b"); c.name = b.name + " (" + t("copy") + ")"; reIdBuilding(c); p.buildings.splice(i + 1, 0, c); p.cur.b = c.id; })},
    {icon:"◀", label:t("moveLeft"), disabled:i === 0, fn:() => edit(() => { p.buildings.splice(i, 1); p.buildings.splice(i - 1, 0, b); })},
    {icon:"▶", label:t("moveRight"), disabled:i === p.buildings.length - 1, fn:() => edit(() => { p.buildings.splice(i, 1); p.buildings.splice(i + 1, 0, b); })},
    "-",
    {icon:"🗑", label:t("bldDelete"), danger:true, disabled:p.buildings.length < 2, fn:async () => { if (!await uiConfirm(t("bldDelConf",{n:b.name}), t("delete"), true)) return; edit(() => { p.buildings = p.buildings.filter(x => x !== b); p.links = p.links.filter(l => l.a.b !== b.id && l.b.b !== b.id); p.cur.b = p.buildings[0].id; UI.sel = null; }); }}
  ], {up:true});
}
// New ids for everything in a copied building (cables and views keep pointing at the copies).
function reIdBuilding(b){
  const map = {}, nid = (o, p) => { const n = uid(p); map[o.id] = n; o.id = n; };
  b.floors.forEach(x => nid(x, "f")); b.rooms.forEach(x => nid(x, "r")); b.vlans.forEach(x => nid(x, "v")); b.racks.forEach(x => nid(x, "k")); b.devices.forEach(x => nid(x, "d")); b.links.forEach(x => nid(x, "l"));
  const fix = o => { if (!o || typeof o !== "object") return; for (const k in o){ const v = o[k]; if (typeof v === "string" && map[v]) o[k] = map[v]; else if (v && typeof v === "object") fix(v); } };
  fix(b.floors); fix(b.rooms); fix(b.racks); fix(b.devices); fix(b.links);
  for (const v of Object.values(b.views)){ if (v && v.nodes){ const n = {}; for (const [k, x] of Object.entries(v.nodes)) n[map[k] || k] = x; v.nodes = n; } fix(v); }
  fix(b.wifi);
}
/* ---------- main render ---------- */
function render(){
  if (!store) return;
  document.documentElement.lang = store.settings.lang;
  const a = curApp(), tab = curTab();
  document.title = `${t(a.name)} — ${B().name} — NetWorkKing`;
  document.body.dataset.app = a.id; document.body.style.setProperty("--appc", a.color);
  renderHeader(); renderTabs(); renderBuildings();
  const pal = tab.palette ? tab.palette() : "";
  $("#pal").innerHTML = pal; $("#pal").hidden = !pal;
  const view = $("#view"); view.className = "view v-" + a.id + " t-" + tab.id;
  view.innerHTML = tab.render ? tab.render() : "";
  const dr = drawerHtml(a, tab);
  $("#drawer").innerHTML = dr ? `<div class="dhandle"></div>${dr}` : ""; $("#drawer").hidden = !dr; document.body.classList.toggle("drawer-open", !!dr);
  if (UI.multi.size) $$("[data-sel]", view).forEach(el => { if (UI.multi.has(el.dataset.sel)){ const tr = el.closest("tr") || el; tr.classList.add("on"); } });
  if (tab.after) tab.after(view);
  restoreFocus();
  if (typeof AI !== "undefined" && UI.ai && UI.ai.open) AI.draw();
  if (a.afterRender) a.afterRender(tab);
  maybeTour();
}
// Re-render only the drawer (used while typing in it).
// Several devices selected: one editor for the fields they share (+ the app's own tools for a selection, e.g. align).
function drawerHtml(a, tab){
  if (UI.multi.size > 1){ const L = multiDevs(), extra = a.drawer ? a.drawer(tab) : "";
    return `<div class="dhead"><div><h3>${esc(t("multiSel",{n:UI.multi.size}))}</h3></div><button class="x" data-dr="close">×</button></div>${L.length > 1 ? multiEditor(B(), L) : ""}${extra}`; }
  return a.drawer ? a.drawer(tab) : "";
}
function renderDrawer(){ const a = curApp(), dr = drawerHtml(a, curTab()); $("#drawer").innerHTML = dr ? `<div class="dhandle"></div>${dr}` : ""; $("#drawer").hidden = !dr; document.body.classList.toggle("drawer-open", !!dr);  restoreFocus(); }
/* ---------- header / tab / building events ---------- */
/* ---------- typing masks: IP fields take only an IPv4 address (digits, dots, "/mask"), MAC fields only hex with ":" added ---------- */
const IP_FIELDS = '[data-f="ip"],[data-cf$=":ip"],#bk-ip,#ne-ip,#lk-ip,[data-c="gw"],[data-c="subnet"],[data-v="gw"],[data-v="subnet"],input[data-mask="ip"]';
const MAC_FIELDS = '[data-f="mac"],[data-cf$=":mac"],#ne-mac,input[data-mask="mac"]';
function maskIp(v){
  v = v.replace(/,/g, ".").replace(/[^\d./]/g, "").replace(/\.{2,}/g, ".").replace(/^\./, "");
  let [a, m] = v.split("/"); const parts = a.split(".").slice(0, 4).map(x => x.slice(0, 3)); a = parts.join(".");
  if (parts.length < 4 && parts[parts.length - 1].length === 3 && m === undefined) a += ".";
  return m !== undefined ? a + "/" + m.replace(/\D/g, "").slice(0, 2) : a;
}
function maskMac(v){ const h = v.replace(/[^0-9a-f]/gi, "").toUpperCase().slice(0, 12); return h.replace(/(..)(?=.)/g, "$1:"); }
document.addEventListener("input", e => { const el = e.target; if (!el.matches || el.tagName !== "INPUT") return;
  const ip = el.matches(IP_FIELDS), mac = !ip && el.matches(MAC_FIELDS); if (!ip && !mac) return;
  const atEnd = el.selectionStart === el.value.length, del = e.inputType && e.inputType.startsWith("delete");
  let v = ip ? (del ? el.value.replace(/,/g, ".").replace(/[^\d./]/g, "") : maskIp(el.value)) : (del ? el.value.replace(/[^0-9a-f:]/gi, "").toUpperCase() : maskMac(el.value));
  if (v !== el.value){ const pos = el.selectionStart; el.value = v; if (!atEnd) el.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length)); } }, true);
/* ---------- keep the field the user moved to focused when saving the previous field redraws the page ---------- */
const FKEYS = ["data-f","data-mf","data-cf","data-wr","data-cch","data-wc","data-wp","data-wt","data-lk","data-cs","id"];
function fieldKey(el){ if (!el || !/INPUT|SELECT|TEXTAREA/.test(el.tagName)) return null; for (const k of FKEYS){ const v = el.getAttribute(k); if (v) return k === "id" ? "#" + CSS.escape(v) : `[${k}="${CSS.escape(v)}"]`; } return null; }
let refocus = null;
// (deferred: the mouse-down that started this would otherwise move the focus to the old, removed field)
function restoreFocus(){ if (!refocus) return; const key = refocus; refocus = null; setTimeout(() => focusField(key), 0); }
function focusField(key){ const el = document.querySelector(key); if (el && document.activeElement !== el){ el.focus(); if (el.select && el.tagName === "INPUT" && /text|search|number|tel|email|url/.test(el.type)) try { el.select(); } catch(e){} } }
document.addEventListener("pointerdown", e => { const k = fieldKey(e.target.closest && e.target.closest("input,select,textarea")); if (k){ refocus = k; setTimeout(() => { refocus = null; }, 400); } }, true);
document.addEventListener("keydown", e => { if (e.key !== "Tab") return; const el = e.target, box = el.closest && el.closest("#drawer,#view,.mbox"); if (!box || !fieldKey(el)) return;
  const L = $$("input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])", box).filter(x => x.offsetParent), i = L.indexOf(el), nx = L[i + (e.shiftKey ? -1 : 1)];
  const k = fieldKey(nx); if (!k) return; e.preventDefault(); refocus = k; el.blur(); restoreFocus(); }, true);
function wireShell(){
  // A field being edited is saved before a click elsewhere changes the selection (otherwise the typed text would be lost
  // or land on the newly clicked device).
  document.addEventListener("pointerdown", e => { const a = document.activeElement; if (a && a !== e.target && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !a.contains(e.target) && (a.closest("#drawer") || a.closest("#view") || a.closest("#pal"))) a.blur(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches && e.target.matches("#drawer input[data-f], #drawer input[data-mf], #view input[data-cf], #view input[data-lk]")){ e.preventDefault(); e.target.blur(); } });
  document.addEventListener("click", e => {
    if (e.target.closest("#modal") || e.target.closest(".layer")) return;
    const sw = e.target.closest("#appsw"); if (sw){ openAppSwitcher(sw); return; }
    const h = e.target.closest("[data-h]");
    if (h && !h.disabled){ const k = h.dataset.h;
      if (k === "undo") undo(); else if (k === "redo") redo(); else if (k === "search") openSearch(); else if (k === "versions") openVersions();
      else if (k === "import") importAny(); else if (k === "export") exportMenu(h); else if (k === "settings") openSettings(); else if (k === "help") startTour(true);
      else if (k === "menu") popMenu(h, [{icon:"↶", label:t("undo"), fn:undo, disabled:!undoStack.length}, {icon:"↷", label:t("redo"), fn:redo, disabled:!redoStack.length}, "-",
        {icon:"🔍", label:t("search"), fn:openSearch}, {icon:"🕘", label:t("versions"), fn:openVersions}, {icon:"⤓", label:t("import"), fn:importAny}, {icon:"⤒", label:t("export"), fn:() => exportMenu(h)}, "-",
        {icon:"?", label:t("helpTour"), fn:() => startTour(true)}, {icon:"⚙", label:t("settings"), fn:openSettings}], {right:true});
      return; }
    const tb = e.target.closest("[data-tab]"); if (tb){ UI.tabs[UI.app] = tb.dataset.tab; UI.sel = null; UI.multi.clear(); P().cur.tabs = Object.assign(P().cur.tabs || {}, {[UI.app]:tb.dataset.tab}); persist(); render(); return; }
    const ac = e.target.closest("#ptabs [data-act]"); if (ac && !ac.disabled){ const a = curApp(), x = (a.actions ? a.actions(curTab()) : []).find(y => y && y.id === ac.dataset.act); if (x && x.fn) x.fn(ac); return; }
    const bm = e.target.closest("[data-bmenu]"); if (bm){ e.stopPropagation(); buildingMenu(bm, bm.dataset.bmenu); return; }
    const bt = e.target.closest("[data-b]"); if (bt){ if (P().cur.b !== bt.dataset.b){ P().cur.b = bt.dataset.b; UI.sel = null; UI.multi.clear(); persist(); render(); } return; }
    if (e.target.closest("[data-badd]")){ addBuilding(); return; }
  });
  document.addEventListener("dblclick", e => { const bt = e.target.closest("#btabs [data-b]"); if (bt){ const b = P().buildings.find(x => x.id === bt.dataset.b); uiPrompt(t("bldName"), b.name).then(n => { if (n && n.trim()) edit(() => { b.name = n.trim(); }); }); } });
  document.addEventListener("change", e => {
    if (e.target.id === "projsel"){ const v = e.target.value;
      if (v === "__new"){ uiPrompt(t("projName"), t("newProject")).then(n => { if (n === null){ render(); return; } const p = newProject(n.trim() || t("newProject")); store.projects[p.id] = p; store.cur = p.id; undoStack = []; redoStack = []; persist(); render(); }); return; }
      store.cur = v; undoStack = []; redoStack = []; UI.sel = null; UI.app = P().cur.app || UI.app; persist(); render(); }
  });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable, mod = e.ctrlKey || e.metaKey;
    if (document.querySelector(".layer")) return;
    if (e.key === "Escape"){ if (document.querySelector(".tour")) { endTour(); return; } if (!$("#modal").hidden){ closeModal(); return; } if (menuEl){ closeMenu(); return; } const a = curApp(); if (a.onEsc && a.onEsc()) return; if (UI.sel || UI.multi.size){ UI.sel = null; UI.multi.clear(); render(); } return; }
    if (!$("#modal").hidden) return;
    if (mod && e.key.toLowerCase() === "s"){ e.preventDefault(); saveVersion(t("verManual")); return; }
    if (mod && e.key.toLowerCase() === "p"){ e.preventDefault(); printNow(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === "z"){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === "y"){ e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === "f"){ e.preventDefault(); openSearch(); return; }
    if (e.key === "F1"){ e.preventDefault(); startTour(true); return; }
    const a = curApp(); if (a.onKey) a.onKey(e, curTab());
  });
}
function exportMenu(anchor){
  const a = curApp(), extra = a.exports ? a.exports(curTab()) : [];
  popMenu(anchor, [{icon:"🗂", label:t("exProject"), sub:t("exProjectSub"), fn:exportProject}, {icon:"🖨", label:t("exPdf"), sub:t("exPdfSub"), fn:printNow}, ...(extra.length ? ["-", ...extra] : [])], {right:true});
}
/* ---------- global search over the current project ---------- */
function openSearch(){
  modal(`<h3>🔍 ${esc(t("search"))}</h3><input id="sq" placeholder="${esc(t("searchHint"))}" autocomplete="off"><div id="sres" class="scroll" style="max-height:56vh;margin-top:8px"></div><div class="mfoot"><button class="btn" data-m="close">${esc(t("close"))}</button></div>`, {
    go: (b) => { const p = P(); p.cur.b = b.dataset.b; const app = b.dataset.app; UI.app = app; UI.sel = {type:b.dataset.type, id:b.dataset.id}; closeModal(); render(); if (APPS[app].reveal) APPS[app].reveal(UI.sel); }
  });
  const run = () => { const q = $("#sq").value.trim().toLowerCase(), R = [];
    if (q.length >= 1) P().buildings.forEach(b => {
      b.devices.forEach(d => { const hay = [d.name, d.brand, d.model, d.host, d.ip, d.mac, d.serial, d.asset, d.notes, roomName(b, d.room), kindName(d.kind)].join(" ").toLowerCase(); if (hay.includes(q)) R.push({b, type:"dev", id:d.id, app:appForKind(d.kind), title:d.name || kindName(d.kind), sub:[kindName(d.kind), d.brand + " " + d.model, d.ip, roomName(b, d.room)].filter(x => x && x.trim()).join(" · ")}); });
      b.racks.forEach(r => { if ([r.name, r.code].join(" ").toLowerCase().includes(q)) R.push({b, type:"rack", id:r.id, app:"rack", title:r.name, sub:`${r.u}U · ${roomName(b, r.room)}`}); });
      b.links.forEach(l => { if ([l.cid, l.label].join(" ").toLowerCase().includes(q)) R.push({b, type:"link", id:l.id, app:"topology", title:l.cid || l.label, sub:linkText(b, l)}); });
    });
    $("#sres").innerHTML = R.length ? R.slice(0, 120).map(x => `<button class="sres" data-m="go" data-b="${x.b.id}" data-type="${x.type}" data-id="${x.id}" data-app="${x.app}"><b>${esc(x.title)}</b><small>🏢 ${esc(x.b.name)} · ${esc(x.sub)}</small></button>`).join("") : (q ? `<p class="muted">${esc(t("notFound"))}</p>` : "");
  };
  $("#sq").addEventListener("input", run);
}
/* ---------- printing (document tab of each app) ---------- */
const PAGES = {A4:[297,210], A3:[420,297], A2:[594,420], A1:[841,594], A0:[1189,841], Letter:[279,216], Legal:[356,216], Tabloid:[432,279]};
function pageMM(b){ const [x, y] = PAGES[b.pagefmt.size] || PAGES.A3; return b.pagefmt.orient === "portrait" ? [y, x] : [x, y]; }
// Prints the current app's document sheet (switches to the Document tab first).
async function printNow(){
  const a = curApp(); const doc = a.tabs.find(x => x.id === "doc");
  if (doc && curTab() !== doc){ UI.tabs[a.id] = "doc"; render(); await new Promise(r => setTimeout(r, 60)); }
  const b = B(), [pw, ph] = pageMM(b), M = 8, sh = $(".sheet");
  let st = $("#pagecss"); if (!st){ st = document.createElement("style"); st.id = "pagecss"; document.head.appendChild(st); }
  st.textContent = `@media print{@page{size:${pw}mm ${ph}mm;margin:${M}mm}}`;
  // A sheet that still reads well on one page is fitted onto it (drawing sheet with title block); a long one (big tables)
  // is fitted to the page width and continues on further pages.
  if (sh){ const w = sh.scrollWidth, h = sh.scrollHeight, fw = (pw - 2*M) / 25.4 * 96 / w, fp = Math.min(fw, (ph - 2*M) / 25.4 * 96 / h);
    const pz = fp >= fw * .55 ? fp * .95 : fw * .98; document.documentElement.style.setProperty("--pz", pz.toFixed(4));
    document.documentElement.style.setProperty("--pgh", Math.round((ph - 2*M) / 25.4 * 96 / pz * .8) + "px"); }
  if (window.appBridge && window.appBridge.savePdf){ await window.appBridge.savePdf({name:`${fileSafe(B().name)} - ${t(a.name)}.pdf`, pageSize:b.pagefmt.size, landscape:b.pagefmt.orient !== "portrait"}); return; }
  window.print();
}
