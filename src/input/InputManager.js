/**
 * Input Manager for Keyboard and Standard Gamepads (Desktop / Mobile).
 */
export class InputManager {
  constructor(onCameraToggle, onFire, onReset, onInvertToggle) {
    this.onCameraToggle = onCameraToggle;
    this.onFire = onFire;
    this.onReset = onReset;
    this.onInvertToggle = onInvertToggle;

    this.keys = {};
    this.gamepadIndex = null;

    this.state = {
      throttle: 0,
      steer: 0,
      fire: false,
    };

    this.setupKeyboard();
    this.setupGamepad();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.onFire) this.onFire();
      }
      if (e.code === 'KeyC') {
        if (this.onCameraToggle) this.onCameraToggle();
      }
      if (e.code === 'KeyR') {
        if (this.onReset) this.onReset();
      }
      if (e.code === 'KeyI') {
        if (this.onInvertToggle) this.onInvertToggle();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  update() {
    let throttle = 0;
    let steer = 0;

    // 1. Keyboard Input
    if (this.keys['KeyW'] || this.keys['ArrowUp']) throttle += 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) throttle -= 1.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steer -= 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steer += 1.0;

    // 2. Standard Gamepad Input
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        // Left stick steering
        const stickX = gp.axes[0] || 0;
        if (Math.abs(stickX) > 0.15) {
          steer = stickX;
        }

        // Right Trigger (Gas) / Left Trigger (Brake) or Stick Y
        const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
        const lt = gp.buttons[6] ? gp.buttons[6].value : 0;

        if (rt > 0.1) throttle = rt;
        else if (lt > 0.1) throttle = -lt;
        else {
          const stickY = gp.axes[1] || 0;
          if (Math.abs(stickY) > 0.15) throttle = -stickY;
        }

        // Fire button (A / X or RB)
        if (gp.buttons[0]?.pressed || gp.buttons[5]?.pressed) {
          if (!this.wasGamepadFirePressed) {
            this.wasGamepadFirePressed = true;
            if (this.onFire) this.onFire();
          }
        } else {
          this.wasGamepadFirePressed = false;
        }

        // Camera button (Y / Triangle)
        if (gp.buttons[3]?.pressed) {
          if (!this.wasGamepadCamPressed) {
            this.wasGamepadCamPressed = true;
            if (this.onCameraToggle) this.onCameraToggle();
          }
        } else {
          this.wasGamepadCamPressed = false;
        }
      }
    }

    this.state.throttle = Math.max(-1.0, Math.min(1.0, throttle));
    this.state.steer = Math.max(-1.0, Math.min(1.0, steer));

    return this.state;
  }
}
