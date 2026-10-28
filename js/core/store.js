/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// NetWorkKing data store: one project = one company / branch, with buildings.
// Every app is a view of the same building data (devices, racks, cables, floors, rooms, VLANs),
// so a change made in one app is immediately visible in all the others.
"use strict";
const DBNAME = "networkking", OLD_DB = "networker";   // NetWorker 1.x / 2.x kept their data under the old name
const IDB = {
  db:null,
  open(){ return new Promise(res => { let rq; try { rq = indexedDB.open(DBNAME, 1); } catch(e){ return res(null); }
    rq.onupgradeneeded = () => { const db = rq.result; ["state","versions","assets","catalog"].forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, s === "versions" ? {keyPath:"id", autoIncrement:true} : undefined); }); };
    rq.onsuccess = () => { IDB.db = rq.result; res(IDB.db); }; rq.onerror = () => res(null); rq.onblocked = () => res(null); }); },
  req(store, mode, fn){ return new Promise((res, rej) => { if (!IDB.db) return rej(new Error("no db")); const tx = IDB.db.transaction(store, mode), r = fn(tx.objectStore(store)); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); },
  get(s, k){ return IDB.req(s, "readonly", o => o.get(k)); },
  put(s, v, k){ return IDB.req(s, "readwrite", o => k === undefined ? o.put(v) : o.put(v, k)); },
  del(s, k){ return IDB.req(s, "readwrite", o => o.delete(k)); },
  all(s){ return IDB.req(s, "readonly", o => o.getAll()); }
};
/* ---------- images and other binary files (kept outside the JSON, no size limit) ---------- */
const ASSETS = new Map();
async function putAsset(blob){ const id = uid("img_"); ASSETS.set(id, {blob, url:URL.createObjectURL(blob)}); if (IDB.db) await IDB.put("assets", blob, id).catch(() => {}); return id; }
const assetURL = id => { const a = id && ASSETS.get(id); return a ? a.url : ""; };
const assetSize = id => { const a = id && ASSETS.get(id); return a ? a.blob.size : 0; };
async function loadAssets(ids){ for (const id of ids){ if (!id || ASSETS.has(id) || !IDB.db) continue; const b = await IDB.get("assets", id).catch(() => null); if (b) ASSETS.set(id, {blob:b, url:URL.createObjectURL(b)}); } }
function assetIds(o){ const out = new Set(), walk = x => { if (!x || typeof x !== "object") return; for (const k in x){ const v = x[k]; if (typeof v === "string" && v.startsWith("img_")) out.add(v); else if (v && typeof v === "object") walk(v); } }; walk(o); return [...out]; }
// Image or PDF drawing picked by the user, stored as an asset. PDF pages are rendered with pdf.js (classic scripts work on file://).
function pickImage(){
  return new Promise(res => {
    const done = async blob => { try { if (!blob) return res(null); if (/pdf/i.test(blob.type)) blob = await pdfToPng(blob); res(blob ? await putAsset(blob) : null); } catch(e){ toast("⚠ " + (e && e.message || e)); res(null); } };
    if (window.appBridge && window.appBridge.openImage){ window.appBridge.openImage().then(f => done(f ? dataURLToBlob(f) : null)); return; }
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,application/pdf,.pdf"; inp.onchange = () => done(inp.files[0] || null); inp.click();
  });
}
async function pdfToPng(blob){
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  try { if (!window.pdfjsLib) await load("vendor/pdf.min.js"); if (!globalThis.pdfjsWorker) await load("vendor/pdf.worker.min.js"); } catch(e){ throw new Error(t("pdfNoLib")); }
  const lib = window.pdfjsLib; if (!lib) throw new Error(t("pdfNoLib"));
  const pdf = await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()), isEvalSupported:false}).promise;
  let pn = 1;
  if (pdf.numPages > 1){ const a = await uiPrompt(t("pdfPage",{n:pdf.numPages}), "1", "number"); if (a === null) return null; pn = clamp(Math.round(num(a, 1)), 1, pdf.numPages); }
  toast(t("pdfRendering"));
  const page = await pdf.getPage(pn), v1 = page.getViewport({scale:1}), scale = clamp(5000 / Math.max(v1.width, v1.height), 1, 8);
  const vp = page.getViewport({scale}), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({canvasContext:ctx, viewport:vp}).promise;
  return await new Promise(r => c.toBlob(r, "image/png"));
}
/* ---------- model ---------- */
let store = null;
const UI = {app:"topology", tabs:{}, sel:null, multi:new Set(), drawer:false};
const P = () => store.projects[store.cur];
const B = () => { const p = P(); return p.buildings.find(b => b.id === p.cur.b) || p.buildings[0]; };
function defaultSettings(){ return {lang:"az", theme:"system", help:{off:{}}, ai:{enabled:false, key:"", model:"claude-sonnet-5-5"}, catalogUrl:"https://raw.githubusercontent.com/UlveeLives/NetWorkKing/main/catalog/catalog.json", catalogAuto:true, setupDone:false, addBoxed:true}; }
function newBuilding(name){
  return {id:uid("b"), name:name || t("bldN",{n:1}), address:"", floors:[], rooms:[], vlans:[], racks:[], devices:[], links:[],
    views:{}, wifi:{}, cctv:{}, fiber:{}, tb:{}, revs:[], notes:{}, pagefmt:{size:"A3", orient:"landscape"}};
}
// a new project is called «Project 1», «Project 2» … (the first free number)
function projDefaultName(){ const used = new Set(Object.values((typeof store !== "undefined" && store && store.projects) || {}).map(p => p.name)); let n = 1; while (used.has(t("projDefault",{n}))) n++; return t("projDefault",{n}); }
function newProject(name){ const b = newBuilding(t("bldN",{n:1})); return {id:uid("p"), name:name || projDefaultName(), company:"", buildings:[b], links:[], cur:{b:b.id}, created:today()}; }
function normProject(p){
  p.buildings = p.buildings && p.buildings.length ? p.buildings : [newBuilding(t("bldN",{n:1}))];
  p.buildings.forEach(normBuilding); p.links = p.links || []; p.links.forEach(normLink);
  p.cur = p.cur || {}; if (!p.buildings.some(b => b.id === p.cur.b)) p.cur.b = p.buildings[0].id;
  p.company = p.company || ""; return p;
}
function normBuilding(b){
  ["floors","rooms","vlans","racks","devices","links","revs"].forEach(k => b[k] = Array.isArray(b[k]) ? b[k] : []);
  ["views","wifi","cctv","fiber","notes"].forEach(k => b[k] = b[k] && typeof b[k] === "object" ? b[k] : {});
  b.tb = Object.assign({company:"", project:"", client:"", drawingNo:"", rev:"A", author:"", checked:"", approved:"", date:today(), scale:"NTS", sheet:"1 / 1", status:""}, b.tb || {});
  b.pagefmt = Object.assign({size:"A3", orient:"landscape"}, b.pagefmt || {});
  b.floors.forEach(f => { f.plan = Object.assign({img:null, wm:40, hm:14, op:60, cal:false, idf:null, walls:[], survey:[]}, f.plan || {}); f.plan.walls = f.plan.walls || []; f.plan.survey = f.plan.survey || []; f.lvl = f.lvl ?? 0; });
  b.rooms.forEach(r => { r.users = r.users ?? 0; r.wall = r.wall || "drywall"; });
  b.racks.forEach(r => typeof normRack === "function" && normRack(r));
  b.devices.forEach(d => typeof normDevice === "function" && normDevice(d));
  b.links.forEach(normLink);
  return b;
}
function normLink(l){ l.a = l.a || {}; l.b = l.b || {}; ["cid","len","label","status","speed"].forEach(k => { if (l[k] === undefined) l[k] = ""; }); l.media = l.media || "cat6"; return l; }
/* ---------- persistence ---------- */
let saveTimer = null;
function persist(){
  clearTimeout(saveTimer); setSaveState("…"); if (typeof HIST !== "undefined") HIST.note();
  saveTimer = setTimeout(async () => {
    try { const data = JSON.parse(JSON.stringify(store)); if (IDB.db) await IDB.put("state", data, "main"); else localStorage.setItem("networkking", JSON.stringify(data)); setSaveState("✓"); }
    catch(e){ setSaveState("⚠"); toast("⚠ " + t("saveFail") + " " + (e && e.message || "")); }
  }, 350);
}
function setSaveState(s){ const el = $("#savest"); if (el){ el.textContent = s === "✓" ? "✓ " + t("savedShort") : s === "…" ? "… " + t("saving") : "⚠ " + t("saveFailShort"); el.className = s === "⚠" ? "bad" : ""; } }
// First start of NetWorkKing: copy the data of NetWorker 1.x / 2.x (the old copy is left as it is, so the old version keeps working).
async function migrateOld(){
  try {
    if (!IDB.db || await IDB.get("state", "main")) return false;
    if (indexedDB.databases){ const L = await indexedDB.databases(); if (!L.some(d => d.name === OLD_DB)) return false; }
    const old = await new Promise(res => { const rq = indexedDB.open(OLD_DB); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onupgradeneeded = () => { rq.transaction.abort(); res(null); }; });
    if (!old || !old.objectStoreNames.contains("state")) { old && old.close(); return false; }
    const read = st => new Promise(res => { if (!old.objectStoreNames.contains(st)) return res([]); const tx = old.transaction(st, "readonly"), o = tx.objectStore(st), out = []; const c = o.openCursor(); c.onsuccess = () => { const x = c.result; if (x){ out.push([x.key, x.value]); x.continue(); } else res(out); }; c.onerror = () => res(out); });
    for (const st of ["state", "assets", "catalog", "versions"]){ const rows = await read(st); for (const [k, v] of rows){ if (st === "versions") await IDB.put(st, v).catch(() => {}); else await IDB.put(st, v, k).catch(() => {}); } }
    old.close(); return true;
  } catch(e){ console.warn("migrate", e); return false; }
}
async function loadStore(){
  await IDB.open();
  const migrated = await migrateOld();
  let s = null;
  try { s = IDB.db ? await IDB.get("state", "main") : JSON.parse(localStorage.getItem("networkking") || localStorage.getItem("networker") || "null"); } catch(e){ s = null; }
  if (migrated) setTimeout(() => toast("✓ " + t("migrated"), 6000), 1500);
  if (!s || !s.projects) s = {v:1, settings:defaultSettings(), projects:{}, cur:null};
  s.settings = Object.assign(defaultSettings(), s.settings || {});
  // the program moved to the NetWorkKing repository: the catalog is updated from there
  if (/UlveeLives\/networker\//i.test(s.settings.catalogUrl || "")) s.settings.catalogUrl = defaultSettings().catalogUrl; s.settings.help = Object.assign({off:{}}, s.settings.help || {}); s.settings.ai = Object.assign(defaultSettings().ai, s.settings.ai || {});
  store = s;
  if (!Object.keys(s.projects).length){ const p = newProject(); s.projects[p.id] = p; s.cur = p.id; }
  if (!s.projects[s.cur]) s.cur = Object.keys(s.projects)[0];
  Object.values(s.projects).forEach(normProject);
  await loadAssets(assetIds(s));
}
/* ---------- undo / redo (per project) ---------- */
let undoStack = [], redoStack = [], dirtyVer = false;
function snapshot(){ return JSON.stringify(P()); }
function pushUndo(snap){ undoStack.push(snap || snapshot()); if (undoStack.length > 120) undoStack.shift(); redoStack = []; dirtyVer = true; }
// Every change goes through edit(): undo point, change, save, redraw.
function edit(fn, opts = {}){ pushUndo(); fn(); if (opts.norm !== false) normBuilding(B()); persist(); if (opts.render !== false) render(); }
function restore(json){ const p = JSON.parse(json); store.projects[p.id] = normProject(p); store.cur = p.id; UI.sel = null; UI.multi.clear(); persist(); render(); }
function undo(){ if (!undoStack.length) return toast(t("nothingUndo")); redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo(){ if (!redoStack.length) return toast(t("nothingRedo")); undoStack.push(snapshot()); restore(redoStack.pop()); }
/* ---------- version history ---------- */
async function saveVersion(label, silent){
  if (!IDB.db) return; await IDB.put("versions", {pid:P().id, date:new Date().toISOString(), label:label || "", auto:!!silent, data:snapshot()});
  const all = (await IDB.all("versions")).filter(v => v.pid === P().id && v.auto).sort((a, b) => a.id - b.id);
  while (all.length > 30){ const v = all.shift(); await IDB.del("versions", v.id); }
  dirtyVer = false; if (!silent) toast("🕘 " + t("verSaved"));
}
setInterval(() => { if (dirtyVer && store) saveVersion(t("verAuto"), true).catch(() => {}); }, 10 * 60 * 1000);
async function openVersions(){
  const list = IDB.db ? (await IDB.all("versions")).filter(v => v.pid === P().id).sort((a, b) => b.id - a.id) : [];
  modal(`<h3>🕘 ${esc(t("versions"))}</h3><p class="muted small">${esc(t("verHint"))}</p>
  <div class="row"><input id="ver-lbl" placeholder="${esc(t("verLabel"))}"><button class="btn pri" data-m="verSave">💾 ${esc(t("verSave"))}</button></div>
  <div class="scroll" style="max-height:50vh"><table class="t">${list.length ? list.map(v => `<tr><td class="nw">${esc(new Date(v.date).toLocaleString())}</td><td>${v.auto ? `<span class="muted">${esc(t("verAuto"))}</span>` : esc(v.label || "—")}</td><td class="nw r"><button class="btn small" data-m="verRestore" data-v="${v.id}">↺ ${esc(t("verRestore"))}</button> <button class="btn small dan" data-m="verDel" data-v="${v.id}">×</button></td></tr>`).join("") : `<tr><td class="muted">—</td></tr>`}</table></div>
  <div class="mfoot"><button class="btn" data-m="hist">📜 ${esc(t("hT"))}</button><span class="grow"></span><button class="btn" data-m="close">${esc(t("close"))}</button></div>`, {
    hist: () => HIST.open(),
    verSave: async () => { await saveVersion($("#ver-lbl").value.trim() || t("verManual")); openVersions(); },
    verRestore: async b => { const v = (await IDB.all("versions")).find(x => x.id === +b.dataset.v); if (!v || !await uiConfirm(t("verConf"))) return; await saveVersion(t("verBefore"), true); closeModal(); pushUndo(); restore(v.data); toast("↺ " + t("verDone")); },
    verDel: async b => { await IDB.del("versions", +b.dataset.v); openVersions(); }
  });
}
/* ---------- export / import of whole projects ---------- */
async function exportProject(){
  const p = P(), assets = {};
  for (const id of assetIds(p)){ const a = ASSETS.get(id); if (a) assets[id] = await blobToDataURL(a.blob); }
  // device kinds the user added that this project uses travel with the file
  const usedK = new Set(p.buildings.flatMap(b => b.devices.map(d => d.kind))), UK = typeof ukAll === "function" ? ukAll().filter(u => usedK.has(u.key)) : [];
  if (UK.length) p.ukinds = [...(p.ukinds || []).filter(u => !UK.some(x => x.key === u.key)), ...UK];
  saveText(`${fileSafe(p.name)} ${today()}.networkking.json`, JSON.stringify({app:"networkking", v:1, exported:new Date().toISOString(), project:p, assets}), "json", "application/json");
}
async function importAny(){
  const txt = await openTextFile(); if (!txt) return;
  let j; try { j = JSON.parse(txt); } catch(e){ return toast("⚠ " + t("impBad")); }
  try {
    if ((j.app === "networkking" || j.app === "networker" || j.app === "wolf-suite") && j.project){ await importProject(j); return; }
    if (typeof importLegacy === "function" && await importLegacy(j)) return;
    toast("⚠ " + t("impBad"));
  } catch(e){ console.error(e); toast("⚠ " + t("impBad") + " " + (e.message || "")); }
}
// A project file: as a new project, as new buildings of this project, or (when it has floor plans) laid over the current building.
async function importProject(j, where){
  const src = j.project || {}, bl = Array.isArray(src.buildings) ? src.buildings : [], drawn = bl.filter(x => (x.floors || []).some(f => f.plan && f.plan.img));
  if (!where){ const C = [["new", t("impNewProj"), "pri"], ["bld", t("impNewBld")]]; if (drawn.length && typeof BLD !== "undefined") C.push(["over", t("ov_impOver",{b:B().name})]);
    where = await uiChoice(t("impProjQ",{p:src.name || "?", n:bl.length}), C); if (!where) return; }
  const map = {};
  for (const [id, url] of Object.entries(j.assets || {})){ try { map[id] = await putAsset(dataURLToBlob(url)); } catch(e){} }
  const remap = o => { if (!o || typeof o !== "object") return; for (const k in o){ const v = o[k]; if (typeof v === "string" && map[v]) o[k] = map[v]; else if (v && typeof v === "object") remap(v); } };
  const p = clone(src); remap(p);
  if (where === "over"){ let sb = p.buildings.filter(x => (x.floors || []).some(f => f.plan && f.plan.img));
    let pick = sb[0]; if (sb.length > 1){ const k = await uiChoice(t("ov_whichBld"), sb.map(x => [x.id, x.name])); if (!k) return; pick = sb.find(x => x.id === k); }
    normBuilding(pick); return BLD.overlayPlan(pick, {devs:true}); }
  if (where === "bld"){ pushUndo(); const P0 = P(); (src.ukinds || []).forEach(u => { P0.ukinds = P0.ukinds || []; if (u && u.key && !P0.ukinds.some(x => x.key === u.key)) P0.ukinds.push(u); }); p.buildings.forEach(x => { x.id = uid("b"); if (P0.buildings.some(y => y.name === x.name)) x.name += " (" + t("imported") + ")"; normBuilding(x); P0.buildings.push(x); }); P0.cur.b = p.buildings[0].id; UI.sel = null; normProject(P0); regUKinds(true); persist(); render(); toast("✓ " + t("impOk")); return; }
  p.id = uid("p"); if (Object.values(store.projects).some(x => x.name === p.name)) p.name += " (" + t("imported") + ")";
  normProject(p); store.projects[p.id] = p; store.cur = p.id; undoStack = []; redoStack = []; regUKinds(true); persist(); render(); toast("✓ " + t("impOk"));
}
