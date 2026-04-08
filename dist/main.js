"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const robotjs_1 = __importDefault(require("robotjs"));
const types_1 = require("./types");
const CONFIG_PATH = path_1.default.join(electron_1.app.getPath("userData"), "config.json");
let config = { ...types_1.DEFAULT_CONFIG };
let isActive = false;
let leftStickMode = "mouse";
let lastButtons = [];
const heldKeys = new Set();
const heldMouseButtons = new Set();
let isPanning = false;
const loadConfig = () => {
    try {
        if (fs_1.default.existsSync(CONFIG_PATH)) {
            const data = fs_1.default.readFileSync(CONFIG_PATH, "utf-8");
            const savedConfig = JSON.parse(data);
            config = { ...types_1.DEFAULT_CONFIG, ...savedConfig };
            console.log("Config loaded from", CONFIG_PATH);
        }
    }
    catch (err) {
        console.error("Failed to load config:", err);
    }
};
const saveConfig = () => {
    try {
        fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log("Config saved to", CONFIG_PATH);
    }
    catch (err) {
        console.error("Failed to save config:", err);
    }
};
const toggleKey = (key, down) => {
    if (down) {
        if (!heldKeys.has(key)) {
            robotjs_1.default.keyToggle(key, "down");
            heldKeys.add(key);
        }
    }
    else {
        if (heldKeys.has(key)) {
            robotjs_1.default.keyToggle(key, "up");
            heldKeys.delete(key);
        }
    }
};
const toggleMouseButton = (button, down) => {
    if (down) {
        if (!heldMouseButtons.has(button)) {
            robotjs_1.default.mouseToggle("down", button);
            heldMouseButtons.add(button);
        }
    }
    else {
        if (heldMouseButtons.has(button)) {
            robotjs_1.default.mouseToggle("up", button);
            heldMouseButtons.delete(button);
        }
    }
};
const releaseAllInputs = () => {
    for (const key of heldKeys) {
        robotjs_1.default.keyToggle(key, "up");
    }
    heldKeys.clear();
    for (const btn of heldMouseButtons) {
        robotjs_1.default.mouseToggle("up", btn);
    }
    heldMouseButtons.clear();
    isPanning = false;
};
const applyStick = (x, y, action) => {
    if (action === "none")
        return;
    const deadzone = config.deadzone;
    const sensitivity = config.sensitivity;
    const processAxis = (val) => {
        if (Math.abs(val) < deadzone)
            return 0;
        const sign = val > 0 ? 1 : -1;
        return sign * ((Math.abs(val) - deadzone) / (1 - deadzone));
    };
    const nx = processAxis(x);
    const ny = processAxis(y);
    if (nx === 0 && ny === 0) {
        if (action === "mouse_pan" && isPanning) {
            toggleMouseButton("middle", false);
            toggleKey("alt", false);
            isPanning = false;
        }
        if (action === "arrow_move") {
            toggleKey("up", false);
            toggleKey("down", false);
            toggleKey("left", false);
            toggleKey("right", false);
        }
        return;
    }
    if (action === "mouse_move" || action === "mouse_pan") {
        if (action === "mouse_pan" && !isPanning) {
            toggleKey("alt", true);
            toggleMouseButton("middle", true);
            isPanning = true;
        }
        const dx = Math.round(nx * sensitivity * 15);
        const dy = Math.round(ny * sensitivity * 15);
        if (dx !== 0 || dy !== 0) {
            const pos = robotjs_1.default.getMousePos();
            robotjs_1.default.moveMouse(pos.x + dx, pos.y + dy);
        }
    }
    else if (action === "arrow_move") {
        toggleKey("up", ny < -0.5);
        toggleKey("down", ny > 0.5);
        toggleKey("left", nx < -0.5);
        toggleKey("right", nx > 0.5);
    }
};
const applyInput = (state) => {
    if (!isActive) {
        releaseAllInputs();
        return;
    }
    // Handle Buttons
    state.buttons.forEach((pressed, index) => {
        const wasPressed = lastButtons[index] || false;
        const action = config.buttonMappings[index];
        if (!action || action === "none")
            return;
        if (pressed && !wasPressed) {
            // Button Down Event
            switch (action) {
                case "left_click":
                    toggleMouseButton("left", true);
                    break;
                case "right_click":
                    toggleMouseButton("right", true);
                    break;
                case "middle_click":
                    toggleMouseButton("middle", true);
                    break;
                case "zoom_in_wheel":
                    robotjs_1.default.scrollMouse(0, -1);
                    break; // robotjs scroll is (x, y), y < 0 is up/zoom in
                case "zoom_out_wheel":
                    robotjs_1.default.scrollMouse(0, 1);
                    break;
                case "zoom_in_pgup":
                    toggleKey("pageup", true);
                    break;
                case "zoom_out_pgdn":
                    toggleKey("pagedown", true);
                    break;
                case "arrow_up":
                    toggleKey("up", true);
                    break;
                case "arrow_down":
                    toggleKey("down", true);
                    break;
                case "arrow_left":
                    toggleKey("left", true);
                    break;
                case "arrow_right":
                    toggleKey("right", true);
                    break;
                case "toggle_stick_mode":
                    leftStickMode = leftStickMode === "mouse" ? "arrows" : "mouse";
                    break;
            }
        }
        else if (!pressed && wasPressed) {
            // Button Up Event
            switch (action) {
                case "left_click":
                    toggleMouseButton("left", false);
                    break;
                case "right_click":
                    toggleMouseButton("right", false);
                    break;
                case "middle_click":
                    toggleMouseButton("middle", false);
                    break;
                case "zoom_in_pgup":
                    toggleKey("pageup", false);
                    break;
                case "zoom_out_pgdn":
                    toggleKey("pagedown", false);
                    break;
                case "arrow_up":
                    toggleKey("up", false);
                    break;
                case "arrow_down":
                    toggleKey("down", false);
                    break;
                case "arrow_left":
                    toggleKey("left", false);
                    break;
                case "arrow_right":
                    toggleKey("right", false);
                    break;
            }
        }
    });
    lastButtons = [...state.buttons];
    // Handle Sticks
    const leftX = state.axes[0] || 0;
    const leftY = state.axes[1] || 0;
    const rightX = state.axes[2] || 0;
    const rightY = state.axes[3] || 0;
    const currentLeftAction = leftStickMode === "mouse" ? config.leftStickAction : "arrow_move";
    applyStick(leftX, leftY, currentLeftAction);
    applyStick(rightX, rightY, config.rightStickAction);
};
const createWindow = () => {
    const mainWindow = new electron_1.BrowserWindow({
        width: 900,
        height: 800,
        resizable: true,
        webPreferences: {
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    mainWindow.loadFile(path_1.default.join(__dirname, "index.html"));
};
electron_1.app.whenReady().then(() => {
    loadConfig();
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
electron_1.ipcMain.on("get-config", (event) => {
    event.reply("config-loaded", config);
});
electron_1.ipcMain.on("save-config", (_event, newConfig) => {
    config = newConfig;
    saveConfig();
});
electron_1.ipcMain.on("camera-active", (_event, active) => {
    isActive = active;
    if (!isActive) {
        releaseAllInputs();
    }
});
electron_1.ipcMain.on("camera-input", (_event, input) => {
    applyInput(input);
});
