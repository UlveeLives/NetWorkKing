/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// NetWorkKing — Electron main process (Windows desktop app).
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, screen, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
// its own identity for Windows: its own taskbar button (otherwise Windows may group it under another program's button, and a
// click on that button never reaches this window). Same id as the installer uses (package.json build.appId).
if (process.platform === "win32") app.setAppUserModelId(/beta/i.test(app.getName()) ? "local.ulveelives.networkking.beta" : "local.ulveelives.networkking");
if (!app.requestSingleInstanceLock()) app.quit();
// NetWorkKing keeps its data in its own folder. On the first start it copies the data of the version installed before it
// (the beta copies NetWorkKing; NetWorkKing copies NetWorker 1.x / 2.x). The old folder is never changed, so the other
// version still opens with its own data — work done in the beta does not reach the stable version.
try {
  const nu = app.getPath("userData"), old = ["NetWorkKing", "NetWorker"].map(n => path.join(app.getPath("appData"), n)).find(f => path.resolve(f).toLowerCase() !== path.resolve(nu).toLowerCase() && fs.existsSync(path.join(f, "IndexedDB"))) || "";
  if (old && !fs.existsSync(path.join(nu, "IndexedDB"))){
    fs.mkdirSync(nu, { recursive: true });
    for (const d of ["IndexedDB", "Local Storage"]) if (fs.existsSync(path.join(old, d))) fs.cpSync(path.join(old, d), path.join(nu, d), { recursive: true });
  }
} catch (e) { console.error("data copy", e); }
// opened again while running: bring the window forward (or make a new one if it is gone)
app.on("second-instance", () => { if (splash && !splash.isDestroyed()){ splash.focus(); return; } if (win && !win.isDestroyed()){ if (win.isMinimized()) win.restore(); win.show(); win.focus(); } else if (app.isReady()) createWindow(); });

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1000, minHeight: 640, frame: false, show: false,
    title: app.getName(), backgroundColor: "#0d2a1a", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon-dark.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile("index.html");
  // closing the app window ends the program — also the hidden window of the minimise effect, which would otherwise
  // keep the program running in the background
  win.on("closed", () => { win = null; if (fx && !fx.isDestroyed()) fx.destroy(); fx = null; if (splash && !splash.isDestroyed()) splash.destroy(); app.quit(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
  // the page draws its own title bar (red / yellow / green buttons); it needs to know focus and full-screen state
  const st = () => { if (win && !win.isDestroyed()) win.webContents.send("win-state", { focused: win.isFocused(), full: win.isFullScreen(), max: win.isMaximized() }); };
  ["focus", "blur", "enter-full-screen", "leave-full-screen", "maximize", "unmaximize"].forEach(ev => win.on(ev, st));
  win.webContents.on("did-finish-load", st);
  ["minimize", "restore", "show", "hide", "focus", "blur"].forEach(ev => win.on(ev, () => flog("win", ev, "fxMin=" + fxMin, "busy=" + fxBusy, "min=" + win.isMinimized(), "vis=" + win.isVisible())));
  win.on("restore", () => { if (fxMin){ fxMin = false; try { win.setOpacity(0); } catch(e){}
    // never leave the window invisible: whatever happens, it is shown again after 1.5 s
    const guard = setTimeout(() => { try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch(e){} }, 1500);
    restoreFx().catch(() => {}).finally(() => { clearTimeout(guard); try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch(e){} }); } });
  // the effect window is made while the program starts, so the first minimise does not wait for it
  win.once("ready-to-show", () => { mainReady(); if (!splash) showMain(); setTimeout(() => fxWindow().catch(() => {}), 1200); });
}
/* ---------- splash screen ----------
   Shown while the program loads behind it (hidden). Language and theme come from splash.json, which the program writes
   every time it starts or its settings change, so the splash speaks the language chosen last time. The program window
   appears when the splash has played its ending (the logo fading away). */
let splash = null, shown = false, readyRes, readyP = new Promise(r => readyRes = r);
const mainReady = () => readyRes();
const spFile = () => path.join(app.getPath("userData"), "splash.json");
function splashPrefs(){
  let p = {}; try { p = JSON.parse(fs.readFileSync(spFile(), "utf8")) || {}; } catch(e){}
  const loc = (app.getLocale() || "").slice(0, 2).toLowerCase(), L = ["az", "tr", "en", "ru"];
  return { on: p.on !== false, lang: L.includes(p.lang) ? p.lang : (L.includes(loc) ? loc : "az"),
    theme: p.theme === "light" || p.theme === "dark" ? p.theme : (nativeTheme.shouldUseDarkColors ? "dark" : "light") };
}
function showMain(){
  if (shown || !win || win.isDestroyed()) return; shown = true;
  win.maximize(); win.show(); win.focus();
  if (splash && !splash.isDestroyed()){ const s = splash; setTimeout(() => { try { if (!s.isDestroyed()) s.destroy(); } catch(e){} }, 60); }
}
function createSplash(p){
  // 760 × 920 at full size; smaller screens get the same picture zoomed down
  const wa = screen.getPrimaryDisplay().workAreaSize, k = Math.min(1, (wa.height - 24) / 920, (wa.width - 24) / 760);
  splash = new BrowserWindow({ width: Math.round(760 * k), height: Math.round(920 * k), frame: false, transparent: true, resizable: false,
    maximizable: false, fullscreenable: false, skipTaskbar: true, show: false, hasShadow: false, backgroundColor: "#00000000", center: true,
    title: app.getName(), icon: path.join(__dirname, "build", p.theme === "light" ? "icon-light.png" : "icon-dark.png"),
    webPreferences: { preload: path.join(__dirname, "splashpreload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, zoomFactor: k } });
  splash.loadFile("splash.html", { search: `app=1&lang=${p.lang}&theme=${p.theme}&v=${encodeURIComponent(app.getVersion())}` });
  splash.once("ready-to-show", () => splash && !splash.isDestroyed() && splash.show());
  splash.webContents.on("did-fail-load", () => { splash.destroy(); });
  splash.on("closed", () => { splash = null; readyP.then(showMain); });
  // never stay on the splash: whatever happens, the program appears after 45 s
  setTimeout(() => readyP.then(showMain), 45000);
}
ipcMain.handle("splash-wait", () => readyP.then(() => true));
ipcMain.on("splash-done", () => readyP.then(showMain));
ipcMain.on("splash-prefs", (_e, p) => { try {
  const cur = JSON.stringify(splashPrefs()), nu = JSON.stringify({ on: p.on !== false, lang: p.lang, theme: p.theme === "light" ? "light" : "dark" });
  if (cur !== nu) fs.writeFileSync(spFile(), nu); } catch(e){} });
/* ---------- minimise / restore effect (like the macOS "genie") ----------
   The window is photographed, a transparent window over the whole screen plays the picture flowing into the
   taskbar, then the real window is minimised. On restore the same is played backwards. The app window itself stays a
   normal window (resizing, snapping and the taskbar keep working). If anything goes wrong it falls back to a plain
   minimise. Only when the taskbar is at the bottom of the screen; otherwise a plain minimise. */
let fx = null, fxBusy = false, fxMin = false, iconX = null;
const fxPos = () => path.join(app.getPath("userData"), "taskbar-pos.json");
try { iconX = JSON.parse(fs.readFileSync(fxPos(), "utf8")).x; if (typeof iconX !== "number") iconX = null; } catch(e){ iconX = null; }
// beta: step log of the minimise effect (NWK_FXLOG file next to the app files), to find timing problems on real PCs
const fxLogFile = path.join(__dirname, "fx.log"), T0 = Date.now();
function flog(...a){ if (!process.env.NWK_FXLOG) return; try { fs.appendFileSync(fxLogFile, `${((Date.now() - T0) / 1000).toFixed(3)} ${a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ")}\n`); } catch(e){} }
function fxWindow(){
  if (fx && !fx.isDestroyed()) return Promise.resolve(fx);
  fx = new BrowserWindow({ frame: false, transparent: true, resizable: false, movable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true,
    show: false, hasShadow: false, backgroundColor: "#00000000", webPreferences: { preload: path.join(__dirname, "fxpreload.js"), contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  fx.setIgnoreMouseEvents(true);
  const o = fx;
  return new Promise(res => { o.webContents.once("did-finish-load", () => {
    // warm-up: Windows draws a new transparent window late the first time it is shown — show it once now, empty,
    // so the first minimise / restore animation is not lost
    try { o.setBounds(screen.getDisplayMatching(win.getBounds()).bounds); o.showInactive(); setTimeout(() => { try { if (!fxBusy) o.hide(); } catch(e){} res(o); }, 120); } catch(e){ res(o); } });
    o.loadFile("fx.html"); });
}
// hide the effect window (it stays ready for the next time)
function fxDrop(){ try { if (fx && !fx.isDestroyed()) fx.hide(); } catch(e){} }
const fxAsk = (ch, data, reply) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("fx timeout")), 900);
  ipcMain.once(reply, (_e, v) => { clearTimeout(t); res(v); }); fx.webContents.send(ch, data); });
function geom(){
  const b = win.getBounds(), d = screen.getDisplayMatching(b), wa = d.workArea, db = d.bounds;
  const bottom = wa.y + wa.height < db.y + db.height - 4 && wa.x === db.x && wa.width === db.width;
  if (!bottom) return null;
  const tx = iconX !== null && iconX >= db.x && iconX <= db.x + db.width ? iconX : wa.x + wa.width / 2;
  return { d, rect: { x: b.x - db.x, y: b.y - db.y, w: b.width, h: b.height }, to: { x: tx - db.x, y: wa.y + wa.height - db.y + (db.y + db.height - wa.y - wa.height) / 2 } };
}
// a lighter picture is enough for a 0.4 s animation (big screens: at most 1600 px wide)
async function snap(){ let img = await win.webContents.capturePage(); const z = img.getSize(); if (z.width > 1600) img = img.resize({ width: 1600, quality: "good" }); return "data:image/jpeg;base64," + img.toJPEG(80).toString("base64"); }
async function minimizeFx(){
  flog("minimizeFx called busy=" + fxBusy);
  if (fxBusy || !win || win.isDestroyed()) return; const g = win.isFullScreen() ? null : geom(); flog("geom", g && {rect:g.rect, to:g.to}); if (!g){ win.minimize(); return; }
  fxBusy = true;
  try {
    const [img, o] = await Promise.all([snap(), fxWindow()]); flog("min snap+fx ready, img kB", Math.round(img.length / 1024));
    o.setBounds(g.d.bounds); await fxAsk("fx-load", { img, rect: g.rect, to: g.to, dir: "min" }, "fx-ready"); flog("min fx-ready");
    o.showInactive(); await new Promise(r => setTimeout(r, 34)); win.setOpacity(0);
    await fxAsk("fx-go", null, "fx-done");
    flog("min anim done"); fxMin = true;
    // the effect window goes away completely BEFORE minimising — while it existed on top, Windows could treat the
    // program as the active one and a taskbar click then did nothing
    fxDrop(); win.minimize(); setTimeout(() => { try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch(e){} }, 120);
  } catch(e){ flog("min error", String(e && e.message)); try { win.setOpacity(1); if (fx) fx.hide(); } catch(x){} win.minimize(); }
  finally { fxBusy = false; }
}
async function restoreFx(){
  flog("restoreFx start");
  // the taskbar button was just clicked: the mouse is over it — remember where it is for the next minimise
  const c = screen.getCursorScreenPoint(), g0 = geom(); if (g0 && c.y >= g0.d.workArea.y + g0.d.workArea.height - 2){ iconX = c.x; try { fs.writeFileSync(fxPos(), JSON.stringify({ x: iconX })); } catch(e){} }
  const g = geom(); if (!g){ win.setOpacity(1); return; }
  fxBusy = true;
  try {
    const [img, o] = await Promise.all([snap(), fxWindow()]);
    o.setBounds(g.d.bounds); await fxAsk("fx-load", { img, rect: g.rect, to: g.to, dir: "restore" }, "fx-ready");
    o.showInactive(); await fxAsk("fx-go", null, "fx-done");
    flog("restore anim done"); win.setOpacity(1); setTimeout(fxDrop, 40);
  } catch(e){ flog("restore error", String(e && e.message)); win.setOpacity(1); try { if (fx) fx.hide(); } catch(x){} }
  finally { fxBusy = false; }
}
// window / taskbar icon follows the theme: dark logo for the dark theme, light logo for the light one
ipcMain.on("set-icon", (_e, th) => { if (win && !win.isDestroyed()) win.setIcon(path.join(__dirname, "build", th === "light" ? "icon-light.png" : "icon-dark.png")); });
ipcMain.on("win", (_e, act, o) => { if (!win || win.isDestroyed()) return;
  if (act === "close") win.close();
  else if (act === "min"){ if (o && o.fx === false) win.minimize(); else minimizeFx(); }
  else if (act === "full") win.setFullScreen(!win.isFullScreen());
  else if (act === "max") win.isMaximized() ? win.unmaximize() : win.maximize();
});
app.whenReady().then(() => { Menu.setApplicationMenu(null); const p = splashPrefs(); if (p.on) createSplash(p); createWindow(); });
app.on("window-all-closed", () => app.quit());

ipcMain.handle("save-file", async (_e, { name, data, filters }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, data, "utf8");
  return r.filePath;
});
ipcMain.handle("open-file", async (_e, { filters }) => {
  const r = await dialog.showOpenDialog(win, { properties: ["openFile"], filters });
  if (r.canceled || !r.filePaths.length) return null;
  return { name: path.basename(r.filePaths[0]), data: fs.readFileSync(r.filePaths[0], "utf8") };
});
ipcMain.handle("open-image", async () => {
  const r = await dialog.showOpenDialog(win, { properties: ["openFile"], filters: [{ name: "Image / PDF", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "pdf"] }] });
  if (r.canceled || !r.filePaths.length) return null;
  const f = r.filePaths[0], ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : ext === "pdf" ? "application/pdf" : "image/" + ext;
  return "data:" + mime + ";base64," + fs.readFileSync(f).toString("base64");
});
ipcMain.handle("save-binary", async (_e, { name, base64, filters }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, Buffer.from(base64, "base64"));
  return r.filePath;
});
ipcMain.handle("save-pdf", async (_e, { name, pageSize, landscape }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (r.canceled || !r.filePath) return false;
  // The page sets @page {size; margin} itself, so the CSS page size wins; pageSize is the fallback.
  const buf = await win.webContents.printToPDF({ landscape: landscape !== false, pageSize: pageSize || "A3", printBackground: true, preferCSSPageSize: true,
    margins: { marginType: "custom", top: 0.31, bottom: 0.31, left: 0.31, right: 0.31 } });
  fs.writeFileSync(r.filePath, buf);
  shell.openPath(r.filePath);
  return r.filePath;
});
