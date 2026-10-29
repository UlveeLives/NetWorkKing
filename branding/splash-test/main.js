// NetWorkKing — splash screen test as a real frameless, transparent window (nothing else of the app is started).
// Run from the NetWorker-dev folder:  splash-test.bat   (or: npx electron branding\splash-test\main.js [light] [az|tr|en|ru])
const { app, BrowserWindow } = require("electron");
const path = require("path");
app.whenReady().then(() => {
  const card = process.argv.includes("card");
  const w = new BrowserWindow({ width: 760, height: 920, frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, show: false, backgroundColor: "#00000000", hasShadow: false, center: true });
  const lang = process.argv.find(a => /^(az|tr|en|ru)$/.test(a)) || "az", theme = process.argv.includes("light") ? "light" : "dark";
  w.loadFile(path.join(__dirname, "..", "..", "splash.html"), { search: `win=1&lang=${lang}&theme=${theme}` });
  w.once("ready-to-show", () => w.show());
  app.on("window-all-closed", () => app.quit());
  setTimeout(() => app.quit(), 30000);   // the page closes itself when the outro ends; this is only a safety net
});
