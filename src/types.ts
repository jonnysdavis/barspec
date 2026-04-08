export type Action =
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

export type StickAction = "mouse_move" | "mouse_pan" | "arrow_move" | "none";

export interface GamepadState {
  axes: number[];
  buttons: boolean[];
}

export interface MappingConfig {
  sensitivity: number;
  deadzone: number;
  leftStickAction: StickAction;
  rightStickAction: StickAction;
  buttonMappings: Action[]; // index matches gamepad button index
}

export const DEFAULT_CONFIG: MappingConfig = {
  sensitivity: 1.0,
  deadzone: 0.15,
  leftStickAction: "mouse_move",
  rightStickAction: "mouse_pan",
  buttonMappings: [
    "middle_click", // 0: A
    "right_click",  // 1: B
    "left_click",   // 2: X
    "none",         // 3: Y
    "zoom_out_wheel", // 4: L1
    "zoom_in_wheel",  // 5: R1
    "zoom_out_wheel", // 6: L2
    "zoom_in_wheel",  // 7: R2
    "none",         // 8: Select
    "none",         // 9: Start
    "toggle_stick_mode", // 10: L3
    "none",         // 11: R3
    "arrow_up",     // 12: Dpad Up
    "arrow_down",   // 13: Dpad Down
    "arrow_left",   // 14: Dpad Left
    "arrow_right",  // 15: Dpad Right
  ],
};
