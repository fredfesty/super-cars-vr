import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Arcade Car physics model matching the fast, responsive, slidey feel of Super Cars II.
 * Handles acceleration, braking, lateral drift, barrier rebounds, ramp jumping, and spin-outs.
 */
export class ArcadeCar {
  constructor(mesh, isPlayer = false, soundManager = null, particleSystem = null) {
    this.mesh = mesh;
    this.isPlayer = isPlayer;
    this.soundManager = soundManager;
    this.particles = particleSystem;

    // Transform state
    this.position = new THREE.Vector3();
    this.yaw = 0;             // Car heading in radians
    this.speed = 0;           // Forward/backward speed
    this.lateralVelocity = 0; // Drifting sideways speed
    this.verticalVelocity = 0;
    this.elevation = 0;
    this.isGrounded = true;

    // Visual suspension roll & pitch
    this.roll = 0;
    this.pitch = 0;
    this.steerAngle = 0;

    // Spin-out state (when hit by missile)
    this.isSpunOut = false;
    this.spinTimer = 0;
    this.spinAngularSpeed = 0;

    // Wheel rotation accumulator
    this.wheelRotation = 0;

    // Race progress state (used by RaceManager)
    this.lap = 1;
    this.checkpointIndex = 0;
    this.lapProgress = 0;
    this.totalDistance = 0;
    this.finished = false;
    this.rank = 1;

    // Cached vectors to avoid per-frame GC allocations
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
  }

  setPosition(pos, yaw = 0) {
    this.position.copy(pos);
    this.yaw = yaw;
    this.speed = 0;
    this.lateralVelocity = 0;
    this.verticalVelocity = 0;
    this.elevation = pos.y;
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
    this.right.set(this.forward.z, 0, -this.forward.x).normalize();
    this.updateMeshTransforms();
  }

  update(delta, input, colliders, ramps, trackSpline) {
    const cfg = CONFIG.car;

    // 1. Handle Missile Spin-Out
    if (this.isSpunOut) {
      this.spinTimer -= delta;
      this.yaw += this.spinAngularSpeed * delta;
      this.speed *= Math.pow(0.2, delta); // heavy drag during spin
      this.lateralVelocity *= Math.pow(0.2, delta);

      if (this.spinTimer <= 0) {
        this.isSpunOut = false;
      }
    } else {
      // 2. Drive & Steering Input
      this.handleInput(delta, input, cfg);
    }

    // 3. Compute Orientation Vectors
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
    this.right.set(this.forward.z, 0, -this.forward.x).normalize();

    // 4. Update Position along Forward & Lateral axes
    this.velocity.copy(this.forward).multiplyScalar(this.speed);
    this.velocity.addScaledVector(this.right, this.lateralVelocity);

    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // 5. Jump Ramp and Airborne Physics
    this.handleElevationAndJumps(delta, ramps, trackSpline, cfg);

    // 6. Watertight Track Boundary Constraint (Impossible to leave the track!)
    this.enforceTrackBoundaries(trackSpline, delta, cfg);
    this.handleBarrierCollisions(colliders, cfg);

    // 7. Visual Feedback (Drift smoke, wheel spin, suspension roll)
    this.updateVisuals(delta, cfg);

    // 8. Update Audio
    if (this.isPlayer && this.soundManager) {
      this.soundManager.updateEngine(this.speed, cfg.maxSpeed, input ? (input.throttle > 0) : false);
      const driftAmount = Math.abs(this.lateralVelocity) / (cfg.maxSpeed * 0.4);
      this.soundManager.updateSkid(driftAmount);
    }

    // 9. Sync Three.js Mesh
    this.updateMeshTransforms();
  }

  handleInput(delta, input, cfg) {
    if (!input) return;

    const throttle = input.throttle || 0; // -1 to 1 (or 0 to 1 forward, -1 reverse)
    const steer = input.steer || 0;       // -1 (left) to 1 (right)

    // Acceleration & Braking with progressive throttle curve
    if (throttle > 0) {
      if (this.speed < 0) {
        // Braking while reversing
        this.speed += cfg.braking * delta;
      } else {
        // Progressive forward acceleration (tapers smoothly near top speed)
        const speedNorm = Math.min(1.0, Math.max(0, this.speed / cfg.maxSpeed));
        const torque = 1.0 - (speedNorm * 0.35);
        this.speed += cfg.acceleration * throttle * torque * delta;
        if (this.speed > cfg.maxSpeed) this.speed = cfg.maxSpeed;
      }
    } else if (throttle < 0) {
      if (this.speed > 0) {
        // Braking while going forward
        this.speed -= cfg.braking * delta;
        if (this.speed < 0) this.speed = 0;
      } else {
        // Reversing
        this.speed -= cfg.reverseAccel * Math.abs(throttle) * delta;
        if (this.speed < cfg.reverseSpeed) this.speed = cfg.reverseSpeed;
      }
    } else {
      // Natural engine braking / rolling deceleration
      const decel = cfg.naturalDecel * delta;
      if (Math.abs(this.speed) <= decel) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * decel;
      }
    }

    // Steering: inverted when CONFIG.controls.invertSteer is true
    // Keep minimum steering authority so car can maneuver at low speed
    const speedRatio = Math.min(1.0, Math.max(0.25, Math.abs(this.speed) / (cfg.maxSpeed * 0.25)));
    const reverseSign = this.speed < -0.1 ? -1 : 1;
    const steerDir = (this.isPlayer && CONFIG.controls?.invertSteer) ? -1 : 1;
    const steerDelta = steerDir * steer * cfg.turnSpeed * speedRatio * reverseSign * delta;
    this.yaw += steerDelta;

    // Visual front wheel angle (matches steer direction)
    this.steerAngle = steerDir * steer * 0.42;

    // Stable arcade drift (slight slide to outside of turn, heavily damped)
    if (Math.abs(this.speed) > 5.0) {
      this.lateralVelocity -= Math.sign(steerDelta) * Math.min(Math.abs(steerDelta) * this.speed * 0.25, 4.0);
    }
    // Strong grip damping so the car stays completely in control
    this.lateralVelocity *= Math.exp(-12.0 * delta);

    // Emit tire smoke if sliding sideways
    if (Math.abs(this.lateralVelocity) > 3.0 && Math.abs(this.speed) > cfg.driftThreshold) {
      if (this.particles) {
        const rearL = this.position.clone().addScaledVector(this.forward, -1.2).addScaledVector(this.right, -0.8);
        const rearR = this.position.clone().addScaledVector(this.forward, -1.2).addScaledVector(this.right, 0.8);
        this.particles.emitTireSmoke(rearL, Math.abs(this.lateralVelocity));
        this.particles.emitTireSmoke(rearR, Math.abs(this.lateralVelocity));
      }
    }
  }

  handleElevationAndJumps(delta, ramps, trackSpline, cfg) {
    // Find expected track ground elevation at current location
    let targetGroundY = 0;
    if (trackSpline) {
      // Check closest point on spline or ramp
      const sample = trackSpline.getPointAt(this.lapProgress || 0);
      targetGroundY = sample.y;
    }

    // Check if on jump ramp crest zone
    if (ramps && this.isGrounded) {
      ramps.forEach(ramp => {
        const dist = this.position.distanceTo(ramp.crest);
        if (dist < 14.0 && this.speed > 22.0) {
          // Launch into air!
          this.isGrounded = false;
          this.verticalVelocity = ramp.boost;
          this.pitch = -0.22; // Nose pitch up
        }
      });
    }

    if (!this.isGrounded) {
      this.verticalVelocity += cfg.gravity * delta;
      this.position.y += this.verticalVelocity * delta;

      // Pitch nose down gradually while in flight
      this.pitch = Math.min(0.25, this.pitch + 0.35 * delta);

      if (this.position.y <= targetGroundY) {
        this.position.y = targetGroundY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.pitch = 0;

        // Landing suspension thud & dust
        if (this.particles) {
          this.particles.emitCollisionSparks(this.position, new THREE.Vector3(0, 1, 0), 8);
        }
        if (this.soundManager && this.isPlayer) {
          this.soundManager.playCollision(0.7);
        }
      }
    } else {
      // Smoothly track track elevation
      this.position.y = THREE.MathUtils.lerp(this.position.y, targetGroundY, delta * 12);
    }
  }

  enforceTrackBoundaries(trackSpline, delta, cfg) {
    if (!trackSpline) return;

    // Search closest point along track spline near current lap progress
    const baseT = this.lapProgress || 0;
    let bestT = baseT;
    let closestDistSq = Infinity;
    let closestPt = null;

    // Search 50 points around current progress for sub-meter spline accuracy
    for (let s = -25; s <= 25; s++) {
      const t = (baseT + (s / 400) + 1.0) % 1.0;
      const pt = trackSpline.getPointAt(t);
      const dx = this.position.x - pt.x;
      const dz = this.position.z - pt.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        bestT = t;
        closestPt = pt;
      }
    }

    // Fallback global search if local search missed (e.g. after spin or jump)
    if (closestDistSq > 150) {
      for (let g = 0; g < 100; g++) {
        const t = g / 100;
        const pt = trackSpline.getPointAt(t);
        const dx = this.position.x - pt.x;
        const dz = this.position.z - pt.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          bestT = t;
          closestPt = pt;
        }
      }
    }

    if (!closestPt) return;
    this.lapProgress = bestT;

    const tangent = trackSpline.getTangentAt(bestT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Lateral distance from track centerline
    const toCarX = this.position.x - closestPt.x;
    const toCarZ = this.position.z - closestPt.z;
    const lateralDist = toCarX * normal.x + toCarZ * normal.z;

    // Hard track boundary: track width is 16m (half width 8.0m, kerb to 9.1m, Armco barrier at 9.25m)
    // Car half-width is 0.84m, so car hits Armco barrier at 8.35m
    const maxBoundary = 8.35;

    if (Math.abs(lateralDist) > maxBoundary) {
      // Clamping: 100% Watertight constraint! Impossible to drive outside the track!
      const sign = Math.sign(lateralDist) || 1;
      const clampedDist = sign * maxBoundary;
      this.position.x = closestPt.x + normal.x * clampedDist;
      this.position.z = closestPt.z + normal.z * clampedDist;

      // Inward wall normal pointing back into the track
      const wallNormal = normal.clone().multiplyScalar(-sign);
      const vNormal = this.velocity.dot(wallNormal);

      if (vNormal < 0) {
        // Cancel velocity into the wall, slight gentle bounce
        this.velocity.addScaledVector(wallNormal, -vNormal * 1.35);

        // Retain forward momentum along the track
        const forwardSpeed = this.velocity.dot(this.forward);
        this.speed = Math.max(0, forwardSpeed * 0.94);
        this.lateralVelocity = this.velocity.dot(this.right);

        // Auto-align heading along the track tangent
        const forwardDotTangent = this.forward.dot(tangent);
        if (forwardDotTangent < 0.94) {
          const trackHeading = Math.atan2(tangent.x, tangent.z);
          this.yaw = THREE.MathUtils.lerp(this.yaw, trackHeading, delta * 5.0);
        }

        if (this.particles) {
          this.particles.emitCollisionSparks(this.position, wallNormal, 8);
        }
        if (this.soundManager && this.isPlayer) {
          this.soundManager.playCollision(0.4);
        }
      }
    }
  }

  handleBarrierCollisions(colliders, cfg) {
    if (!colliders || colliders.length === 0) return;

    // Check front and rear contact points along the car length (capsule bounds)
    const sphereOffset = 0.85;
    const sphereRadius = 1.0;
    const checkPoints = [
      this.position.clone().addScaledVector(this.forward, sphereOffset),
      this.position.clone().addScaledVector(this.forward, -sphereOffset),
    ];

    for (let cpIdx = 0; cpIdx < checkPoints.length; cpIdx++) {
      const checkPt = checkPoints[cpIdx];

      for (let i = 0; i < colliders.length; i++) {
        const seg = colliders[i];
        const closestPoint = this.closestPointOnSegment(checkPt, seg.p1, seg.p2);
        const dist = checkPt.distanceTo(closestPoint);

        if (dist < sphereRadius) {
          // Normal pointing into track away from barrier
          const normal = new THREE.Vector3().subVectors(checkPt, closestPoint).normalize();
          normal.y = 0;

          // Push car position away from barrier
          const penetration = sphereRadius - dist;
          this.position.addScaledVector(normal, penetration + 0.04);

          // Wall slide physics: decompose velocity
          const vNormal = this.velocity.dot(normal);
          if (vNormal < 0) {
            // Cancel velocity into the wall, slight gentle bounce
            this.velocity.addScaledVector(normal, -vNormal * 1.25);

            // Recompute forward speed & lateral velocity
            const forwardSpeed = this.velocity.dot(this.forward);
            this.speed = Math.max(0, forwardSpeed * 0.94); // Retain forward momentum!
            this.lateralVelocity = this.velocity.dot(this.right);

            // Deflect car heading slightly away from wall to smoothly glide off
            const forwardIntoWall = this.forward.dot(normal);
            if (forwardIntoWall < 0) {
              const turnAwaySign = Math.sign(this.right.dot(normal)) || 1;
              this.yaw += turnAwaySign * 0.06;
            }

            // Sparks & crunch sound
            if (this.particles) {
              this.particles.emitCollisionSparks(closestPoint, normal, 8);
            }
            if (this.soundManager && this.isPlayer) {
              this.soundManager.playCollision(0.4);
            }
          }
          break;
        }
      }
    }
  }

  closestPointOnSegment(p, a, b) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    const abLenSq = ab.lengthSq();
    if (abLenSq === 0) return a.clone();

    const t = Math.max(0, Math.min(1, ap.dot(ab) / abLenSq));
    return a.clone().addScaledVector(ab, t);
  }

  triggerSpinOut() {
    if (this.isSpunOut) return;
    this.isSpunOut = true;
    this.spinTimer = CONFIG.car.spinDuration;
    this.spinAngularSpeed = (Math.random() > 0.5 ? 1 : -1) * (12.0 + Math.random() * 4.0);

    if (this.particles) {
      this.particles.emitCollisionSparks(this.position, new THREE.Vector3(0, 1, 0), 12);
    }
  }

  updateVisuals(delta, cfg) {
    // Wheel spin
    this.wheelRotation += (this.speed / 0.34) * delta;

    if (this.mesh && this.mesh.wheels) {
      const w = this.mesh.wheels;
      // Spin all 4 wheels
      w.fl.rotatingHub.rotation.x = this.wheelRotation;
      w.fr.rotatingHub.rotation.x = this.wheelRotation;
      w.rl.rotatingHub.rotation.x = this.wheelRotation;
      w.rr.rotatingHub.rotation.x = this.wheelRotation;

      // Steer front wheels
      w.fl.rotation.y = this.steerAngle;
      w.fr.rotation.y = this.steerAngle;
    }

    // Suspension body roll into turns
    const targetRoll = (-this.lateralVelocity / cfg.maxSpeed) * 0.25;
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, delta * 10);

    // Taillight brightening on brake
    if (this.mesh && this.mesh.taillightMaterial) {
      const isBraking = this.speed > 2.0 && (this.lateralVelocity !== 0);
      this.mesh.taillightMaterial.emissiveIntensity = isBraking ? 5.0 : 2.0;
    }
  }

  updateMeshTransforms() {
    if (!this.mesh) return;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, this.yaw, 0, 'YXZ');

    if (this.mesh.visualGroup) {
      this.mesh.visualGroup.rotation.z = this.roll;
      this.mesh.visualGroup.rotation.x = this.pitch;
    }
  }
}
