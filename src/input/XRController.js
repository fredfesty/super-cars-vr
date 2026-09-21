import * as THREE from 'three';

/**
 * WebXR controller and Touch controller input manager for Meta Quest 3.
 * Supports thumbstick steering, trigger acceleration/braking,
 * missile firing, haptic rumble pulses, and in-VR floating HUD.
 */
export class XRControllerManager {
  constructor(renderer, scene, onCameraToggle, onFire) {
    this.renderer = renderer;
    this.scene = scene;
    this.onCameraToggle = onCameraToggle;
    this.onFire = onFire;

    this.isInVR = false;
    this.session = null;

    this.state = {
      throttle: 0,
      steer: 0,
    };

    this.prevFirePressed = false;
    this.prevCamPressed = false;

    this.setupWebXRButton();
    this.setupXREvents();
    this.createInVRHUD();
  }

  setupWebXRButton() {
    const container = document.getElementById('vr-button-container');
    if (!container) return;

    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          const btn = document.createElement('button');
          btn.className = 'enter-vr-btn';
          btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h4.5l2 2h5l2-2H21c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-14 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm10 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
            ENTER VR (QUEST 3)
          `;

          btn.addEventListener('click', () => {
            this.onRequestXRSession();
          });

          container.appendChild(btn);
        } else {
          this.showVRError('WebXR Immersive VR not supported on this device/browser');
        }
      }).catch((err) => {
        console.warn('XR session support check failed:', err);
      });
    } else {
      this.showVRError('WebXR API not available (Requires HTTPS or localhost)');
    }
  }

  showVRError(msg) {
    const container = document.getElementById('vr-button-container');
    if (container) {
      container.innerHTML = `<span style="color:#94a3b8; font-size:12px; background:rgba(0,0,0,0.6); padding:6px 12px; border-radius:12px;">${msg}</span>`;
    }
  }

  async onRequestXRSession() {
    if (!this.session) {
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
        });
        await this.renderer.xr.setSession(session);
      } catch (e) {
        console.error('Failed to start WebXR session:', e);
        alert('Could not start VR session: ' + e.message);
      }
    } else {
      this.session.end();
    }
  }

  setupXREvents() {
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.isInVR = true;
      this.session = this.renderer.xr.getSession();

      // Show VR HUD
      if (this.vrHUDGroup) {
        this.vrHUDGroup.visible = true;
      }
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.isInVR = false;
      this.session = null;

      if (this.vrHUDGroup) {
        this.vrHUDGroup.visible = false;
      }
    });
  }

  createInVRHUD() {
    // A floating 3D dashboard HUD for Quest 3 headset display
    this.vrHUDGroup = new THREE.Group();
    this.vrHUDGroup.visible = false;

    // Canvas texture for VR HUD
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 512;
    this.hudCanvas.height = 256;
    this.hudCtx = this.hudCanvas.getContext('2d');

    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    const hudMat = new THREE.MeshBasicMaterial({
      map: this.hudTexture,
      transparent: true,
      depthTest: false,
    });

    const hudPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), hudMat);
    hudPlane.position.set(0, -0.6, -1.8);
    hudPlane.rotation.x = -0.25;
    this.vrHUDGroup.add(hudPlane);

    this.scene.add(this.vrHUDGroup);
  }

  updateVRHUD(speed, lap, pos, isReady) {
    if (!this.isInVR || !this.hudCtx) return;

    const ctx = this.hudCtx;
    ctx.clearRect(0, 0, 512, 256);

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 236, 24);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Position
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(`POS: ${pos}/4`, 40, 80);

    // Lap
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`LAP: ${lap}/3`, 310, 80);

    // Speedometer
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 72px monospace';
    ctx.fillText(`${Math.round(speed * 3.6)}`, 40, 175);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('KM/H', 180, 175);

    // Weapons ready
    ctx.fillStyle = isReady ? '#ef4444' : '#64748b';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(isReady ? '🚀 ROCKETS READY [A]' : 'RELOADING...', 40, 220);

    this.hudTexture.needsUpdate = true;
  }

  triggerHaptic(intensity = 0.6, duration = 120) {
    if (!this.session) return;
    for (const source of this.session.inputSources) {
      if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
        source.gamepad.hapticActuators[0].pulse(intensity, duration);
      }
    }
  }

  update(camera) {
    let throttle = 0;
    let steer = 0;

    if (this.isInVR && this.session) {
      // Sync VR HUD position with VR Camera
      if (camera && this.vrHUDGroup) {
        this.vrHUDGroup.position.copy(camera.position);
        this.vrHUDGroup.quaternion.copy(camera.quaternion);
      }

      for (const source of this.session.inputSources) {
        if (!source.gamepad) continue;
        const gp = source.gamepad;

        // Left Oculus Touch Controller (Steering & Camera)
        if (source.handedness === 'left') {
          // Thumbstick X (axes[2])
          const stickX = gp.axes[2] !== undefined ? gp.axes[2] : (gp.axes[0] || 0);
          if (Math.abs(stickX) > 0.1) {
            steer = stickX;
          }

          // 'Y' or 'X' button (gp.buttons[4] or gp.buttons[5]) or grip
          const camPressed = gp.buttons[4]?.pressed || gp.buttons[5]?.pressed || gp.buttons[1]?.pressed;
          if (camPressed) {
            if (!this.prevCamPressed) {
              this.prevCamPressed = true;
              if (this.onCameraToggle) this.onCameraToggle();
            }
          } else {
            this.prevCamPressed = false;
          }
        }

        // Right Oculus Touch Controller (Throttle, Brake, Rockets)
        if (source.handedness === 'right') {
          // Right Trigger (buttons[0]) -> Throttle
          const trigger = gp.buttons[0] ? gp.buttons[0].value : 0;
          // Right Grip (buttons[1]) -> Brake/Reverse
          const grip = gp.buttons[1] ? gp.buttons[1].value : 0;

          // Or Right Thumbstick Y (axes[3])
          const stickY = gp.axes[3] !== undefined ? gp.axes[3] : (gp.axes[1] || 0);

          if (trigger > 0.05) {
            throttle = trigger;
          } else if (grip > 0.05) {
            throttle = -grip;
          } else if (Math.abs(stickY) > 0.15) {
            throttle = -stickY;
          }

          // 'A' button (gp.buttons[4]) or trigger secondary -> Fire Rockets
          const firePressed = gp.buttons[4]?.pressed || gp.buttons[5]?.pressed;
          if (firePressed) {
            if (!this.prevFirePressed) {
              this.prevFirePressed = true;
              this.triggerHaptic(0.8, 100);
              if (this.onFire) this.onFire();
            }
          } else {
            this.prevFirePressed = false;
          }
        }
      }

      this.state.throttle = Math.max(-1.0, Math.min(1.0, throttle));
      this.state.steer = Math.max(-1.0, Math.min(1.0, steer));
    }

    return this.state;
  }
}
