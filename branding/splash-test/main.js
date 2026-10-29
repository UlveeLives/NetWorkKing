// NetWorkKing — splash screen test as a real frameless, transparent window (nothing else of the app is started).
// Run from the NetWorker-dev folder:  splash-test.bat   (or: npx electron branding\splash-test\main.js [card])
const { app, BrowserWindow } = require("electron");
const path = require("path");
app.whenReady().then(() => {
  const card = process.argv.includes("card");
  const w = new BrowserWindow({ width: 420, height: 420, frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, show: false, backgroundColor: "#00000000", hasShadow: false, center: true });
  w.loadFile(path.join(__dirname, "splash.html"), { search: "win=1" + (card ? "&card=1" : "") });
  w.once("ready-to-show", () => w.show());
  setTimeout(() => app.quit(), 4800);
});
