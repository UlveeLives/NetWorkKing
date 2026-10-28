// Safe bridge between the page and the main process (files and PDF only).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("appBridge", {
  saveFile: o => ipcRenderer.invoke("save-file", o),
  openFile: o => ipcRenderer.invoke("open-file", o),
  openImage: () => ipcRenderer.invoke("open-image"),
  saveBinary: o => ipcRenderer.invoke("save-binary", o),
  savePdf: o => ipcRenderer.invoke("save-pdf", o)
});
