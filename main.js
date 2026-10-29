/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// NetWorkKing — Electron main process (Windows desktop app).
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, screen } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
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
app.on("second-instance", () => { if (win && !win.isDestroyed()){ if (win.isMinimized()) win.restore(); win.show(); win.focus(); } else if (app.isReady()) createWindow(); });

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1000, minHeight: 640, frame: false,
    title: app.getName(), backgroundColor: "#0d2a1a", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon-dark.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.maximize();
  win.loadFile("index.html");
  // closing the app window ends the program — also the hidden window of the minimise effect, which would otherwise
  // keep the program running in the background
  win.on("closed", () => { win = null; if (fx && !fx.isDestroyed()) fx.destroy(); fx = null; app.quit(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
  // the page draws its own title bar (red / yellow / green buttons); it needs to know focus and full-screen state
  const st = () => { if (win && !win.isDestroyed()) win.webContents.send("win-state", { focused: win.isFocused(), full: win.isFullScreen(), max: win.isMaximized() }); };
  ["focus", "blur", "enter-full-screen", "leave-full-screen", "maximize", "unmaximize"].forEach(ev => win.on(ev, st));
  win.webContents.on("did-finish-load", st);
  win.on("restore", () => { if (fxMin){ fxMin = false;
    // never leave the window invisible: whatever happens, it is shown again after 1.5 s
    const guard = setTimeout(() => { try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch(e){} }, 1500);
    restoreFx().catch(() => {}).finally(() => { clearTimeout(guard); try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch(e){} }); } });
  // the effect window is made while the program starts, so the first minimise does not wait for it
  win.once("ready-to-show", () => setTimeout(() => fxWindow().catch(() => {}), 1200));
}
/* ---------- minimise / restore effect (like the macOS "genie") ----------
   The window is photographed, a transparent window over the whole screen plays the picture flowing into the
   taskbar, then the real window is minimised. On restore the same is played backwards. The app window itself stays a
   normal window (resizing, snapping and the taskbar keep working). If anything goes wrong it falls back to a plain
   minimise. Only when the taskbar is at the bottom of the screen; otherwise a plain minimise. */
let fx = null, fxBusy = false, fxMin = false, iconX = null;
function fxWindow(){
  if (fx && !fx.isDestroyed()) return Promise.resolve(fx);
  fx = new BrowserWindow({ frame: false, transparent: true, resizable: false, movable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true,
    show: false, hasShadow: false, backgroundColor: "#00000000", webPreferences: { preload: path.join(__dirname, "fxpreload.js"), contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  fx.setIgnoreMouseEvents(true);
  return new Promise(res => { fx.webContents.once("did-finish-load", () => res(fx)); fx.loadFile("fx.html"); });
}
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
  if (fxBusy || !win || win.isDestroyed()) return; const g = win.isFullScreen() ? null : geom(); if (!g){ win.minimize(); return; }
  fxBusy = true;
  try {
    const [img, o] = await Promise.all([snap(), fxWindow()]);
    o.setBounds(g.d.bounds); await fxAsk("fx-load", { img, rect: g.rect, to: g.to, dir: "min" }, "fx-ready");
    o.showInactive(); await new Promise(r => setTimeout(r, 34)); win.setOpacity(0);
    await fxAsk("fx-go", null, "fx-done");
    fxMin = true; win.minimize(); setTimeout(() => o.hide(), 60);
  } catch(e){ try { win.setOpacity(1); if (fx) fx.hide(); } catch(x){} win.minimize(); }
  finally { fxBusy = false; }
}
async function restoreFx(){
  // the taskbar button was just clicked: the mouse is over it — remember where it is for the next minimise
  const c = screen.getCursorScreenPoint(), g0 = geom(); if (g0 && c.y >= g0.d.workArea.y + g0.d.workArea.height - 2) iconX = c.x;
  const g = geom(); if (!g){ win.setOpacity(1); return; }
  fxBusy = true;
  try {
    const [img, o] = await Promise.all([snap(), fxWindow()]);
    o.setBounds(g.d.bounds); await fxAsk("fx-load", { img, rect: g.rect, to: g.to, dir: "restore" }, "fx-ready");
    o.showInactive(); await fxAsk("fx-go", null, "fx-done");
    win.setOpacity(1); setTimeout(() => o.hide(), 50);
  } catch(e){ win.setOpacity(1); try { if (fx) fx.hide(); } catch(x){} }
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
app.whenReady().then(() => { Menu.setApplicationMenu(null); createWindow(); });
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
