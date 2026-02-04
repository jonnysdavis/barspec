import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("barspec", {
  sendInput: (input: any) => ipcRenderer.send("camera-input", input),
  setActive: (active: boolean) => ipcRenderer.send("camera-active", active),
  getConfig: () => ipcRenderer.send("get-config"),
  saveConfig: (config: any) => ipcRenderer.send("save-config", config),
  onConfigLoaded: (callback: any) =>
    ipcRenderer.on("config-loaded", (_event, config) => callback(config)),
});
