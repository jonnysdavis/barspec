import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("barspec", {
  sendInput: (input: unknown) => ipcRenderer.send("camera-input", input),
  setActive: (active: boolean) => ipcRenderer.send("camera-active", active),
});
