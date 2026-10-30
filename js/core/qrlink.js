/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// QR links on printed labels: the code holds a link to the mobile app (PWA, Progressive Web App) such as
//   https://ulveelives.github.io/NetWorkKing/#nk=p.<building>.<device>.<port>&t=<label text>
// Scanning it on the phone opens NetWorkKing and jumps to that port / device / cable in the project stored on the phone.
// Only ids go into the link; the project itself never leaves the device. Ids survive a project export → import, so the
// phone finds the item even though an imported project gets a new project id. Not found → the label text is shown.
"use strict";
const QRL = (function(){
const DEF = "https://ulveelives.github.io/NetWorkKing/";
const base = () => { let u = String(store.settings.qrBase || DEF).trim(); if (!/^https?:\/\//i.test(u)) u = DEF; return u.replace(/#.*$/, ""); };
// kind: p = port, d = device, l = cable (link)
function url(kind, b, id, port, text){
  const parts = [kind, b.id, id].concat(port !== undefined && port !== "" ? [port] : []).map(x => encodeURIComponent(String(x)).replace(/\./g, "%2E"));
  const tx = String(text || "").slice(0, 40);
  return base() + "#nk=" + parts.join(".") + (tx ? "&t=" + encodeURIComponent(tx) : "");
}
function parse(h){
  const m = /[#&]nk=([^&]+)/.exec(h || ""); if (!m) return null;
  const a = m[1].split(".").map(x => { try { return decodeURIComponent(x); } catch(e){ return x; } });
  const tm = /[&]t=([^&]*)/.exec(h); let tx = ""; try { tx = tm ? decodeURIComponent(tm[1]) : ""; } catch(e){}
  return {kind:a[0], b:a[1], id:a[2], port:a[3], text:tx};
}
// look in the current project first, then in every other project; the building id is preferred but not required
function locate(q){
  const projs = [P(), ...Object.values(store.projects).filter(p => p !== P())];
  const has = (b) => q.kind === "l" ? (b.links || []).some(l => l.id === q.id) : (b.devices || []).some(d => d.id === q.id);
  for (const strict of [true, false]) for (const p of projs) for (const b of p.buildings || []){ if (strict && b.id !== q.b) continue; if (has(b)) return {p, b}; }
  return null;
}
function open(q){
  const f = locate(q);
  if (!f){ modal(`<h3>🏷 ${esc(t("qlNotHere"))}</h3>${q.text ? `<p class="qltext mono"><b>${esc(q.text)}</b></p>` : ""}<p class="small">${esc(t("qlNotHereH"))}</p>
      <div class="mfoot"><button class="btn" data-m="close">${esc(t("close"))}</button><span class="grow"></span><button class="btn pri" data-m="imp">⤓ ${esc(t("import"))}</button></div>`,
      {imp:() => { closeModal(); importAny(); }}); return false; }
  store.cur = f.p.id; f.p.cur.b = f.b.id; closeModal(); UI.multi.clear();
  if (q.kind === "p"){ UI.app = "portmap"; UI.tabs.portmap = "ports"; UI.sel = {type:"port", id:q.id, p:String(q.port || "1")}; }
  else if (q.kind === "l"){ UI.app = "topology"; UI.tabs.topology = "map"; UI.sel = {type:"link", id:q.id}; }
  else { const d = devById(f.b, q.id); UI.app = appForKind(d.kind); UI.sel = {type:"dev", id:q.id}; }
  f.p.cur.app = UI.app; persist(); render();
  try { if (APPS[UI.app].reveal) APPS[UI.app].reveal(UI.sel); } catch(e){}
  setTimeout(() => { const el = q.kind === "p" ? $(`[data-port="${q.id}:${q.port}"]`) : null; if (el) el.scrollIntoView({block:"center", inline:"center"}); }, 60);
  return true;
}
// called once after start-up and whenever the hash changes (a second scan while the app is already open)
function handle(){
  const q = parse(location.hash); if (!q || !q.id) return;
  try { history.replaceState(null, "", location.pathname + location.search); } catch(e){}
  open(q);
}
window.addEventListener("hashchange", () => { try { handle(); } catch(e){ console.error(e); } });
return {url, parse, handle, open, base, DEF};
})();
