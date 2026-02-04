"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("barspec", {
    sendInput: (input) => electron_1.ipcRenderer.send("camera-input", input),
    setActive: (active) => electron_1.ipcRenderer.send("camera-active", active),
    getConfig: () => electron_1.ipcRenderer.send("get-config"),
    saveConfig: (config) => electron_1.ipcRenderer.send("save-config", config),
    onConfigLoaded: (callback) => electron_1.ipcRenderer.on("config-loaded", (_event, config) => callback(config)),
});
