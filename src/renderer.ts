export {};

type Action =
  | "left_click"
  | "right_click"
  | "middle_click"
  | "zoom_in_wheel"
  | "zoom_out_wheel"
  | "zoom_in_pgup"
  | "zoom_out_pgdn"
  | "arrow_up"
  | "arrow_down"
  | "arrow_left"
  | "arrow_right"
  | "toggle_stick_mode"
  | "none";

type StickAction = "mouse_move" | "mouse_pan" | "arrow_move" | "none";

interface GamepadState {
  axes: number[];
  buttons: boolean[];
}

interface MappingConfig {
  sensitivity: number;
  deadzone: number;
  leftStickAction: StickAction;
  rightStickAction: StickAction;
  buttonMappings: Action[];
}

type BarspecBridge = {
  sendInput: (input: GamepadState) => void;
  setActive: (active: boolean) => void;
  getConfig: () => void;
  saveConfig: (config: MappingConfig) => void;
  onConfigLoaded: (callback: (config: MappingConfig) => void) => void;
};

declare global {
  interface Window {
    barspec: BarspecBridge;
  }
}

const statusEl = document.querySelector("[data-status]") as HTMLElement;
const padEl = document.querySelector("[data-pad]") as HTMLElement;
const activeBtn = document.querySelector("[data-active]") as HTMLButtonElement;
const sensitivityEl = document.querySelector("[data-sensitivity]") as HTMLInputElement;
const deadzoneEl = document.querySelector("[data-deadzone]") as HTMLInputElement;
const sensitivityValue = document.querySelector("[data-sensitivity-value]") as HTMLElement;
const deadzoneValue = document.querySelector("[data-deadzone-value]") as HTMLElement;

const actionNames: Record<Action, string> = {
  left_click: "Left Click",
  right_click: "Right Click",
  middle_click: "Middle Click",
  zoom_in_wheel: "Wheel Up",
  zoom_out_wheel: "Wheel Down",
  zoom_in_pgup: "Page Up",
  zoom_out_pgdn: "Page Down",
  arrow_up: "Arrow Up",
  arrow_down: "Arrow Down",
  arrow_left: "Arrow Left",
  arrow_right: "Arrow Right",
  toggle_stick_mode: "Toggle Mode",
  none: "None",
};

const stickActionNames: Record<StickAction, string> = {
  mouse_move: "Mouse",
  mouse_pan: "Pan (Alt+Mid)",
  arrow_move: "Arrows",
  none: "None",
};

let isActive = false;
let lastStartPressed = false;
let currentConfig: MappingConfig | null = null;

const setActive = (active: boolean) => {
  isActive = active;
  activeBtn.textContent = isActive ? "Stop camera control" : "Start camera control";
  activeBtn.classList.toggle("active", isActive);
  statusEl.textContent = isActive ? "Active" : "Idle";
  window.barspec.setActive(isActive);
};

activeBtn.addEventListener("click", () => {
  setActive(!isActive);
});

const updateConfigFromUI = () => {
  if (!currentConfig) return;
  currentConfig.sensitivity = parseFloat(sensitivityEl.value);
  currentConfig.deadzone = parseFloat(deadzoneEl.value);
  sensitivityValue.textContent = currentConfig.sensitivity.toFixed(2);
  deadzoneValue.textContent = currentConfig.deadzone.toFixed(2);
  window.barspec.saveConfig(currentConfig);
};

[sensitivityEl, deadzoneEl].forEach((el) =>
  el.addEventListener("input", updateConfigFromUI)
);

const updateLabels = () => {
  if (!currentConfig) return;

  currentConfig.buttonMappings.forEach((action, i) => {
    const label = document.querySelector(`[data-label="${i}"]`);
    if (label) label.textContent = actionNames[action];
  });

  const leftLabel = document.querySelector(`[data-label="ls"]`);
  if (leftLabel) leftLabel.textContent = stickActionNames[currentConfig.leftStickAction];

  const rightLabel = document.querySelector(`[data-label="rs"]`);
  if (rightLabel) rightLabel.textContent = stickActionNames[currentConfig.rightStickAction];
};

window.barspec.onConfigLoaded((config) => {
  currentConfig = config;
  sensitivityEl.value = config.sensitivity.toString();
  deadzoneEl.value = config.deadzone.toString();
  sensitivityValue.textContent = config.sensitivity.toFixed(2);
  deadzoneValue.textContent = config.deadzone.toFixed(2);
  updateLabels();
  setupConfigUI();
});

window.barspec.getConfig();

const setupConfigUI = () => {
  if (!currentConfig) return;

  const configList = document.querySelector("[data-config-list]") as HTMLElement;
  if (!configList) return;
  configList.innerHTML = "";

  // Add Left Stick config
  addStickConfig(configList, "Left Stick", "leftStickAction", currentConfig.leftStickAction);
  // Add Right Stick config
  addStickConfig(configList, "Right Stick", "rightStickAction", currentConfig.rightStickAction);

  // Add Button configs
  const buttonNames = ["A", "B", "X", "Y", "L1", "R1", "L2", "R2", "Select", "Start", "L3", "R3", "Up", "Down", "Left", "Right"];
  currentConfig.buttonMappings.forEach((action, i) => {
    if (i < buttonNames.length) {
      addButtonConfig(configList, buttonNames[i], i, action);
    }
  });
};

const addStickConfig = (container: HTMLElement, name: string, key: "leftStickAction" | "rightStickAction", current: StickAction) => {
  const row = document.createElement("div");
  row.className = "config-row";
  row.innerHTML = `
    <span>${name}</span>
    <select>
      ${Object.entries(stickActionNames).map(([val, label]) => `<option value="${val}" ${val === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
  const select = row.querySelector("select") as HTMLSelectElement;
  select.addEventListener("change", () => {
    if (currentConfig) {
      currentConfig[key] = select.value as StickAction;
      window.barspec.saveConfig(currentConfig);
      updateLabels();
    }
  });
  container.appendChild(row);
};

const addButtonConfig = (container: HTMLElement, name: string, index: number, current: Action) => {
  const row = document.createElement("div");
  row.className = "config-row";
  row.innerHTML = `
    <span>Button ${name}</span>
    <select>
      ${Object.entries(actionNames).map(([val, label]) => `<option value="${val}" ${val === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
  const select = row.querySelector("select") as HTMLSelectElement;
  select.addEventListener("change", () => {
    if (currentConfig) {
      currentConfig.buttonMappings[index] = select.value as Action;
      window.barspec.saveConfig(currentConfig);
      updateLabels();
    }
  });
  container.appendChild(row);
};

const pollGamepad = () => {
  const pads = navigator.getGamepads();
  const gamepad = Array.from(pads).find((p) => p !== null);

  if (!gamepad) {
    padEl.textContent = "No gamepad detected (Press a button)";
    requestAnimationFrame(pollGamepad);
    return;
  }

  padEl.textContent = `${gamepad.id}`;

  const startPressed = gamepad.buttons[9]?.pressed ?? false;
  if (startPressed && !lastStartPressed) {
    setActive(!isActive);
  }
  lastStartPressed = startPressed;

  if (isActive) {
    const state: GamepadState = {
      axes: Array.from(gamepad.axes),
      buttons: gamepad.buttons.map((b) => b.pressed),
    };
    window.barspec.sendInput(state);
  }

  // Update visual feedback
  gamepad.buttons.forEach((btn, i) => {
    const el = document.querySelector(`[data-button="${i}"]`);
    if (el) el.classList.toggle("pressed", btn.pressed);
  });
  // Sticks feedback
  const ls = document.querySelector(`[data-stick="ls"]`) as HTMLElement;
  if (ls) {
    const lx = gamepad.axes[0] * 10;
    const ly = gamepad.axes[1] * 10;
    ls.style.transform = `translate(${lx}px, ${ly}px)`;
  }
  const rs = document.querySelector(`[data-stick="rs"]`) as HTMLElement;
  if (rs) {
    const rx = gamepad.axes[2] * 10;
    const ry = gamepad.axes[3] * 10;
    rs.style.transform = `translate(${rx}px, ${ry}px)`;
  }

  requestAnimationFrame(pollGamepad);
};

requestAnimationFrame(pollGamepad);
