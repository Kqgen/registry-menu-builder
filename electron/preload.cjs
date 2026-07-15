const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tweakForge", {
  saveText: (request) => ipcRenderer.invoke("save-text", request),
  copyText: (content) => ipcRenderer.invoke("copy-text", content),
});
