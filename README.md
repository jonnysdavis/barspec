# Barspec

Barspec is a simple TypeScript desktop app that lets you control the Beyond All Reason spectator camera with an Xbox-style gamepad while the game runs in another window.

## Features

- Left stick pans (WASD)
- Right stick moves the mouse cursor (camera look)
- Triggers zoom (mouse wheel)
- Adjustable sensitivity + deadzone
- Start button toggles camera control

## Getting started

```bash
npm install
npm run start
```

## Usage notes

1. Launch Beyond All Reason and enter a match or replay.
2. Start Barspec and connect your controller.
3. Click **Start camera control** or press the controller **Start** button.
4. Keep the BAR window focused to receive the mapped mouse/keyboard inputs.
5. If a Bluetooth controller says "No gamepad detected", click the Barspec
   window and press any button to refresh the connection.

> Tip: If the camera feels too fast/slow, adjust the sensitivity slider.
