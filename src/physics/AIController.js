import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Intelligent AI racer controller for Super Cars II.
 * Follows track racing line, brakes for turns, avoids competitors, and fires missiles.
 */
export class AIController {
  constructor(arcadeCar, spline, topSpeed, weaponsManager = null, laneOffset = 0) {
    this.car = arcadeCar;
    this.spline = spline;
    this.topSpeed = topSpeed;
    this.weapons = weaponsManager;
    this.laneOffset = laneOffset;

    this.lookAheadDistance = 0.035; // Fraction of track length to aim towards
    this.fireTimer = Math.random() * 4.0 + 2.0;

    this.input = {
      throttle: 0,
      steer: 0,
    };
  }

  update(delta, playerCar, allCars) {
    if (this.car.isSpunOut) {
      this.input.throttle = 0;
      this.input.steer = 0;
      return this.input;
    }

    // 1. Calculate current progress on spline
    const currentT = this.car.lapProgress || 0;
    const targetT = (currentT + this.lookAheadDistance) % 1.0;

    // 2. Target waypoint in world space offset by AI's designated lane
    const rawTarget = this.spline.getPointAt(targetT);
    const tangent = this.spline.getTangentAt(targetT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const targetPoint = rawTarget.clone().addScaledVector(normal, this.laneOffset);

    // Vector from car to target
    const toTarget = new THREE.Vector3().subVectors(targetPoint, this.car.position);
    toTarget.y = 0;

    // Desired yaw heading
    const desiredYaw = Math.atan2(toTarget.x, toTarget.z);

    // Shortest angular difference (-PI to PI)
    let angleDiff = desiredYaw - this.car.yaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Steering input (-1 to 1): positive steer turns right (increases yaw)
    this.input.steer = Math.max(-1.0, Math.min(1.0, angleDiff * 2.5));

    // Throttle management: brake for sharp turns
    const turnSeverity = Math.abs(angleDiff);
    if (turnSeverity > 0.5) {
      this.input.throttle = 0.4; // Slow down for corners
    } else if (turnSeverity > 0.85) {
      this.input.throttle = -0.15; // Hard brake into tight hairpins
    } else {
      this.input.throttle = 1.0;  // Full gas on straights
    }

    // Car speed limit check for this AI's skill tier
    if (this.car.speed > this.topSpeed) {
      this.input.throttle = 0.2;
    }

    // 3. Avoidance & anti-ramming logic
    if (allCars) {
      for (let i = 0; i < allCars.length; i++) {
        const other = allCars[i];
        if (other === this.car) continue;

        const dist = this.car.position.distanceTo(other.position);
        if (dist < 4.2) {
          const toOther = new THREE.Vector3().subVectors(other.position, this.car.position);
          const rightDot = this.car.right.dot(toOther);
          const forwardDot = this.car.forward.dot(toOther);

          // If another car is right in front of us, ease off throttle
          if (forwardDot > 0.6 && dist < 3.5) {
            this.input.throttle = Math.min(this.input.throttle, 0.35);
          }

          // Steer away from other car
          if (rightDot > 0) {
            this.input.steer -= 0.45; // Other car is on our right, steer left
          } else {
            this.input.steer += 0.45; // Other car is on our left, steer right
          }
        }
      }
    }

    // 4. Combat / Missile firing AI
    if (this.weapons && playerCar) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = Math.random() * 5.0 + 3.0;

        // Check if player is ahead in firing cone
        const toPlayer = new THREE.Vector3().subVectors(playerCar.position, this.car.position);
        const distToPlayer = toPlayer.length();

        if (distToPlayer < CONFIG.ai.fireDistance && distToPlayer > 8.0) {
          toPlayer.normalize();
          const dot = this.car.forward.dot(toPlayer);
          if (dot > 0.88) {
            // Player directly in sights!
            this.weapons.fire(this.car);
          }
        }
      }
    }

    return this.input;
  }
}
