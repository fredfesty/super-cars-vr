import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Manages 3D ammunition pickup crates placed along the circuit.
 * Cars must drive through these pickups to collect rockets before they can fire.
 */
export class AmmoPickupManager {
  constructor(scene, spline, particles, soundManager) {
    this.scene = scene;
    this.spline = spline;
    this.particles = particles;
    this.sounds = soundManager;

    this.pickups = [];
    this.animTime = 0;

    // Shared geometries and materials for performance
    this.crateGeo = new THREE.BoxGeometry(1.1, 0.7, 1.1);
    this.crateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });

    this.stripeGeo = new THREE.BoxGeometry(1.12, 0.22, 1.12);
    this.stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.miniRocketGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8);
    this.miniRocketGeo.rotateX(Math.PI / 2);
    this.miniRocketMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.5,
      roughness: 0.3,
    });

    this.miniConeGeo = new THREE.ConeGeometry(0.1, 0.28, 8);
    this.miniConeGeo.rotateX(Math.PI / 2);
    this.miniConeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.5,
    });

    this.beaconRingGeo = new THREE.RingGeometry(1.1, 1.4, 24);
    this.beaconRingGeo.rotateX(-Math.PI / 2);
    this.beaconRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });

    this.spawnPickups();
  }

  spawnPickups() {
    // 5 strategic pickup locations placed out on the circuit (strictly after Turn 1)
    const pickupLocations = [
      { t: 0.22, laneOffset: -2.8 },  // Sweeper straight exit (left lane)
      { t: 0.36, laneOffset: 2.8 },   // S-Curve approach to jump (right lane)
      { t: 0.54, laneOffset: 0.0 },   // Runway after jump (center)
      { t: 0.70, laneOffset: -2.8 },  // Approach to hairpin (left lane)
      { t: 0.84, laneOffset: 2.8 },   // Back straight exit (right lane)
    ];

    const up = new THREE.Vector3(0, 1, 0);

    pickupLocations.forEach((loc, index) => {
      const pt = this.spline.getPointAt(loc.t);
      const tangent = this.spline.getTangentAt(loc.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const pos = pt.clone().addScaledVector(normal, loc.laneOffset);
      const groundY = Math.max(0, pt.y) + 0.06;
      pos.y = groundY;

      // Outer container
      const pickupGroup = new THREE.Group();
      pickupGroup.position.copy(pos);

      // 1. Glowing beacon ring on asphalt road
      const beaconRing = new THREE.Mesh(this.beaconRingGeo, this.beaconRingMat.clone());
      beaconRing.position.y = 0.02;
      pickupGroup.add(beaconRing);

      // 2. Floating bobbing rotating crate group
      const innerGroup = new THREE.Group();
      innerGroup.position.y = 0.65;

      // Ammo crate body
      const crate = new THREE.Mesh(this.crateGeo, this.crateMat);
      crate.castShadow = true;
      innerGroup.add(crate);

      // Glowing hazard band
      const stripe = new THREE.Mesh(this.stripeGeo, this.stripeMat);
      innerGroup.add(stripe);

      // Twin miniature missiles mounted on top
      [-0.28, 0.28].forEach((xOff) => {
        const pod = new THREE.Group();
        pod.position.set(xOff, 0.44, 0);

        const rBody = new THREE.Mesh(this.miniRocketGeo, this.miniRocketMat);
        pod.add(rBody);

        const rTip = new THREE.Mesh(this.miniConeGeo, this.miniConeMat);
        rTip.position.z = 0.45;
        pod.add(rTip);

        innerGroup.add(pod);
      });

      pickupGroup.add(innerGroup);
      this.scene.add(pickupGroup);

      this.pickups.push({
        group: pickupGroup,
        innerGroup: innerGroup,
        beaconRing: beaconRing,
        position: pos,
        baseY: groundY,
        laneOffset: loc.laneOffset,
        t: loc.t,
        active: true,
        respawnTimer: 0,
        phase: index * 1.05,
      });
    });
  }

  update(delta, allCars, playerCar, isRacing = true) {
    this.animTime += delta;

    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];

      if (!p.active) {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.group.visible = true;
          // Spawn flash
          if (this.particles) {
            this.particles.emitCollisionSparks(p.position, new THREE.Vector3(0, 1, 0), 10);
          }
        }
        continue;
      }

      // Visual hovering, bobbing, and rotation
      p.innerGroup.rotation.y += delta * 2.2;
      p.innerGroup.position.y = 0.65 + Math.sin(this.animTime * 3.5 + p.phase) * 0.12;

      const ringScale = 1.0 + Math.sin(this.animTime * 4.0 + p.phase) * 0.15;
      p.beaconRing.scale.set(ringScale, ringScale, 1.0);

      // Check collision with cars only while actively racing (never during countdown)
      if (!isRacing || !allCars) continue;

      for (let c = 0; c < allCars.length; c++) {
        const car = allCars[c];
        const distSq = car.position.distanceToSquared(p.position);

        // 2.3m collection radius
        if (distSq < (2.3 * 2.3)) {
          this.collectPickup(p, car, playerCar);
          break;
        }
      }
    }
  }

  collectPickup(pickup, car, playerCar) {
    pickup.active = false;
    pickup.group.visible = false;
    pickup.respawnTimer = CONFIG.weapon.pickupRespawnTime;

    // Grant ammunition to the car
    const currentAmmo = car.ammo || 0;
    car.ammo = Math.min(CONFIG.weapon.maxAmmo, currentAmmo + CONFIG.weapon.pickupAmmo);

    // Audio feedback
    if (this.sounds) {
      if (car.isPlayer) {
        this.sounds.playAmmoPickup();
      } else if (playerCar && playerCar.position.distanceTo(pickup.position) < 40.0) {
        // AI car picked up ammo nearby
        this.sounds.playAmmoPickup();
      }
    }

    // Visual particle burst
    if (this.particles) {
      this.particles.emitCollisionSparks(pickup.position, new THREE.Vector3(0, 1, 0), 16);
    }
  }

  reset() {
    this.pickups.forEach((p) => {
      p.active = true;
      p.group.visible = true;
      p.respawnTimer = 0;
    });
  }
}
