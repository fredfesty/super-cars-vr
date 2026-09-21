import * as THREE from 'three';

/**
 * High-performance Particle Manager for Super Cars II VR.
 * Handles tire smoke, sparks, missile thrust plumes, and fireball explosions.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared geometries and materials
    this.smokeGeo = new THREE.PlaneGeometry(0.8, 0.8);
    this.sparkGeo = new THREE.PlaneGeometry(0.18, 0.18);
    this.fireGeo = new THREE.PlaneGeometry(1.4, 1.4);

    // Procedural particle textures
    this.smokeTex = this.createSmokeTexture();
    this.sparkTex = this.createSparkTexture();
    this.fireTex = this.createFireTexture();

    this.smokeMat = new THREE.MeshBasicMaterial({
      map: this.smokeTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.sparkMat = new THREE.MeshBasicMaterial({
      map: this.sparkTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.fireMat = new THREE.MeshBasicMaterial({
      map: this.fireTex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(230, 235, 245, 0.9)');
    grad.addColorStop(0.6, 'rgba(180, 190, 205, 0.4)');
    grad.addColorStop(1, 'rgba(120, 130, 140, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  createSparkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 200, 50, 0.9)');
    grad.addColorStop(0.7, 'rgba(255, 90, 10, 0.4)');
    grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  createFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 6, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 200, 1)');
    grad.addColorStop(0.4, 'rgba(255, 120, 20, 0.9)');
    grad.addColorStop(0.8, 'rgba(200, 30, 0, 0.4)');
    grad.addColorStop(1, 'rgba(50, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  emitTireSmoke(position, driftAmount) {
    if (Math.random() > 0.45) return;

    const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    mesh.position.copy(position);
    mesh.position.y += 0.2;
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    const scale = 0.5 + Math.random() * 0.4;
    mesh.scale.set(scale, scale, scale);
    this.scene.add(mesh);

    this.particles.push({
      mesh: mesh,
      type: 'smoke',
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0.8 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.5
      ),
      growth: 1.8,
      fade: 1.4,
      life: 0.6,
      maxLife: 0.6,
    });
  }

  emitCollisionSparks(position, normal, count = 12) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
      mesh.position.copy(position);
      this.scene.add(mesh);

      const spread = 6.0;
      const vel = new THREE.Vector3(
        normal.x * 4.0 + (Math.random() - 0.5) * spread,
        Math.random() * 6.0 + 2.0,
        normal.z * 4.0 + (Math.random() - 0.5) * spread
      );

      this.particles.push({
        mesh: mesh,
        type: 'spark',
        vel: vel,
        gravity: -18.0,
        fade: 2.2,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
      });
    }
  }

  emitRocketTrail(position) {
    const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    mesh.position.copy(position);
    const scale = 0.35 + Math.random() * 0.25;
    mesh.scale.set(scale, scale, scale);
    this.scene.add(mesh);

    this.particles.push({
      mesh: mesh,
      type: 'smoke',
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.3,
        (Math.random() - 0.5) * 0.6
      ),
      growth: 1.2,
      fade: 2.2,
      life: 0.35,
      maxLife: 0.35,
    });
  }

  emitExplosion(position) {
    // Fireball cloud
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(this.fireGeo, this.fireMat.clone());
      mesh.position.copy(position);
      mesh.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ));
      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        type: 'fire',
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 8.0,
          Math.random() * 6.0 + 2.0,
          (Math.random() - 0.5) * 8.0
        ),
        growth: 2.5,
        fade: 1.8,
        life: 0.55 + Math.random() * 0.2,
        maxLife: 0.75,
      });
    }

    // Secondary smoke cloud
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
      mesh.position.copy(position);
      mesh.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 2.0
      ));
      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        type: 'smoke',
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 5.0,
          Math.random() * 4.0 + 1.0,
          (Math.random() - 0.5) * 5.0
        ),
        growth: 3.5,
        fade: 0.9,
        life: 1.0 + Math.random() * 0.4,
        maxLife: 1.4,
      });
    }

    // Spark shrapnel
    this.emitCollisionSparks(position, new THREE.Vector3(0, 1, 0), 20);
  }

  update(delta, camera) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        // Do not dispose p.mesh.geometry because it is a shared geometry
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Movement
      p.mesh.position.addScaledVector(p.vel, delta);
      if (p.gravity) {
        p.vel.y += p.gravity * delta;
      }

      // Billboard to face current active camera
      if (camera) {
        p.mesh.quaternion.copy(camera.quaternion);
      }

      // Growth & Fade
      if (p.growth) {
        const currentScale = p.mesh.scale.x;
        const newScale = currentScale + p.growth * delta;
        p.mesh.scale.set(newScale, newScale, newScale);
      }

      const normLife = Math.max(0, p.life / p.maxLife);
      p.mesh.material.opacity = normLife * (p.type === 'smoke' ? 0.45 : 0.9);
    }
  }
}
