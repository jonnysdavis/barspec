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
  sensitivity: number;
  deadzone: number;
}

const statusEl = document.querySelector("[data-status]") as HTMLElement;
const padEl = document.querySelector("[data-pad]") as HTMLElement;
const padSelect = document.querySelector("[data-pad-select]") as HTMLSelectElement;
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
let selectedPadIndex = -1;

const updateLabels = () => {
  sensitivityValue.textContent = Number(sensitivityEl.value).toFixed(2);
  deadzoneValue.textContent = Number(deadzoneEl.value).toFixed(2);
};

const setActive = (active: boolean) => {
  isActive = active;
  activeBtn.textContent = isActive ? "Stop camera control" : "Start camera control";
  statusEl.textContent = isActive
    ? "Remapping controller input to mouse + keys"
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

const pollGamepad = () => {
  const pads = navigator.getGamepads();
  const connected = Array.from(pads).filter(
    (pad): pad is Gamepad => Boolean(pad && pad.connected)
  );

  if (padSelect.options.length !== connected.length + 1) {
    padSelect.innerHTML = "";
    const autoOption = document.createElement("option");
    autoOption.value = "-1";
    autoOption.textContent = "Auto (first connected)";
    padSelect.append(autoOption);
    connected.forEach((pad) => {
      const option = document.createElement("option");
      option.value = String(pad.index);
      option.textContent = `${pad.index + 1}: ${pad.id}`;
      padSelect.append(option);
    });
  }

  const gamepad =
    selectedPadIndex >= 0
      ? connected.find((pad) => pad.index === selectedPadIndex)
      : connected[0];

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

padSelect.addEventListener("change", () => {
  selectedPadIndex = Number(padSelect.value);
});

requestAnimationFrame(pollGamepad);
