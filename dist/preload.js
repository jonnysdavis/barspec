"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("barspec", {
    sendInput: (input) => electron_1.ipcRenderer.send("camera-input", input),
    setActive: (active) => electron_1.ipcRenderer.send("camera-active", active),
});
