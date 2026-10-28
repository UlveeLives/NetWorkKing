// NetWorkKing — Electron main process (Windows desktop app).
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
if (!app.requestSingleInstanceLock()) app.quit();
// NetWorkKing keeps its data in its own folder. On the first start it copies the data of NetWorker 1.x / 2.x
// (the old folder is not changed, so the old version still opens with its own data).
try {
  const nu = app.getPath("userData"), old = path.join(app.getPath("appData"), "NetWorker");
  if (path.resolve(nu).toLowerCase() !== path.resolve(old).toLowerCase() && fs.existsSync(old) && !fs.existsSync(path.join(nu, "IndexedDB"))){
    fs.mkdirSync(nu, { recursive: true });
    for (const d of ["IndexedDB", "Local Storage"]) if (fs.existsSync(path.join(old, d))) fs.cpSync(path.join(old, d), path.join(nu, d), { recursive: true });
  }
} catch (e) { console.error("data copy", e); }
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1000, minHeight: 640,
    title: "NetWorkKing", backgroundColor: "#eef1f4", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.maximize();
  win.loadFile("index.html");
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
}
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
