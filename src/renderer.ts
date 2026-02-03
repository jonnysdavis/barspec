export {};

type BarspecBridge = {
  sendInput: (input: CameraInput) => void;
  setActive: (active: boolean) => void;
};

declare global {
  interface Window {
    barspec: BarspecBridge;
  }
}

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

const statusEl = document.querySelector("[data-status]") as HTMLElement;
const padEl = document.querySelector("[data-pad]") as HTMLElement;
const activeBtn = document.querySelector("[data-active]") as HTMLButtonElement;
const sensitivityEl = document.querySelector(
  "[data-sensitivity]"
) as HTMLInputElement;
const deadzoneEl = document.querySelector("[data-deadzone]") as HTMLInputElement;
const sensitivityValue = document.querySelector(
  "[data-sensitivity-value]"
) as HTMLElement;
const deadzoneValue = document.querySelector(
  "[data-deadzone-value]"
) as HTMLElement;

let isActive = false;
let lastStartPressed = false;

const updateLabels = () => {
  sensitivityValue.textContent = Number(sensitivityEl.value).toFixed(2);
  deadzoneValue.textContent = Number(deadzoneEl.value).toFixed(2);
};

const setActive = (active: boolean) => {
  isActive = active;
  activeBtn.textContent = isActive ? "Stop camera control" : "Start camera control";
  statusEl.textContent = isActive
    ? "Sending input to Beyond All Reason"
    : "Idle";
  window.barspec.setActive(isActive);
};

activeBtn.addEventListener("click", () => {
  setActive(!isActive);
});

[sensitivityEl, deadzoneEl].forEach((el) =>
  el.addEventListener("input", updateLabels)
);

updateLabels();
setActive(false);

const readTriggers = (gamepad: Gamepad) => {
  const leftTrigger = gamepad.buttons[6]?.value ?? 0;
  const rightTrigger = gamepad.buttons[7]?.value ?? 0;
  return { leftTrigger, rightTrigger };
};

const readDpad = (gamepad: Gamepad) => {
  let x = 0;
  let y = 0;
  if (gamepad.buttons[12]?.pressed) y -= 1; // Up
  if (gamepad.buttons[13]?.pressed) y += 1; // Down
  if (gamepad.buttons[14]?.pressed) x -= 1; // Left
  if (gamepad.buttons[15]?.pressed) x += 1; // Right
  return { dpadX: x, dpadY: y };
};

const pollGamepad = () => {
  const pads = navigator.getGamepads();
  const gamepad = pads[0];

  if (!gamepad) {
    padEl.textContent = "No gamepad detected";
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
    const input: CameraInput = {
      leftX: gamepad.axes[0] ?? 0,
      leftY: gamepad.axes[1] ?? 0,
      rightX: gamepad.axes[2] ?? 0,
      rightY: gamepad.axes[3] ?? 0,
      ...readTriggers(gamepad),
      ...readDpad(gamepad),
      buttonA: gamepad.buttons[0]?.pressed ?? false,
      buttonY: gamepad.buttons[3]?.pressed ?? false,
      sensitivity: Number(sensitivityEl.value),
      deadzone: Number(deadzoneEl.value),
    };
    window.barspec.sendInput(input);
  }

  requestAnimationFrame(pollGamepad);
};

window.addEventListener("gamepadconnected", () => {
  padEl.textContent = "Gamepad connected";
});

requestAnimationFrame(pollGamepad);
