import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Weapons system for Super Cars II VR.
 * Fires twin front-mounted rockets that seek forward, hit competitors,
 * cause spin-outs, and produce explosions with smoke trails.
 */
export class WeaponsManager {
  constructor(scene, particles, soundManager) {
    this.scene = scene;
    this.particles = particles;
    this.sounds = soundManager;

    this.activeRockets = [];
    this.cooldowns = new Map(); // Car -> last fired time

    // Rocket 3D Model Template
    this.rocketGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8);
    this.rocketGeo.rotateX(Math.PI / 2);

    this.rocketMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.5,
      roughness: 0.3,
    });

    this.coneGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
    this.coneGeo.rotateX(Math.PI / 2);
    this.coneMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf97316,
      emissiveIntensity: 2.0,
    });
  }

  canFire(car) {
    const lastFired = this.cooldowns.get(car) || 0;
    const now = performance.now() / 1000;
    return (now - lastFired) >= CONFIG.weapon.cooldown;
  }

  fire(car) {
    if (!this.canFire(car)) return false;

    const now = performance.now() / 1000;
    this.cooldowns.set(car, now);

    // Fire dual twin rockets from the hood launcher pods
    this.spawnRocket(car, -0.45);
    this.spawnRocket(car, 0.45);

    if (this.sounds && car.isPlayer) {
      this.sounds.playRocketFire();
    }

    return true;
  }

  spawnRocket(car, lateralOffset) {
    const rocketMesh = new THREE.Group();

    const body = new THREE.Mesh(this.rocketGeo, this.rocketMat);
    rocketMesh.add(body);

    const tip = new THREE.Mesh(this.coneGeo, this.coneMat);
    tip.position.z = 0.5;
    rocketMesh.add(tip);

    // Initial position at car's front launchers
    const spawnPos = car.position.clone()
      .addScaledVector(car.forward, 1.6)
      .addScaledVector(car.right, lateralOffset);
    spawnPos.y += 0.55;

    rocketMesh.position.copy(spawnPos);
    rocketMesh.quaternion.copy(car.mesh.quaternion);
    this.scene.add(rocketMesh);

    // Direction vector
    const dir = car.forward.clone().normalize();

    this.activeRockets.push({
      mesh: rocketMesh,
      owner: car,
      direction: dir,
      speed: CONFIG.weapon.rocketSpeed,
      life: CONFIG.weapon.rocketLifetime,
      trailTimer: 0,
    });
  }

  update(delta, allCars) {
    for (let i = this.activeRockets.length - 1; i >= 0; i--) {
      const r = this.activeRockets[i];
      r.life -= delta;

      if (r.life <= 0) {
        this.removeRocket(i);
        continue;
      }

      // Move rocket forward
      r.mesh.position.addScaledVector(r.direction, r.speed * delta);

      // Rocket thrust particle trail
      r.trailTimer -= delta;
      if (r.trailTimer <= 0) {
        r.trailTimer = 0.03;
        if (this.particles) {
          const exhaustPos = r.mesh.position.clone().addScaledVector(r.direction, -0.4);
          this.particles.emitRocketTrail(exhaustPos);
        }
      }

      // Check collision against all cars except owner
      let hit = false;
      for (let c = 0; c < allCars.length; c++) {
        const car = allCars[c];
        if (car === r.owner) continue;

        const dist = r.mesh.position.distanceTo(car.position);
        if (dist < (CONFIG.weapon.rocketRadius + CONFIG.car.carRadius)) {
          // Direct hit!
          car.triggerSpinOut();

          if (this.particles) {
            this.particles.emitExplosion(r.mesh.position);
          }
          if (this.sounds) {
            this.sounds.playExplosion();
          }

          hit = true;
          break;
        }
      }

      if (hit) {
        this.removeRocket(i);
      }
    }
  }

  removeRocket(index) {
    const r = this.activeRockets[index];
    this.scene.remove(r.mesh);
    this.activeRockets.splice(index, 1);
  }
}
