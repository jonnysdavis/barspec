import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import robot from "robotjs";
import { GamepadState, MappingConfig, DEFAULT_CONFIG, Action, StickAction } from "./types";

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

let config: MappingConfig = { ...DEFAULT_CONFIG };
let isActive = false;
let leftStickMode: "mouse" | "arrows" = "mouse";
let lastButtons: boolean[] = [];

const heldKeys = new Set<string>();
const heldMouseButtons = new Set<string>();
let isPanning = false;

const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      const savedConfig = JSON.parse(data);
      config = { ...DEFAULT_CONFIG, ...savedConfig };
      console.log("Config loaded from", CONFIG_PATH);
    }
  } catch (err) {
    console.error("Failed to load config:", err);
  }
};

const saveConfig = () => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("Config saved to", CONFIG_PATH);
  } catch (err) {
    console.error("Failed to save config:", err);
  }
};

const toggleKey = (key: string, down: boolean) => {
  if (down) {
    if (!heldKeys.has(key)) {
      robot.keyToggle(key, "down");
      heldKeys.add(key);
    }
  } else {
    if (heldKeys.has(key)) {
      robot.keyToggle(key, "up");
      heldKeys.delete(key);
    }
  }
};

const toggleMouseButton = (button: string, down: boolean) => {
  if (down) {
    if (!heldMouseButtons.has(button)) {
      robot.mouseToggle("down", button as any);
      heldMouseButtons.add(button);
    }
  } else {
    if (heldMouseButtons.has(button)) {
      robot.mouseToggle("up", button as any);
      heldMouseButtons.delete(button);
    }
  }
};

const releaseAllInputs = () => {
  for (const key of heldKeys) {
    robot.keyToggle(key, "up");
  }
  heldKeys.clear();
  for (const btn of heldMouseButtons) {
    robot.mouseToggle("up", btn as any);
  }
  heldMouseButtons.clear();
  isPanning = false;
};

const applyStick = (x: number, y: number, action: StickAction) => {
  if (action === "none") return;

  const deadzone = config.deadzone;
  const sensitivity = config.sensitivity;

  const processAxis = (val: number) => {
    if (Math.abs(val) < deadzone) return 0;
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
      const pos = robot.getMousePos();
      robot.moveMouse(pos.x + dx, pos.y + dy);
    }
  } else if (action === "arrow_move") {
    toggleKey("up", ny < -0.5);
    toggleKey("down", ny > 0.5);
    toggleKey("left", nx < -0.5);
    toggleKey("right", nx > 0.5);
  }
};

const applyInput = (state: GamepadState) => {
  if (!isActive) {
    releaseAllInputs();
    return;
  }

  // Handle Buttons
  state.buttons.forEach((pressed, index) => {
    const wasPressed = lastButtons[index] || false;
    const action = config.buttonMappings[index];

    if (!action || action === "none") return;

    if (pressed && !wasPressed) {
      // Button Down Event
      switch (action) {
        case "left_click": toggleMouseButton("left", true); break;
        case "right_click": toggleMouseButton("right", true); break;
        case "middle_click": toggleMouseButton("middle", true); break;
        case "zoom_in_wheel": robot.scrollMouse(0, -1); break; // robotjs scroll is (x, y), y < 0 is up/zoom in
        case "zoom_out_wheel": robot.scrollMouse(0, 1); break;
        case "zoom_in_pgup": toggleKey("pageup", true); break;
        case "zoom_out_pgdn": toggleKey("pagedown", true); break;
        case "arrow_up": toggleKey("up", true); break;
        case "arrow_down": toggleKey("down", true); break;
        case "arrow_left": toggleKey("left", true); break;
        case "arrow_right": toggleKey("right", true); break;
        case "toggle_stick_mode":
          leftStickMode = leftStickMode === "mouse" ? "arrows" : "mouse";
          break;
      }
    } else if (!pressed && wasPressed) {
      // Button Up Event
      switch (action) {
        case "left_click": toggleMouseButton("left", false); break;
        case "right_click": toggleMouseButton("right", false); break;
        case "middle_click": toggleMouseButton("middle", false); break;
        case "zoom_in_pgup": toggleKey("pageup", false); break;
        case "zoom_out_pgdn": toggleKey("pagedown", false); break;
        case "arrow_up": toggleKey("up", false); break;
        case "arrow_down": toggleKey("down", false); break;
        case "arrow_left": toggleKey("left", false); break;
        case "arrow_right": toggleKey("right", false); break;
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
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

app.whenReady().then(() => {
  loadConfig();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("get-config", (event) => {
  event.reply("config-loaded", config);
});

ipcMain.on("save-config", (_event, newConfig: MappingConfig) => {
  config = newConfig;
  saveConfig();
});

ipcMain.on("camera-active", (_event, active: boolean) => {
  isActive = active;
  if (!isActive) {
    releaseAllInputs();
  }
});

ipcMain.on("camera-input", (_event, input: GamepadState) => {
  applyInput(input);
});
