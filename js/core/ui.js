/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Shell: header with app switcher, page tabs, building tabs (bottom, like Excel sheets), drawer, modals, menus.
"use strict";
const LANGS = [["az","Azərbaycanca"],["tr","Türkçe"],["en","English"],["ru","Русский"]];
function L(){ return I18N[store && store.settings.lang] || I18N.az; }
function t(k, v){ let s = L()[k] ?? I18N.az[k] ?? I18N.en[k] ?? k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; }
const APPS = {}, APP_ORDER = ["building","topology","portmap","rack","fiber","cctv","wifi","summary"];
function registerApp(a){ APPS[a.id] = a; }
const curApp = () => APPS[UI.app] || APPS.topology;
const curTab = () => { const a = curApp(); const id = UI.tabs[a.id]; return a.tabs.find(x => x.id === id) || a.tabs[0]; };
/* ---------- theme ---------- */
function applyTheme(){ const th = store.settings.theme, eff = th === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : th;
  document.documentElement.dataset.theme = eff; if (typeof applyTitleBg === "function") applyTitleBg();
  // the logo follows the theme: dark logo with the dark theme, light logo with the light one (page icon, window / taskbar icon)
  const fav = document.getElementById("favicon"); if (fav) fav.href = `icons/fav-${eff}.png`;
  if (window.appBridge && appBridge.win && appBridge.win.setIcon) appBridge.win.setIcon(eff);
  // the splash screen of the next start: same language and theme
  if (window.appBridge && appBridge.splashPrefs) appBridge.splashPrefs({lang:store.settings.lang, theme:eff, on:store.settings.splash !== false, fx:store.settings.winFx !== false});
  try { localStorage.setItem("nwk-splash", JSON.stringify({lang:store.settings.lang, theme:eff, on:store.settings.splash !== false})); } catch(e){} }   // read by the phone splash before the store loads
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
// Several fields in one small window: fields = [{k, label, val, ph, type}]; resolves to {k: value} or null.
// check(values) may return an error text: the window stays open and shows it.
function uiForm(title, fields, check){
  return new Promise(res => {
    const o = layer(`<p><b>${esc(title)}</b></p>${fields.map(f => `<label class="fld"><span>${esc(f.label)}</span><input data-k="${esc(f.k)}" type="${f.type || "text"}" value="${esc(f.val ?? "")}" placeholder="${esc(f.ph || "")}"${f.mode ? ` inputmode="${f.mode}"` : ""}></label>`).join("")}<p class="small bad uferr"></p><div class="mfoot"><button class="btn" data-x="0">${esc(t("cancel"))}</button><button class="btn pri" data-x="1">${esc(t("ok"))}</button></div>`);
    const vals = () => Object.fromEntries([...o.querySelectorAll("[data-k]")].map(i => [i.dataset.k, i.value.trim()]));
    const end = ok => { if (ok){ const v = vals(), err = check && check(v); if (err){ o.querySelector(".uferr").textContent = "⚠ " + err; return; } o.remove(); res(v); } else { o.remove(); res(null); } };
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x) end(x.dataset.x === "1"); });
    o.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter"){ e.preventDefault(); end(true); } else if (e.key === "Escape") end(false); });
  });
}
function uiConfirm(msg, okLabel, danger){
  return new Promise(res => {
    const o = layer(`<p style="white-space:pre-line">${esc(msg)}</p><div class="mfoot"><button class="btn" data-x="0">${esc(t("cancel"))}</button><button class="btn ${danger ? "dan-fill" : "pri"}" data-x="1">${esc(okLabel || t("ok"))}</button></div>`);
    const end = ok => { o.remove(); document.removeEventListener("keydown", key, true); res(ok); };
    const key = e => { if (!o.isConnected){ document.removeEventListener("keydown", key, true); return; } if (e.key === "Escape"){ e.stopPropagation(); end(false); } else if (e.key === "Enter"){ e.stopPropagation(); end(true); } };
    document.addEventListener("keydown", key, true);
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x) end(x.dataset.x === "1"); });
  });
}
// Choice dialog: resolves to the chosen key or null.
function uiChoice(msg, choices){
  return new Promise(res => {
    const o = layer(`<p style="white-space:pre-line">${esc(msg)}</p><div class="choices">${choices.map(([k, l, cls]) => `<button class="btn ${cls || ""}" data-x="${esc(k)}">${esc(l)}</button>`).join("")}</div><div class="mfoot"><button class="btn" data-x="">${esc(t("cancel"))}</button></div>`);
    o.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x){ o.remove(); res(x.dataset.x || null); } });
  });
}
/* ---------- modal with named actions ---------- */
let modalActs = {};
/* A window opened from inside another window (Settings → Device database → …) remembers the one it came from:
   «‹ Back» returns to it exactly as it was (same tab, same filled-in fields). A window that only redraws itself
   (same title) does not count as a new step. Closing (× / Close / outside) closes the whole chain. */
let modalHist = [];
const modalTitleOf = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
function modalBack(){ const prev = modalHist.pop(); if (!prev) return closeModal(); const m = $("#modal"); m.innerHTML = ""; m.appendChild(prev.el); modalActs = prev.acts; m.hidden = false;
  // still more windows behind this one: it gets its Back button again
  if (modalHist.length && !prev.el.querySelector(".mback")) prev.el.insertAdjacentHTML("afterbegin", `<button class="mback" data-m="__back" title="${esc(t("back"))}">‹ ${esc(t("back"))}</button>`);
  if (prev.onBack) prev.onBack(); }
function modal(html, acts, opts = {}){ const m = $("#modal");
  const cur = !m.hidden && m.firstElementChild, curT = cur ? modalTitleOf((cur.querySelector("h3,h2") || {}).innerHTML) : "", nuT = modalTitleOf((String(html).match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/) || [])[1]);
  const ownBack = /data-m="(back|prev)"/.test(html);   // multi-step windows (wizards) have their own «Back»
  if (!cur) modalHist = []; else if (!opts.replace && !ownBack && curT !== nuT){ cur.querySelector(".mback") && cur.querySelector(".mback").remove(); modalHist.push({el:cur, acts:modalActs, onBack:opts.onBack}); }
  modalActs = acts || {}; m.innerHTML = `<div class="mbox${opts.wide ? " wide" : ""}${opts.xwide ? " xwide" : ""}">${modalHist.length && !ownBack ? `<button class="mback" data-m="__back" title="${esc(t("back"))}">‹ ${esc(t("back"))}</button>` : ""}${html}</div>`; m.hidden = false; const f = m.querySelector("input:not([type=checkbox]):not([type=radio]),select,textarea"); if (f && !opts.nofocus) setTimeout(() => f.focus(), 0); }
function uiAlert(msg){ return new Promise(res => { const o = layer(`<p style="white-space:pre-line">⚠ ${esc(msg)}</p><div class="mfoot"><span class="grow"></span><button class="btn pri" data-x="1">OK</button></div>`);
  const end = () => { o.remove(); document.removeEventListener("keydown", key, true); res(); }, key = e => { if (!o.isConnected){ document.removeEventListener("keydown", key, true); return; } if (e.key === "Escape" || e.key === "Enter"){ e.stopPropagation(); end(); } };
  o.addEventListener("click", e => { if (e.target.closest("[data-x]")) end(); }); document.addEventListener("keydown", key, true); setTimeout(() => { const x = o.querySelector("[data-x]"); x && x.focus(); }, 0); }); }
let modalDownOut = false;
document.addEventListener("pointerdown", e => { const m = $("#modal"); modalDownOut = !!(m && !m.hidden && e.target === m); }, true);
function closeModal(){ const m = $("#modal"); m.hidden = true; m.innerHTML = ""; modalActs = {}; modalHist = []; }
document.addEventListener("click", e => {
  const m = $("#modal"); if (!m || m.hidden) return;
  // only a click that both starts and ends outside the window closes it (selecting text with the mouse and letting go
  // outside the window no longer closes it)
  if (e.target === m && modalDownOut && !m.querySelector(".mbox.lock")) { closeModal(); return; }
  const b = e.target.closest("[data-m]"); if (!b || !m.contains(b)) return;
  const k = b.dataset.m; if (k === "close"){ closeModal(); return; } if (k === "__back"){ modalBack(); return; }
  if (modalActs[k]) modalActs[k](b, e);
  else if (k.includes(":") && modalActs[k.split(":")[0]]) modalActs[k.split(":")[0]](b, e, k.split(":").slice(1).join(":"));
});
/* ---------- popover menu ---------- */
let menuEl = null;
function closeMenu(){ if (menuEl){ menuEl.remove(); menuEl = null; } }
// a second click on the button that opened a menu closes it (instead of opening it again)
let menuAnchor = null, menuShut = {a:null, t:0};
function popMenu(anchor, items, opts = {}){
  if (menuShut.a && menuShut.a === anchor && Date.now() - menuShut.t < 600){ menuShut.a = null; return; }
  closeMenu(); menuAnchor = anchor; const el = document.createElement("div"); el.className = "pmenu" + (opts.cls ? " " + opts.cls : "");
  el.innerHTML = items.map((it, i) => it === "-" ? `<hr>` : it.head ? `<div class="mh">${esc(it.head)}</div>` : `<button class="mi${it.danger ? " dan" : ""}${it.on ? " on" : ""}" data-i="${i}"${it.disabled ? " disabled" : ""}>${it.icon ? `<span class="mic">${it.icon}</span>` : ""}<span class="mtx"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span></button>`).join("");
  document.body.appendChild(el); menuEl = el;
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  let x = opts.right ? r.right - w : r.left, y = opts.up ? r.top - h - 4 : r.bottom + 4;
  if (y + h > innerHeight - 6) y = Math.max(6, r.top - h - 4);
  el.style.left = clamp(x, 6, innerWidth - w - 6) + "px"; el.style.top = clamp(y, 6, innerHeight - h - 6) + "px";
  el.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.fn && it.fn(); });
}
document.addEventListener("pointerdown", e => { if (menuEl && !menuEl.contains(e.target)){ menuShut = {a:menuAnchor && menuAnchor.contains(e.target) ? menuAnchor : null, t:Date.now()}; closeMenu(); } }, true);
window.addEventListener("resize", closeMenu);
/* ---------- header ---------- */
function appIcon(a, s = 26){ return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><rect x="2" y="2" width="44" height="44" rx="10" fill="${a.color}"/>${a.glyph}</svg>`; }
function renderHeader(){
  const a = curApp(), p = P();
  const B2 = (act, ic, k, extra = "") => `<button class="hb" data-h="${act}" title="${esc(t(k))}"${extra}><span class="hi">${ic}</span><span class="ht">${esc(t(k))}</span></button>`;
  $("#hdr").innerHTML = `${typeof winLights === "function" ? winLights() : ""}<button class="brand" id="appsw" title="${esc(t("switchApp"))}">${appIcon(a)}<span class="bn"><b>${esc(t(a.name))}</b></span><span class="car">▾</span></button>
    <div class="hproj"><select id="projsel" title="${esc(t("project"))}">${Object.values(store.projects).sort((x, y) => String(x.name || "").localeCompare(String(y.name || ""))).map(x => opt(x.id, x.name, p.id)).join("")}<option value="__new">＋ ${esc(t("newProject"))}…</option></select></div>
    <span class="grow"></span>
    <div class="hacts">${B2("undo","↶","undo", undoStack.length ? "" : " disabled")}${B2("redo","↷","redo", redoStack.length ? "" : " disabled")}<span class="hsep"></span>
    ${B2("sync","⇄","sy_btn")}${B2("search","🔍","search")}${B2("versions","🕘","versions")}${B2("import","⤓","import")}${B2("export","⤒","export")}<span class="hsep"></span>
    ${B2("help","?","helpTour")}${B2("settings","⚙","settings")}</div>
    <span id="savest">✓ ${esc(t("savedShort"))}</span>
    <button class="hb hmenu" data-h="menu" title="${esc(t("menu"))}"><span class="hi">☰</span></button>
    <div class="hlogo" aria-label="NetWorkKing"><img src="icons/logo-hdr.png" alt="" width="34" height="34"><span class="hname"><span class="o">Net</span><span class="g">Work</span><span class="o">King</span></span>${IS_BETA ? `<span class="betap">beta</span>` : ""}</div>`;
  fitHeader();
}
// the logo and the name sit in the middle of the title bar; when the buttons would run into them the button labels go
// first (icons only), then the name, and on a very narrow window the logo too
function fitHeader(){
  const h = $("#hdr"), c = h && h.querySelector(".hlogo"); if (!c) return;
  h.classList.remove("hc-icons", "hc-noname", "hc-nologo");
  const hit = () => { const r = c.getBoundingClientRect(); if (!r.width) return false;
    return [...h.children].filter(x => x !== c && x.offsetParent && !x.classList.contains("grow")).some(x => { const q = x.getBoundingClientRect(); return q.width && q.right > r.left - 12 && q.left < r.right + 12; }); };
  if (hit()){ h.classList.add("hc-icons"); if (hit()){ h.classList.add("hc-noname"); if (hit()) h.classList.add("hc-nologo"); } }
}
window.addEventListener("resize", () => { clearTimeout(fitHeader.t); fitHeader.t = setTimeout(fitHeader, 60); });
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

document.addEventListener("change", e => { if (e.target.id === "add-planned"){ store.settings.addPlanned = e.target.checked; persist(); toast(e.target.checked ? "📝 " + t("addPlannedOn") : t("addPlannedOff")); } });
/* ---------- zoom & pan for floor plans (Building, CCTV, Wi-Fi) ----------
   Mouse wheel zooms at the cursor, the middle button drags the view (as in AutoCAD), Space + left drag too;
   on touch screens two fingers pan and pinch. The view of each plan is remembered while the program is open. */
const ZP = {st:{}, drag:null, touch:new Map(), space:false};
function zpWrap(key, inner){ return `<div class="zp" data-zp="${esc(key)}"><div class="zpi">${inner}</div><div class="zpbtn"><button data-zpa="in" title="+">＋</button><button data-zpa="out" title="−">－</button><button data-zpa="fit" title="${esc(t("zpFit"))}">⤢</button><span class="zpz"></span></div><div class="zphint">${esc(t("zpHint"))}</div></div>`; }
function zpEl(el){ return el && el.closest ? el.closest(".zp") : null; }
function zpSize(el){ const c = el.querySelector(".zpi"), f = c && c.firstElementChild; if (!f) return {w:1, h:1}; const w = f.offsetWidth || num(f.getAttribute && f.getAttribute("width"), 1), h = f.offsetHeight || num(f.getAttribute && f.getAttribute("height"), 1); return {w:Math.max(1, w), h:Math.max(1, h)}; }
// fit shows the main part (data-fit="x y w h" on the content, e.g. the building without its free surroundings), else everything
function zpFit(el){ const S = zpSize(el), W = el.clientWidth, H = el.clientHeight; if (W < 40 || H < 40) return;
  const c = el.querySelector(".zpi"), f = c && c.firstElementChild, fr = f && f.dataset && f.dataset.fit ? f.dataset.fit.split(" ").map(Number) : [0, 0, S.w, S.h];
  const z = clamp(Math.min(W / fr[2], H / fr[3]) * .94, .05, 8); ZP.st[el.dataset.zp] = {z, x:(W - fr[2] * z) / 2 - fr[0] * z, y:(H - fr[3] * z) / 2 - fr[1] * z}; const an = f && f.dataset && f.dataset.anchor; if (an){ const a = an.split(" ").map(Number); ZP.st[el.dataset.zp].ax = a[0]; ZP.st[el.dataset.zp].ay = a[1]; } zpSet(el); }
function zpSet(el){ const s = ZP.st[el.dataset.zp]; if (!s){ if (el.clientWidth >= 40 && el.clientHeight >= 40) zpFit(el); return; } const c = el.querySelector(".zpi");
  // content that grew on the left / top (data-anchor = where its origin sits) must not jump
  const f = c && c.firstElementChild, an = f && f.dataset && f.dataset.anchor ? f.dataset.anchor.split(" ").map(Number) : null;
  if (an){ if (s.ax !== undefined){ s.x += (s.ax - an[0]) * s.z; s.y += (s.ay - an[1]) * s.z; } s.ax = an[0]; s.ay = an[1]; } if (c) c.style.transform = `translate(${s.x}px,${s.y}px) scale(${s.z})`; const z = el.querySelector(".zpz"); if (z) z.textContent = Math.round(s.z * 100) + "%"; }
function zpZoom(el, f, cx, cy){ const s = ZP.st[el.dataset.zp] || (zpFit(el), ZP.st[el.dataset.zp]), R = el.getBoundingClientRect(), mx = cx === undefined ? R.width / 2 : cx - R.left, my = cy === undefined ? R.height / 2 : cy - R.top, nz = clamp(s.z * f, .05, 12);
  s.x = mx - (mx - s.x) * nz / s.z; s.y = my - (my - s.y) * nz / s.z; s.z = nz; zpSet(el); }
function zpAll(){ $$(".zp").forEach(el => zpSet(el)); }
// Ctrl + wheel zooms (a plain wheel scrolls the page as usual); a touchpad pinch arrives as Ctrl + wheel too
document.addEventListener("wheel", e => { const el = zpEl(e.target); if (!el || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zpZoom(el, Math.exp(-e.deltaY * (e.deltaMode ? .05 : .0015)), e.clientX, e.clientY); }, {passive:false});
document.addEventListener("keydown", e => { if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) { if ($(".zp")) { ZP.space = true; document.body.classList.add("zpspace"); e.preventDefault(); } } });
document.addEventListener("keyup", e => { if (e.code === "Space"){ ZP.space = false; document.body.classList.remove("zpspace"); } });
document.addEventListener("pointerdown", e => {
  const el = zpEl(e.target); if (!el) return;
  if (e.pointerType === "touch"){ ZP.touch.set(e.pointerId, {x:e.clientX, y:e.clientY}); if (ZP.touch.size === 2){ e.stopImmediatePropagation(); e.preventDefault(); const [a, b] = [...ZP.touch.values()]; ZP.drag = {el, pinch:true, d:Math.hypot(a.x - b.x, a.y - b.y), cx:(a.x + b.x) / 2, cy:(a.y + b.y) / 2}; } return; }
  if (e.button === 1 || (e.button === 0 && ZP.space)){ e.preventDefault(); e.stopImmediatePropagation(); const s = ZP.st[el.dataset.zp] || (zpFit(el), ZP.st[el.dataset.zp]); ZP.drag = {el, x0:e.clientX, y0:e.clientY, sx:s.x, sy:s.y}; el.classList.add("panning"); }
}, true);
document.addEventListener("mousedown", e => { if (e.button === 1 && zpEl(e.target)) e.preventDefault(); }, true);   // no browser autoscroll
document.addEventListener("pointermove", e => {
  if (e.pointerType === "touch" && ZP.touch.has(e.pointerId)) ZP.touch.set(e.pointerId, {x:e.clientX, y:e.clientY});
  const D = ZP.drag; if (!D) return;
  if (D.pinch){ if (ZP.touch.size < 2) return; const [a, b] = [...ZP.touch.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, s = ZP.st[D.el.dataset.zp];
    s.x += cx - D.cx; s.y += cy - D.cy; zpSet(D.el); zpZoom(D.el, d / D.d, cx, cy); D.d = d; D.cx = cx; D.cy = cy; e.stopImmediatePropagation(); return; }
  const s = ZP.st[D.el.dataset.zp]; s.x = D.sx + e.clientX - D.x0; s.y = D.sy + e.clientY - D.y0; zpSet(D.el); e.stopImmediatePropagation();
}, true);
const zpEnd = e => { if (e.pointerType === "touch") ZP.touch.delete(e.pointerId); if (ZP.drag && (!ZP.drag.pinch || ZP.touch.size < 2)){ ZP.drag.el.classList.remove("panning"); ZP.drag = null; e.stopImmediatePropagation(); } };
document.addEventListener("pointerup", zpEnd, true); document.addEventListener("pointercancel", zpEnd, true);
document.addEventListener("click", e => { const b = e.target.closest("[data-zpa]"); if (!b) return; const el = zpEl(b); if (!el) return; const k = b.dataset.zpa; if (k === "fit") zpFit(el); else zpZoom(el, k === "in" ? 1.25 : .8); });
window.addEventListener("resize", debounce(() => $$(".zp").forEach(el => { if (!ZP.st[el.dataset.zp]) zpFit(el); }), 150));

function render(){
  if (!store) return;
  document.documentElement.lang = store.settings.lang;
  const a = curApp(), tab = curTab();
  document.title = `${t(a.name)} — ${B().name} — NetWorkKing`;
  document.body.dataset.app = a.id; document.body.style.setProperty("--appc", a.color);
  renderHeader(); renderTabs(); renderBuildings();
  const pal0 = tab.palette ? tab.palette() : "", pal = pal0 ? `<label class="chk planck" title="${esc(t("addPlannedH"))}"><input type="checkbox" id="add-planned"${store.settings.addPlanned ? " checked" : ""}> 📝 ${esc(t("addPlanned"))}</label>` + pal0 : "";
  $("#pal").innerHTML = pal; $("#pal").hidden = !pal;
  const view = $("#view"), keep = sameScreen(a, tab) ? scrollSave() : null; view.className = "view v-" + a.id + " t-" + tab.id;
  view.innerHTML = tab.render ? tab.render() : "";
  const dr = drawerHtml(a, tab);
  $("#drawer").innerHTML = dr ? `<div class="dhandle"></div>${dr}${drawerFoot()}` : ""; $("#drawer").hidden = !dr; document.body.classList.toggle("drawer-open", !!dr);
  if (UI.multi.size) $$("[data-sel]", view).forEach(el => { if (UI.multi.has(el.dataset.sel)){ const tr = el.closest("tr") || el; tr.classList.add("on"); } });
  zpAll(); refreshBrands();
  if (keep) scrollRestore(keep);
  if (tab.after) tab.after(view);
  restoreFocus();
  if (typeof AI !== "undefined" && UI.ai && UI.ai.open) AI.draw();
  if (a.afterRender) a.afterRender(tab);
  maybeTour(); maybePanelTour(); if (typeof SYNC !== "undefined") SYNC.dot();
  if (window.appBridge && appBridge.fxDirty) appBridge.fxDirty();
}
/* ---------- Save / Close at the bottom of every side card ----------
   Fields are kept as soon as they are left; Save finishes the field being typed, confirms and closes the card. */
const drawerFoot = () => `<div class="dfoot"><button class="btn pri" data-dsave="1">💾 ${esc(t("save"))}</button><button class="btn" data-dclose="1">${esc(t("close"))}</button><small class="muted">${esc(t("dSaveH"))}</small></div>`;
async function drawerSave(){ const a = document.activeElement; if (a && a.closest && a.closest("#drawer") && a.blur) a.blur();
  if (UI.app === "portmap" && UI.sel && UI.sel.type === "port" && window.PM && PM.savePort) return PM.savePort();
  setTimeout(() => { if (document.querySelector(".layer") || !$("#modal").hidden) return; UI.sel = null; UI.multi.clear(); render(); toast("✓ " + t("saved")); }, 120); }
document.addEventListener("pointerdown", e => { const el = e.target.closest && e.target.closest("[data-dsave],[data-dclose]"); if (!el || e.button) return; e.preventDefault(); e.stopPropagation();
  if (el.dataset.dsave) drawerSave(); else { const a = document.activeElement; if (a && a.blur) a.blur(); setTimeout(() => { if (document.querySelector(".layer")) return; UI.sel = null; UI.multi.clear(); render(); }, 80); } }, true);
/* ---------- scroll positions survive a redraw ----------
   After a change the screen is drawn again; every scrolled box (the page, tables, lists, the side panel) keeps its place
   instead of jumping back to the top. Boxes are found again by their position in the page. */
let lastScreen = "";
function sameScreen(a, tab){ const k = a.id + "/" + tab.id + "/" + (P() && P().cur.b); const same = k === lastScreen; lastScreen = k; return same; }
function pathOf(el, root){ const p = []; while (el && el !== root){ const par = el.parentElement; if (!par) break; p.unshift([...par.children].indexOf(el)); el = par; } return p; }
function scrollSave(){ const out = [];
  ["#view", "#drawer", "#pal"].forEach(sel => { const root = $(sel); if (!root) return; if (root.scrollTop || root.scrollLeft) out.push([sel, [], root.scrollTop, root.scrollLeft]);
    root.querySelectorAll(".scroll, .smwrap, .racks, #dgwrap, .dsb, .ulist, [data-keepscroll]").forEach(el => { if (el.scrollTop || el.scrollLeft) out.push([sel, pathOf(el, root), el.scrollTop, el.scrollLeft]); }); });
  out.push(["win", [], window.scrollY, window.scrollX]); out.sel = JSON.stringify(UI.sel || null); return out; }
function scrollRestore(L){ const sameSel = L.sel === JSON.stringify(UI.sel || null); L.forEach(([sel, path, top, left]) => { if (sel === "#drawer" && !sameSel) return; if (sel === "win"){ if (top || left) window.scrollTo(left, top); return; } let el = $(sel); for (const i of path){ el = el && el.children[i]; } if (el){ el.scrollTop = top; el.scrollLeft = left; } }); }
// Re-render only the drawer (used while typing in it).
// Several devices selected: one editor for the fields they share (+ the app's own tools for a selection, e.g. align).
function drawerHtml(a, tab){
  if (UI.multi.size > 1){ const L = multiDevs(), extra = a.drawer ? a.drawer(tab) : "";
    return `<div class="dhead"><div><h3>${esc(t("multiSel",{n:UI.multi.size}))}</h3></div><button class="x" data-dr="close">×</button></div>${L.length > 1 ? multiEditor(B(), L) : ""}${extra}`; }
  return a.drawer ? a.drawer(tab) : "";
}
function renderDrawer(){ const a = curApp(), dr = drawerHtml(a, curTab()); $("#drawer").innerHTML = dr ? `<div class="dhandle"></div>${dr}${drawerFoot()}` : ""; $("#drawer").hidden = !dr; document.body.classList.toggle("drawer-open", !!dr);  restoreFocus(); maybePanelTour(); }
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
      if (k === "undo") undo(); else if (k === "redo") redo(); else if (k === "search") openSearch(); else if (k === "sync") SYNC.open(); else if (k === "versions") openVersions();
      else if (k === "import") importAny(); else if (k === "export") exportMenu(h); else if (k === "settings") openSettings(); else if (k === "help") startTour(true);
      else if (k === "menu") popMenu(h, [{icon:"↶", label:t("undo"), fn:undo, disabled:!undoStack.length}, {icon:"↷", label:t("redo"), fn:redo, disabled:!redoStack.length}, "-",
        {icon:"⇄", label:t("sy_btn"), fn:() => SYNC.open()}, {icon:"🔍", label:t("search"), fn:openSearch}, {icon:"🕘", label:t("versions"), fn:openVersions}, {icon:"⤓", label:t("import"), fn:importAny}, {icon:"⤒", label:t("export"), fn:() => exportMenu(h)}, "-",
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
      if (v === "__new"){ uiPrompt(t("projName"), projDefaultName()).then(n => { if (n === null){ render(); return; } const p = newProject(n.trim() || projDefaultName()); store.projects[p.id] = p; store.cur = p.id; undoStack = []; redoStack = []; persist(); render(); }); return; }
      store.cur = v; undoStack = []; redoStack = []; UI.sel = null; UI.app = P().cur.app || UI.app; persist(); render(); }
  });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable, mod = e.ctrlKey || e.metaKey;
    if (document.querySelector(".layer")) return;
    if (e.key === "Escape"){ if (document.querySelector(".tour")) { endTour(); return; } if (!$("#modal").hidden){ if (modalHist.length) modalBack(); else closeModal(); return; } if (menuEl){ closeMenu(); return; } const a = curApp(); if (a.onEsc && a.onEsc()) return; if (UI.sel || UI.multi.size){ UI.sel = null; UI.multi.clear(); render(); } return; }
    if (!$("#modal").hidden) return;
    if (mod && e.key.toLowerCase() === "s"){ e.preventDefault(); saveVersion(t("verManual")); return; }
    if (mod && e.key.toLowerCase() === "p"){ e.preventDefault(); printNow(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === "z"){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === "y"){ e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === "f"){ e.preventDefault(); openSearch(); return; }
    if (e.key === "F1"){ e.preventDefault(); startTour(true); return; }
    const a = curApp(); if (a.onKey) a.onKey(e, curTab());
    // Ctrl+A fallback: select every device visible on the current screen (tables, plans, racks)
    if (mod && e.key.toLowerCase() === "a" && !e.defaultPrevented){ const ids = new Set();
      document.querySelectorAll('#view [data-sel^="dev:"], #view [data-bdev], #view [data-rdsel], #view [data-rdev]').forEach(el => { const id = el.dataset.sel ? el.dataset.sel.slice(4) : (el.dataset.bdev || el.dataset.rdsel || el.dataset.rdev); if (id && devById(B(), id)) ids.add(id); });
      if (ids.size){ e.preventDefault(); UI.multi.clear(); ids.forEach(id => UI.multi.add("dev:" + id)); UI.sel = ids.size === 1 ? {type:"dev", id:[...ids][0]} : null; if (ids.size === 1) UI.multi.clear(); render(); toast(t("selAll", {n:ids.size})); } }
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
/* ---------- a click right after typing ----------
   Typing in a field and then pressing a button: leaving the field saves it and redraws the panel, which replaced the
   button under the pointer, so the first click was lost. The field is finished first; if the button was redrawn, the
   same button (same data attributes and text) in the new panel is pressed. */
(function(){
  const sig = el => el.tagName + "|" + [...el.attributes].filter(a => a.name.startsWith("data-") || a.name === "class").map(a => a.name + "=" + a.value).join("&") + "|" + el.textContent.trim();
  document.addEventListener("pointerdown", e => {
    if (e.button) return; const btn = e.target.closest && e.target.closest("button, .btn, [data-dr], [data-m], .lnk, .eprow"); if (!btn) return;
    const a = document.activeElement; if (!a || a === btn || !/^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
    const box = btn.closest("#drawer, #modal, #view"); if (!box || !box.contains(a)) return;
    const key = sig(btn), idx = [...box.querySelectorAll(btn.tagName)].filter(x => sig(x) === key).indexOf(btn);
    a.blur();
    if (btn.isConnected) return;
    e.preventDefault(); const L = [...box.querySelectorAll(btn.tagName)].filter(x => sig(x) === key), nb = L[idx] || L[0];
    if (nb) setTimeout(() => { if (nb.isConnected && !document.querySelector(".layer")) nb.click(); }, 0);
  }, true);
})();
/* ---------- number fields keep to their limits ----------
   min / max on an <input type="number"> only guide the arrows: a typed 99999 still went through and a 99999-port switch
   or a 99999U rack could freeze the program. Every number field is clamped before any app reads it. */
document.addEventListener("change", e => { const el = e.target; if (!el || el.tagName !== "INPUT" || el.type !== "number" || el.value === "") return;
  let v = parseFloat(String(el.value).replace(",", ".")); if (!isFinite(v)){ el.value = ""; return; }
  if (el.min !== "" && isFinite(+el.min) && v < +el.min) v = +el.min; if (el.max !== "" && isFinite(+el.max) && v > +el.max) v = +el.max;
  if (String(v) !== el.value) el.value = String(v); }, true);
