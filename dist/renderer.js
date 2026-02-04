"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const statusEl = document.querySelector("[data-status]");
const padEl = document.querySelector("[data-pad]");
const activeBtn = document.querySelector("[data-active]");
const sensitivityEl = document.querySelector("[data-sensitivity]");
const deadzoneEl = document.querySelector("[data-deadzone]");
const sensitivityValue = document.querySelector("[data-sensitivity-value]");
const deadzoneValue = document.querySelector("[data-deadzone-value]");
const debugInfoEl = document.querySelector("[data-debug-info]");
const appEl = document.querySelector(".app");
const actionNames = {
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
const stickActionNames = {
    mouse_move: "Mouse",
    mouse_pan: "Pan (Alt+Mid)",
    arrow_move: "Arrows",
    none: "None",
};
let isActive = false;
let lastStartPressed = false;
let currentConfig = null;
let selectedGamepadIndex = null;
// Environment Check
console.log("Renderer process starting...");
console.log("Protocol:", window.location.protocol);
console.log("Pathname:", window.location.pathname);
if (!window.barspec) {
    const warn = document.createElement("div");
    warn.className = "env-warning";
    let warnMsg = `
    <strong>⚠️ Running in Browser Mode</strong>
    <p>Barspec must be run as a desktop application to control your mouse and keyboard.
    Input injection is disabled in your web browser for security.</p>
  `;
    if (window.location.protocol === "file:" && window.location.pathname.includes("/src/")) {
        warnMsg += `
      <p style="color: #ef4444; margin-top: 10px;">
        <strong>Notice:</strong> You are opening <code>src/index.html</code>.
        This is the source directory and lacks the compiled JavaScript.
        Please run <code>npm start</code> in your terminal.
      </p>
    `;
    }
    warn.innerHTML = warnMsg;
    if (appEl)
        appEl.prepend(warn);
}
const setActive = (active) => {
    if (!window.barspec)
        return;
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
    if (!currentConfig || !window.barspec)
        return;
    currentConfig.sensitivity = parseFloat(sensitivityEl.value);
    currentConfig.deadzone = parseFloat(deadzoneEl.value);
    sensitivityValue.textContent = currentConfig.sensitivity.toFixed(2);
    deadzoneValue.textContent = currentConfig.deadzone.toFixed(2);
    window.barspec.saveConfig(currentConfig);
};
[sensitivityEl, deadzoneEl].forEach((el) => el.addEventListener("input", updateConfigFromUI));
const updateLabels = () => {
    if (!currentConfig)
        return;
    currentConfig.buttonMappings.forEach((action, i) => {
        const label = document.querySelector(`[data-label="${i}"]`);
        if (label)
            label.textContent = actionNames[action];
    });
    const leftLabel = document.querySelector(`[data-label="ls"]`);
    if (leftLabel)
        leftLabel.textContent = stickActionNames[currentConfig.leftStickAction];
    const rightLabel = document.querySelector(`[data-label="rs"]`);
    if (rightLabel)
        rightLabel.textContent = stickActionNames[currentConfig.rightStickAction];
};
if (window.barspec) {
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
}
else {
    // Mock config for browser preview
    currentConfig = {
        sensitivity: 1.0,
        deadzone: 0.15,
        leftStickAction: "mouse_move",
        rightStickAction: "mouse_pan",
        buttonMappings: Array(16).fill("none")
    };
    updateLabels();
    setupConfigUI();
}
function setupConfigUI() {
    if (!currentConfig)
        return;
    const configList = document.querySelector("[data-config-list]");
    if (!configList)
        return;
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
}
;
function addStickConfig(container, name, key, current) {
    const row = document.createElement("div");
    row.className = "config-row";
    row.innerHTML = `
    <span>${name}</span>
    <select>
      ${Object.entries(stickActionNames).map(([val, label]) => `<option value="${val}" ${val === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
    const select = row.querySelector("select");
    select.addEventListener("change", () => {
        if (currentConfig && window.barspec) {
            currentConfig[key] = select.value;
            window.barspec.saveConfig(currentConfig);
            updateLabels();
        }
    });
    container.appendChild(row);
}
;
function addButtonConfig(container, name, index, current) {
    const row = document.createElement("div");
    row.className = "config-row";
    row.innerHTML = `
    <span>Button ${name}</span>
    <select>
      ${Object.entries(actionNames).map(([val, label]) => `<option value="${val}" ${val === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
    const select = row.querySelector("select");
    select.addEventListener("change", () => {
        if (currentConfig && window.barspec) {
            currentConfig.buttonMappings[index] = select.value;
            window.barspec.saveConfig(currentConfig);
            updateLabels();
        }
    });
    container.appendChild(row);
}
;
const pollGamepad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gamepad = null;
    // Detailed Diagnostic info
    let debugHtml = "<strong>Detailed Diagnostics:</strong><ul style='padding-left:15px; margin:5px 0;'>";
    let anyFound = false;
    for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (p) {
            anyFound = true;
            debugHtml += `<li>Slot ${i}: <span style='color:#4f6ef7'>${p.id}</span> (Mapping: ${p.mapping})</li>`;
        }
        else {
            debugHtml += `<li>Slot ${i}: <span style='opacity:0.5'>null</span></li>`;
        }
    }
    debugHtml += "</ul>";
    if (!anyFound) {
        debugHtml += "<p style='color:#ef4444'>No gamepads reported by system. Try pressing a button or reconnecting.</p>";
    }
    if (debugInfoEl)
        debugInfoEl.innerHTML = debugHtml;
    // Try to find the selected gamepad or the first available one
    if (selectedGamepadIndex !== null && pads[selectedGamepadIndex]) {
        gamepad = pads[selectedGamepadIndex];
    }
    else {
        for (let i = 0; i < pads.length; i++) {
            if (pads[i]) {
                gamepad = pads[i];
                selectedGamepadIndex = i;
                break;
            }
        }
    }
    if (!gamepad) {
        padEl.textContent = "No gamepad detected";
        requestAnimationFrame(pollGamepad);
        return;
    }
    padEl.textContent = `${gamepad.id} (Slot ${gamepad.index})`;
    const startPressed = gamepad.buttons[9]?.pressed ?? false;
    if (startPressed && !lastStartPressed) {
        setActive(!isActive);
    }
    lastStartPressed = startPressed;
    if (isActive && window.barspec) {
        const state = {
            axes: Array.from(gamepad.axes),
            buttons: gamepad.buttons.map((b) => b.pressed),
        };
        window.barspec.sendInput(state);
    }
    // Update visual feedback
    gamepad.buttons.forEach((btn, i) => {
        const el = document.querySelector(`[data-button="${i}"]`);
        if (el)
            el.classList.toggle("pressed", btn.pressed);
    });
    // Sticks feedback
    const ls = document.querySelector(`[data-stick="ls"]`);
    if (ls) {
        const lx = (gamepad.axes[0] || 0) * 10;
        const ly = (gamepad.axes[1] || 0) * 10;
        ls.style.transform = `translate(${lx}px, ${ly}px)`;
    }
    const rs = document.querySelector(`[data-stick="rs"]`);
    if (rs) {
        const rx = (gamepad.axes[2] || 0) * 10;
        const ry = (gamepad.axes[3] || 0) * 10;
        rs.style.transform = `translate(${rx}px, ${ry}px)`;
    }
    requestAnimationFrame(pollGamepad);
};
window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);
    if (selectedGamepadIndex === null) {
        selectedGamepadIndex = e.gamepad.index;
    }
});
window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected:", e.gamepad.id);
    if (selectedGamepadIndex === e.gamepad.index) {
        selectedGamepadIndex = null;
    }
});
// Manual refresh button logic
document.querySelector("[data-refresh]")?.addEventListener("click", () => {
    console.log("Manual refresh triggered");
    // Just log to console as pollGamepad runs every frame anyway
    const pads = navigator.getGamepads();
    console.table(pads);
});
// Signal that renderer is loaded
window.barspecLoaded = true;
requestAnimationFrame(pollGamepad);
