import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import robot from "robotjs";

interface CameraInput {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  leftTrigger: number;
  rightTrigger: number;
  buttonA: boolean;
  buttonY: boolean;
  dpadX: number;
  dpadY: number;
  sensitivity: number;
  deadzone: number;
}

const keyState = new Map<string, boolean>();
let isActive = false;
let invertY = false;
let lastButtonY = false;
let middleClickHeld = false;
let altHeld = false;

const ensureKey = (key: string, pressed: boolean) => {
  const current = keyState.get(key) ?? false;
  if (current !== pressed) {
    robot.keyToggle(key, pressed ? "down" : "up");
    keyState.set(key, pressed);
  }
};

const releaseAllKeys = () => {
  for (const [key, pressed] of keyState.entries()) {
    if (pressed) {
      robot.keyToggle(key, "up");
      keyState.set(key, false);
    }
  }
  if (middleClickHeld) {
    robot.mouseToggle("up", "middle");
    middleClickHeld = false;
  }
  if (altHeld) {
    robot.keyToggle("alt", "up");
    altHeld = false;
  }
};

const applyInput = (input: CameraInput) => {
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

  const applyStickDeadzone = (val: number) => {
    if (Math.abs(val) < deadzone) return 0;
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
      const mouse = robot.getMousePos();
      robot.moveMouse(mouse.x + dx, mouse.y + dy);
    }
  }

  // Mouse Pan (Right Stick + Alt + Middle Click)
  const rightActive = rightX !== 0 || rightY !== 0;
  if (rightActive) {
    if (!altHeld) {
      robot.keyToggle("alt", "down");
      altHeld = true;
    }
    if (!middleClickHeld) {
      robot.mouseToggle("down", "middle");
      middleClickHeld = true;
    }
    const dx = Math.round(rightX * sensitivity * 10);
    const dy = Math.round((invertY ? -rightY : rightY) * sensitivity * 10);
    if (dx !== 0 || dy !== 0) {
      const mouse = robot.getMousePos();
      robot.moveMouse(mouse.x + dx, mouse.y + dy);
    }
  } else {
    // Only release if Button A is not also holding it
    if (altHeld) {
      robot.keyToggle("alt", "up");
      altHeld = false;
    }
    if (middleClickHeld && !input.buttonA) {
      robot.mouseToggle("up", "middle");
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
    robot.mouseToggle("down", "middle");
    middleClickHeld = true;
  } else if (!input.buttonA && middleClickHeld && !rightActive) {
    robot.mouseToggle("up", "middle");
    middleClickHeld = false;
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 520,
    height: 520,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

app.whenReady().then(() => {
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

ipcMain.on("camera-input", (_event, input: CameraInput) => {
  applyInput(input);
});

ipcMain.on("camera-active", (_event, active: boolean) => {
  isActive = active;
  if (!isActive) {
    releaseAllKeys();
  }
});
