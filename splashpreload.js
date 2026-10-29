/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Splash window bridge: wait until the program behind has loaded, then say the splash is done.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("splashBridge", {
  waitReady: () => ipcRenderer.invoke("splash-wait"),
  done: () => ipcRenderer.send("splash-done")
});
