/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Safe bridge between the page and the main process (files and PDF only).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("appBridge", {
  saveFile: o => ipcRenderer.invoke("save-file", o),
  openFile: o => ipcRenderer.invoke("open-file", o),
  openImage: () => ipcRenderer.invoke("open-image"),
  saveBinary: o => ipcRenderer.invoke("save-binary", o),
  savePdf: o => ipcRenderer.invoke("save-pdf", o),
  // own title bar: close / minimise (with or without the effect) / full screen / maximise; window state for the buttons
  win: { act: (a, o) => ipcRenderer.send("win", a, o), onState: cb => ipcRenderer.on("win-state", (_e, s) => cb(s)) }
});
