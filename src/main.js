import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SoundManager } from './audio/SoundManager.js';
import { ParticleSystem } from './graphics/ParticleSystem.js';
import { CarBuilder } from './graphics/CarBuilder.js';
import { TrackBuilder } from './graphics/TrackBuilder.js';
import { ArcadeCar } from './physics/ArcadeCar.js';
import { AIController } from './physics/AIController.js';
import { WeaponsManager } from './gameplay/Weapons.js';
import { RaceManager } from './gameplay/RaceManager.js';
import { InputManager } from './input/InputManager.js';
import { XRControllerManager } from './input/XRController.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.speedDisplay = document.getElementById('speed-display');
    this.cameraBtn = document.getElementById('camera-toggle-btn');
    this.restartBtn = document.getElementById('restart-btn');

    this.clock = new THREE.Clock();
    this.cameraModes = ['DRONE', 'CHASE', 'BUMPER'];
    this.cameraModeIndex = 0; // Default to classic Super Cars Drone / Top-Down View

    this.initGraphics();
    this.initAudioAndFX();
    this.initWorld();
    this.initInput();
    this.initUIEvents();

    // Start WebXR Render Loop
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  initGraphics() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x1e293b, 0.0025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.2, 1000);
    this.cameraTarget = new THREE.Vector3();
    this.cameraPositionTarget = new THREE.Vector3();

    // Camera Rig (crucial for WebXR camera translation)
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    // 3. WebGL / WebXR Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true; // WebXR enabled

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting & Atmosphere
    this.initLighting();

    // Resize handler
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initLighting() {
    // Hemisphere ambient light
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x163820, 1.2);
    this.scene.add(hemiLight);

    // Directional Sun with soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    this.sunLight.position.set(120, 180, 80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;

    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Ambient fill
    const ambient = new THREE.AmbientLight(0x334155, 0.6);
    this.scene.add(ambient);

    // Create a procedural sunny sky dome
    this.createSkyDome();
  }

  createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(600, 32, 15);
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0284c7');   // Rich deep blue zenith
    grad.addColorStop(0.65, '#7dd3fc'); // Horizon cyan
    grad.addColorStop(0.85, '#fef08a'); // Warm sun haze
    grad.addColorStop(1.0, '#334155');  // Ground dusk
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);

    const skyTex = new THREE.CanvasTexture(canvas);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);
  }

  initAudioAndFX() {
    this.soundManager = new SoundManager();
    this.particles = new ParticleSystem(this.scene);
    this.weapons = new WeaponsManager(this.scene, this.particles, this.soundManager);

    // Resume Web Audio on first interaction
    const unlockAudio = () => {
      this.soundManager.init();
      this.soundManager.resume();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  initWorld() {
    // 1. Build Circuit
    this.trackBuilder = new TrackBuilder(this.scene);
    this.trackData = this.trackBuilder.buildTrack();

    // 2. Build Player Car
    const playerMesh = CarBuilder.createCar(CONFIG.colors.player, true);
    this.scene.add(playerMesh);
    this.playerCar = new ArcadeCar(playerMesh, true, this.soundManager, this.particles);

    // 3. Build 3 AI Competitors
    const aiColors = [CONFIG.colors.ai1, CONFIG.colors.ai2, CONFIG.colors.ai3];
    this.aiCars = [];
    this.aiControllers = [];

    for (let i = 0; i < 3; i++) {
      const aiMesh = CarBuilder.createCar(aiColors[i], false);
      this.scene.add(aiMesh);

      const aiCar = new ArcadeCar(aiMesh, false, null, this.particles);
      this.aiCars.push(aiCar);

      const aiLaneOffsets = [3.0, -3.0, 0.0];
      const controller = new AIController(
        aiCar,
        this.trackData.spline,
        CONFIG.ai.speeds[i],
        this.weapons,
        aiLaneOffsets[i]
      );
      this.aiControllers.push(controller);
    }

    this.allCars = [this.playerCar, ...this.aiCars];

    // 4. Race Manager
    this.raceManager = new RaceManager(
      this.trackData.spline,
      this.trackData.checkpoints,
      this.trackBuilder,
      this.soundManager
    );
    this.raceManager.setupGrid(this.playerCar, this.aiCars);
  }

  initInput() {
    // Desktop / Gamepad Input
    this.inputManager = new InputManager(
      () => this.toggleCameraMode(),
      () => this.onFireRockets(),
      () => this.resetRace()
    );

    // WebXR / Quest 3 Touch Controller Input
    this.xrManager = new XRControllerManager(
      this.renderer,
      this.scene,
      () => this.toggleCameraMode(),
      () => this.onFireRockets()
    );
  }

  initUIEvents() {
    if (this.cameraBtn) {
      this.cameraBtn.addEventListener('click', () => {
        this.toggleCameraMode();
      });
    }

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        this.resetRace();
      });
    }
  }

  toggleCameraMode() {
    this.cameraModeIndex = (this.cameraModeIndex + 1) % this.cameraModes.length;
    const mode = this.cameraModes[this.cameraModeIndex];

    if (this.cameraBtn) {
      const modeNames = {
        DRONE: 'Drone / Top-Down (C)',
        CHASE: 'Chase Cam (C)',
        BUMPER: 'Bumper Cam (C)',
      };
      this.cameraBtn.innerText = `Camera: ${modeNames[mode]}`;
    }
  }

  onFireRockets() {
    if (!this.raceManager.isRacing()) return;
    this.weapons.fire(this.playerCar);
  }

  resetRace() {
    this.raceManager.setupGrid(this.playerCar, this.aiCars);
  }

  updateCamera(delta) {
    const mode = this.cameraModes[this.cameraModeIndex];
    const car = this.playerCar;
    const cfg = CONFIG.camera;

    if (mode === 'DRONE') {
      // Classic Super Cars elevated bird's-eye view (tabletop diorama in VR!)
      const camCfg = cfg.drone;
      const targetPos = car.position.clone()
        .addScaledVector(car.forward, -camCfg.distance)
        .add(new THREE.Vector3(0, camCfg.height, 0));

      const lookTarget = car.position.clone().addScaledVector(car.forward, camCfg.lookAhead);

      this.cameraPositionTarget.lerp(targetPos, delta * camCfg.lerpSpeed);
      this.cameraTarget.lerp(lookTarget, delta * camCfg.lerpSpeed);

      if (this.renderer.xr.isPresenting) {
        this.cameraRig.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
      } else {
        this.camera.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
        this.camera.fov = camCfg.fov;
        this.camera.updateProjectionMatrix();
      }
    } else if (mode === 'CHASE') {
      // Dynamic Third-Person Chase Cam
      const camCfg = cfg.chase;
      const targetPos = car.position.clone()
        .addScaledVector(car.forward, -camCfg.distance)
        .add(new THREE.Vector3(0, camCfg.height, 0));

      const lookTarget = car.position.clone().addScaledVector(car.forward, camCfg.lookAhead);

      this.cameraPositionTarget.lerp(targetPos, delta * camCfg.lerpSpeed);
      this.cameraTarget.lerp(lookTarget, delta * camCfg.lerpSpeed);

      if (this.renderer.xr.isPresenting) {
        this.cameraRig.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
      } else {
        this.camera.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
        this.camera.fov = camCfg.fov;
        this.camera.updateProjectionMatrix();
      }
    } else {
      // Bumper / Hood Cam
      const camCfg = cfg.bumper;
      const targetPos = car.position.clone()
        .addScaledVector(car.forward, camCfg.distance)
        .add(new THREE.Vector3(0, camCfg.height, 0));

      const lookTarget = car.position.clone().addScaledVector(car.forward, camCfg.lookAhead);

      this.cameraPositionTarget.lerp(targetPos, delta * camCfg.lerpSpeed);
      this.cameraTarget.lerp(lookTarget, delta * camCfg.lerpSpeed);

      if (this.renderer.xr.isPresenting) {
        this.cameraRig.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
      } else {
        this.camera.position.copy(this.cameraPositionTarget);
        this.camera.lookAt(this.cameraTarget);
        this.camera.fov = camCfg.fov;
        this.camera.updateProjectionMatrix();
      }
    }

    // Shadow map follows player car to keep shadows sharp
    this.sunLight.position.set(
      car.position.x + 80,
      180,
      car.position.z + 60
    );
    this.sunLight.target.position.copy(car.position);
    this.sunLight.target.updateMatrixWorld();
  }

  handleCarToCarCollisions() {
    const count = this.allCars.length;
    // Front & rear collision spheres along car length (3.2m car length)
    const sphereOffset = 0.8;
    const sphereRadius = 1.0;
    const minDistance = sphereRadius * 2; // 2.0m

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const c1 = this.allCars[i];
        const c2 = this.allCars[j];

        const c1Pts = [
          c1.position.clone().addScaledVector(c1.forward, sphereOffset),
          c1.position.clone().addScaledVector(c1.forward, -sphereOffset),
        ];

        const c2Pts = [
          c2.position.clone().addScaledVector(c2.forward, sphereOffset),
          c2.position.clone().addScaledVector(c2.forward, -sphereOffset),
        ];

        let maxOverlap = 0;
        let collisionNormal = new THREE.Vector3();
        let contactPoint = new THREE.Vector3();

        for (let p1 = 0; p1 < 2; p1++) {
          for (let p2 = 0; p2 < 2; p2++) {
            const pt1 = c1Pts[p1];
            const pt2 = c2Pts[p2];
            const dist = pt1.distanceTo(pt2);

            if (dist < minDistance && dist > 0.001) {
              const overlap = minDistance - dist;
              if (overlap > maxOverlap) {
                maxOverlap = overlap;
                collisionNormal.subVectors(pt1, pt2).normalize();
                collisionNormal.y = 0;
                contactPoint.addVectors(pt1, pt2).multiplyScalar(0.5);
              }
            }
          }
        }

        if (maxOverlap > 0) {
          // Push apart immediately so cars NEVER jam or lock together
          c1.position.addScaledVector(collisionNormal, maxOverlap * 0.52);
          c2.position.addScaledVector(collisionNormal, -maxOverlap * 0.52);
          c1.updateMeshTransforms();
          c2.updateMeshTransforms();

          // Deflect lateral impulse (bounce away from each other)
          const sideDot1 = collisionNormal.dot(c1.right);
          const sideDot2 = collisionNormal.dot(c2.right);
          c1.lateralVelocity += sideDot1 * 4.0;
          c2.lateralVelocity -= sideDot2 * 4.0;

          // Rear-end bump: transfer partial forward momentum
          const forwardDot = collisionNormal.dot(c1.forward);
          if (forwardDot < -0.3) {
            // c1 hit c2 from behind: c1 slows down, c2 nudges forward
            c1.speed *= 0.88;
            c2.speed = Math.max(c2.speed, c1.speed + 1.5);
          }

          // Sparks & Sound
          this.particles.emitCollisionSparks(contactPoint, collisionNormal, 8);

          if (c1.isPlayer || c2.isPlayer) {
            this.soundManager.playCollision(0.5);
            this.xrManager.triggerHaptic(0.5, 70);
          }
        }
      }
    }
  }

  render() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // 1. Gather Input
    const desktopInput = this.inputManager.update();
    const xrInput = this.xrManager.update(this.camera);

    const activeInput = this.xrManager.isInVR ? xrInput : desktopInput;

    // Throttle input disabled before countdown finishes
    const allowDrive = this.raceManager.isRacing();
    const playerDriveInput = {
      throttle: allowDrive ? activeInput.throttle : 0,
      steer: activeInput.steer,
    };

    // 2. Update Player Car
    this.playerCar.update(
      delta,
      playerDriveInput,
      this.trackData.colliders,
      this.trackData.ramps,
      this.trackData.spline
    );

    // 3. Update AI Cars
    this.aiControllers.forEach(controller => {
      const aiInput = controller.update(delta, this.playerCar, this.allCars);
      const effectiveAIInput = {
        throttle: allowDrive ? aiInput.throttle : 0,
        steer: aiInput.steer,
      };

      controller.car.update(
        delta,
        effectiveAIInput,
        this.trackData.colliders,
        this.trackData.ramps,
        this.trackData.spline
      );
    });

    // 4. Car to Car Collisions
    this.handleCarToCarCollisions();

    // 5. Update Weapons & Projectiles
    this.weapons.update(delta, this.allCars);

    // 6. Update Race State & Laps
    this.raceManager.update(delta);

    // 7. Update Particles
    this.particles.update(delta, this.camera);

    // 8. Update Camera
    this.updateCamera(delta);

    // 9. Update HUD
    const speedKmh = Math.round(Math.abs(this.playerCar.speed) * 3.6);
    if (this.speedDisplay) {
      this.speedDisplay.innerText = speedKmh;
    }

    if (this.xrManager.isInVR) {
      const isReady = this.weapons.canFire(this.playerCar);
      this.xrManager.updateVRHUD(
        this.playerCar.speed,
        this.playerCar.lap,
        this.playerCar.rank,
        isReady
      );
    }

    // 10. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Start Game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
