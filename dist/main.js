"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const robotjs_1 = __importDefault(require("robotjs"));
const keyState = new Map();
let isActive = false;
let invertY = false;
let lastButtonY = false;
let middleClickHeld = false;
let altHeld = false;
const ensureKey = (key, pressed) => {
    const current = keyState.get(key) ?? false;
    if (current !== pressed) {
        robotjs_1.default.keyToggle(key, pressed ? "down" : "up");
        keyState.set(key, pressed);
    }
};
const releaseAllKeys = () => {
    for (const [key, pressed] of keyState.entries()) {
        if (pressed) {
            robotjs_1.default.keyToggle(key, "up");
            keyState.set(key, false);
        }
    }
    if (middleClickHeld) {
        robotjs_1.default.mouseToggle("up", "middle");
        middleClickHeld = false;
    }
    if (altHeld) {
        robotjs_1.default.keyToggle("alt", "up");
        altHeld = false;
    }
};
const applyInput = (input) => {
    if (!isActive) {
        releaseAllKeys();
        return;
    }
    // Handle Y-axis inversion toggle
    if (input.buttonY && !lastButtonY) {
        invertY = !invertY;
    }
    lastButtonY = input.buttonY;
    const deadzone = Math.max(0, Math.min(input.deadzone, 0.5));
    const sensitivity = Math.max(0.1, Math.min(input.sensitivity, 5));
    const applyStickDeadzone = (val) => {
        if (Math.abs(val) < deadzone)
            return 0;
        const sign = val > 0 ? 1 : -1;
        return sign * ((Math.abs(val) - deadzone) / (1 - deadzone));
    };
    const leftX = applyStickDeadzone(input.leftX);
    const leftY = applyStickDeadzone(input.leftY);
    const rightX = applyStickDeadzone(input.rightX);
    const rightY = applyStickDeadzone(input.rightY);
    // Mouse Look (Left Stick)
    if (leftX !== 0 || leftY !== 0) {
        const dx = Math.round(leftX * sensitivity * 10);
        const dy = Math.round((invertY ? -leftY : leftY) * sensitivity * 10);
        if (dx !== 0 || dy !== 0) {
            const mouse = robotjs_1.default.getMousePos();
            robotjs_1.default.moveMouse(mouse.x + dx, mouse.y + dy);
        }
    }
    // Mouse Pan (Right Stick + Alt + Middle Click)
    const rightActive = rightX !== 0 || rightY !== 0;
    if (rightActive) {
        if (!altHeld) {
            robotjs_1.default.keyToggle("alt", "down");
            altHeld = true;
        }
        if (!middleClickHeld) {
            robotjs_1.default.mouseToggle("down", "middle");
            middleClickHeld = true;
        }
        const dx = Math.round(rightX * sensitivity * 10);
        const dy = Math.round((invertY ? -rightY : rightY) * sensitivity * 10);
        if (dx !== 0 || dy !== 0) {
            const mouse = robotjs_1.default.getMousePos();
            robotjs_1.default.moveMouse(mouse.x + dx, mouse.y + dy);
        }
    }
    else {
        // Only release if Button A is not also holding it
        if (altHeld) {
            robotjs_1.default.keyToggle("alt", "up");
            altHeld = false;
        }
        if (middleClickHeld && !input.buttonA) {
            robotjs_1.default.mouseToggle("up", "middle");
            middleClickHeld = false;
        }
    }
    // D-Pad (Arrow Keys)
    ensureKey("up", input.dpadY < 0);
    ensureKey("down", input.dpadY > 0);
    ensureKey("left", input.dpadX < 0);
    ensureKey("right", input.dpadX > 0);
    // Triggers (PageUp / PageDown)
    ensureKey("pageup", input.leftTrigger > 0.3);
    ensureKey("pagedown", input.rightTrigger > 0.3);
    // Button A (Middle Click)
    if (input.buttonA && !middleClickHeld) {
        robotjs_1.default.mouseToggle("down", "middle");
        middleClickHeld = true;
    }
    else if (!input.buttonA && middleClickHeld && !rightActive) {
        robotjs_1.default.mouseToggle("up", "middle");
        middleClickHeld = false;
    }
};
const createWindow = () => {
    const mainWindow = new electron_1.BrowserWindow({
        width: 520,
        height: 520,
        resizable: false,
        webPreferences: {
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    mainWindow.loadFile(path_1.default.join(__dirname, "index.html"));
};
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.ipcMain.on("camera-input", (_event, input) => {
    applyInput(input);
});
electron_1.ipcMain.on("camera-active", (_event, active) => {
    isActive = active;
    if (!isActive) {
        releaseAllKeys();
    }
});
