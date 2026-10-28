// Start-up: load data and catalog, wire the shell, open the last app, run the first-time setup if needed.
"use strict";
const APP_VERSION = "3.1.0";
(async function start(){
  try {
    await loadStore(); await CAT.load(); applyTheme();
    $("#dl-brands").innerHTML = allBrands().map(x => `<option value="${esc(x)}">`).join("");
    wireShell(); wireEditors(); AI.init(); Object.values(APPS).forEach(a => a.init && a.init());
    const p = P(); UI.app = APPS[p.cur.app] ? p.cur.app : "building"; UI.tabs = Object.assign({}, p.cur.tabs || {});
    render();
    if (!store.settings.setupDone) openWizard();
    CAT.autoUpdate();
    if (/^https?:$/.test(location.protocol) && "serviceWorker" in navigator && !window.appBridge) navigator.serviceWorker.register("sw.js").catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch(e){ console.error(e); document.body.innerHTML = `<pre style="padding:20px;color:#c00">NetWorkKing failed to start:\n${String(e && e.stack || e)}</pre>`; }
})();
window.addEventListener("beforeunload", () => { if (saveTimer){ clearTimeout(saveTimer); try { IDB.db && IDB.put("state", JSON.parse(JSON.stringify(store)), "main"); } catch(e){} } });
