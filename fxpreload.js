/*! NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE. */
// Bridge for the minimise-effect window (fx.html): receives the picture, reports when it is ready / done.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("fxBridge", {
  on: (ch, cb) => { if (["fx-load", "fx-go"].includes(ch)) ipcRenderer.on(ch, (_e, d) => cb(d)); },
  send: ch => { if (["fx-ready", "fx-done"].includes(ch)) ipcRenderer.send(ch); }
});
