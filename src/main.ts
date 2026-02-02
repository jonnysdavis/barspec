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
  sensitivity: number;
  deadzone: number;
}

const keyState = new Map<string, boolean>();
let isActive = false;

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
};

const applyInput = (input: CameraInput) => {
  if (!isActive) {
    releaseAllKeys();
    return;
  }

  const deadzone = Math.max(0, Math.min(input.deadzone, 0.5));
  const sensitivity = Math.max(0.1, Math.min(input.sensitivity, 3));

  const leftX = Math.abs(input.leftX) > deadzone ? input.leftX : 0;
  const leftY = Math.abs(input.leftY) > deadzone ? input.leftY : 0;
  const rightX = Math.abs(input.rightX) > deadzone ? input.rightX : 0;
  const rightY = Math.abs(input.rightY) > deadzone ? input.rightY : 0;

  ensureKey("a", leftX < -deadzone);
  ensureKey("d", leftX > deadzone);
  ensureKey("w", leftY < -deadzone);
  ensureKey("s", leftY > deadzone);

  ensureKey("up", rightY < -deadzone);
  ensureKey("down", rightY > deadzone);

  if (rightX !== 0 || rightY !== 0) {
    const mouseSpeed = 12 * sensitivity;
    const { x, y } = robot.getMousePos();
    const nextX = Math.round(x + rightX * mouseSpeed);
    const nextY = Math.round(y + rightY * mouseSpeed);
    robot.moveMouse(nextX, nextY);
  }

  const triggerDelta = input.rightTrigger - input.leftTrigger;
  const wheelAmount = Math.round(triggerDelta * 60 * sensitivity);
  if (wheelAmount !== 0) {
    robot.scrollMouse(0, wheelAmount);
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
