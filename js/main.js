/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Start-up: load data and catalog, wire the shell, open the last app, run the first-time setup if needed.
"use strict";
const APP_VERSION = "3.8.11";
const IS_BETA = /beta/.test(APP_VERSION);
(async function start(){
  try {
    await loadStore(); await CAT.load(); applyTheme(); regUKinds(true);
    $("#dl-brands").innerHTML = allBrands().map(x => `<option value="${esc(x)}">`).join("");
    wireShell(); wireEditors(); AI.init(); Object.values(APPS).forEach(a => a.init && a.init());
    const p = P(); UI.app = APPS[p.cur.app] ? p.cur.app : "building"; UI.tabs = Object.assign({}, p.cur.tabs || {});
    render(); HIST.reset();
    if (!store.settings.setupDone) openWizard();
    try { QRL.handle(); } catch(e){ console.error(e); }   // opened from a scanned label QR
    CAT.autoUpdate();
    if (/^https?:$/.test(location.protocol) && "serviceWorker" in navigator && !window.appBridge) navigator.serviceWorker.register("sw.js").catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch(e){ console.error(e); document.body.innerHTML = `<pre style="padding:20px;color:#c00">NetWorkKing failed to start:\n${String(e && e.stack || e)}</pre>`; }
})();
window.addEventListener("beforeunload", () => { if (saveTimer){ clearTimeout(saveTimer); try { IDB.db && IDB.put("state", JSON.parse(JSON.stringify(store)), "main"); } catch(e){} } });
